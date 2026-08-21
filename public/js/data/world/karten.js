// ============================================================================
// Welt
// ----------------------------------------------------------------------------
// Sammelpunkt: Beide Regionen tragen sich beim Laden in das Verzeichnis ein.
// Wer eine Karte braucht, holt sie über `karte(id)`.
// ============================================================================

import './region_west.js';
import './region_ost.js';

export { KARTEN, karte } from './verzeichnis.js';

/** Startpunkt eines neuen Spiels. */
export const START = { karte: 'haus_spieler', x: 5, y: 5, richtung: 'unten' };
