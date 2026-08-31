// ============================================================================
// Hardtekkmon-Sprites
// ----------------------------------------------------------------------------
// Jedes der 151 Hardtekkmon wird zur Laufzeit aus seinem Namen erzeugt: der
// Name liefert die Aussaat, daraus folgen Bauart, Gliedmaßen, Gesicht und
// Zubehör. Gezeichnet wird zuerst in ein 28x28-Pixelraster; danach laufen zwei
// automatische Durchgänge darüber – Schattierung (Licht von oben links) und
// Umriss. Erst dann wird das Raster vergrößert ausgegeben.
//
// Eine Ausnahme: Roter Chupa Chups, das Maskottchen-Legendäre, hat ein
// festes Bild statt einer prozeduralen Zeichnung (siehe CHUPA_CHUPS_BILD
// unten). Das Referenzbild zeigt nur einen Blickwinkel, deshalb zeigen
// front/rueck/klein notgedrungen alle dasselbe Bild – für die anderen 150
// Arten unterscheidet sich die Rückenansicht sonst von der Vorderansicht.
// ============================================================================

import { neueFlaeche } from '../engine/screen.js';
import { generator, saatAusText } from '../engine/rng.js';
import { TYP_FARBEN } from './palette.js';
import { heller, dunkler, mische } from './farbwerkzeug.js';

const RASTER = 28;
const UMRISS = '#201820';

class Pixelraster {
  constructor(groesse) {
    this.groesse = groesse;
    /** @type {(string|null)[]} */
    this.daten = new Array(groesse * groesse).fill(null);
    /** @type {Set<number>} */
    this.geschuetzt = new Set();
  }

  index(x, y) {
    return y * this.groesse + x;
  }

  innen(x, y) {
    return x >= 0 && y >= 0 && x < this.groesse && y < this.groesse;
  }

  hole(x, y) {
    return this.innen(x, y) ? this.daten[this.index(x, y)] : null;
  }

  setze(x, y, farbe, schuetzen = false) {
    if (!this.innen(x, y)) return;
    const i = this.index(x, y);
    this.daten[i] = farbe;
    if (schuetzen) this.geschuetzt.add(i);
  }

  kasten(x, y, breite, hoehe, farbe, schuetzen = false) {
    for (let dy = 0; dy < hoehe; dy += 1) {
      for (let dx = 0; dx < breite; dx += 1) {
        this.setze(x + dx, y + dy, farbe, schuetzen);
      }
    }
  }

  oval(cx, cy, rx, ry, farbe, schuetzen = false) {
    for (let y = Math.ceil(cy - ry); y <= cy + ry; y += 1) {
      for (let x = Math.ceil(cx - rx); x <= cx + rx; x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.02) this.setze(x, y, farbe, schuetzen);
      }
    }
  }

  dreieck(x0, y0, x1, y1, x2, y2, farbe) {
    const minX = Math.min(x0, x1, x2);
    const maxX = Math.max(x0, x1, x2);
    const minY = Math.min(y0, y1, y2);
    const maxY = Math.max(y0, y1, y2);
    const flaeche = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (flaeche === 0) return;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const a = ((x1 - x) * (y2 - y) - (x2 - x) * (y1 - y)) / flaeche;
        const b = ((x2 - x) * (y0 - y) - (x0 - x) * (y2 - y)) / flaeche;
        const c = 1 - a - b;
        if (a >= -0.02 && b >= -0.02 && c >= -0.02) this.setze(x, y, farbe);
      }
    }
  }

  linie(x0, y0, x1, y1, farbe, dicke = 1) {
    const schritte = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= schritte; i += 1) {
      const t = schritte === 0 ? 0 : i / schritte;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      this.kasten(x, y, dicke, dicke, farbe);
    }
  }

  /** Licht von oben links: freiliegende Oberkanten aufhellen, Unterkanten abdunkeln. */
  schattiere() {
    const original = [...this.daten];
    const hellCache = new Map();
    const dunkelCache = new Map();

    for (let y = 0; y < this.groesse; y += 1) {
      for (let x = 0; x < this.groesse; x += 1) {
        const i = this.index(x, y);
        const farbe = original[i];
        if (!farbe || this.geschuetzt.has(i)) continue;

        const obenLeerP = !original[this.index(x, Math.max(0, y - 1))] || y === 0;
        const untenLeer = y === this.groesse - 1 || !original[this.index(x, y + 1)];

        if (obenLeerP) {
          if (!hellCache.has(farbe)) hellCache.set(farbe, heller(farbe, 0.32));
          this.daten[i] = hellCache.get(farbe);
        } else if (untenLeer) {
          if (!dunkelCache.has(farbe)) dunkelCache.set(farbe, dunkler(farbe, 0.3));
          this.daten[i] = dunkelCache.get(farbe);
        }
      }
    }
  }

  /** Legt einen dunklen Rand um die gesamte Silhouette. */
  umrande() {
    const original = [...this.daten];
    for (let y = 0; y < this.groesse; y += 1) {
      for (let x = 0; x < this.groesse; x += 1) {
        if (original[this.index(x, y)]) continue;
        const nachbarn = [
          this.innen(x, y - 1) && original[this.index(x, y - 1)],
          this.innen(x, y + 1) && original[this.index(x, y + 1)],
          this.innen(x - 1, y) && original[this.index(x - 1, y)],
          this.innen(x + 1, y) && original[this.index(x + 1, y)],
        ];
        if (nachbarn.some(Boolean)) this.setze(x, y, UMRISS);
      }
    }
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} skala
   */
  male(ctx, skala) {
    for (let y = 0; y < this.groesse; y += 1) {
      for (let x = 0; x < this.groesse; x += 1) {
        const farbe = this.daten[this.index(x, y)];
        if (!farbe) continue;
        ctx.fillStyle = farbe;
        ctx.fillRect(x * skala, y * skala, skala, skala);
      }
    }
  }
}

