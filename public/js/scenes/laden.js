// ============================================================================
// Kiosk
// ----------------------------------------------------------------------------
// Kaufen und Verkaufen. Verkauft wird zum halben Preis – Schlüsselgegenstände
// nimmt niemand an.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster, gegenstandSymbol } from '../gfx/ui.js';
import { zeichneText, umbrechen } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { Auswahl } from '../ui/auswahl.js';
import { Textfenster } from '../ui/textfenster.js';
import { GEGENSTAENDE } from '../data/gegenstaende.js';
import { spiel, gibGegenstand, nimmGegenstand, aendereGeld } from '../game/spielstand.js';
import { poppe } from './stapel.js';

export class Ladenszene {
  /** @param {string[]} waren */
  constructor(waren) {
    this.waren = waren.filter((name) => GEGENSTAENDE[name]);
    this.modus = 'hauptmenue';
    this.textfenster = new Textfenster();
    this.hauptmenue = new Auswahl({ eintraege: ['KAUFEN', 'VERKAUFEN', 'TSCHÜSS'] });
    this.kaufmenue = new Auswahl({ eintraege: this.waren, sichtbar: 6 });
    this.verkaufNamen = [];
    this.verkaufmenue = new Auswahl({ eintraege: [], sichtbar: 6 });
    this.menge = 1;
  }

  aktualisieren() {
    if (this.textfenster.aktiv) {
      this.textfenster.aktualisieren();
      return;
    }

    switch (this.modus) {
      case 'hauptmenue': this.aktualisiereHauptmenue(); break;
      case 'kaufen': this.aktualisiereKaufen(); break;
      case 'menge': this.aktualisiereMenge(); break;
      case 'verkaufen': this.aktualisiereVerkaufen(); break;
      default: break;
    }
  }

  aktualisiereHauptmenue() {
    const antwort = this.hauptmenue.aktualisieren();
    if (antwort === 'abbruch') { poppe(); return; }
    if (antwort !== 'bestaetigt') return;

    if (this.hauptmenue.index === 0) {
      this.modus = 'kaufen';
    } else if (this.hauptmenue.index === 1) {
      this.verkaufNamen = Object.keys(spiel.beutel)
        .filter((name) => GEGENSTAENDE[name] && GEGENSTAENDE[name].art !== 'schluessel');
      if (this.verkaufNamen.length === 0) {
        this.textfenster.zeige('Du hast nichts, was ich brauchen könnte.');
        return;
      }
      this.verkaufmenue.setzeEintraege(this.verkaufNamen);
      this.modus = 'verkaufen';
    } else {
      poppe();
    }
  }

  aktualisiereKaufen() {
    const antwort = this.kaufmenue.aktualisieren();
    if (antwort === 'abbruch') { this.modus = 'hauptmenue'; return; }
    if (antwort !== 'bestaetigt') return;

    this.menge = 1;
    this.modus = 'menge';
  }

  aktualisiereMenge() {
    const name = this.waren[this.kaufmenue.index];
    const preis = GEGENSTAENDE[name].preis;

    if (gedrueckt('UP')) this.menge = Math.min(99, this.menge + 1);
    if (gedrueckt('DOWN')) this.menge = Math.max(1, this.menge - 1);
    if (gedrueckt('B')) { effekt('zurueck'); this.modus = 'kaufen'; return; }
    if (!gedrueckt('A')) return;

    const summe = preis * this.menge;
    if (spiel.spieler.geld < summe) {
      effekt('zurueck');
      this.textfenster.zeige('Dafür reicht das Geld nicht.');
      this.modus = 'kaufen';
      return;
    }

    aendereGeld(-summe);
    gibGegenstand(name, this.menge);
    effekt('item');
    this.textfenster.zeige(`${this.menge}× ${name} für ${summe} Mücken. Danke!`);
    this.modus = 'kaufen';
  }

  aktualisiereVerkaufen() {
    const antwort = this.verkaufmenue.aktualisieren();
    if (antwort === 'abbruch') { this.modus = 'hauptmenue'; return; }
    if (antwort !== 'bestaetigt') return;

    const name = this.verkaufNamen[this.verkaufmenue.index];
    const preis = Math.floor(GEGENSTAENDE[name].preis / 2);
    nimmGegenstand(name, 1);
    aendereGeld(preis);
    effekt('item');
    this.textfenster.zeige(`${name} für ${preis} Mücken verkauft.`);

    this.verkaufNamen = Object.keys(spiel.beutel)
      .filter((eintrag) => GEGENSTAENDE[eintrag] && GEGENSTAENDE[eintrag].art !== 'schluessel');
    this.verkaufmenue.setzeEintraege(this.verkaufNamen);
    if (this.verkaufNamen.length === 0) this.modus = 'hauptmenue';
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(0, 0, BREITE, HOEHE);
    zeichneText(ctx, 'KIOSK', 8, 5, { farbe: UI.textHell, schatten: UI.dunkel });

    // Rechts oben liegen die Bildschirmschalter, deshalb etwas eingerückt.
    fenster(ctx, BREITE - 124, 2, 88, 16);
    zeichneText(ctx, `Mücken: ${spiel.spieler.geld}`, BREITE - 118, 6, { farbe: UI.text });

    if (this.modus === 'hauptmenue') {
      this.hauptmenue.zeichnen(ctx, 8, 24, 90, 44);
    } else if (this.modus === 'kaufen' || this.modus === 'menge') {
      this.kaufmenue.zeichnen(ctx, 4, 22, 190, 82, {
        zeilenhoehe: 12,
        zusatz: (index) => `${GEGENSTAENDE[this.waren[index]].preis}`,
      });
      this.zeichneBeschreibung(ctx, this.waren[this.kaufmenue.index]);

      if (this.modus === 'menge') {
        const name = this.waren[this.kaufmenue.index];
        const summe = GEGENSTAENDE[name].preis * this.menge;
        fenster(ctx, 150, 60, 86, 30);
        zeichneText(ctx, `Menge  ${this.menge}`, 156, 66, { farbe: UI.text });
        zeichneText(ctx, `= ${summe}`, 156, 78, { farbe: UI.text });
      }
    } else if (this.modus === 'verkaufen') {
      this.verkaufmenue.zeichnen(ctx, 4, 22, 190, 82, {
        zeilenhoehe: 12,
        zusatz: (index) => `×${spiel.beutel[this.verkaufNamen[index]] ?? 0}`,
      });
      this.zeichneBeschreibung(ctx, this.verkaufNamen[this.verkaufmenue.index]);
    }

    this.textfenster.zeichnen(ctx);
  }

  /** Beschreibung als breites Fenster unten – so passt jedes Wort in die Zeile. */
  zeichneBeschreibung(ctx, name) {
    fenster(ctx, 4, 108, BREITE - 8, 40);
    if (!name) return;
    gegenstandSymbol(ctx, GEGENSTAENDE[name].symbol, 8, 120);
    umbrechen(GEGENSTAENDE[name].text, BREITE - 44).slice(0, 3).forEach((zeile, i) => {
      zeichneText(ctx, zeile, 28, 114 + i * 11, { farbe: UI.text });
    });
  }
}
