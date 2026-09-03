// ============================================================================
// Telefonzelle
// ----------------------------------------------------------------------------
// Die Teleportationskapsel im Boxenstopp: äußerlich eine alte Telefonzelle,
// innerlich ein Ziffernblock mit dreistelligem Display – dieselbe Bauweise
// wie das Tastenfeld im Klonlabor (siehe scenes/tastenfeld.js), nur mit
// eigener Prüfung (welche Nummer gehört zu welcher Stadt, wurde sie schon
// betreten) statt eines festen Codes, und einer Bezahl- und Teleportfolge
// statt einer einfachen Tür.
//
// Die Szene weiß nichts von der Weltszene – sie meldet nur die Zielstadt
// zurück (siehe oeffneTelefonzelle() in scenes/welt.js).
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { poppe } from './stapel.js';
import { STATIONEN } from '../data/world/regionskarte.js';
import { spiel, hatFlagge, aendereGeld, WAEHRUNG } from '../game/spielstand.js';

const TASTEN = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'RUF'];
const SPALTEN = 3;
const KOSTEN = 250;

/** Wie lange der "Guthaben reicht nicht"-Hinweis steht, bevor automatisch bezahlt wird. */
const HINWEIS_BILDER = 75;
const MELDUNG_BILDER = 80;
/** Dauer der drei Animationsphasen (siehe aktualisiereAnimation). */
const DREH_BILDER = 40;
const WEISS_BILDER = 12;

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

export class Telefonzellenszene {
  /** @param {{ aktuelleStadtId: string, beiErfolg?: (zielStadtId: string) => void }} vorgabe */
  constructor({ aktuelleStadtId, beiErfolg = null }) {
    this.aktuelleStadtId = aktuelleStadtId;
    this.beiErfolg = beiErfolg;
    this.eingabe = '';
    this.auswahl = TASTEN.indexOf('5');
    /** 'eingabe' – Ziffernblock; 'hinweis' – "Guthaben reicht nicht"; 'dreh'/'weiss' – Animation. */
    this.zustand = 'eingabe';
    this.zielStadtId = null;
    this.meldung = null;
    this.meldungFarbe = '#f0d8a0';
    this.rest = 0;
    this.animZeit = 0;
    this.bildzaehler = 0;
  }