const BAUARTEN = ['knolle', 'vierbeiner', 'zweibeiner', 'flieger', 'wurm', 'maschine', 'geist', 'gestalt'];
const AUGEN = ['normal', 'schmal', 'kreuz', 'brille', 'gross', 'ringe'];
const MUND = ['grinsen', 'zaehne', 'offen', 'strich', 'zunge'];
const ZUSATZ = ['kopfhoerer', 'antenne', 'horn', 'kappe', 'zacken', 'ohren', 'kabel', 'nichts'];

/**
 * Leitet das Aussehen aus Name und Typen ab.
 * @param {{ id: number, name: string, typen: string[] }} art
 */
function bauplan(art) {
  const rnd = generator(saatAusText(`${art.name}#${art.id}`));
  const grund = TYP_FARBEN[art.typen[0]] ?? '#888888';
  const zweit = TYP_FARBEN[art.typen[1] ?? art.typen[0]] ?? grund;

  return {
    rnd,
    bauart: BAUARTEN[Math.floor(rnd() * BAUARTEN.length)],
    haut: mische(grund, '#ffffff', 0.12),
    bauch: heller(grund, 0.45),
    akzent: mische(zweit, '#ffffff', 0.2),
    dunkel: dunkler(grund, 0.35),
    augen: AUGEN[Math.floor(rnd() * AUGEN.length)],
    mund: MUND[Math.floor(rnd() * MUND.length)],
    zusatz: ZUSATZ[Math.floor(rnd() * ZUSATZ.length)],
    groesse: 0.85 + rnd() * 0.3,
  };
}

