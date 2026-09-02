// ============================================================================
// Pixelschrift
// ----------------------------------------------------------------------------
// Eine 5x7-Bitmapschrift, direkt im Quelltext als Punktbild notiert: "#" ist
// ein gesetztes Pixel, "." ein leeres, "/" trennt die Zeilen. Beim Start
// werden daraus einmalig Zeichensätze in den benötigten Farben gerendert;
// gezeichnet wird danach nur noch mit drawImage.
// ============================================================================

import { neueFlaeche } from '../engine/screen.js';

const ZEICHEN_HOEHE = 7;
const ABSTAND = 1;
const LEERZEICHEN_BREITE = 3;

/** @type {Record<string, string>} */
const GLYPHEN = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/####./#...#/#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.###.',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '#####/..#../..#../..#../..#../..#../#####',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#...#/#...#/#...#/#...#',
  N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#...#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  a: '...../...../.###./....#/.####/#...#/.####',
  b: '#..../#..../####./#...#/#...#/#...#/####.',
  c: '...../...../.###./#..../#..../#...#/.###.',
  d: '....#/....#/.####/#...#/#...#/#...#/.####',
  e: '...../...../.###./#...#/#####/#..../.###.',
  f: '..##./.#.../.#.../####./.#.../.#.../.#...',
  g: '...../.####/#...#/#...#/.####/....#/.###.',
  h: '#..../#..../####./#...#/#...#/#...#/#...#',
  i: '#/./#/#/#/#/#',
  j: '..#./..../..#./..#./..#./#.#./.##.',
  k: '#..../#..../#..#./#.#../##.../#.#../#..#.',
  l: '##/.#/.#/.#/.#/.#/.#',
  m: '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
  n: '...../...../####./#...#/#...#/#...#/#...#',
  o: '...../...../.###./#...#/#...#/#...#/.###.',
  p: '...../####./#...#/#...#/####./#..../#....',
  q: '...../.####/#...#/#...#/.####/....#/....#',
  r: '...../...../#.##./##..#/#..../#..../#....',
  s: '...../...../.####/#..../.###./....#/####.',
  t: '.#.../.#.../####./.#.../.#.../.#..#/..##.',
  u: '...../...../#...#/#...#/#...#/#..##/.##.#',
  v: '...../...../#...#/#...#/#...#/.#.#./..#..',
  w: '...../...../#...#/#...#/#.#.#/#.#.#/.#.#.',
  x: '...../...../#...#/.#.#./..#../.#.#./#...#',
  y: '...../#...#/#...#/#...#/.####/....#/.###.',
  z: '...../...../#####/...#./..#../.#.../#####',
  'Ä': '#...#/.###./#...#/#...#/#####/#...#/#...#',
  'Ö': '#...#/.###./#...#/#...#/#...#/#...#/.###.',
  'Ü': '#...#/...../#...#/#...#/#...#/#...#/.###.',
  'ä': '#.#../...../.###./....#/.####/#...#/.####',
  'ö': '#.#../...../.###./#...#/#...#/#...#/.###.',
  'ü': '#.#../...../#...#/#...#/#...#/#..##/.##.#',
  'ß': '.##../#..#./#..#./#.##./#...#/#...#/####.',
  0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  1: '..#../.##../..#../..#../..#../..#../.###.',
  2: '.###./#...#/....#/...#./..#../.#.../#####',
  3: '####./....#/....#/.###./....#/....#/####.',
  4: '...#./..##./.#.#./#..#./#####/...#./...#.',
  5: '#####/#..../####./....#/....#/#...#/.###.',
  6: '..##./.#.../#..../####./#...#/#...#/.###.',
  7: '#####/....#/...#./..#../.#.../.#.../.#...',
  8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
  9: '.###./#...#/#...#/.####/....#/...#./.##..',
  '.': '../../../../../##/##',
  ',': '../../../../.#/.#/#.',
  '!': '#/#/#/#/#/./#',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  "'": '#/#/./././././',
  '"': '#.#/#.#/.../.../.../.../...',
  '-': '...../...../...../#####/...../...../.....',
  // Gedankenstriche. Ohne sie fiele jeder Halbsatz mit "–" auf das
  // Ersatzzeichen zurück – und davon gibt es in Tekkdex, Attacken,
  // Gegenständen und Dialogen reichlich.
  '–': '....../....../....../######/....../....../......',
  '—': '......./......./......./#######/......./......./.......',
  '_': '...../...../...../...../...../...../#####',
  ':': '../##/##/../##/##/..',
  ';': '../##/##/../##/.#/#.',
  '/': '....#/....#/...#./..#../.#.../#..../#....',
  '(': '..#/.#./#../#../#../.#./..#',
  ')': '#../.#./..#/..#/..#/.#./#..',
  '[': '###/#../#../#../#../#../###',
  ']': '###/..#/..#/..#/..#/..#/###',
  '+': '...../..#../..#../#####/..#../..#../.....',
  '=': '...../...../#####/...../#####/...../.....',
  '<': '..#/.#./#../#../#../.#./..#',
  '>': '#../.#./..#/..#/..#/.#./#..',
  '%': '##..#/##.#./...#./..#../.#.../#.##./#..##',
  '&': '.##../#..#./#..#./.##../#.#.#/#..#./.##.#',
  '*': '...../#.#.#/.###./#####/.###./#.#.#/.....',
  '#': '.#.#./#####/.#.#./.#.#./#####/.#.#./.....',
  '×': '...../#...#/.#.#./..#../.#.#./#...#/.....',
  '°': '##/##/../../../../..',
  '…': '........./........./........./........./........./#.#.#/#.#.#',
  '♪': '..##./..##./..#.#/..#.#/###.#/###../.....',
  '★': '..#../..#../#####/.###./.###./#...#/.....',
  '♥': '.#.#./#####/#####/#####/.###./..#../.....',
  '▶': '#..../##.../###../####./###../##.../#....',
  '▲': '..#../..#../.###./.###./#####/#####/.....',
  '▼': '...../#####/#####/.###./.###./..#../.....',
  '↑': '..#../.###./#.#.#/..#../..#../..#../.....',
  '↓': '...../..#../..#../..#../#.#.#/.###./..#..',
  '←': '..#../.#.../#####/.#.../..#../...../.....',
  '→': '..#../...#./#####/...#./..#../...../.....',
};

