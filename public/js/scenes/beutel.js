// ============================================================================
// Beutel
// ----------------------------------------------------------------------------
// Der Inhalt wird nach Art gruppiert – Samplepacks, Heilmittel, Zustands-
// mittel, Kampfhilfen, Schlüsselgegenstände. Mit A wird ein Gegenstand
// benutzt, bei Heilmitteln öffnet sich dafür die Team-Übersicht.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster, gegenstandSymbol } from '../gfx/ui.js';
import { zeichneText, umbrechen } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { Auswahl } from '../ui/auswahl.js';
import { spiel } from '../game/spielstand.js';
import { GEGENSTAENDE, BEUTEL_REIHENFOLGE, ausserhalbNutzbar, anlegbar } from '../data/gegenstaende.js';
import { schiebe, poppe } from './stapel.js';

const GRUPPENNAMEN = {
  fang: 'SAMPLEPACKS',
  heilung: 'HEILMITTEL',
  status: 'ZUSTAND',
  beleben: 'AUFWECKER',
  levelauf: 'BOOST',
  kampfhilfe: 'KAMPFHILFEN',
  anlege: 'ANLEGEN',
  schluessel: 'WICHTIGES',
};

export class Beutelszene {
  constructor() {
    this.gruppe = 0;
    this.auswahl = new Auswahl({ eintraege: [], sichtbar: 7 });
    this.aktualisiereListe();
  }

  get gruppenname() {
    return BEUTEL_REIHENFOLGE[this.gruppe];
  }

  /** Alle Gegenstände der aktuellen Gruppe, alphabetisch. */
  gegenstaendeDerGruppe() {
    return Object.keys(spiel.beutel)
      .filter((name) => GEGENSTAENDE[name]?.art === this.gruppenname)
      .sort((a, b) => a.localeCompare(b, 'de'));
  }

  aktualisiereListe() {
    this.namen = this.gegenstaendeDerGruppe();
    this.auswahl.setzeEintraege(this.namen);
    this.auswahl.anfang = 0;
  }

  aktualisieren() {
    if (gedrueckt('LEFT')) {
      this.gruppe = (this.gruppe - 1 + BEUTEL_REIHENFOLGE.length) % BEUTEL_REIHENFOLGE.length;
      this.aktualisiereListe();
      effekt('auswahl');
      return;
    }
    if (gedrueckt('RIGHT')) {
      this.gruppe = (this.gruppe + 1) % BEUTEL_REIHENFOLGE.length;
      this.aktualisiereListe();
      effekt('auswahl');
      return;
    }

    const antwort = this.auswahl.aktualisieren();
    if (antwort === 'abbruch') {
      poppe();
      return;
    }
    if (antwort !== 'bestaetigt') return;

    const name = this.namen[this.auswahl.index];
    if (!name || (!ausserhalbNutzbar(name) && !anlegbar(name))) return;

    import('./team.js').then(({ Teamszene }) => schiebe(new Teamszene({ gegenstand: name })));
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    zeichneText(ctx, GRUPPENNAMEN[this.gruppenname], 8, 5, { farbe: UI.textHell, schatten: UI.dunkel });
    // Oben rechts liegen die Bildschirmschalter – dort bleibt Platz frei.
    zeichneText(ctx, '← →', BREITE - 66, 5, { farbe: UI.textHell, schatten: UI.dunkel });

    this.auswahl.zeichnen(ctx, 4, 14, 150, 92, {
      zeilenhoehe: 12,
      zusatz: (index) => (
        GEGENSTAENDE[this.namen[index]]?.art === 'schluessel' ? '' : `×${spiel.beutel[this.namen[index]]}`
      ),
    });

    fenster(ctx, 158, 14, 78, 92);
    zeichneText(ctx, `Mücken`, 164, 20, { farbe: UI.text });
    zeichneText(ctx, String(spiel.spieler.geld), 164, 30, { farbe: UI.text });

    const name = this.namen[this.auswahl.index];
    if (name) gegenstandSymbol(ctx, GEGENSTAENDE[name].symbol, 188, 52);
    zeichneText(ctx, 'A: benutzen', 164, 76, { farbe: UI.text });
    zeichneText(ctx, 'B: zurück', 164, 88, { farbe: UI.text });

    fenster(ctx, 4, 108, BREITE - 8, 40);
    const beschreibung = name ? GEGENSTAENDE[name].text : 'Hier ist gerade nichts drin.';
    umbrechen(beschreibung, BREITE - 24).slice(0, 3).forEach((zeile, i) => {
      zeichneText(ctx, zeile, 12, 114 + i * 11, { farbe: UI.text });
    });
  }
}
