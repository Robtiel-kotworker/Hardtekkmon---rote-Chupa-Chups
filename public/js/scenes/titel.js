// ============================================================================
// Titelbild
// ----------------------------------------------------------------------------
// Erster Bildschirm: Schriftzug, ein roter Chupa Chups als Logo und die
// Auswahl zwischen Weiterspielen und Neuanfang. Hier wird auch der Ton
// gestartet – Browser erlauben Klang erst nach einer Eingabe.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { irgendeineGedrueckt } from '../engine/input.js';
import { starteAudio, spieleTrack, effekt } from '../engine/audio.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { gibtStand } from '../engine/storage.js';
import { Auswahl } from '../ui/auswahl.js';
import { ladeSpiel } from '../game/spielstand.js';
import { ersetze } from './stapel.js';
import { Weltszene } from './welt.js';
import { Namensszene } from './namenswahl.js';

export class Titelszene {
  constructor() {
    this.bildzaehler = 0;
    this.zustand = 'warten';
    this.auswahl = null;
  }

  betreten() {
    this.zustand = 'warten';
  }

  aktualisieren() {
    this.bildzaehler += 1;

    if (this.zustand === 'warten') {
      if (irgendeineGedrueckt()) {
        starteAudio();
        spieleTrack('titel');
        effekt('bestaetigen');
        const eintraege = gibtStand() ? ['WEITER', 'NEUES SPIEL'] : ['NEUES SPIEL'];
        this.auswahl = new Auswahl({ eintraege });
        this.zustand = 'auswahl';
      }
      return;
    }

    const antwort = this.auswahl.aktualisieren();
    if (antwort !== 'bestaetigt') return;

    const gewaehlt = this.auswahl.eintraege[this.auswahl.index];
    if (gewaehlt === 'WEITER' && ladeSpiel()) {
      ersetze(new Weltszene());
      return;
    }

    ersetze(new Namensszene());
  }

  zeichnen(ctx) {
    // Hintergrund mit pulsierendem Licht
    ctx.fillStyle = '#12111c';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    const puls = 0.5 + 0.5 * Math.sin(this.bildzaehler / 26);
    ctx.fillStyle = `rgba(224, 64, 88, ${0.06 + puls * 0.1})`;
    ctx.fillRect(0, 0, BREITE, HOEHE);

    for (let i = 0; i < 8; i += 1) {
      const x = ((this.bildzaehler * 1.2) + i * 34) % (BREITE + 40) - 20;
      ctx.fillStyle = 'rgba(64, 208, 240, 0.07)';
      ctx.fillRect(x, 0, 10, HOEHE);
    }

    this.zeichneLutscher(ctx, BREITE / 2, 62, puls);

    const titel = 'HARDTEKKMON';
    zeichneText(ctx, titel, (BREITE - textBreite(titel) * 2) / 2, 14,
      { farbe: UI.gold, schatten: '#802020' });
    // Doppelte Größe durch zweifaches Zeichnen mit Versatz wäre unscharf –
    // stattdessen steht der Untertitel klein darunter.
    const unter = 'ROTE CHUPA CHUPS';
    zeichneText(ctx, unter, (BREITE - textBreite(unter)) / 2, 26, { farbe: '#f8f8f0', schatten: '#403050' });

    if (this.zustand === 'warten') {
      if (Math.floor(this.bildzaehler / 26) % 2 === 0) {
        const hinweis = 'IRGENDEINE TASTE DRÜCKEN';
        zeichneText(ctx, hinweis, (BREITE - textBreite(hinweis)) / 2, HOEHE - 34, { farbe: '#f8f8f0' });
      }
    } else {
      const breite = 92;
      this.auswahl.zeichnen(ctx, (BREITE - breite) / 2, HOEHE - 52, breite,
        this.auswahl.eintraege.length * 12 + 8);
    }

    zeichneText(ctx, 'Steuerkreuz  A  B  START', 6, HOEHE - 12, { farbe: '#7a7a98' });
  }

  /** Das Wahrzeichen des Spiels: ein roter Lolli. */
  zeichneLutscher(ctx, x, y, puls) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(this.bildzaehler / 40) * 0.12);

    ctx.fillStyle = '#c8c8d8';
    ctx.fillRect(-2, 0, 4, 44);

    ctx.fillStyle = '#e8e8f0';
    ctx.beginPath();
    ctx.arc(0, -4, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgb(${210 + puls * 40}, 40, 70)`;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, -4);
      const a = (i / 5) * Math.PI * 2 + this.bildzaehler / 60;
      ctx.arc(0, -4, 24, a, a + 0.62);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-8, -14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
