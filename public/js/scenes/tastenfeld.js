// ============================================================================
// Tastenfeld
// ----------------------------------------------------------------------------
// Die Codeeingabe am Sicherheitsterminal im Boxenstopp: ein Ziffernblock, ein
// dreistelliges Display und eine Enter-Taste. Gewählt wird mit dem Steuerkreuz,
// gedrückt mit A, verlassen mit B.
//
// Die Szene weiß nichts vom Klonlabor – sie bekommt nur den erwarteten Code und
// meldet den Erfolg zurück (siehe oeffneTastenfeld in scenes/welt.js).
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { poppe } from './stapel.js';

/** Der Ziffernblock, drei Tasten je Reihe. */
const TASTEN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'ENTER'];
const SPALTEN = 3;

/** Wie lange "ZUGANG FREI" stehen bleibt, bevor die Tür aufgeht. */
const ERFOLG_BILDER = 60;
/** Wie lange eine Fehlermeldung stehen bleibt. */
const MELDUNG_BILDER = 80;

const PANEL = { x: 48, y: 6, breite: 144, hoehe: 148 };
const TASTE = { breite: 34, hoehe: 18, luecke: 4 };
const TASTEN_X = PANEL.x + (PANEL.breite - (SPALTEN * TASTE.breite + (SPALTEN - 1) * TASTE.luecke)) / 2;
const TASTEN_Y = 58;

/** Zeichnet Text in doppelter Größe – für das Display. */
function grossText(ctx, text, x, y, farbe) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.scale(2, 2);
  zeichneText(ctx, text, x / 2, y / 2, { farbe });
  ctx.restore();
}

export class Tastenfeldszene {
  /** @param {{ code: string, beiErfolg?: () => void }} vorgabe */
  constructor({ code, beiErfolg = null }) {
    this.code = code;
    this.beiErfolg = beiErfolg;
    this.eingabe = '';
    this.auswahl = TASTEN.indexOf('5');
    /** 'eingabe' während der Bedienung, 'erfolg' für die kurze Bestätigung. */
    this.zustand = 'eingabe';
    this.meldung = null;
    this.meldungFarbe = '#f0d8a0';
    this.rest = 0;
    this.bildzaehler = 0;
  }

  aktualisieren() {
    this.bildzaehler += 1;

    if (this.zustand === 'erfolg') {
      this.rest -= 1;
      if (this.rest <= 0) {
        poppe();
        this.beiErfolg?.();
      }
      return;
    }

    if (this.rest > 0) this.rest -= 1;
    else if (this.meldung) this.meldung = null;

    if (gedrueckt('B')) {
      effekt('zurueck');
      poppe();
      return;
    }

    this.bewege();
    if (gedrueckt('A')) this.druecke(TASTEN[this.auswahl]);
  }

  /** Steuerkreuz: waagerecht innerhalb der Reihe, senkrecht innerhalb der Spalte. */
  bewege() {
    const zeilen = TASTEN.length / SPALTEN;
    let zeile = Math.floor(this.auswahl / SPALTEN);
    let spalte = this.auswahl % SPALTEN;
    let bewegt = false;

    if (gedrueckt('LEFT')) { spalte = (spalte - 1 + SPALTEN) % SPALTEN; bewegt = true; }
    if (gedrueckt('RIGHT')) { spalte = (spalte + 1) % SPALTEN; bewegt = true; }
    if (gedrueckt('UP')) { zeile = (zeile - 1 + zeilen) % zeilen; bewegt = true; }
    if (gedrueckt('DOWN')) { zeile = (zeile + 1) % zeilen; bewegt = true; }

    if (!bewegt) return;
    this.auswahl = zeile * SPALTEN + spalte;
    effekt('auswahl');
  }

  druecke(taste) {
    if (taste === 'C') {
      this.eingabe = '';
      this.zeigeMeldung('GELÖSCHT', '#f0d8a0');
      effekt('zurueck');
      return;
    }

    if (taste === 'ENTER') {
      this.pruefe();
      return;
    }

    if (this.eingabe.length >= 3) {
      this.zeigeMeldung('NUR DREI STELLEN', '#f0c040');
      effekt('zurueck');
      return;
    }
    this.eingabe += taste;
    effekt('auswahl');
  }

