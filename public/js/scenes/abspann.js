// ============================================================================
// Abspann
// ----------------------------------------------------------------------------
// Nach dem Sieg über den Chef: die Halle der Gigs. Das Team zieht mit
// Scheinwerferlicht vorbei, danach laufen die Credits durch. Am Ende geht es
// zurück ins eigene Zimmer – gespeichert wird automatisch.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { spieleTrack } from '../engine/audio.js';
import { fenster, blende } from '../gfx/ui.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import { anzeigename, artVon, ARTEN_GESAMT } from '../game/hardtekkmon.js';
import { spiel, speichereSpiel, spielzeitText, heileTeam } from '../game/spielstand.js';
import { poppe } from './stapel.js';

const ZEILEN = [
  'HALLE DER GIGS',
  '',
  'Acht Marken. Ein Chef. Eine Nacht.',
  '',
  'Danke fürs Durchmachen.',
  '',
  'Musik, Grafik und Ablauf:',
  'komplett zur Laufzeit erzeugt.',
  '',
  'Keine Datei geladen, kein Sample gekauft.',
  '',
  'Bis zur nächsten Afterhour.',
];

export class Abspannszene {
  /** @param {object} welt Weltszene, in die zurückgekehrt wird. */
  constructor(welt) {
    this.welt = welt;
    this.bildzaehler = 0;
    this.rollen = 0;
    this.fertig = false;
  }

  betreten() {
    spieleTrack('sieg');
    heileTeam();
    speichereSpiel();
  }

  aktualisieren() {
    this.bildzaehler += 1;
    this.rollen += 0.35;

    const ende = ZEILEN.length * 12 + HOEHE;
    if (this.rollen > ende) this.fertig = true;

    if (gedrueckt('A') || gedrueckt('B') || gedrueckt('START')) {
      if (this.fertig || this.rollen > 60) this.beende();
    }
  }

  beende() {
    const ziel = spiel.letzterBoxenstopp;
    poppe();
    this.welt.starteBlende(() => {
      this.welt.wechsleKarte(ziel.karte, ziel.x, ziel.y, 'unten');
      this.welt.zeigeText([
        'Zurück im Alltag. Aber alle wissen jetzt, wer du bist.',
        'Der Tekkdex ist noch nicht voll – da draußen laufen noch einige rum.',
      ]);
    });
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#0d0c16';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    // Scheinwerferkegel
    for (let i = 0; i < 3; i += 1) {
      const x = 40 + i * 80 + Math.sin(this.bildzaehler / 40 + i) * 18;
      ctx.fillStyle = `rgba(240, 80, 160, ${0.05 + 0.04 * Math.sin(this.bildzaehler / 20 + i)})`;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 26, HOEHE);
      ctx.lineTo(x + 26, HOEHE);
      ctx.closePath();
      ctx.fill();
    }

    // Team als Reihe
    spiel.team.forEach((mon, i) => {
      const x = 8 + i * 38;
      const y = 40 + Math.sin(this.bildzaehler / 18 + i) * 3;
      ctx.drawImage(monSprite(artVon(mon), 'klein'), x, y);
      zeichneText(ctx, anzeigename(mon).slice(0, 7), x - 2, y + 30, { farbe: UI.textHell, schatten: UI.dunkel });
    });

    // Rollende Credits
    ZEILEN.forEach((zeile, i) => {
      const y = HOEHE + i * 12 - this.rollen;
      if (y < 74 || y > HOEHE) return;
      zeichneText(ctx, zeile, (BREITE - textBreite(zeile)) / 2, y, { farbe: UI.gold, schatten: '#301020' });
    });

    fenster(ctx, 4, HOEHE - 26, BREITE - 8, 22);
    const stand = `${spiel.spieler.name}   Zeit ${spielzeitText()}   Dex ${spiel.gefangen.size}/${ARTEN_GESAMT}`;
    zeichneText(ctx, stand, 10, HOEHE - 19, { farbe: UI.text });

    blende(ctx, BREITE, HOEHE, Math.max(0, 1 - this.bildzaehler / 40));
  }
}
