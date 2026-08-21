// ============================================================================
// Figuren
// ----------------------------------------------------------------------------
// Spieler und alle nicht spielbaren Figuren nutzen dieselbe Zeichenroutine.
// Eine Figur wird durch fünf Farben und ein optionales Kopfteil beschrieben;
// daraus entsteht ein Bogen mit vier Blickrichtungen à drei Laufbildern.
// ============================================================================

import { neueFlaeche } from '../engine/screen.js';
import { dunkler } from './farbwerkzeug.js';

export const FIGUR_BREITE = 16;
export const FIGUR_HOEHE = 22;
/** Überstand nach oben: die Figur ist höher als eine Kachel. */
export const FIGUR_UEBERSTAND = FIGUR_HOEHE - 16;

export const RICHTUNGEN = ['unten', 'oben', 'links', 'rechts'];

/**
 * Aussehen der Figuren. Wird über den Schlüssel in den Kartendaten referenziert.
 * @type {Record<string, { haut: string, haar: string, oberteil: string, hose: string, akzent?: string, kopfteil?: 'kappe'|'kopfhoerer'|'kapuze'|'glatze'|'zylinder' }>}
 */
export const FIGUREN = {
  spieler: { haut: '#f0c090', haar: '#3a2a1c', oberteil: '#e04058', hose: '#2c3a68', akzent: '#f0f0f0', kopfteil: 'kappe' },
  rivale: { haut: '#f0c090', haar: '#c85028', oberteil: '#404058', hose: '#282838', akzent: '#90f0d0', kopfteil: 'kopfhoerer' },
  professor: { haut: '#f0c090', haar: '#d8d8e0', oberteil: '#f0f0f8', hose: '#8a8a98', kopfteil: 'glatze' },
  junge: { haut: '#f0c090', haar: '#402c18', oberteil: '#4878c8', hose: '#38445c' },
  maedchen: { haut: '#f8d0a0', haar: '#b04828', oberteil: '#f078a8', hose: '#584068' },
  raver: { haut: '#e8b888', haar: '#f050a0', oberteil: '#20d0c0', hose: '#181820', kopfteil: 'kopfhoerer' },
  punk: { haut: '#e0b080', haar: '#98d030', oberteil: '#282830', hose: '#3a3a48', kopfteil: 'kappe' },
  techniker: { haut: '#d8a878', haar: '#282828', oberteil: '#f0a030', hose: '#404048', kopfteil: 'kappe' },
  opa: { haut: '#e8c8a0', haar: '#d0d0d0', oberteil: '#7a6a58', hose: '#4a4038', kopfteil: 'glatze' },
  oma: { haut: '#e8c8a0', haar: '#c8c8d8', oberteil: '#a05888', hose: '#585068' },
  kumpel: { haut: '#c89060', haar: '#201810', oberteil: '#508050', hose: '#303840', kopfteil: 'kapuze' },
  wirt: { haut: '#f0c090', haar: '#582818', oberteil: '#f0f0f0', hose: '#282828' },
  schrauber: { haut: '#d0a070', haar: '#403020', oberteil: '#3a5a8a', hose: '#2a2a32', kopfteil: 'kappe' },
  gigleiter: { haut: '#f0c090', haar: '#f0d030', oberteil: '#c02848', hose: '#181820', kopfteil: 'zylinder' },
  wache: { haut: '#e8b888', haar: '#282828', oberteil: '#181828', hose: '#181828', kopfteil: 'kappe' },
  schwester: { haut: '#f8d0a0', haar: '#f07898', oberteil: '#f8f8f8', hose: '#f8f8f8' },
  verkaeufer: { haut: '#f0c090', haar: '#403028', oberteil: '#4878c8', hose: '#303848' },
  zombie: { haut: '#a8c090', haar: '#4a4a58', oberteil: '#585048', hose: '#38383a' },
};

/** @type {Map<string, HTMLCanvasElement>} */
const boegen = new Map();

function rechteck(ctx, farbe, x, y, breite, hoehe) {
  ctx.fillStyle = farbe;
  ctx.fillRect(x, y, breite, hoehe);
}

/** Kopfbedeckung – wird über Haar und Kopf gelegt. */
function kopfteil(ctx, figur, richtung) {
  const akzent = figur.akzent ?? figur.oberteil;
  switch (figur.kopfteil) {
    case 'kappe':
      rechteck(ctx, akzent, 3, 0, 10, 3);
      if (richtung === 'unten') rechteck(ctx, dunkler(akzent, 0.3), 3, 3, 10, 1);
      if (richtung === 'links') rechteck(ctx, dunkler(akzent, 0.3), 1, 2, 4, 1);
      if (richtung === 'rechts') rechteck(ctx, dunkler(akzent, 0.3), 11, 2, 4, 1);
      break;
    case 'kopfhoerer':
      rechteck(ctx, '#282830', 3, 0, 10, 2);
      rechteck(ctx, '#404050', 2, 2, 2, 4);
      rechteck(ctx, '#404050', 12, 2, 2, 4);
      break;
    case 'kapuze':
      rechteck(ctx, dunkler(figur.oberteil, 0.2), 2, 0, 12, 6);
      if (richtung !== 'oben') rechteck(ctx, figur.haut, 5, 3, 6, 4);
      break;
    case 'zylinder':
      rechteck(ctx, '#181820', 4, 0, 8, 3);
      rechteck(ctx, '#181820', 2, 3, 12, 1);
      rechteck(ctx, figur.akzent ?? '#e04058', 4, 2, 8, 1);
      break;
    case 'glatze':
      rechteck(ctx, figur.haut, 4, 1, 8, 3);
      rechteck(ctx, figur.haar, 3, 3, 2, 3);
      rechteck(ctx, figur.haar, 11, 3, 2, 3);
      break;
    default:
      break;
  }
}

