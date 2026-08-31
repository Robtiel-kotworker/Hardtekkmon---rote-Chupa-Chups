// ============================================================================
// Sequenzerszene
// ----------------------------------------------------------------------------
// Das DJ-Pult im Proberaum (siehe data/world/casino.js): ein 16-Step-
// Sequenzer im Stil einer Korg Electribe. Vier Zeilen – Kick, Clap, HiHat,
// Melodie – mit je drei wählbaren Klängen (siehe SEQUENZER_REIHEN in
// engine/audio.js). Das Muster selbst gehört ganz dieser Szene; wie es
// klingt und wann ein Schritt dran ist, übernimmt der Sequenzer-Teil von
// engine/audio.js.
//
// Bedienung bewusst schlicht gehalten – kein Maus-"Klicken", nur die üblichen
// acht Tasten:
//   ←→   Schritt wählen        ↑↓     Zeile wählen
//   A    Schritt an/aus        SELECT Klang der Zeile wechseln
//   START Wiedergabe an/aus    B      Pult verlassen
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import {
  effekt, spieleTrack, aktuellerTrack,
  sequenzerStarten, sequenzerStoppen, sequenzerLaeuft, sequenzerAktualisieren,
  sequenzerAnzeigeSchritt, sequenzerVorhoeren, SEQUENZER_REIHEN, SEQUENZER_SCHRITTE,
} from '../engine/audio.js';
import { fenster } from '../gfx/ui.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { poppe } from './stapel.js';

/** Kachelmaße des Gitters. */
const GITTER_X = 30;
const GITTER_Y = 20;
const ZELLE_BREITE = 11;
const ZELLE_HOEHE = 11;
const ZEILE_ABSTAND = 14;
/** Zusätzlicher Abstand vor jeder vierten Stufe – gruppiert wie am echten Gerät. */
const GRUPPEN_LUECKE = 3;

/** X-Position einer Stufe im Gitter. */
function stufeX(schritt) {
  return GITTER_X + schritt * (ZELLE_BREITE + 1) + Math.floor(schritt / 4) * GRUPPEN_LUECKE;
}

export class Sequenzerszene {
  constructor() {
    /** Vier Zeilen zu je 16 Schritten – true heißt: hier klingt die Zeile. */
    this.muster = SEQUENZER_REIHEN.map(() => new Array(SEQUENZER_SCHRITTE).fill(false));
    /** Gewählte Klangvariante je Zeile (Index in SEQUENZER_REIHEN[i].varianten). */
    this.varianten = SEQUENZER_REIHEN.map(() => 0);
    this.cursorZeile = 0;
    this.cursorSchritt = 0;
    this.bildzaehler = 0;
    // Die Musik des Saals darüber pausiert, solange am Pult gebaut wird –
    // sonst überlagert sie den eigenen Beat. Danach kommt sie zurück.
    this.rueckkehrTrack = aktuellerTrack();
  }

  betreten() {
    spieleTrack('');
  }

  verlassen() {
    sequenzerStoppen();
    spieleTrack(this.rueckkehrTrack || 'gebaeude');
  }

  aktualisieren() {
    this.bildzaehler += 1;
    sequenzerAktualisieren(this.muster, this.varianten);

    if (gedrueckt('B')) {
      effekt('zurueck');
      poppe();
      return;
    }

    if (gedrueckt('START')) {
      if (sequenzerLaeuft()) {
        sequenzerStoppen();
        effekt('zurueck');
      } else {
        sequenzerStarten();
        effekt('bestaetigen');
      }
    }

    if (gedrueckt('SELECT')) {
      const reihe = SEQUENZER_REIHEN[this.cursorZeile];
      this.varianten[this.cursorZeile] = (this.varianten[this.cursorZeile] + 1) % reihe.varianten.length;
      sequenzerVorhoeren(this.cursorZeile, this.varianten[this.cursorZeile]);
      effekt('auswahl');
    }

    if (gedrueckt('A')) {
      const an = !this.muster[this.cursorZeile][this.cursorSchritt];
      this.muster[this.cursorZeile][this.cursorSchritt] = an;
      if (an) sequenzerVorhoeren(this.cursorZeile, this.varianten[this.cursorZeile]);
      effekt(an ? 'auswahl' : 'zurueck');
    }

    const zeilen = SEQUENZER_REIHEN.length;
    if (gedrueckt('LEFT')) this.bewegeSchritt(-1);
    if (gedrueckt('RIGHT')) this.bewegeSchritt(1);
    if (gedrueckt('UP')) this.cursorZeile = (this.cursorZeile + zeilen - 1) % zeilen;
    if (gedrueckt('DOWN')) this.cursorZeile = (this.cursorZeile + 1) % zeilen;
  }