/** Körper je Bauart. Liefert die Kopfmitte für Gesicht und Zubehör. */
function zeichneKoerper(raster, plan) {
  const { rnd, haut, bauch, akzent, dunkel } = plan;
  const mitte = 14;

  switch (plan.bauart) {
    case 'knolle': {
      const ry = Math.round(7 * plan.groesse);
      raster.oval(mitte, 19, 9, ry, haut);
      raster.oval(mitte, 21, 5, 4, bauch);
      raster.oval(mitte, 10, 7, 6, haut);
      raster.kasten(9, 25, 3, 3, dunkel);
      raster.kasten(17, 25, 3, 3, dunkel);
      return { kopfX: mitte, kopfY: 10, kopfR: 6 };
    }
    case 'vierbeiner': {
      raster.oval(13, 17, 9, 5, haut);
      raster.oval(13, 19, 6, 3, bauch);
      for (const x of [6, 10, 16, 20]) raster.kasten(x, 21, 3, 6, dunkel);
      raster.oval(21, 11, 5, 5, haut);
      raster.linie(4, 16, 1, 10, akzent, 2);
      return { kopfX: 21, kopfY: 11, kopfR: 5 };
    }
    case 'zweibeiner': {
      raster.kasten(10, 21, 3, 7, dunkel);
      raster.kasten(16, 21, 3, 7, dunkel);
      raster.oval(mitte, 18, 6, 7, haut);
      raster.oval(mitte, 19, 3, 4, bauch);
      raster.linie(8, 15, 4, 20, haut, 2);
      raster.linie(20, 15, 24, 20, haut, 2);
      raster.oval(mitte, 8, 6, 6, haut);
      return { kopfX: mitte, kopfY: 8, kopfR: 6 };
    }
    case 'flieger': {
      raster.dreieck(11, 13, 1, 6, 3, 18, akzent);
      raster.dreieck(17, 13, 27, 6, 25, 18, akzent);
      raster.oval(mitte, 16, 5, 6, haut);
      raster.oval(mitte, 18, 3, 3, bauch);
      raster.oval(mitte, 8, 5, 5, haut);
      raster.kasten(12, 24, 2, 3, dunkel);
      raster.kasten(16, 24, 2, 3, dunkel);
      return { kopfX: mitte, kopfY: 8, kopfR: 5 };
    }
    case 'wurm': {
      const glieder = [
        [8, 24, 5], [11, 20, 5], [15, 16, 5], [18, 12, 5],
      ];
      for (const [x, y, r] of glieder) {
        raster.oval(x, y, r, r - 1, haut);
        raster.oval(x, y + 1, r - 3, r - 3, bauch);
      }
      raster.oval(19, 8, 6, 5, haut);
      return { kopfX: 19, kopfY: 8, kopfR: 5 };
    }
    case 'maschine': {
      raster.kasten(6, 13, 17, 13, haut);
      raster.kasten(8, 15, 13, 9, dunkel);
      raster.oval(14, 19, 5, 4, akzent);
      raster.oval(14, 19, 2, 2, bauch);
      raster.kasten(5, 26, 19, 2, dunkel);
      raster.kasten(8, 4, 13, 9, haut);
      return { kopfX: 14, kopfY: 8, kopfR: 5 };
    }
    case 'geist': {
      raster.oval(mitte, 12, 8, 8, haut);
      for (let x = 6; x <= 22; x += 1) {
        const hoehe = 18 + Math.floor(rnd() * 6);
        for (let y = 12; y < hoehe; y += 1) raster.setze(x, y, haut);
      }
      raster.oval(mitte, 14, 4, 3, bauch);
      return { kopfX: mitte, kopfY: 11, kopfR: 7 };
    }
    case 'gestalt':
    default: {
      raster.kasten(11, 22, 3, 6, dunkel);
      raster.kasten(15, 22, 3, 6, dunkel);
      raster.dreieck(14, 9, 6, 24, 22, 24, haut);
      raster.linie(9, 16, 5, 23, akzent, 2);
      raster.linie(19, 16, 23, 23, akzent, 2);
      raster.oval(mitte, 8, 5, 6, haut);
      return { kopfX: mitte, kopfY: 8, kopfR: 5 };
    }
  }
}

function zeichneAugen(raster, plan, kopf) {
  const links = kopf.kopfX - Math.max(2, Math.round(kopf.kopfR * 0.5));
  const rechts = kopf.kopfX + Math.max(2, Math.round(kopf.kopfR * 0.5));
  const y = kopf.kopfY - 1;

  switch (plan.augen) {
    case 'schmal':
      for (const x of [links, rechts]) {
        raster.kasten(x - 2, y, 4, 1, '#f8f8f8', true);
        raster.kasten(x - 1, y, 2, 1, '#201820', true);
      }
      break;
    case 'kreuz':
      for (const x of [links, rechts]) {
        raster.linie(x - 2, y - 2, x + 1, y + 1, '#f04040');
        raster.linie(x + 1, y - 2, x - 2, y + 1, '#f04040');
      }
      break;
    case 'brille':
      raster.kasten(links - 3, y - 1, kopf.kopfR * 2 + 2, 3, '#181820', true);
      raster.kasten(links - 2, y - 1, 3, 1, '#60a8f0', true);
      break;
    case 'gross':
      for (const x of [links, rechts]) {
        raster.oval(x, y, 2.6, 3, '#f8f8f8', true);
        raster.oval(x, y + 1, 1.4, 1.6, '#201820', true);
        raster.setze(x - 1, y - 1, '#f8f8f8', true);
      }
      break;
    case 'ringe':
      for (const x of [links, rechts]) {
        raster.oval(x, y + 1, 2.6, 2.6, '#6a4c7a', true);
        raster.oval(x, y, 2, 2, '#f0e8d8', true);
        raster.kasten(x - 1, y, 2, 2, '#201820', true);
      }
      break;
    case 'normal':
    default:
      for (const x of [links, rechts]) {
        raster.oval(x, y, 2, 2.4, '#f8f8f8', true);
        raster.kasten(x - 1, y, 2, 2, '#201820', true);
      }
      break;
  }
}

