// ============================================================================
// Kamera
// ----------------------------------------------------------------------------
// Folgt dem Spieler und bleibt innerhalb der Karte. Ist eine Karte kleiner als
// der Bildschirm, wird sie mittig gesetzt statt an den Rand geklemmt.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { KACHEL } from '../gfx/tiles.js';

/**
 * @param {{ breite: number, hoehe: number }} karte
 * @param {{ x: number, y: number }} zielPixel Mittelpunkt, dem gefolgt wird
 * @returns {{ x: number, y: number }}
 */
export function kameraPosition(karte, zielPixel) {
  const kartenBreite = karte.breite * KACHEL;
  const kartenHoehe = karte.hoehe * KACHEL;

  const x = kartenBreite <= BREITE
    ? (kartenBreite - BREITE) / 2
    : Math.max(0, Math.min(kartenBreite - BREITE, zielPixel.x - BREITE / 2));

  const y = kartenHoehe <= HOEHE
    ? (kartenHoehe - HOEHE) / 2
    : Math.max(0, Math.min(kartenHoehe - HOEHE, zielPixel.y - HOEHE / 2));

  return { x: Math.round(x), y: Math.round(y) };
}
