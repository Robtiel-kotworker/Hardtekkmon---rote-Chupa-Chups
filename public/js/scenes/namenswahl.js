// ============================================================================
// Namenswahl
// ----------------------------------------------------------------------------
// Bildschirmtastatur zur Eingabe des Spielernamens vor einem neuen Spiel –
// angelehnt an die klassische "Wie heißt du?"-Eingabe der Vorlage. Der
// gewählte Name landet in neuesSpiel() und taucht danach in ausgewählten
// Dialogen auf (Professor, Rivale, Chef der Szene) statt eines Platzhalters.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster } from '../gfx/ui.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { Auswahl } from '../ui/auswahl.js';
import { neuesSpiel } from '../game/spielstand.js';
import { ersetze } from './stapel.js';
import { Weltszene } from './welt.js';

const MAX_LAENGE = 10;
const SPALTEN = 7;

/** Alphabetisches Tastenfeld plus Löschen und Bestätigen – genau 4 volle Zeilen. */
const TASTEN = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G',
  'H', 'I', 'J', 'K', 'L', 'M', 'N',
  'O', 'P', 'Q', 'R', 'S', 'T', 'U',
  'V', 'W', 'X', 'Y', 'Z', '←', 'OK',
];

export class Namensszene {
  constructor() {
    this.name = '';
    this.tastatur = new Auswahl({ eintraege: TASTEN, spalten: SPALTEN });
    this.bildzaehler = 0;
  }

  aktualisieren() {
    this.bildzaehler += 1;

    // START bestätigt jederzeit, sobald mindestens ein Zeichen steht – ohne
    // erst zu "OK" navigieren zu müssen.
    if (gedrueckt('START') && this.name.length > 0) {
      this.bestaetige();
      return;
    }

    // B löscht direkt das letzte Zeichen. Anders als sonst gibt es hier
    // nichts, wohin man mit B "zurück" könnte – die Namenswahl steht vor
    // jedem neuen Spiel, ein Abbrechen ergibt keinen Sinn.
    if (gedrueckt('B')) {
      this.loesche();
      return;
    }

    const antwort = this.tastatur.aktualisieren();
    if (antwort !== 'bestaetigt') return;

    const taste = TASTEN[this.tastatur.index];
    if (taste === '←') {
      this.loesche();
    } else if (taste === 'OK') {
      if (this.name.length > 0) this.bestaetige();
    } else if (this.name.length < MAX_LAENGE) {
      this.name += taste;
      effekt('item');
    }
  }

  loesche() {
    if (this.name.length === 0) return;
    this.name = this.name.slice(0, -1);
    effekt('zurueck');
  }

  bestaetige() {
    effekt('bestaetigen');
    neuesSpiel(this.name);
    ersetze(new Weltszene());
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#181820';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    const titel = 'WIE HEISST DU?';
    zeichneText(ctx, titel, (BREITE - textBreite(titel)) / 2, 6, { farbe: UI.textHell, schatten: UI.dunkel });

    fenster(ctx, 30, 16, BREITE - 60, 16);
    const blinkt = Math.floor(this.bildzaehler / 20) % 2 === 0;
    zeichneText(ctx, this.name + (blinkt ? '_' : ' '), 36, 20, { farbe: UI.text });

    this.tastatur.zeichnen(ctx, 10, 36, BREITE - 20, 4 * 17 + 10, { zeilenhoehe: 17 });

    const hinweis = 'A: wählen   B: löschen   START: fertig';
    zeichneText(ctx, hinweis, (BREITE - textBreite(hinweis)) / 2, HOEHE - 12, { farbe: UI.textSchatten });
  }
}
