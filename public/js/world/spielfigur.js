// ============================================================================
// Figurenbewegung
// ----------------------------------------------------------------------------
// Bewegung läuft rasterweise: Eine Figur steht immer auf einer Kachel und
// gleitet beim Schritt weich zur nächsten. Spieler und Figuren teilen sich
// diese Mechanik, damit Trainer beim Herankommen genauso laufen wie der
// Spieler.
// ============================================================================

import { KACHEL } from '../gfx/tiles.js';

export const RICHTUNGS_VEKTOR = {
  oben: { x: 0, y: -1 },
  unten: { x: 0, y: 1 },
  links: { x: -1, y: 0 },
  rechts: { x: 1, y: 0 },
};

/** Gegenrichtung – z. B. damit sich Figuren dem Spieler zuwenden. */
export const GEGENRICHTUNG = {
  oben: 'unten', unten: 'oben', links: 'rechts', rechts: 'links',
};

/**
 * @param {number} x Kachelspalte
 * @param {number} y Kachelzeile
 * @param {string} richtung
 */
export function neueFigur(x, y, richtung = 'unten') {
  return {
    x,
    y,
    richtung,
    versatz: 0, // zurückgelegte Pixel des laufenden Schritts (0..16)
    laeuft: false,
    schrittZaehler: 0,
    bild: 0,
  };
}

/** Startet einen Schritt in die aktuelle Blickrichtung. */
export function starteSchritt(figur) {
  figur.laeuft = true;
  figur.versatz = 0;
}

/**
 * Führt den laufenden Schritt fort.
 * @param {object} figur
 * @param {number} tempo Pixel pro Bild
 * @returns {boolean} true, sobald die Zielkachel erreicht ist
 */
export function bewegeFigur(figur, tempo) {
  if (!figur.laeuft) return false;

  figur.versatz += tempo;
  figur.schrittZaehler += tempo;
  figur.bild = 1 + (Math.floor(figur.schrittZaehler / 8) % 2);

  if (figur.versatz < KACHEL) return false;

  const vektor = RICHTUNGS_VEKTOR[figur.richtung];
  figur.x += vektor.x;
  figur.y += vektor.y;
  figur.versatz = 0;
  figur.laeuft = false;
  return true;
}

/** Bildschirmposition (linke obere Ecke der Kachel) inklusive Zwischenschritt. */
export function pixelPosition(figur) {
  const vektor = RICHTUNGS_VEKTOR[figur.richtung];
  const anteil = figur.laeuft ? figur.versatz : 0;
  return {
    x: figur.x * KACHEL + vektor.x * anteil,
    y: figur.y * KACHEL + vektor.y * anteil,
  };
}

/** Kachel, auf die die Figur gerade blickt. */
export function blickfeld(figur, weite = 1) {
  const vektor = RICHTUNGS_VEKTOR[figur.richtung];
  return { x: figur.x + vektor.x * weite, y: figur.y + vektor.y * weite };
}