/** Vorbereitete Glyphen: getrimmtes Punktbild plus Breite. */
const AUFBEREITET = new Map();

for (const [zeichen, muster] of Object.entries(GLYPHEN)) {
  const zeilen = muster.split('/');
  const breite = Math.max(...zeilen.map((zeile) => zeile.length));
  AUFBEREITET.set(zeichen, { zeilen, breite });
}

/** Zeichensätze je Farbe – einmal gerendert, danach nur noch kopiert. */
const SAETZE = new Map();

/**
 * @param {string} farbe
 * @returns {{ canvas: HTMLCanvasElement, plaetze: Map<string, {x: number, breite: number}> }}
 */
function satz(farbe) {
  const vorhanden = SAETZE.get(farbe);
  if (vorhanden) return vorhanden;

  let gesamtBreite = 0;
  for (const { breite } of AUFBEREITET.values()) gesamtBreite += breite + ABSTAND;

  const { canvas, ctx } = neueFlaeche(gesamtBreite, ZEICHEN_HOEHE);
  ctx.fillStyle = farbe;

  const plaetze = new Map();
  let x = 0;
  for (const [zeichen, { zeilen, breite }] of AUFBEREITET) {
    plaetze.set(zeichen, { x, breite });
    for (let zeile = 0; zeile < zeilen.length; zeile += 1) {
      const inhalt = zeilen[zeile];
      for (let spalte = 0; spalte < inhalt.length; spalte += 1) {
        if (inhalt[spalte] === '#') ctx.fillRect(x + spalte, zeile, 1, 1);
      }
    }
    x += breite + ABSTAND;
  }

  const neuerSatz = { canvas, plaetze };
  SAETZE.set(farbe, neuerSatz);
  return neuerSatz;
}

/**
 * Breite eines Zeichens inklusive Zeichenabstand.
 * @param {string} zeichen
 */
function zeichenBreite(zeichen) {
  if (zeichen === ' ') return LEERZEICHEN_BREITE + ABSTAND;
  const glyphe = AUFBEREITET.get(zeichen);
  return (glyphe ? glyphe.breite : 5) + ABSTAND;
}

/**
 * Breite eines Textes in Pixeln.
 * @param {string} text
 */
export function textBreite(text) {
  let breite = 0;
  for (const zeichen of text) breite += zeichenBreite(zeichen);
  return Math.max(0, breite - ABSTAND);
}

/**
 * Zeichnet Text und liefert die belegte Breite.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y obere Kante
 * @param {{ farbe?: string, schatten?: string|null }} [optionen]
 */
export function zeichneText(ctx, text, x, y, optionen = {}) {
  const farbe = optionen.farbe ?? '#282838';
  const schatten = optionen.schatten ?? null;

  if (schatten) zeichneRoh(ctx, text, x + 1, y + 1, schatten);
  zeichneRoh(ctx, text, x, y, farbe);
  return textBreite(text);
}

function zeichneRoh(ctx, text, x, y, farbe) {
  const { canvas, plaetze } = satz(farbe);
  let stift = Math.round(x);
  const oben = Math.round(y);

  for (const zeichen of text) {
    if (zeichen === ' ') {
      stift += LEERZEICHEN_BREITE + ABSTAND;
      continue;
    }
    const platz = plaetze.get(zeichen) ?? plaetze.get('?');
    if (platz) {
      ctx.drawImage(
        canvas,
        platz.x, 0, platz.breite, ZEICHEN_HOEHE,
        stift, oben, platz.breite, ZEICHEN_HOEHE,
      );
      stift += platz.breite + ABSTAND;
    }
  }
}

/**
 * Bricht Text an Wortgrenzen auf eine maximale Zeilenbreite um.
 * @param {string} text
 * @param {number} maxBreite
 * @returns {string[]}
 */
export function umbrechen(text, maxBreite) {
  const zeilen = [];
  for (const absatz of text.split('\n')) {
    let aktuell = '';
    for (const wort of absatz.split(' ')) {
      const versuch = aktuell ? `${aktuell} ${wort}` : wort;
      if (textBreite(versuch) <= maxBreite || !aktuell) {
        aktuell = versuch;
      } else {
        zeilen.push(aktuell);
        aktuell = wort;
      }
    }
    zeilen.push(aktuell);
  }
  return zeilen;
}

export { ZEICHEN_HOEHE };
