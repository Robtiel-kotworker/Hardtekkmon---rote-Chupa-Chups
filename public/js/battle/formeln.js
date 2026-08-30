// ============================================================================
// Kampfformeln
// ----------------------------------------------------------------------------
// Schaden, Treffer, Volltreffer, Erfahrung und Fangchance. Die Formeln sind an
// die klassische Vorlage angelehnt: ganzzahlige Zwischenschritte, ein kleiner
// Zufallsanteil und ein deutlicher Typvorteil.
// ============================================================================

import { werte, artVon, maxKp } from '../game/hardtekkmon.js';
import { wirksamkeitGegen } from '../data/typen.js';
import { findeAttacke } from '../data/attacken.js';

/** Wertestufen reichen von -6 bis +6. */
export const STUFEN_GRENZE = 6;

/**
 * Faktor einer Wertestufe.
 * @param {number} stufe -6..+6
 */
export function stufenFaktor(stufe) {
  const begrenzt = Math.max(-STUFEN_GRENZE, Math.min(STUFEN_GRENZE, stufe));
  return begrenzt >= 0 ? (2 + begrenzt) / 2 : 2 / (2 - begrenzt);
}

/** Faktor einer Genauigkeitsstufe – flacher als bei den übrigen Werten. */
export function genauigkeitsFaktor(stufe) {
  const begrenzt = Math.max(-STUFEN_GRENZE, Math.min(STUFEN_GRENZE, stufe));
  return begrenzt >= 0 ? (3 + begrenzt) / 3 : 3 / (3 - begrenzt);
}

/**
 * Kampfwert inklusive Wertestufen und Zustand.
 * @param {object} kaempfer { mon, stufen, status }
 * @param {'ang'|'ver'|'spa'|'spv'|'ini'} schluessel
 */
export function kampfwert(kaempfer, schluessel) {
  const grund = werte(kaempfer.mon)[schluessel];
  let wert = grund * stufenFaktor(kaempfer.stufen[schluessel] ?? 0);

  if (schluessel === 'ang' && kaempfer.mon.status === 'ausgebrannt') wert *= 0.5;
  if (schluessel === 'ini' && kaempfer.mon.status === 'zugedröhnt') wert *= 0.5;

  return Math.max(1, Math.floor(wert));
}

/** Trifft die Attacke? */
export function trifft(attacke, angreifer, verteidiger) {
  if (attacke.genauigkeit >= 100) return true;
  const anteil = (attacke.genauigkeit / 100)
    * genauigkeitsFaktor((angreifer.stufen.gen ?? 0) - (verteidiger.stufen.gen ?? 0));
  return Math.random() < anteil;
}

/**
 * Volltreffer? Attacken mit `krit`-Effekt treffen deutlich häufiger kritisch
 * (1 zu 5), alle anderen deutlich seltener (1 zu 20) – Volltreffer sollen
 * eine seltene Ausnahme bleiben, nicht mehrmals hintereinander vorkommen.
 */
export function istVolltreffer(attacke) {
  const chance = attacke.effekt?.art === 'krit' ? 0.2 : 0.05;
  return Math.random() < chance;
}

/**
 * Schadensberechnung.
 * @returns {{ schaden: number, wirkung: number, volltreffer: boolean }}
 */
export function berechneSchaden(attacke, angreifer, verteidiger) {
  const zieltypen = artVon(verteidiger.mon).typen;
  const wirkung = wirksamkeitGegen(attacke.typ, zieltypen);
  if (wirkung === 0 || attacke.staerke <= 0) {
    return { schaden: 0, wirkung, volltreffer: false };
  }

  const spezial = attacke.kategorie === 'spezial';
  const angriff = kampfwert(angreifer, spezial ? 'spa' : 'ang');
  const verteidigung = kampfwert(verteidiger, spezial ? 'spv' : 'ver');
  const volltreffer = istVolltreffer(attacke);

  const grund = Math.floor(
    Math.floor(Math.floor((2 * angreifer.mon.stufe) / 5 + 2) * attacke.staerke * angriff / verteidigung) / 50,
  ) + 2;

  const eigeneTypen = artVon(angreifer.mon).typen;
  const stab = eigeneTypen.includes(attacke.typ) ? 1.5 : 1;
  const zufall = 0.85 + Math.random() * 0.15;
  // Weiter gedämpft als die klassischen 1.5x: Ein Volltreffer soll spürbar
  // bleiben, aber keine Runden mehr im Alleingang entscheiden.
  const kritisch = volltreffer ? 1.1 : 1;

  const schaden = Math.max(1, Math.floor(grund * stab * wirkung * zufall * kritisch));
  return { schaden, wirkung, volltreffer };
}

/** Wer ist zuerst dran? Bei Gleichstand entscheidet der Zufall. */
export function istSchneller(a, b) {
  const iniA = kampfwert(a, 'ini');
  const iniB = kampfwert(b, 'ini');
  if (iniA === iniB) return Math.random() < 0.5;
  return iniA > iniB;
}

/**
 * Erfahrung für einen Sieg.
 * @param {object} besiegt
 * @param {boolean} vonTrainer
 */
export function erfahrungFuerSieg(besiegt, vonTrainer) {
  const basis = artVon(besiegt).basisErfahrung;
  return Math.max(1, Math.floor((basis * besiegt.stufe) / 7 * (vonTrainer ? 1.5 : 1)));
}

/** Zustandsbonus beim Fangen. */
function statusBonus(mon) {
  if (mon.status === 'weggeratzt' || mon.status === 'tiefgekühlt') return 2;
  if (mon.status) return 1.5;
  return 1;
}

/**
 * Fangversuch. Liefert, wie oft das Samplepack wackelt (0-3) und ob es hält.
 * @param {object} mon wildes Hardtekkmon
 * @param {number} packbonus
 * @returns {{ erfolg: boolean, wackler: number }}
 */
export function fangversuch(mon, packbonus) {
  const grenze = maxKp(mon);
  const fangrate = artVon(mon).fang;

  const a = Math.max(1, Math.floor(
    (((3 * grenze - 2 * mon.kp) * fangrate * packbonus) / (3 * grenze)) * statusBonus(mon),
  ));
  if (a >= 255) return { erfolg: true, wackler: 3 };

  const b = Math.floor(1048560 / Math.floor(Math.sqrt(Math.sqrt(16711680 / a))));
  let wackler = 0;
  for (let i = 0; i < 4; i += 1) {
    if (Math.floor(Math.random() * 65536) >= b) {
      return { erfolg: false, wackler };
    }
    wackler = Math.min(3, wackler + 1);
  }
  return { erfolg: true, wackler: 3 };
}

/**
 * Fluchtchance aus einem wilden Kampf. Steigt mit jedem Versuch.
 */
export function fluchtGelingt(eigenes, wildes, versuche) {
  const eigen = kampfwert(eigenes, 'ini');
  const fremd = kampfwert(wildes, 'ini');
  if (eigen > fremd) return true;
  const wert = Math.floor((eigen * 128) / Math.max(1, fremd)) + 30 * versuche;
  return Math.floor(Math.random() * 256) < wert;
}

/** Schaden durch Dauerzustände am Rundenende. */
export function zustandsschaden(mon) {
  if (mon.status === 'verkatert' || mon.status === 'ausgebrannt') {
    return Math.max(1, Math.floor(maxKp(mon) / 16));
  }
  return 0;
}

/** Bequemer Zugriff auf die Attackendaten eines Kampfeintrags. */
export function attackeDaten(eintrag) {
  return findeAttacke(eintrag.name);
}