function zeichneMund(raster, plan, kopf) {
  const x = kopf.kopfX;
  const y = kopf.kopfY + Math.max(2, kopf.kopfR - 1);

  switch (plan.mund) {
    case 'zaehne':
      raster.kasten(x - 3, y, 7, 3, '#201820', true);
      raster.kasten(x - 2, y, 1, 2, '#f8f8f8', true);
      raster.kasten(x, y, 1, 2, '#f8f8f8', true);
      raster.kasten(x + 2, y, 1, 2, '#f8f8f8', true);
      break;
    case 'offen':
      raster.oval(x, y + 1, 2.6, 2.2, '#201820', true);
      raster.oval(x, y + 2, 1.6, 1, '#e05878', true);
      break;
    case 'strich':
      raster.kasten(x - 2, y + 1, 5, 1, '#201820', true);
      break;
    case 'zunge':
      raster.kasten(x - 2, y, 5, 2, '#201820', true);
      raster.kasten(x, y + 2, 2, 2, '#e05878', true);
      break;
    case 'grinsen':
    default:
      raster.setze(x - 3, y, '#201820', true);
      raster.kasten(x - 2, y + 1, 5, 1, '#201820', true);
      raster.setze(x + 3, y, '#201820', true);
      break;
  }
}

function zeichneZusatz(raster, plan, kopf, rueckseite) {
  const { akzent, dunkel } = plan;
  const x = kopf.kopfX;
  const y = kopf.kopfY;
  const r = kopf.kopfR;

  switch (plan.zusatz) {
    case 'kopfhoerer':
      raster.kasten(x - r - 2, y - 1, 3, 5, '#282830');
      raster.kasten(x + r, y - 1, 3, 5, '#282830');
      for (let i = -r - 1; i <= r + 1; i += 1) {
        raster.setze(x + i, y - r - Math.round(Math.cos((i / (r + 1)) * 1.2) * 2), '#383844');
      }
      break;
    case 'antenne':
      raster.linie(x, y - r - 5, x, y - r, '#c8c8d0');
      raster.oval(x, y - r - 6, 2, 2, akzent);
      break;
    case 'horn':
      raster.dreieck(x - 4, y - r + 1, x - 2, y - r - 5, x, y - r + 1, akzent);
      raster.dreieck(x, y - r + 1, x + 2, y - r - 5, x + 4, y - r + 1, akzent);
      break;
    case 'kappe':
      raster.oval(x, y - r + 1, r + 1, 3, akzent);
      raster.kasten(x - r - 3, y - r + 1, r + 4, 2, dunkel);
      break;
    case 'zacken':
      for (let i = -2; i <= 2; i += 1) {
        raster.dreieck(x + i * 3 - 1, y - r, x + i * 3, y - r - 4, x + i * 3 + 1, y - r, akzent);
      }
      break;
    case 'ohren':
      raster.dreieck(x - r, y - 1, x - r - 2, y - r - 4, x - 1, y - r, plan.haut);
      raster.dreieck(x + r, y - 1, x + r + 2, y - r - 4, x + 1, y - r, plan.haut);
      break;
    case 'kabel':
      raster.linie(x + r, y + 2, x + r + 5, y + 6, '#282830', 2);
      raster.linie(x + r + 5, y + 6, x + r + 4, y + 11, '#282830', 2);
      raster.oval(x + r + 4, y + 12, 2, 2, akzent);
      break;
    case 'nichts':
    default:
      if (rueckseite) raster.kasten(x - 1, y - r, 3, r, dunkel);
      break;
  }
}

