// ============================================================================
// Gegenstände
// ----------------------------------------------------------------------------
// Gefangen wird mit Samplepacks: Man wirft dem geschwächten Hardtekkmon einen
// Datenträger zu, es verschwindet darin und wird – wenn es passt – Teil der
// eigenen Sammlung. Daneben gibt es Heilmittel aus dem Kiosk und
// Schlüsselgegenstände, die den Weg freischalten.
// ============================================================================

/**
 * @typedef {'fang'|'heilung'|'status'|'beleben'|'levelauf'|'kampfhilfe'|'anlege'|'schluessel'} Gegenstandsart
 */

/** @type {Record<string, object>} */
export const GEGENSTAENDE = {};

function gegenstand(name, art, preis, symbol, wirkung, text) {
  GEGENSTAENDE[name] = { name, art, preis, symbol, wirkung, text };
}

// --- Samplepacks (Fangen) -----------------------------------------------------
// Vier Stufen, deren Fangbonus mit dem Spielfortschritt wächst. Samplepack und
// Super-Sample gibt es von Anfang an im Kiosk, Giga-Sample erst in größeren
// Kiosken späterer Städte – Master-Sample ist wie eh und je ein einzelnes,
// garantiertes Fundstück und nirgends käuflich.
gegenstand('Samplepack', 'fang', 200, 'samplepack', { fangbonus: 1 },
  'Ein handelsübliches Pack. Fängt geschwächte Hardtekkmon ein.');
gegenstand('Super-Sample', 'fang', 600, 'samplepackGross', { fangbonus: 1.5 },
  'Mehr Speicher, mehr Chancen. Deutlich fängiger.');
gegenstand('Giga-Sample', 'fang', 1200, 'samplepackGross', { fangbonus: 2 },
  'Studioqualität. Da will jedes Hardtekkmon rein.');
gegenstand('Master-Sample', 'fang', 0, 'samplepackGross', { fangbonus: 255 },
  'Das legendäre Pack. Fängt garantiert – nur einmal zu bekommen.');

// --- Heilmittel ----------------------------------------------------------------
// Dieselbe Vier-Stufen-Logik wie bei den Samplepacks: Mate und Super-Mate sind
// von Anfang an erhältlich, Giga-Mate und Mate-Mate erst in den großen Kiosken
// der späteren Städte.
gegenstand('Mate', 'heilung', 200, 'trank', { kp: 20 },
  'Kalt, koffeinhaltig, heilt 20 Kraftpunkte.');
gegenstand('Super-Mate', 'heilung', 500, 'trank', { kp: 50 },
  'Zwei auf einmal. Heilt 50 Kraftpunkte.');
gegenstand('Giga-Mate', 'heilung', 1200, 'trank', { kp: 80 },
  'Nicht mehr ganz legal. Heilt 80 Kraftpunkte.');
gegenstand('Mate-Mate', 'heilung', 2500, 'pille', { kp: 999 },
  'Volle Dröhnung. Stellt alle Kraftpunkte wieder her.');
gegenstand('Defibrillator', 'beleben', 1500, 'pille', { beleben: 0.5 },
  'Bringt ein umgekipptes Hardtekkmon mit halber Kraft zurück.');
gegenstand('Schwarzer Defibrillator', 'beleben', 3500, 'pille', { beleben: 1 },
  'Bringt ein umgekipptes Hardtekkmon mit voller Kraft zurück.');

// --- Levelaufstieg ---------------------------------------------------------------
gegenstand('Roter Lolli', 'levelauf', 5000, 'pille', { stufen: 1 },
  'Scharf, süß, sofort spürbar: Ein Hardtekkmon, das ihn bekommt, geht um eine Stufe hoch.');

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
gegenstand('Boxenkondensator', 'kampfhilfe', 400, 'pille', { werte: { ver: 1 } },
  'Puffert die Wucht ab: Verteidigung steigt im Kampf.');
gegenstand('Subwoofer-Kern', 'kampfhilfe', 400, 'pille', { werte: { spa: 1 } },
  'Mehr Druck aus dem Bass: Spezial-Angriff steigt im Kampf.');

// --- Anlegbare Spezialitems ----------------------------------------------------
// Anders als alle bisherigen Gegenstände werden diese nicht verbraucht,
// sondern einem Hardtekkmon dauerhaft zum Tragen gegeben (siehe Teamszene).
// Von jedem gibt es im ganzen Spiel nur ein einziges Exemplar, nirgends
// käuflich – reine Fundstücke auf den Routen.
gegenstand('EP-Teiler', 'anlege', 0, 'karte', {},
  'Wer das trägt, bekommt die Hälfte der Erfahrung aus jedem Kampf ab – auch ohne dabei zu sein. Die andere Hälfte bekommt weiterhin, wer tatsächlich kämpft.');

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
  return ['fang', 'heilung', 'status', 'beleben', 'levelauf', 'kampfhilfe'].includes(eintrag.art);
}

/** Kann der Gegenstand außerhalb des Kampfes benutzt werden? */
export function ausserhalbNutzbar(name) {
  const eintrag = GEGENSTAENDE[name];
  if (!eintrag) return false;
  return ['heilung', 'status', 'beleben', 'levelauf'].includes(eintrag.art);
}

/** Kann der Gegenstand einem Hardtekkmon dauerhaft zum Tragen gegeben werden? */
export function anlegbar(name) {
  return GEGENSTAENDE[name]?.art === 'anlege';
}

/** Sortierreihenfolge im Beutel. */
export const BEUTEL_REIHENFOLGE = [
  'fang', 'heilung', 'status', 'beleben', 'levelauf', 'kampfhilfe', 'anlege', 'schluessel',
];