  aktualisieren() {
    this.bildzaehler += 1;

    if (this.zustand === 'hinweis') {
      this.rest -= 1;
      if (this.rest <= 0) this.loeseZahlungAus();
      return;
    }
    if (this.zustand === 'dreh' || this.zustand === 'weiss') {
      this.aktualisiereAnimation();
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
    if (taste === 'RUF') {
      this.rufeAn();
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

  /** Prüft die eingegebene Nummer. Nur bei einer bekannten, bereits betretenen Stadt geht es weiter. */
  rufeAn() {
    if (this.eingabe.length < 3) {
      this.zeigeMeldung('DREI STELLEN NÖTIG', '#f0c040');
      effekt('zurueck');
      return;
    }

    const station = STATIONEN.find((s) => s.telefon === this.eingabe);
    if (!station) {
      this.eingabe = '';
      this.zeigeMeldung('KEIN ANSCHLUSS UNTER DIESER NUMMER', '#e04058');
      effekt('zurueck');
      return;
    }
    if (!hatFlagge(`besucht:${station.id}`)) {
      this.eingabe = '';
      this.zeigeMeldung('STADT UNBEKANNT', '#e04058');
      effekt('zurueck');
      return;
    }
    if (station.id === this.aktuelleStadtId) {
      this.eingabe = '';
      this.zeigeMeldung('DU BIST SCHON HIER', '#f0c040');
      effekt('zurueck');
      return;
    }

    this.zielStadtId = station.id;
    this.zustand = 'hinweis';
    this.rest = HINWEIS_BILDER;
    this.meldung = 'SPRACHGUTHABEN REICHT NICHT';
    this.meldungFarbe = '#f0c040';
    effekt('auswahl');
  }

  /** Nach dem Hinweis: reicht das Guthaben, wird automatisch bezahlt und die Fahrt beginnt. */
  loeseZahlungAus() {
    if (spiel.spieler.geld < KOSTEN) {
      this.zustand = 'eingabe';
      this.eingabe = '';
      this.zeigeMeldung(`ZU WENIG ${WAEHRUNG.toUpperCase()}`, '#e04058');
      effekt('zurueck');
      return;
    }

    aendereGeld(-KOSTEN);
    this.zustand = 'dreh';
    this.animZeit = 0;
    this.meldung = null;
    effekt('gefangen');
  }

  aktualisiereAnimation() {
    this.animZeit += 1;

    if (this.zustand === 'dreh' && this.animZeit >= DREH_BILDER) {
      this.zustand = 'weiss';
      this.animZeit = 0;
      return;
    }
    if (this.zustand === 'weiss' && this.animZeit >= WEISS_BILDER) {
      // Ab hier ist der Bildschirm schwarz – die Weltszene übernimmt von
      // hier den Rückweg ins Bild (siehe teleportZuBoxenstopp() in welt.js).
      const ziel = this.zielStadtId;
      poppe();
      this.beiErfolg?.(ziel);
    }
  }

  zeigeMeldung(text, farbe) {
    this.meldung = text;
    this.meldungFarbe = farbe;
    this.rest = MELDUNG_BILDER;
  }

  // --- Zeichnen ----------------------------------------------------------------

  zeichnen(ctx) {
    if (this.zustand === 'weiss') {
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, BREITE, HOEHE);
      return;
    }
    if (this.zustand === 'dreh') {
      this.zeichneDreh(ctx);
      return;
    }

    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    ctx.fillStyle = '#20242e';
    ctx.fillRect(PANEL.x - 2, PANEL.y - 2, PANEL.breite + 4, PANEL.hoehe + 4);
    ctx.fillStyle = '#7a1018';
    ctx.fillRect(PANEL.x, PANEL.y, PANEL.breite, PANEL.hoehe);
    ctx.fillStyle = '#8c1620';
    ctx.fillRect(PANEL.x + 2, PANEL.y + 2, PANEL.breite - 4, PANEL.hoehe - 4);

    const titel = 'TELEFONZELLE';
    zeichneText(ctx, titel, PANEL.x + (PANEL.breite - textBreite(titel)) / 2, PANEL.y + 6, {
      farbe: '#f0e4cc', schatten: '#5c0c12',
    });

    this.zeichneDisplay(ctx);
    this.zeichneTasten(ctx);

    const hinweis = this.meldung ?? 'A: Taste   B: Auflegen';
    const farbe = this.meldung ? this.meldungFarbe : '#e8ccc8';
    zeichneText(ctx, hinweis, PANEL.x + (PANEL.breite - textBreite(hinweis)) / 2, PANEL.y + PANEL.hoehe - 10, {
      farbe, schatten: '#5c0c12',
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
        ctx.fillStyle = Math.floor(this.bildzaehler / 16) % 2 === 0 ? '#f0c040' : '#d8ac30';
      } else if (taste === 'RUF') {
        // Der grüne Hörer.
        ctx.fillStyle = '#3a9a52';
      } else if (taste === 'C') {
        ctx.fillStyle = '#6a3a44';
      } else {
        ctx.fillStyle = '#98a0ac';
      }
      ctx.fillRect(x + 1, y + 1, TASTE.breite - 2, TASTE.hoehe - 3);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + 1, y + 1, TASTE.breite - 2, 1);

      const dunklerGrund = !gewaehlt && (taste === 'RUF' || taste === 'C');
      const farbe = dunklerGrund ? '#f0e4cc' : '#20242e';
      zeichneText(ctx, taste, x + (TASTE.breite - textBreite(taste)) / 2, y + 5, { farbe });
    });
  }

  /** Die Zelle dreht sich immer schneller, dazu ein Flackern in Rot/Weiß. */
  zeichneDreh(ctx) {
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    const anteil = this.animZeit / DREH_BILDER;
    const tempo = 0.3 + anteil * anteil * 3.2;
    const winkel = this.animZeit * tempo;
    const flackert = Math.floor(this.animZeit * (1 + anteil * 4)) % 2 === 0;

    ctx.save();
    ctx.translate(BREITE / 2, HOEHE / 2);
    ctx.rotate(winkel);
    const b = 26;
    const h = 46;
    ctx.fillStyle = flackert ? '#f8f8f8' : '#c0202c';
    ctx.fillRect(-b / 2, -h / 2, b, h);
    ctx.fillStyle = flackert ? '#c0202c' : '#f8f8f8';
    ctx.fillRect(-b / 2 + 3, -h / 2 + 3, b - 6, h * 0.4);
    ctx.restore();

    // Blitze am Rand, dichter je schneller die Drehung.
    if (Math.floor(this.animZeit / 2) % 2 === 0) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + anteil * 0.3})`;
      ctx.fillRect(0, 0, BREITE, HOEHE);
    }
  }
}
