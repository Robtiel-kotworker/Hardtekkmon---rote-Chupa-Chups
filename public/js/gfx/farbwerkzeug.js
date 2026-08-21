// ============================================================================
// Farbwerkzeug
// ----------------------------------------------------------------------------
// Aus einer Grundfarbe werden Licht- und Schattentöne abgeleitet, damit
// prozedurale Sprites mit nur einer Angabe je Hardtekkmon auskommen.
// ============================================================================

/** @param {string} hex z. B. "#d85030" */
function zerlege(hex) {
  const wert = parseInt(hex.slice(1), 16);
  return { r: (wert >> 16) & 255, g: (wert >> 8) & 255, b: wert & 255 };
}

function baue({ r, g, b }) {
  const klemme = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) + (klemme(r) << 16) + (klemme(g) << 8) + klemme(b)).toString(16).slice(1)}`;
}

/** @param {string} hex @param {number} anteil 0..1 */
export function heller(hex, anteil) {
  const { r, g, b } = zerlege(hex);
  return baue({
    r: r + (255 - r) * anteil,
    g: g + (255 - g) * anteil,
    b: b + (255 - b) * anteil,
  });
}

/** @param {string} hex @param {number} anteil 0..1 */
export function dunkler(hex, anteil) {
  const { r, g, b } = zerlege(hex);
  return baue({ r: r * (1 - anteil), g: g * (1 - anteil), b: b * (1 - anteil) });
}

/** Mischt zwei Farben. @param {number} anteil 0 = a, 1 = b */
export function mische(a, b, anteil) {
  const farbeA = zerlege(a);
  const farbeB = zerlege(b);
  return baue({
    r: farbeA.r + (farbeB.r - farbeA.r) * anteil,
    g: farbeA.g + (farbeB.g - farbeA.g) * anteil,
    b: farbeA.b + (farbeB.b - farbeA.b) * anteil,
  });
}
