// ============================================================================
// Einzelnes Hardtekkmon
// ----------------------------------------------------------------------------
// Ein Hardtekkmon im Team ist ein schlanker Datensatz: Art, Stufe, Erfahrung,
// Erbwerte, aktuelle Kraftpunkte, bis zu vier Attacken und ein Zustand.
// Kampfbezogene Dinge (Wertestufen, Verwirrung) leben nur im Kampf und stehen
// bewusst nicht hier – so bleibt der Spielstand klein und eindeutig.
// ============================================================================

import { art, artNachName, ARTEN } from '../data/arten.js';
import { findeAttacke } from '../data/attacken.js';
import { zahl } from '../engine/rng.js';

export const MAX_ATTACKEN = 4;
export const MAX_TEAM = 6;

/** Erbwerte: kleiner Zufallsanteil, damit zwei gleiche Arten sich unterscheiden. */
function wuerfleErbwerte() {
  const wert = () => zahl(0, 15);
  return { kp: wert(), ang: wert(), ver: wert(), spa: wert(), spv: wert(), ini: wert() };
}

/** Erfahrung, die für eine Stufe insgesamt nötig ist. */
export function erfahrungFuerStufe(stufe) {
  return stufe ** 3;
}

/**
 * Berechnet die aktuellen Werte eines Hardtekkmon.
 * @param {object} mon
 */
export function werte(mon) {
  const basis = art(mon.artId).basis;
  const rechne = (schluessel, zugabe) => Math.floor(
    ((2 * basis[schluessel] + mon.iv[schluessel]) * mon.stufe) / 100,
  ) + zugabe;

  return {
    kp: rechne('kp', mon.stufe + 10),
    ang: rechne('ang', 5),
    ver: rechne('ver', 5),
    spa: rechne('spa', 5),
    spv: rechne('spv', 5),
    ini: rechne('ini', 5),
  };
}

/** Alle Attacken, die eine Art bis zu einer Stufe gelernt hat. */
function attackenBisStufe(artDaten, stufe) {
  return artDaten.lernsatz
    .filter((eintrag) => eintrag.stufe <= stufe)
    .map((eintrag) => eintrag.attacke);
}

function baueAttacke(name) {
  const daten = findeAttacke(name);
  if (!daten) return null;
  return { name, ap: daten.ap, maxAp: daten.ap };
}

/**
 * Erzeugt ein Hardtekkmon.
 * @param {string|number} artAngabe Name oder Nummer
 * @param {number} stufe
 * @param {{ original?: string }} [zusatz]
 */
export function erstelleHardtekkmon(artAngabe, stufe, zusatz = {}) {
  const artDaten = typeof artAngabe === 'number' ? art(artAngabe) : artNachName(artAngabe);
  if (!artDaten) throw new Error(`Unbekannte Art: ${artAngabe}`);

  const mon = {
    artId: artDaten.id,
    spitzname: null,
    stufe,
    erfahrung: erfahrungFuerStufe(stufe),
    iv: wuerfleErbwerte(),
    kp: 0,
    status: null,
    schlafRunden: 0,
    attacken: attackenBisStufe(artDaten, stufe)
      .slice(-MAX_ATTACKEN)
      .map(baueAttacke)
      .filter(Boolean),
    original: zusatz.original ?? null,
  };

  if (mon.attacken.length === 0) mon.attacken = [baueAttacke(artDaten.lernsatz[0].attacke)];
  mon.kp = werte(mon).kp;
  return mon;
}

/** Anzeigename (Spitzname, sonst Artname). */
export function anzeigename(mon) {
  return mon.spitzname ?? art(mon.artId).name;
}

export function artVon(mon) {
  return art(mon.artId);
}

export function maxKp(mon) {
  return werte(mon).kp;
}

export function istUmgekippt(mon) {
  return mon.kp <= 0;
}

/** Heilt Kraftpunkte und liefert die tatsächlich geheilte Menge. */
export function heile(mon, menge) {
  const grenze = maxKp(mon);
  const vorher = mon.kp;
  mon.kp = Math.min(grenze, mon.kp + menge);
  return mon.kp - vorher;
}

