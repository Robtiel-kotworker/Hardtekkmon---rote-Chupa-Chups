// ============================================================================
// Spielstand
// ----------------------------------------------------------------------------
// Ein einziges Objekt hält den kompletten Fortschritt. Mengen (Flaggen,
// besiegte Trainer, Tekkdex) liegen im Spiel als Set vor, werden zum Speichern
// aber in Listen umgewandelt – JSON kennt keine Sets.
// ============================================================================

import { laden as ladeStand, speichern as schreibeStand, loeschen } from '../engine/storage.js';
import { erstelleHardtekkmon, frischMachen, MAX_TEAM } from './hardtekkmon.js';
import { START } from '../data/world/karten.js';

export const ANZAHL_GIGS = 8;

/** @type {any} */
export let spiel = null;

function leererStand() {
  return {
    version: 1,
    spieler: { name: 'Ravey', geld: 3000 },
    position: { ...START },
    letzterBoxenstopp: { karte: 'haus_spieler', x: 5, y: 5 },
    team: [],
    lager: [],
    beutel: {},
    gigs: new Array(ANZAHL_GIGS).fill(false),
    flaggen: new Set(),
    besiegteTrainer: new Set(),
    aufgesammelt: new Set(),
    gesehen: new Set(),
    gefangen: new Set(),
    spielzeit: 0,
    startgewaehlt: false,
  };
}

/** Beginnt ein neues Spiel. */
export function neuesSpiel(name = 'Ravey') {
  spiel = leererStand();
  spiel.spieler.name = name;
  gibGegenstand('Samplepack', 5);
  gibGegenstand('Mate', 3);
  gibGegenstand('Tekkdex', 1);
  gibGegenstand('Stadtplan', 1);
  gibGegenstand('Gigpass', 1);
  return spiel;
}

/** Lädt einen gespeicherten Stand. Liefert false, wenn keiner vorhanden ist. */
export function ladeSpiel() {
  const roh = ladeStand();
  if (!roh || roh.version !== 1) return false;

  spiel = {
    ...leererStand(),
    ...roh,
    flaggen: new Set(roh.flaggen ?? []),
    besiegteTrainer: new Set(roh.besiegteTrainer ?? []),
    aufgesammelt: new Set(roh.aufgesammelt ?? []),
    gesehen: new Set(roh.gesehen ?? []),
    gefangen: new Set(roh.gefangen ?? []),
  };
  return true;
}

/** Schreibt den Stand in den Browserspeicher. */
export function speichereSpiel() {
  if (!spiel) return false;
  return schreibeStand({
    ...spiel,
    flaggen: [...spiel.flaggen],
    besiegteTrainer: [...spiel.besiegteTrainer],
    aufgesammelt: [...spiel.aufgesammelt],
    gesehen: [...spiel.gesehen],
    gefangen: [...spiel.gefangen],
  });
}

export function loescheSpiel() {
  loeschen();
}

// --- Beutel --------------------------------------------------------------------

export function gibGegenstand(name, anzahl = 1) {
  spiel.beutel[name] = (spiel.beutel[name] ?? 0) + anzahl;
}

export function nimmGegenstand(name, anzahl = 1) {
  if (!hatGegenstand(name, anzahl)) return false;
  spiel.beutel[name] -= anzahl;
  if (spiel.beutel[name] <= 0) delete spiel.beutel[name];
  return true;
}

export function hatGegenstand(name, anzahl = 1) {
  return (spiel.beutel[name] ?? 0) >= anzahl;
}

export function anzahlGegenstand(name) {
  return spiel.beutel[name] ?? 0;
}

// --- Team ----------------------------------------------------------------------

/**
 * Nimmt ein Hardtekkmon ins Team auf. Ist das Team voll, wandert es ins Lager.
 * @returns {'team'|'lager'}
 */
export function nimmAuf(mon) {
  merkeGefangen(mon.artId);
  if (spiel.team.length < MAX_TEAM) {
    spiel.team.push(mon);
    return 'team';
  }
  spiel.lager.push(mon);
  return 'lager';
}

/** Erstes einsatzbereites Hardtekkmon im Team. */
export function ersterKaempfer() {
  return spiel.team.find((mon) => mon.kp > 0) ?? null;
}

export function teamAmEnde() {
  return spiel.team.length > 0 && spiel.team.every((mon) => mon.kp <= 0);
}

export function heileTeam() {
  for (const mon of spiel.team) frischMachen(mon);
}

/** Gibt dem Spieler sein Start-Hardtekkmon. */
export function waehleStarter(artName) {
  const mon = erstelleHardtekkmon(artName, 5, { original: spiel.spieler.name });
  spiel.startgewaehlt = true;
  merkeGesehen(mon.artId);
  nimmAuf(mon);
  return mon;
}

// --- Fortschritt ----------------------------------------------------------------

export function setzeFlagge(name) {
  spiel.flaggen.add(name);
}

export function hatFlagge(name) {
  return spiel.flaggen.has(name);
}

export function merkeTrainerBesiegt(id) {
  spiel.besiegteTrainer.add(id);
}

export function trainerBesiegt(id) {
  return spiel.besiegteTrainer.has(id);
}

export function merkeAufgesammelt(schluessel) {
  spiel.aufgesammelt.add(schluessel);
}

export function schonAufgesammelt(schluessel) {
  return spiel.aufgesammelt.has(schluessel);
}

export function merkeGesehen(artId) {
  spiel.gesehen.add(artId);
}

export function merkeGefangen(artId) {
  spiel.gesehen.add(artId);
  spiel.gefangen.add(artId);
}

export function gigErhalten(nummer) {
  if (nummer === null || nummer === undefined) return;
  spiel.gigs[nummer] = true;
}

export function anzahlGigs() {
  return spiel.gigs.filter(Boolean).length;
}

export function aendereGeld(betrag) {
  spiel.spieler.geld = Math.max(0, spiel.spieler.geld + betrag);
}

/** Zeitzähler in Bildern; für die Anzeige in Stunden/Minuten. */
export function zaehleZeit() {
  spiel.spielzeit += 1;
}

export function spielzeitText() {
  const sekunden = Math.floor(spiel.spielzeit / 60);
  const stunden = Math.floor(sekunden / 3600);
  const minuten = Math.floor((sekunden % 3600) / 60);
  return `${stunden}:${String(minuten).padStart(2, '0')}`;
}

/** Merkt den letzten Boxenstopp – dorthin geht es nach einer Niederlage. */
export function merkeBoxenstopp(karte, x, y) {
  spiel.letzterBoxenstopp = { karte, x, y };
}