/**
 * Zeichnet ein einzelnes Laufbild.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} figur
 * @param {string} richtung
 * @param {number} bild 0 = Stand, 1/2 = Schritt
 */
function zeichneFigur(ctx, figur, richtung, bild) {
  const schuh = '#282830';
  const hoseDunkel = dunkler(figur.hose, 0.25);
  const seitlich = richtung === 'links' || richtung === 'rechts';
  const versatz = bild === 1 ? 1 : bild === 2 ? -1 : 0;

  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(4, 20, 8, 2);

  // Beine
  if (seitlich) {
    rechteck(ctx, figur.hose, 6, 15, 4, 5);
    rechteck(ctx, hoseDunkel, 6 + versatz, 15, 4, 5);
    rechteck(ctx, schuh, 5 + versatz * 2, 19, 6, 2);
  } else {
    rechteck(ctx, figur.hose, 5, 15, 3, 5 + Math.max(0, versatz));
    rechteck(ctx, figur.hose, 8, 15, 3, 5 - Math.min(0, versatz));
    rechteck(ctx, schuh, 5, 19 + Math.max(0, versatz), 3, 2);
    rechteck(ctx, schuh, 8, 19 - Math.min(0, versatz), 3, 2);
  }

  // Rumpf und Arme
  if (seitlich) {
    rechteck(ctx, figur.oberteil, 5, 8, 6, 8);
    rechteck(ctx, dunkler(figur.oberteil, 0.2), richtung === 'links' ? 4 : 10, 9, 2, 5);
    rechteck(ctx, figur.haut, richtung === 'links' ? 4 : 10, 13, 2, 2);
  } else {
    rechteck(ctx, figur.oberteil, 4, 8, 8, 8);
    rechteck(ctx, dunkler(figur.oberteil, 0.2), 2, 9, 2, 5);
    rechteck(ctx, dunkler(figur.oberteil, 0.2), 12, 9, 2, 5);
    rechteck(ctx, figur.haut, 2, 13, 2, 2);
    rechteck(ctx, figur.haut, 12, 13, 2, 2);
  }

  // Kopf
  rechteck(ctx, figur.haut, 4, 2, 8, 7);
  rechteck(ctx, figur.haar, 3, 0, 10, 3);
  rechteck(ctx, figur.haar, 3, 3, 1, 3);
  rechteck(ctx, figur.haar, 12, 3, 1, 3);

  if (richtung === 'oben') {
    rechteck(ctx, figur.haar, 3, 0, 10, 7);
  } else if (seitlich) {
    rechteck(ctx, figur.haar, richtung === 'links' ? 3 : 6, 0, 7, 4);
    rechteck(ctx, '#201820', richtung === 'links' ? 5 : 10, 5, 1, 2);
  } else {
    rechteck(ctx, '#201820', 5, 5, 2, 2);
    rechteck(ctx, '#201820', 9, 5, 2, 2);
  }

  kopfteil(ctx, figur, richtung);
}

/**
 * Liefert den Bilderbogen einer Figur (4 Richtungen × 3 Laufbilder).
 * @param {string} schluessel
 */
export function figurenBogen(schluessel) {
  const vorhanden = boegen.get(schluessel);
  if (vorhanden) return vorhanden;

  const figur = FIGUREN[schluessel] ?? FIGUREN.junge;
  const { canvas, ctx } = neueFlaeche(FIGUR_BREITE * 3, FIGUR_HOEHE * RICHTUNGEN.length);

  RICHTUNGEN.forEach((richtung, zeile) => {
    for (let bild = 0; bild < 3; bild += 1) {
      ctx.save();
      ctx.translate(bild * FIGUR_BREITE, zeile * FIGUR_HOEHE);
      zeichneFigur(ctx, figur, richtung, bild);
      ctx.restore();
    }
  });

  boegen.set(schluessel, canvas);
  return canvas;
}

/**
 * Zeichnet eine Figur an eine Bildschirmposition.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} schluessel Figurenart
 * @param {string} richtung
 * @param {number} bild 0..2
 * @param {number} x linke Kante der Kachel
 * @param {number} y obere Kante der Kachel
 */
export function zeichneMensch(ctx, schluessel, richtung, bild, x, y) {
  const bogen = figurenBogen(schluessel);
  const zeile = Math.max(0, RICHTUNGEN.indexOf(richtung));
  ctx.drawImage(
    bogen,
    bild * FIGUR_BREITE, zeile * FIGUR_HOEHE, FIGUR_BREITE, FIGUR_HOEHE,
    Math.round(x), Math.round(y - FIGUR_UEBERSTAND), FIGUR_BREITE, FIGUR_HOEHE,
  );
}
