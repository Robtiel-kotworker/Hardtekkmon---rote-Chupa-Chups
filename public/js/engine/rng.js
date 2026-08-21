// ============================================================================
// Zufall
// ----------------------------------------------------------------------------
// Zwei Quellen: ein globaler Zufall für Kämpfe/Begegnungen und ein
// aussaatbarer Generator (mulberry32) für alles, was reproduzierbar sein muss –
// vor allem Kartenbewuchs und Hardtekkmon-Sprites. Gleiche Aussaat ergibt
// immer dasselbe Ergebnis, deshalb müssen keine Grafiken mitgeliefert werden.
// ============================================================================

/**
 * @param {number} saat
 * @returns {() => number} Funktion, die Werte in [0,1) liefert
 */
export function generator(saat) {
  let zustand = saat >>> 0;
  return function next() {
    zustand = (zustand + 0x6d2b79f5) >>> 0;
    let t = zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Wandelt eine Zeichenkette in eine 32-Bit-Aussaat (FNV-1a).
 * @param {string} text
 */
export function saatAusText(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Ganzzahl in [min, max] – inklusive beider Grenzen. */
export function zahl(min, max, quelle = Math.random) {
  return min + Math.floor(quelle() * (max - min + 1));
}

/** Trifft mit der Wahrscheinlichkeit `wahrscheinlichkeit` (0..1) zu. */
export function trifft(wahrscheinlichkeit, quelle = Math.random) {
  return quelle() < wahrscheinlichkeit;
}

/** Zufälliges Element einer Liste. */
export function eines(liste, quelle = Math.random) {
  return liste[Math.floor(quelle() * liste.length)];
}
