// ============================================================================
// Team-Übersicht
// ----------------------------------------------------------------------------
// Zeigt die bis zu sechs Hardtekkmon im Team mit Sprite, Kraftpunkten und
// Zustand. Von hier aus lassen sich Reihenfolge tauschen und Heilmittel
// benutzen.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster, balken, kpFarbe, zeiger, typSchild } from '../gfx/ui.js';
import { zeichneText } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import { anzeigename, artVon, maxKp, heile, istUmgekippt } from '../game/hardtekkmon.js';
import { spiel, nimmGegenstand } from '../game/spielstand.js';
import { gegenstandInfo } from '../data/gegenstaende.js';
import { Textfenster } from '../ui/textfenster.js';
import { poppe } from './stapel.js';

export class Teamszene {
  /**
   * @param {{ gegenstand?: string }} [vorgabe] Wird ein Gegenstand übergeben,
   * dient die Auswahl dem Anwenden dieses Gegenstands.
   */
  constructor(vorgabe = {}) {
    this.ueberlagernd = false;
    this.index = 0;
    this.tauschIndex = null;
    this.gegenstand = vorgabe.gegenstand ?? null;
    this.textfenster = new Textfenster();
    this.bildzaehler = 0;
  }

  aktualisieren() {
    this.bildzaehler += 1;

    if (this.textfenster.aktiv) {
      this.textfenster.aktualisieren();
      return;
    }

    const anzahl = spiel.team.length;
    if (anzahl === 0) {
      poppe();
      return;
    }

    if (gedrueckt('DOWN')) { this.index = (this.index + 1) % anzahl; effekt('auswahl'); }
    if (gedrueckt('UP')) { this.index = (this.index - 1 + anzahl) % anzahl; effekt('auswahl'); }

    if (gedrueckt('A')) this.bestaetige();
    if (gedrueckt('B')) {
      effekt('zurueck');
      if (this.tauschIndex !== null) this.tauschIndex = null;
      else poppe();
    }
  }

  bestaetige() {
    const mon = spiel.team[this.index];
    if (!mon) return;

    if (this.gegenstand) {
      this.benutzeGegenstand(mon);
      return;
    }

    if (this.tauschIndex === null) {
      this.tauschIndex = this.index;
      effekt('bestaetigen');
      return;
    }

    const anderes = spiel.team[this.tauschIndex];
    spiel.team[this.tauschIndex] = mon;
    spiel.team[this.index] = anderes;
    this.tauschIndex = null;
    effekt('bestaetigen');
  }

  benutzeGegenstand(mon) {
    const daten = gegenstandInfo(this.gegenstand);
    if (!daten) return;

    if (daten.art === 'heilung') {
      if (istUmgekippt(mon)) {
        this.textfenster.zeige('Das steht nicht mehr. Da hilft nur ein Riegel.');
        return;
      }
      const geheilt = heile(mon, daten.wirkung.kp);
      if (geheilt === 0) {
        this.textfenster.zeige(`${anzeigename(mon)} ist schon voll da.`);
        return;
      }
      nimmGegenstand(this.gegenstand, 1);
      effekt('item');
      this.textfenster.zeige(`${anzeigename(mon)} bekommt ${geheilt} Kraftpunkte zurück.`);
    } else if (daten.art === 'status') {
      if (mon.status && daten.wirkung.heiltStatus.includes(mon.status)) {
        mon.status = null;
        nimmGegenstand(this.gegenstand, 1);
        effekt('item');
        this.textfenster.zeige(`${anzeigename(mon)} geht es wieder gut.`);
      } else {
        this.textfenster.zeige('Das bringt hier gerade nichts.');
      }
    } else if (daten.art === 'beleben') {
      if (!istUmgekippt(mon)) {
        this.textfenster.zeige('Das steht doch noch!');
        return;
      }
      mon.kp = Math.max(1, Math.floor(maxKp(mon) * daten.wirkung.beleben));
      nimmGegenstand(this.gegenstand, 1);
      effekt('item');
      this.textfenster.zeige(`${anzeigename(mon)} ist wieder auf den Beinen!`);
    }

    if (!spiel.beutel[this.gegenstand]) this.gegenstand = null;
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    zeichneText(ctx, this.gegenstand ? `${this.gegenstand} – für wen?` : 'DEIN TEAM', 8, 5,
      { farbe: UI.textHell, schatten: UI.dunkel });

    spiel.team.forEach((mon, i) => {
      const x = 4;
      const y = 16 + i * 23;
      const gewaehlt = i === this.index;
      fenster(ctx, x, y, BREITE - 8, 22, this.tauschIndex === i);

      ctx.drawImage(monSprite(artVon(mon), 'klein'), x + 3, y - 3, 28, 28);
      zeichneText(ctx, anzeigename(mon), x + 34, y + 3, { farbe: UI.text });
      zeichneText(ctx, `St.${mon.stufe}`, x + 34, y + 12, { farbe: UI.text });

      const grenze = maxKp(mon);
      const anteil = mon.kp / grenze;
      balken(ctx, x + 120, y + 6, 70, anteil, kpFarbe(anteil));
      zeichneText(ctx, `${mon.kp}/${grenze}`, x + 120, y + 12, { farbe: UI.text });

      if (mon.status) {
        ctx.fillStyle = '#c03050';
        ctx.fillRect(x + 196, y + 5, 32, 8);
        zeichneText(ctx, mon.status.slice(0, 4).toUpperCase(), x + 198, y + 6, { farbe: '#f8f8f0' });
      } else {
        typSchild(ctx, artVon(mon).typen[0], x + 196, y + 5);
      }

      if (gewaehlt) zeiger(ctx, x - 2, y + 8, this.bildzaehler);
    });

    this.textfenster.zeichnen(ctx);
  }
}
