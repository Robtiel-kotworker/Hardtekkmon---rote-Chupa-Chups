// ============================================================================
// Gegenstände
// ----------------------------------------------------------------------------
// Gefangen wird mit Samplepacks: Man wirft dem geschwächten Hardtekkmon einen
// Datenträger zu, es verschwindet darin und wird – wenn es passt – Teil der
// eigenen Sammlung. Daneben gibt es Heilmittel aus dem Kiosk und
// Schlüsselgegenstände, die den Weg freischalten.
// ============================================================================

/**
 * @typedef {'fang'|'heilung'|'status'|'beleben'|'kampfhilfe'|'schluessel'} Gegenstandsart
 */

/** @type {Record<string, object>} */
export const GEGENSTAENDE = {};

function gegenstand(name, art, preis, symbol, wirkung, text) {
  GEGENSTAENDE[name] = { name, art, preis, symbol, wirkung, text };
}

// --- Samplepacks (Fangen) ----------------------------------------------------
gegenstand('Samplepack', 'fang', 200, 'samplepack', { fangbonus: 1 },
  'Ein handelsübliches Pack. Fängt geschwächte Hardtekkmon ein.');
gegenstand('Fettes Samplepack', 'fang', 600, 'samplepackGross', { fangbonus: 1.5 },
  'Mehr Speicher, mehr Chancen. Deutlich fängiger.');
gegenstand('Studio-Samplepack', 'fang', 1200, 'samplepackGross', { fangbonus: 2 },
  'Studioqualität. Da will jedes Hardtekkmon rein.');
gegenstand('Meister-Sample', 'fang', 0, 'samplepackGross', { fangbonus: 255 },
  'Das legendäre Pack. Fängt garantiert – nur einmal zu bekommen.');

// --- Heilmittel --------------------------------------------------------------
gegenstand('Mate', 'heilung', 200, 'trank', { kp: 20 },
  'Kalt, koffeinhaltig, heilt 20 Kraftpunkte.');
gegenstand('Doppelmate', 'heilung', 500, 'trank', { kp: 50 },
  'Zwei auf einmal. Heilt 50 Kraftpunkte.');
gegenstand('Turbo-Mate', 'heilung', 1200, 'trank', { kp: 120 },
  'Nicht mehr ganz legal. Heilt 120 Kraftpunkte.');
gegenstand('Roter Lolli', 'heilung', 2500, 'pille', { kp: 999 },
  'Der rote Chupa Chups. Stellt alle Kraftpunkte wieder her.');
gegenstand('Erste-Hilfe-Riegel', 'beleben', 1500, 'pille', { beleben: 0.5 },
  'Bringt ein umgekipptes Hardtekkmon mit halber Kraft zurück.');
gegenstand('Defibrillator', 'beleben', 3500, 'pille', { beleben: 1 },
  'Bringt ein umgekipptes Hardtekkmon mit voller Kraft zurück.');

// --- Zustandsheilung ---------------------------------------------------------
gegenstand('Kaugummi', 'status', 150, 'pille', { heiltStatus: ['zugedröhnt'] },
  'Gegen Zittern und Zucken. Hebt "zugedröhnt" auf.');
gegenstand('Kaffee', 'status', 150, 'trank', { heiltStatus: ['weggeratzt'] },
  'Weckt jeden. Hebt "weggeratzt" auf.');
gegenstand('Kohletablette', 'status', 150, 'pille', { heiltStatus: ['verkatert'] },
  'Bindet alles, was nicht reingehört. Hebt "verkatert" auf.');
gegenstand('Eisbeutel', 'status', 150, 'pille', { heiltStatus: ['ausgebrannt'] },
  'Kühlt runter. Hebt "ausgebrannt" auf.');
gegenstand('Handwärmer', 'status', 150, 'pille', { heiltStatus: ['tiefgekühlt'] },
  'Bringt wieder Leben in die Glieder. Hebt "tiefgekühlt" auf.');
gegenstand('Allzweckreiniger', 'status', 700, 'trank',
  { heiltStatus: ['zugedröhnt', 'weggeratzt', 'verkatert', 'ausgebrannt', 'tiefgekühlt'] },
  'Macht alles wieder sauber. Hebt jeden Zustand auf.');

// --- Kampfhilfen -------------------------------------------------------------
gegenstand('Anlaufhilfe', 'kampfhilfe', 400, 'pille', { werte: { ang: 1 } },
  'Kurzfristig mehr Druck: Angriff steigt im Kampf.');
gegenstand('Ohrstöpsel', 'kampfhilfe', 400, 'pille', { werte: { spv: 1 } },
  'Dämpft alles ab: Spezial-Verteidigung steigt im Kampf.');
gegenstand('Turnschuh-Wachs', 'kampfhilfe', 400, 'pille', { werte: { ini: 1 } },
  'Für schnellere Beine: Initiative steigt im Kampf.');

// --- Schlüsselgegenstände ----------------------------------------------------
gegenstand('Tekkdex', 'schluessel', 0, 'karte', {},
  'Verzeichnet jedes gesehene und gefangene Hardtekkmon.');
gegenstand('Stadtplan', 'schluessel', 0, 'karte', {},
  'Zeigt, wo man gerade ist und wo es noch hingeht.');
gegenstand('Taschenlampe', 'schluessel', 0, 'karte', {},
  'Bringt Licht in den dunkelsten Kellergang.');
gegenstand('Gigpass', 'schluessel', 0, 'karte', {},
  'Sammelheft für alle acht Gig-Marken.');

/** @param {string} name */
export function gegenstandInfo(name) {
  return GEGENSTAENDE[name] ?? null;
}

/** Kann der Gegenstand im Kampf benutzt werden? */
export function imKampfNutzbar(name) {
  const eintrag = GEGENSTAENDE[name];
  if (!eintrag) return false;
  return ['fang', 'heilung', 'status', 'beleben', 'kampfhilfe'].includes(eintrag.art);
}

/** Kann der Gegenstand außerhalb des Kampfes benutzt werden? */
export function ausserhalbNutzbar(name) {
  const eintrag = GEGENSTAENDE[name];
  if (!eintrag) return false;
  return ['heilung', 'status', 'beleben'].includes(eintrag.art);
}

/** Sortierreihenfolge im Beutel. */
export const BEUTEL_REIHENFOLGE = ['fang', 'heilung', 'status', 'beleben', 'kampfhilfe', 'schluessel'];