  bewegeSchritt(richtung) {
    this.cursorSchritt = (this.cursorSchritt + SEQUENZER_SCHRITTE + richtung) % SEQUENZER_SCHRITTE;
  }

  // --- Darstellung ------------------------------------------------------------

  zeichnen(ctx) {
    ctx.fillStyle = '#161018';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    const titel = 'DJ-PULT';
    zeichneText(ctx, titel, (BREITE - textBreite(titel)) / 2, 5, { farbe: '#e8c860', schatten: '#3a1810' });

    this.zeichneGitter(ctx);
    this.zeichneStatus(ctx);
  }

  zeichneGitter(ctx) {
    const anzeigeSchritt = sequenzerLaeuft() ? sequenzerAnzeigeSchritt() : -1;

    // Spotlight-Spalte für den gerade hörbaren Schritt, unter allen Zeilen.
    if (anzeigeSchritt >= 0) {
      ctx.fillStyle = '#2a2438';
      ctx.fillRect(stufeX(anzeigeSchritt) - 1, GITTER_Y - 2, ZELLE_BREITE + 2, SEQUENZER_REIHEN.length * ZEILE_ABSTAND + 2);
    }

    SEQUENZER_REIHEN.forEach((reihe, zeile) => {
      const y = GITTER_Y + zeile * ZEILE_ABSTAND;
      zeichneText(ctx, reihe.kurz, 4, y + 2, { farbe: zeile === this.cursorZeile ? UI.gold : UI.textHell });

      for (let schritt = 0; schritt < SEQUENZER_SCHRITTE; schritt += 1) {
        const x = stufeX(schritt);
        const an = this.muster[zeile][schritt];
        const istCursor = zeile === this.cursorZeile && schritt === this.cursorSchritt;

        if (istCursor) {
          ctx.fillStyle = UI.textHell;
          ctx.fillRect(x - 1, y - 1, ZELLE_BREITE + 2, ZELLE_HOEHE + 2);
        }

        ctx.fillStyle = an ? reihe.farbe : '#302838';
        ctx.fillRect(x, y, ZELLE_BREITE, ZELLE_HOEHE);
        if (!an) {
          ctx.fillStyle = '#201a28';
          ctx.fillRect(x + 1, y + 1, ZELLE_BREITE - 2, ZELLE_HOEHE - 2);
        }
      }
    });
  }

  zeichneStatus(ctx) {
    const y = GITTER_Y + SEQUENZER_REIHEN.length * ZEILE_ABSTAND + 8;
    const reihe = SEQUENZER_REIHEN[this.cursorZeile];
    const name = reihe.varianten[this.varianten[this.cursorZeile]];

    fenster(ctx, 4, y, BREITE - 8, 24);
    zeichneText(ctx, `${reihe.kurz}: ${name}`, 10, y + 4, { farbe: UI.text });
    zeichneText(ctx, sequenzerLaeuft() ? '▶ läuft' : 'gestoppt', 10, y + 14, {
      farbe: sequenzerLaeuft() ? UI.kpGut : UI.textSchatten,
    });

    zeichneText(ctx, '←→ Schritt  ↑↓ Zeile  A An/Aus', 4, y + 30, { farbe: UI.textSchatten });
    zeichneText(ctx, 'SELECT Klang  START ▶/Stopp  B Raus', 4, y + 40, { farbe: UI.textSchatten });
  }
}