/**
 * Baut das Pixelraster eines Hardtekkmon.
 * @param {{ id: number, name: string, typen: string[] }} art
 * @param {boolean} rueckseite Rückenansicht (ohne Gesicht)
 */
function baueRaster(art, rueckseite) {
  const plan = bauplan(art);
  const raster = new Pixelraster(RASTER);
  const kopf = zeichneKoerper(raster, plan);

  raster.schattiere();

  if (rueckseite) {
    // Rückenansicht: statt Gesicht eine angedeutete Rückenzeichnung.
    raster.oval(kopf.kopfX, kopf.kopfY, kopf.kopfR - 2, kopf.kopfR - 2, plan.dunkel, true);
    raster.kasten(kopf.kopfX - 1, kopf.kopfY + kopf.kopfR, 3, 6, plan.dunkel, true);
  } else {
    zeichneAugen(raster, plan, kopf);
    zeichneMund(raster, plan, kopf);
  }

  zeichneZusatz(raster, plan, kopf, rueckseite);
  raster.umrande();
  return raster;
}

/** @type {Map<string, HTMLCanvasElement>} */
const zwischenspeicher = new Map();

const CHUPA_CHUPS_NAME = 'Roter Chupa Chups';

/**
 * Das feste Bild von Roter Chupa Chups. Wird einmalig beim Modulstart
 * angestoßen; bis es geladen ist, greift monSprite() für diese Art auf die
 * prozedurale Zeichnung zurück (praktisch nie sichtbar, da das Bild lange vor
 * dem ersten Aufruf fertig ist – aber ohne Sonderfall gäbe es hier eine
 * Race Condition gegen das erste Zeichnen).
 */
let chupaChupsBild = null;
/** Wird beim ersten Treffer auf den Namen gesetzt, siehe monSprite(). */
let chupaChupsId = null;
(() => {
  const bild = new Image();
  bild.onload = () => {
    chupaChupsBild = bild;
    // Vorher schon prozedural gezeichnete und zwischengespeicherte Sprites
    // dieser Art verwerfen, damit der nächste Aufruf das echte Bild holt.
    for (const schluessel of [...zwischenspeicher.keys()]) {
      if (schluessel.startsWith(`${chupaChupsId}:`)) zwischenspeicher.delete(schluessel);
    }
  };
  bild.src = 'sprites/roter-chupa-chups.png';
})();

/** Bettet das feste Bild seitenverhältnistreu und zentriert in die Zielgröße ein. */
function zeichneChupaChupsBild(skala) {
  const groesse = RASTER * skala;
  const { canvas, ctx } = neueFlaeche(groesse, groesse);
  ctx.imageSmoothingEnabled = true;
  const passung = Math.min(groesse / chupaChupsBild.width, groesse / chupaChupsBild.height);
  const breite = chupaChupsBild.width * passung;
  const hoehe = chupaChupsBild.height * passung;
  ctx.drawImage(chupaChupsBild, (groesse - breite) / 2, (groesse - hoehe) / 2, breite, hoehe);
  return canvas;
}

function zeichneProzeduralesSprite(art, ansicht, skala) {
  const raster = baueRaster(art, ansicht === 'rueck');
  const { canvas, ctx } = neueFlaeche(RASTER * skala, RASTER * skala);
  raster.male(ctx, skala);
  return canvas;
}

/**
 * Liefert das fertige Sprite als Bildfläche.
 * @param {{ id: number, name: string, typen: string[] }} art
 * @param {'front'|'rueck'|'klein'} ansicht
 * @returns {HTMLCanvasElement}
 */
export function monSprite(art, ansicht = 'front') {
  const schluessel = `${art.id}:${ansicht}`;
  const vorhanden = zwischenspeicher.get(schluessel);
  if (vorhanden) return vorhanden;

  const skala = ansicht === 'klein' ? 1 : 2;
  let canvas;
  if (art.name === CHUPA_CHUPS_NAME) {
    chupaChupsId = art.id;
    canvas = chupaChupsBild ? zeichneChupaChupsBild(skala) : zeichneProzeduralesSprite(art, ansicht, skala);
  } else {
    canvas = zeichneProzeduralesSprite(art, ansicht, skala);
  }

  zwischenspeicher.set(schluessel, canvas);
  return canvas;
}

export const SPRITE_GROESSE = RASTER * 2;
