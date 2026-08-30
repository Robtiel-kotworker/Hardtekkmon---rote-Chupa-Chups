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
    musik: einstellungen.musik ?? 'welt',
    drinnen: einstellungen.drinnen ?? false,
    dunkel: einstellungen.dunkel ?? false,
    begegnungen: einstellungen.begegnungen ?? null,
    verbindungen: einstellungen.verbindungen ?? {},
    kacheln: gelaende.kacheln,
    warps: [...gelaende.warps, ...(zusatz.warps ?? [])],
    npcs: zusatz.npcs ?? [],
    schilder: [...gelaende.schilder, ...(zusatz.schilder ?? [])],
    gegenstaende: zusatz.gegenstaende ?? [],
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
