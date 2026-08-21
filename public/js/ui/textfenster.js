// ============================================================================
// Textfenster
// ----------------------------------------------------------------------------
// Das Sprechfenster am unteren Rand. Text erscheint Zeichen für Zeichen, mit A
// wird weitergeschaltet, längere Texte werden automatisch auf Seiten verteilt.
// Alle Szenen benutzen dasselbe Fenster – dadurch fühlt sich jeder Dialog
// gleich an.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { fenster } from '../gfx/ui.js';
import { zeichneText, umbrechen } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { gedrueckt, gehalten } from '../engine/input.js';
import { effekt } from '../engine/audio.js';

const RAND = 6;
const ZEILEN_PRO_SEITE = 3;
const ZEILENHOEHE = 11;
const FENSTER_HOEHE = ZEILEN_PRO_SEITE * ZEILENHOEHE + 10;
const ZEICHEN_PRO_BILD = 1;

export class Textfenster {
  constructor() {
    /** @type {string[][]} */
    this.seiten = [];
    this.seite = 0;
    this.sichtbareZeichen = 0;
    this.aktiv = false;
    this.bildzaehler = 0;
  }

  /**
   * Zeigt einen Text an. Zeilenumbrüche entstehen automatisch.
   * @param {string|string[]} inhalt
   */
  zeige(inhalt) {
    const teile = Array.isArray(inhalt) ? inhalt : [inhalt];
    const zeilen = teile.flatMap((absatz) => umbrechen(absatz, BREITE - 2 * RAND - 8));

    this.seiten = [];
    for (let i = 0; i < zeilen.length; i += ZEILEN_PRO_SEITE) {
      this.seiten.push(zeilen.slice(i, i + ZEILEN_PRO_SEITE));
    }
    if (this.seiten.length === 0) this.seiten = [['']];

    this.seite = 0;
    this.sichtbareZeichen = 0;
    this.aktiv = true;
  }

  schliesse() {
    this.aktiv = false;
    this.seiten = [];
  }

  get zeichenDerSeite() {
    return (this.seiten[this.seite] ?? []).join('').length;
  }

  /** Ist die aktuelle Seite fertig geschrieben? */
  get seiteFertig() {
    return this.sichtbareZeichen >= this.zeichenDerSeite;
  }

  /**
   * Schreibt den Text weiter, ohne Eingaben auszuwerten. Der Kampf nutzt das,
   * weil er das Weiterschalten selbst steuert.
   */
  schreibeWeiter() {
    if (!this.aktiv) return;
    this.bildzaehler += 1;
    if (this.seiteFertig) return;
    const tempo = gehalten('A') || gehalten('B') ? 3 : ZEICHEN_PRO_BILD;
    this.sichtbareZeichen = Math.min(this.zeichenDerSeite, this.sichtbareZeichen + tempo);
  }

  /**
   * Ein Logikschritt. Ein Tastendruck vervollständigt zuerst den laufenden
   * Text; erst der nächste schaltet weiter.
   * @returns {boolean} true, wenn der Text komplett abgearbeitet ist
   */
  aktualisieren() {
    if (!this.aktiv) return true;

    const warFertig = this.seiteFertig;
    this.schreibeWeiter();

    if (!warFertig) {
      if (gedrueckt('A') || gedrueckt('B')) this.ueberspringe();
      return false;
    }

    if (gedrueckt('A') || gedrueckt('B')) {
      if (this.seite < this.seiten.length - 1) {
        this.seite += 1;
        this.sichtbareZeichen = 0;
        effekt('auswahl');
        return false;
      }
      this.schliesse();
      return true;
    }
    return false;
  }

  /** Springt sofort ans Ende des Textes. */
  ueberspringe() {
    this.sichtbareZeichen = this.zeichenDerSeite;
  }

  zeichnen(ctx) {
    if (!this.aktiv) return;

    const y = HOEHE - FENSTER_HOEHE - 4;
    fenster(ctx, 4, y, BREITE - 8, FENSTER_HOEHE);

    const zeilen = this.seiten[this.seite] ?? [];
    let uebrig = Math.floor(this.sichtbareZeichen);

    zeilen.forEach((zeile, i) => {
      const sichtbar = zeile.slice(0, Math.max(0, uebrig));
      uebrig -= zeile.length;
      zeichneText(ctx, sichtbar, 4 + RAND, y + 6 + i * ZEILENHOEHE, { farbe: UI.text });
    });

    if (this.seiteFertig && Math.floor(this.bildzaehler / 20) % 2 === 0) {
      const marke = this.seite < this.seiten.length - 1 ? '▼' : '▶';
      zeichneText(ctx, marke, BREITE - 16, y + FENSTER_HOEHE - 12, { farbe: UI.auswahl });
    }
  }
}

export const TEXTFENSTER_HOEHE = FENSTER_HOEHE;
