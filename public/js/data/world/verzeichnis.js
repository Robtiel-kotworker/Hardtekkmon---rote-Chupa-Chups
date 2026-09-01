// ============================================================================
// Kartenverzeichnis
// ----------------------------------------------------------------------------
// Sammelstelle aller Karten. Die Regionsdateien tragen ihre Karten hier ein,
// das Spiel greift ausschließlich über `karte(id)` darauf zu.
// ============================================================================

import { Kartenbauer } from './bauplan.js';

/** @type {Record<string, object>} */
export const KARTEN = {};

/**
 * Legt eine Karte an.
 * @param {string} id
 * @param {object} einstellungen Name, Größe, Musik, Begegnungen, Verbindungen …
 * @param {(bauer: Kartenbauer) => object|void} aufbau Zeichnet das Gelände
 */
/**
 * Musik einer Karte. Ein ausdrücklich gesetztes `musik` gewinnt immer
 * (Boxenstopp, Gig-Halle); sonst entscheidet die Art des Ortes, damit sich
 * Gebäude, Stadt und Route klar voneinander abheben:
 *
 *   Wildgebiet (hat Begegnungen) -> "route"    – düster, schnell, hart
 *   Innenraum                    -> "gebaeude" – runder, melodischer
 *   sonst (Stadt, Freifläche)    -> "welt"
 *
 * Die Begegnungen werden bewusst vor `drinnen` geprüft: Höhlen wie der
 * Boxenberg sind formal Innenräume, spielen sich aber wie eine Route.
 */
function waehleMusik(einstellungen) {
  if (einstellungen.musik) return einstellungen.musik;
  if (einstellungen.begegnungen) return 'route';
  if (einstellungen.drinnen) return 'gebaeude';
  return 'welt';
}

export function baueKarte(id, einstellungen, aufbau) {
  const bauer = new Kartenbauer(
    einstellungen.breite,
    einstellungen.hoehe,
    einstellungen.grund ?? 'gras',
  );

  const zusatz = aufbau(bauer) ?? {};
  const gelaende = bauer.fertig();

  KARTEN[id] = {
    id,
    name: einstellungen.name,
    breite: einstellungen.breite,
    hoehe: einstellungen.hoehe,
    musik: waehleMusik(einstellungen),
    drinnen: einstellungen.drinnen ?? false,
    dunkel: einstellungen.dunkel ?? false,
    begegnungen: einstellungen.begegnungen ?? null,
    verbindungen: einstellungen.verbindungen ?? {},
    kacheln: gelaende.kacheln,
    warps: [...gelaende.warps, ...(zusatz.warps ?? [])],
    npcs: zusatz.npcs ?? [],
    schilder: [...gelaende.schilder, ...(zusatz.schilder ?? [])],
    beschriftungen: [...gelaende.beschriftungen, ...(zusatz.beschriftungen ?? [])],
    gegenstaende: zusatz.gegenstaende ?? [],
    // Automaten-Tische, an denen gerade ein Zocker klebt – siehe
    // platziereAutomaten() in data/world/casino.js und automatBesetzt() in
    // world/weltkarte.js.
    besetzteAutomaten: zusatz.besetzteAutomaten ?? [],
  };

  return KARTEN[id];
}

/** @param {string} id */
export function karte(id) {
  return KARTEN[id] ?? null;
}

/** Kurzform für einen Warp-Eintrag. */
export function warp(x, y, ziel, zx, zy) {
  return { x, y, ziel, zx, zy };
}

/** Kurzform für eine Figur auf der Karte. */
export function person(x, y, figur, richtung, inhalt = {}) {
  return { x, y, figur, richtung, bewegung: 'stehen', ...inhalt };
}

/** Kurzform für einen Trainer auf der Karte. */
export function kaempfer(x, y, figur, richtung, trainerId, blickrichtung = null) {
  return {
    x, y, figur, richtung, bewegung: 'stehen', trainer: trainerId,
    blick: blickrichtung ?? richtung,
  };
}

/** Kurzform für ein Schild. */
export function schild(x, y, text) {
  return { x, y, text };
}

/** Kurzform für einen aufsammelbaren Gegenstand. */
export function fundstueck(x, y, gegenstand, anzahl = 1) {
  return { x, y, gegenstand, anzahl };
}
