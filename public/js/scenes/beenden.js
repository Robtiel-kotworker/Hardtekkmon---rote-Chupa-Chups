// ============================================================================
// Beenden-Abfrage
// ----------------------------------------------------------------------------
// Überlagerung, die das rote Power-Kreuz im Gehäuse öffnet: fragt nach, ob
// wirklich beendet werden soll, und muss mit Ja oder Nein bestätigt werden.
// "Ja" sichert zuerst den Spielstand (lokal und in der Cloud), meldet ab und
// lädt die Seite neu – von dort greift wieder das Login-Tor.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { blende, fenster } from '../gfx/ui.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { Auswahl } from '../ui/auswahl.js';
import { spiel, speichereSpiel } from '../game/spielstand.js';
import { meldeAb } from '../engine/konto.js';
import { poppe, darunter } from './stapel.js';

export class Beendenszene {
  constructor() {
    this.ueberlagernd = true;
    this.auswahl = new Auswahl({ eintraege: ['Ja', 'Nein'] });
    this.beendetGerade = false;
  }

  aktualisieren() {
    if (this.beendetGerade) return;

    const antwort = this.auswahl.aktualisieren();
    if (antwort === 'abbruch') {
      poppe();
      return;
    }
    if (antwort !== 'bestaetigt') return;

    if (this.auswahl.eintraege[this.auswahl.index] === 'Ja') {
      this.beende();
    } else {
      poppe();
    }
  }

  async beende() {
    this.beendetGerade = true;
    if (spiel) speichereSpiel();
    await meldeAb();
    window.location.reload();
  }

  zeichnen(ctx) {
    darunter()?.zeichnen(ctx);
    blende(ctx, BREITE, HOEHE, 0.6);

    const titel = 'WIRKLICH BEENDEN?';
    const breite = Math.max(110, textBreite(titel) + 16);
    const hoehe = 54;
    const x = (BREITE - breite) / 2;
    const y = (HOEHE - hoehe) / 2;

    fenster(ctx, x, y, breite, hoehe, true);
    zeichneText(ctx, titel, x + (breite - textBreite(titel)) / 2, y + 6, { farbe: UI.text });
    this.auswahl.zeichnen(ctx, x + (breite - 60) / 2, y + 20, 60, 32, { rahmen: false });
  }
}
