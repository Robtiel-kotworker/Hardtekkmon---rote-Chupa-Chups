// ============================================================================
// Bildschirm
// ----------------------------------------------------------------------------
// Alles wird in der festen Auflösung 240x160 gezeichnet – der Auflösung der
// klassischen Handheld-Vorlage. Die Skalierung auf die tatsächliche
// Bildschirmgröße übernimmt ausschließlich CSS, dadurch bleibt der Pixel-Look
// erhalten und im Spielcode gibt es nur ein einziges Koordinatensystem.
// ============================================================================

export const BREITE = 240;
export const HOEHE = 160;

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('screen'));
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d', { alpha: false }));

ctx.imageSmoothingEnabled = false;

/**
 * Legt eine Offscreen-Zeichenfläche an (für vorgerenderte Karten, Sprites …).
 * @param {number} breite
 * @param {number} hoehe
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
 */
export function neueFlaeche(breite, hoehe) {
  const flaeche = document.createElement('canvas');
  flaeche.width = Math.max(1, Math.round(breite));
  flaeche.height = Math.max(1, Math.round(hoehe));
  const flaechenCtx = /** @type {CanvasRenderingContext2D} */ (flaeche.getContext('2d'));
  flaechenCtx.imageSmoothingEnabled = false;
  return { canvas: flaeche, ctx: flaechenCtx };
}

/**
 * Füllt den kompletten Bildschirm mit einer Farbe.
 * @param {string} farbe
 */
export function loesche(farbe = '#000000') {
  ctx.fillStyle = farbe;
  ctx.fillRect(0, 0, BREITE, HOEHE);
}

export { canvas, ctx };