/** Stellt ein Hardtekkmon komplett wieder her. */
export function frischMachen(mon) {
  mon.kp = maxKp(mon);
  mon.status = null;
  mon.schlafRunden = 0;
  for (const attacke of mon.attacken) attacke.ap = attacke.maxAp;
}

/** Zieht Schaden ab und liefert den tatsächlich verursachten Schaden. */
export function fuegeSchadenZu(mon, menge) {
  const vorher = mon.kp;
  mon.kp = Math.max(0, mon.kp - Math.max(0, Math.floor(menge)));
  return vorher - mon.kp;
}

/**
 * Trägt Erfahrung ein und liefert alle erreichten Stufen.
 * @returns {{ neueStufen: number[], neueAttacken: string[] }}
 */
export function gibErfahrung(mon, menge) {
  const neueStufen = [];
  const neueAttacken = [];
  mon.erfahrung += Math.max(0, Math.floor(menge));

  while (mon.stufe < 100 && mon.erfahrung >= erfahrungFuerStufe(mon.stufe + 1)) {
    mon.stufe += 1;
    neueStufen.push(mon.stufe);

    const grenze = maxKp(mon);
    mon.kp = Math.min(grenze, mon.kp + Math.max(1, Math.floor(grenze / 12)));

    for (const eintrag of artVon(mon).lernsatz) {
      if (eintrag.stufe === mon.stufe) neueAttacken.push(eintrag.attacke);
    }
  }

  return { neueStufen, neueAttacken };
}

/** Fortschritt zur nächsten Stufe (0..1). */
export function erfahrungsAnteil(mon) {
  if (mon.stufe >= 100) return 1;
  const unten = erfahrungFuerStufe(mon.stufe);
  const oben = erfahrungFuerStufe(mon.stufe + 1);
  return Math.max(0, Math.min(1, (mon.erfahrung - unten) / (oben - unten)));
}

/**
 * Lernt eine Attacke. Sind schon vier vorhanden, muss der Aufrufer einen
 * Platz angeben – sonst wird nichts gelernt.
 * @param {number} [platz]
 */
export function lerneAttacke(mon, name, platz) {
  const neue = baueAttacke(name);
  if (!neue) return false;
  if (mon.attacken.some((a) => a.name === name)) return false;

  if (mon.attacken.length < MAX_ATTACKEN) {
    mon.attacken.push(neue);
    return true;
  }
  if (platz === undefined || platz < 0 || platz >= MAX_ATTACKEN) return false;
  mon.attacken[platz] = neue;
  return true;
}

/** Prüft, ob eine Entwicklung ansteht, und liefert die Zielart. */
export function entwicklungFaellig(mon) {
  const daten = artVon(mon);
  if (!daten.entwicklung) return null;
  if (mon.stufe < daten.entwicklung.stufe) return null;
  return art(daten.entwicklung.zu);
}

/**
 * Führt die Entwicklung durch. Neu erreichbare Attacken kommen dazu, solange
 * Platz ist.
 */
export function entwickle(mon, zielArt) {
  mon.artId = zielArt.id;
  const grenze = maxKp(mon);
  mon.kp = Math.min(grenze, mon.kp + 5);

  for (const eintrag of zielArt.lernsatz) {
    if (eintrag.stufe <= mon.stufe && mon.attacken.length < MAX_ATTACKEN) {
      lerneAttacke(mon, eintrag.attacke);
    }
  }
  return mon;
}

/** Zufällige Art aus einer Begegnungstabelle ziehen. */
export function ausTabelle(tabelle) {
  const gesamt = tabelle.reduce((summe, eintrag) => summe + eintrag.gewicht, 0);
  let wurf = Math.random() * gesamt;
  for (const eintrag of tabelle) {
    wurf -= eintrag.gewicht;
    if (wurf <= 0) return eintrag;
  }
  return tabelle[tabelle.length - 1];
}

/** Gesamtzahl der Arten – für den Tekkdex. */
export const ARTEN_GESAMT = ARTEN.length;