  pruefe() {
    if (this.eingabe.length < 3) {
      this.zeigeMeldung('DREI STELLEN NÖTIG', '#f0c040');
      effekt('zurueck');
      return;
    }
    if (this.eingabe !== this.code) {
      this.eingabe = '';
      this.zeigeMeldung('ABGELEHNT', '#e04058');
      effekt('zurueck');
      return;
    }
    this.zustand = 'erfolg';
    this.rest = ERFOLG_BILDER;
    this.zeigeMeldung('ZUGANG FREI', '#48f078');
    effekt('gefangen');
  }

  zeigeMeldung(text, farbe) {
    this.meldung = text;
    this.meldungFarbe = farbe;
    this.rest = MELDUNG_BILDER;
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    // Gehäuse
    ctx.fillStyle = '#20242e';
    ctx.fillRect(PANEL.x - 2, PANEL.y - 2, PANEL.breite + 4, PANEL.hoehe + 4);
    ctx.fillStyle = '#4a5060';
    ctx.fillRect(PANEL.x, PANEL.y, PANEL.breite, PANEL.hoehe);
    ctx.fillStyle = '#5a6472';
    ctx.fillRect(PANEL.x + 2, PANEL.y + 2, PANEL.breite - 4, PANEL.hoehe - 4);

    const titel = 'SICHERHEITSBEREICH';
    zeichneText(ctx, titel, PANEL.x + (PANEL.breite - textBreite(titel)) / 2, PANEL.y + 6, {
      farbe: '#f0e4cc', schatten: '#20242e',
    });

    this.zeichneDisplay(ctx);
    this.zeichneTasten(ctx);

    const hinweis = this.meldung ?? 'A: Taste   B: zurück';
    const farbe = this.meldung ? this.meldungFarbe : '#c8ccd8';
    zeichneText(ctx, hinweis, PANEL.x + (PANEL.breite - textBreite(hinweis)) / 2, PANEL.y + PANEL.hoehe - 10, {
      farbe, schatten: '#20242e',
    });
  }

  /** Drei Stellen als grüne LCD-Ziffern; leere Stellen bleiben Striche. */
  zeichneDisplay(ctx) {
    const breite = 88;
    const x = PANEL.x + (PANEL.breite - breite) / 2;
    const y = 24;

    ctx.fillStyle = '#12161a';
    ctx.fillRect(x - 2, y - 2, breite + 4, 28);
    ctx.fillStyle = '#0c2412';
    ctx.fillRect(x, y, breite, 24);

    for (let i = 0; i < 3; i += 1) {
      const feldX = x + 6 + i * 28;
      ctx.fillStyle = '#123018';
      ctx.fillRect(feldX, y + 3, 22, 18);
      const zeichen = this.eingabe[i];
      if (zeichen) {
        grossText(ctx, zeichen, feldX + 6, y + 6, '#48f078');
      } else {
        ctx.fillStyle = '#1e5c2c';
        ctx.fillRect(feldX + 5, y + 15, 12, 2);
      }
    }
  }

  zeichneTasten(ctx) {
    TASTEN.forEach((taste, i) => {
      const spalte = i % SPALTEN;
      const zeile = Math.floor(i / SPALTEN);
      const x = TASTEN_X + spalte * (TASTE.breite + TASTE.luecke);
      const y = TASTEN_Y + zeile * (TASTE.hoehe + TASTE.luecke);
      const gewaehlt = i === this.auswahl;

      ctx.fillStyle = '#20242e';
      ctx.fillRect(x, y, TASTE.breite, TASTE.hoehe);
      if (gewaehlt) {
        // Die gewählte Taste blinkt leicht, damit sie auch im Stillstand auffällt.
        ctx.fillStyle = Math.floor(this.bildzaehler / 16) % 2 === 0 ? '#f0c040' : '#d8ac30';
      } else if (taste === 'ENTER') {
        ctx.fillStyle = '#3a6a48';
      } else if (taste === 'C') {
        ctx.fillStyle = '#6a3a44';
      } else {
        ctx.fillStyle = '#98a0ac';
      }
      ctx.fillRect(x + 1, y + 1, TASTE.breite - 2, TASTE.hoehe - 3);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + 1, y + 1, TASTE.breite - 2, 1);

      // Helle Tasten tragen dunkle Schrift, die dunklen Sondertasten helle.
      const dunklerGrund = !gewaehlt && (taste === 'ENTER' || taste === 'C');
      const farbe = dunklerGrund ? '#f0e4cc' : '#20242e';
      zeichneText(ctx, taste, x + (TASTE.breite - textBreite(taste)) / 2, y + 5, { farbe });
    });
  }
}
