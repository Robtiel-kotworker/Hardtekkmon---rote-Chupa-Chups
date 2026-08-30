// ============================================================================
// Karte zur Laufzeit
// ----------------------------------------------------------------------------
// Aus den Kartendaten wird beim Betreten einmal ein fertiges Bild gerendert.
// Danach kostet das Zeichnen nur noch einen Ausschnitt-Kopiervorgang, egal wie
// groß die Karte ist. Bewegliches (Wasserglitzern, Figuren) kommt zur Laufzeit
// obendrauf.
// ============================================================================

import { neueFlaeche } from '../engine/screen.js';
import { KACHEL, zeichneKachel, kachelInfo, baueKacheln } from '../gfx/tiles.js';
import { karte as kartendaten } from '../data/world/karten.js';
import { zeichneText, textBreite } from '../gfx/font.js';

/** Streuwert für die Kachelvariante – gleiche Position, gleiche Variante. */
function variante(x, y) {
  const wert = Math.imul(x + 1, 0x27d4eb2d) ^ Math.imul(y + 1, 0x165667b1);
  return (wert >>> 13) & 3;
}

export class Weltkarte {
  /** @param {string} id */
  constructor(id) {
    const daten = kartendaten(id);
    if (!daten) throw new Error(`Unbekannte Karte: ${id}`);

    baueKacheln();
    this.daten = daten;
    this.id = id;
    this.breite = daten.breite;
    this.hoehe = daten.hoehe;

    /** Figuren bekommen eine eigene Laufzeitfassung (Blickrichtung, Schritt). */
    this.npcs = (daten.npcs ?? []).map((eintrag, index) => ({
      ...eintrag,
      index,
      startRichtung: eintrag.richtung,
      bild: 0,
      versatz: 0,
      laeuft: false,
      schrittZaehler: 0,
      wartezeit: 60 + index * 37,
      entfernt: false,
    }));

    this.bild = this.rendere();
    this.wasserfelder = this.sammleWasser();
  }

  rendere() {
    const { canvas, ctx } = neueFlaeche(this.breite * KACHEL, this.hoehe * KACHEL);
    for (let y = 0; y < this.hoehe; y += 1) {
      for (let x = 0; x < this.breite; x += 1) {
        zeichneKachel(ctx, this.kachelAn(x, y), x * KACHEL, y * KACHEL, variante(x, y));
      }
    }
    this.zeichneBeschriftungen(ctx);
    return canvas;
  }

  /**
   * Feste Reklameschilder an Gebäuden. Sie gehen einmalig mit ins gerenderte
   * Kartenbild ein und sind dadurch dauerhaft lesbar, ohne zur Laufzeit
   * etwas zu kosten – kein Dialog, kein Anklicken.
   */
  zeichneBeschriftungen(ctx) {
    for (const eintrag of this.daten.beschriftungen ?? []) {
      const feldBreite = eintrag.breite * KACHEL;
      const breite = textBreite(eintrag.text);
      const x = eintrag.x * KACHEL + Math.round((feldBreite - breite) / 2);
      const y = eintrag.y * KACHEL + 4;

      // Schildplatte hinter der Schrift, damit sie sich von der Hauswand abhebt.
      ctx.fillStyle = '#181820';
      ctx.fillRect(x - 3, y - 2, breite + 6, 11);
      ctx.fillStyle = '#f0e4cc';
      ctx.fillRect(x - 2, y - 1, breite + 4, 9);
      zeichneText(ctx, eintrag.text, x, y, { farbe: '#282838' });
    }
  }

  sammleWasser() {
    const felder = [];
    for (let y = 0; y < this.hoehe; y += 1) {
      for (let x = 0; x < this.breite; x += 1) {
        if (kachelInfo(this.kachelAn(x, y)).wasser) felder.push({ x, y });
      }
    }
    return felder;
  }

  innen(x, y) {
    return x >= 0 && y >= 0 && x < this.breite && y < this.hoehe;
  }

  kachelAn(x, y) {
    return this.innen(x, y) ? this.daten.kacheln[y * this.breite + x] : 'baum';
  }

  /** Blockiert die Kachel (ohne Figuren)? */
  istFest(x, y) {
    if (!this.innen(x, y)) return true;
    return Boolean(kachelInfo(this.kachelAn(x, y)).fest);
  }

  /**
   * Blockiert die Kachel das Laufen, lässt aber das Ansprechen einer Person
   * dahinter zu (Tresen, Tisch)? Siehe interagiere() in welt.js.
   */
  reichweiteHindernis(x, y) {
    return Boolean(kachelInfo(this.kachelAn(x, y)).reichweite);
  }

  /** Begehbar inklusive Figuren und Gegenständen. */
  istBegehbar(x, y) {
    if (this.istFest(x, y)) return false;
    return !this.npcAn(x, y);
  }

  npcAn(x, y) {
    return this.npcs.find((npc) => !npc.entfernt && !npc.unsichtbar && npc.x === x && npc.y === y) ?? null;
  }

  warpAn(x, y) {
    return (this.daten.warps ?? []).find((w) => w.x === x && w.y === y) ?? null;
  }

  schildAn(x, y) {
    return (this.daten.schilder ?? []).find((s) => s.x === x && s.y === y) ?? null;
  }

  gegenstandAn(x, y) {
    return (this.daten.gegenstaende ?? []).find((g) => g.x === x && g.y === y) ?? null;
  }

  /** Begegnungsgruppe der Kachel, sofern die Karte wilde Hardtekkmon kennt. */
  begegnungsgruppe(x, y) {
    if (!this.daten.begegnungen) return null;
    return kachelInfo(this.kachelAn(x, y)).begegnung ?? null;
  }

  /**
   * Zeichnet den sichtbaren Ausschnitt.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ x: number, y: number }} kamera Pixelposition der linken oberen Ecke
   * @param {number} bildzaehler
   */
  zeichne(ctx, kamera, bildzaehler) {
    ctx.drawImage(this.bild, -Math.round(kamera.x), -Math.round(kamera.y));
    this.zeichneWasser(ctx, kamera, bildzaehler);
  }

  /** Wellenlinien auf allen sichtbaren Wasserkacheln. */
  zeichneWasser(ctx, kamera, bildzaehler) {
    if (this.wasserfelder.length === 0) return;
    const phase = Math.floor(bildzaehler / 24) % 2;
    ctx.fillStyle = '#b8d8f8';

    for (const feld of this.wasserfelder) {
      const x = feld.x * KACHEL - kamera.x;
      const y = feld.y * KACHEL - kamera.y;
      if (x < -KACHEL || y < -KACHEL || x > 240 || y > 160) continue;
      const versatz = (feld.x + feld.y + phase) % 2 === 0 ? 3 : 9;
      ctx.fillRect(Math.round(x + 2), Math.round(y + versatz), 5, 1);
      ctx.fillRect(Math.round(x + 9), Math.round(y + 14 - versatz), 4, 1);
    }
  }
}
