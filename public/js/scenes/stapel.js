// ============================================================================
// Szenenstapel
// ----------------------------------------------------------------------------
// Immer nur die oberste Szene bekommt Eingaben und rechnet. Gezeichnet wird
// von der letzten deckenden Szene an aufwärts – so kann ein Menü über der Welt
// liegen, ohne dass die Welt darunter weiterläuft.
// ============================================================================

/**
 * @typedef {{
 *   ueberlagernd?: boolean,
 *   betreten?: () => void,
 *   verlassen?: () => void,
 *   aktualisieren: () => void,
 *   zeichnen: (ctx: CanvasRenderingContext2D) => void,
 * }} Szene
 */

/** @type {Szene[]} */
const stapel = [];

/** @param {Szene} szene */
export function schiebe(szene) {
  stapel.push(szene);
  szene.betreten?.();
}

export function poppe() {
  const szene = stapel.pop();
  szene?.verlassen?.();
  return szene ?? null;
}

/** Ersetzt den kompletten Stapel. */
export function ersetze(szene) {
  while (stapel.length) poppe();
  schiebe(szene);
}

export function aktuelleSzene() {
  return stapel[stapel.length - 1] ?? null;
}

/** Szene unterhalb der obersten – z. B. die Welt unter einem Menü. */
export function darunter() {
  return stapel[stapel.length - 2] ?? null;
}

export function aktualisiereStapel() {
  aktuelleSzene()?.aktualisieren();
}

export function zeichneStapel(ctx) {
  let start = stapel.length - 1;
  while (start > 0 && stapel[start].ueberlagernd) start -= 1;
  for (let i = Math.max(0, start); i < stapel.length; i += 1) stapel[i].zeichnen(ctx);
}

export function stapelTiefe() {
  return stapel.length;
}
