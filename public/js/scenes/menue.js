// ============================================================================
// Hauptmenü
// ----------------------------------------------------------------------------
// Liegt als Überlagerung über der Welt: START öffnet es, B schließt es. Von
// hier geht es in Tekkdex, Team, Beutel und Gigpass – und hier wird
// gespeichert.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { effekt } from '../engine/audio.js';
import { fenster, gigMarke } from '../gfx/ui.js';
import { zeichneText } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { Auswahl } from '../ui/auswahl.js';
import { Textfenster } from '../ui/textfenster.js';
import {
  spiel, speichereSpiel, spielzeitText, anzahlGigs, typhilfeAn, schalteTyphilfe, WAEHRUNG,
} from '../game/spielstand.js';
import { ARTEN_GESAMT } from '../game/hardtekkmon.js';
import { meldeAb } from '../engine/konto.js';
import { schiebe, poppe } from './stapel.js';

const EINTRAEGE = ['TEKKDEX', 'TEAM', 'BEUTEL', 'GIGPASS', 'CHEATEN', 'SPEICHERN', 'ABMELDEN', 'ZURÜCK'];

export class Menueszene {
  /** @param {object} welt Die darunterliegende Weltszene (nur zum Zeichnen). */
  constructor(welt) {
    this.ueberlagernd = true;
    this.welt = welt;
    this.auswahl = new Auswahl({ eintraege: EINTRAEGE });
    this.textfenster = new Textfenster();
    this.zeigeGigpass = false;
    /** Untermenü der optionalen Hilfen; null, solange es zu ist. */
    this.cheatAuswahl = null;
  }

  aktualisieren() {
    if (this.textfenster.aktiv) {
      this.textfenster.aktualisieren();
      return;
    }

    if (this.zeigeGigpass) {
      const antwort = this.auswahl.aktualisieren();
      if (antwort) this.zeigeGigpass = false;
      return;
    }

    if (this.cheatAuswahl) {
      this.aktualisiereCheaten();
      return;
    }

    const antwort = this.auswahl.aktualisieren();
    if (antwort === 'abbruch') {
      poppe();
      return;
    }
    if (antwort !== 'bestaetigt') return;

    switch (this.auswahl.index) {
      case 0:
        import('./tekkdex.js').then(({ Tekkdexszene }) => schiebe(new Tekkdexszene()));
        break;
      case 1:
        import('./team.js').then(({ Teamszene }) => schiebe(new Teamszene({ welt: this.welt })));
        break;
      case 2:
        import('./beutel.js').then(({ Beutelszene }) => schiebe(new Beutelszene()));
        break;
      case 3:
        this.zeigeGigpass = true;
        break;
      case 4:
        effekt('bestaetigen');
        this.cheatAuswahl = new Auswahl({ eintraege: ['Typenhilfe', 'Zurück'] });
        break;
      case 5:
        effekt('bestaetigen');
        this.textfenster.zeige(speichereSpiel()
          ? 'Spielstand gesichert. Läuft.'
          : 'Speichern hat nicht geklappt – der Browser lässt nicht.');
        break;
      case 6:
        effekt('bestaetigen');
        if (spiel) speichereSpiel();
        meldeAb().then(() => window.location.reload());
        break;
      case 7:
      default:
        poppe();
        break;
    }
  }

  aktualisiereCheaten() {
    const antwort = this.cheatAuswahl.aktualisieren();
    if (antwort === 'abbruch') {
      this.cheatAuswahl = null;
      return;
    }
    if (antwort !== 'bestaetigt') return;

    if (this.cheatAuswahl.index === 0) {
      const an = schalteTyphilfe();
      effekt('bestaetigen');
      speichereSpiel();
      this.textfenster.zeige(an
        ? 'Typenhilfe an: Im Kampf stehen wirksame Attacken grün, schwache rot.'
        : 'Typenhilfe aus. Wieder alles selbst herausfinden.');
      return;
    }
    this.cheatAuswahl = null;
  }

  zeichnen(ctx) {
    this.welt?.zeichnen(ctx);

    if (this.zeigeGigpass) {
      this.zeichneGigpass(ctx);
      this.textfenster.zeichnen(ctx);
      return;
    }

    const breite = 86;
    this.auswahl.zeichnen(ctx, BREITE - breite - 4, 4, breite, EINTRAEGE.length * 12 + 8);

    if (this.cheatAuswahl) this.zeichneCheaten(ctx);
    this.textfenster.zeichnen(ctx);
  }

  /** Untermenü der optionalen Hilfen samt aktuellem Schaltzustand. */
  zeichneCheaten(ctx) {
    const breite = 118;
    const x = 8;
    const y = 20;
    fenster(ctx, x, y, breite, 46);
    zeichneText(ctx, 'CHEATEN', x + 6, y + 5, { farbe: UI.text });
    this.cheatAuswahl.zeichnen(ctx, x, y + 14, breite, 30, {
      rahmen: false,
      zusatz: (index) => (index === 0 ? (typhilfeAn() ? 'AN' : 'AUS') : ''),
    });
  }

  zeichneGigpass(ctx) {
    fenster(ctx, 12, 10, BREITE - 24, HOEHE - 30);
    zeichneText(ctx, 'GIGPASS', 22, 16, { farbe: UI.text });
    zeichneText(ctx, spiel.spieler.name, 22, 30, { farbe: UI.text });
    zeichneText(ctx, `${WAEHRUNG} ${spiel.spieler.geld}`, 22, 42, { farbe: UI.text });
    zeichneText(ctx, `Zeit ${spielzeitText()}`, 130, 30, { farbe: UI.text });
    zeichneText(ctx, `Dex ${spiel.gefangen.size}/${ARTEN_GESAMT}`, 130, 42, { farbe: UI.text });

    zeichneText(ctx, `Marken: ${anzahlGigs()} von 8`, 22, 58, { farbe: UI.text });
    for (let i = 0; i < 8; i += 1) {
      gigMarke(ctx, i, 24 + (i % 4) * 30, 72 + Math.floor(i / 4) * 24, spiel.gigs[i]);
    }
    zeichneText(ctx, 'B: zurück', BREITE - 70, HOEHE - 34, { farbe: UI.text });
  }
}
