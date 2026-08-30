// ============================================================================
// Team-Übersicht
// ----------------------------------------------------------------------------
// Zeigt die bis zu sechs Hardtekkmon im Team mit Sprite, Kraftpunkten und
// Zustand. Ein Klick auf ein Hardtekkmon öffnet ein Untermenü (Geben/Nehmen/
// Tauschen); daneben kommt hier auch das direkte Anwenden eines im Beutel
// gewählten Gegenstands an (siehe Konstruktor).
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster, balken, kpFarbe, zeiger, typSchild } from '../gfx/ui.js';
import { zeichneText } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import {
  anzeigename, artVon, maxKp, heile, istUmgekippt, stufeErhoehen, entwicklungFaellig, entwickle,
} from '../game/hardtekkmon.js';
import { spiel, nimmGegenstand, gibGegenstand, merkeGefangen } from '../game/spielstand.js';
import { gegenstandInfo, tragbar } from '../data/gegenstaende.js';
import { Auswahl } from '../ui/auswahl.js';
import { Textfenster } from '../ui/textfenster.js';
import { poppe } from './stapel.js';

const UNTERMENUE_EINTRAEGE = ['Geben', 'Nehmen', 'Tauschen'];

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
    // Untermenü Geben/Nehmen/Tauschen für das per A ausgewählte Hardtekkmon.
    this.untermenue = null;
    this.untermenueMon = null;
    // Item-Auswahl innerhalb von "Geben".
    this.gebenListe = null;
    this.gebenNamen = [];
    this.gebenMon = null;
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

    if (this.gebenListe) {
      this.aktualisiereGebenListe();
      return;
    }
    if (this.untermenue) {
      this.aktualisiereUntermenue();
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

    if (this.tauschIndex !== null) {
      const anderes = spiel.team[this.tauschIndex];
      spiel.team[this.tauschIndex] = mon;
      spiel.team[this.index] = anderes;
      this.tauschIndex = null;
      effekt('bestaetigen');
      return;
    }

    this.untermenue = new Auswahl({ eintraege: UNTERMENUE_EINTRAEGE });
    this.untermenueMon = this.index;
    effekt('bestaetigen');
  }

  /** Verarbeitet Geben/Nehmen/Tauschen für das zuvor ausgewählte Hardtekkmon. */
  aktualisiereUntermenue() {
    const antwort = this.untermenue.aktualisieren();
    if (antwort === 'abbruch') {
      effekt('zurueck');
      this.untermenue = null;
      this.untermenueMon = null;
      return;
    }
    if (antwort !== 'bestaetigt') return;

    const mon = spiel.team[this.untermenueMon];
    const wahl = this.untermenue.index;
    const monIndex = this.untermenueMon;
    this.untermenue = null;
    this.untermenueMon = null;
    if (!mon) return;

    if (wahl === 0) this.oeffneGebenListe(mon);
    else if (wahl === 1) this.nehmen(mon);
    else {
      // Tauschen: Position dieses Hardtekkmon merken, die Bestätigung auf
      // dem Zielplatz erledigt bestaetige() wie gehabt.
      this.tauschIndex = monIndex;
      this.index = monIndex;
    }
  }

  /** Öffnet die Auswahl der trag- und gebbaren Gegenstände im Beutel. */
  oeffneGebenListe(mon) {
    this.gebenNamen = Object.keys(spiel.beutel)
      .filter(tragbar)
      .sort((a, b) => a.localeCompare(b, 'de'));

    if (this.gebenNamen.length === 0) {
      this.textfenster.zeige('Nichts im Beutel, das sich zum Tragen geben lässt.');
      return;
    }
    this.gebenMon = mon;
    this.gebenListe = new Auswahl({ eintraege: this.gebenNamen, sichtbar: 6 });
  }

  aktualisiereGebenListe() {
    const antwort = this.gebenListe.aktualisieren();
    if (antwort === 'abbruch') {
      effekt('zurueck');
      this.gebenListe = null;
      this.gebenMon = null;
      return;
    }
    if (antwort !== 'bestaetigt') return;

    const name = this.gebenNamen[this.gebenListe.index];
    const mon = this.gebenMon;
    this.gebenListe = null;
    this.gebenMon = null;
    this.trageAn(mon, name);
  }

  /** Nimmt ein getragenes Item ab und legt es zurück in den Beutel. */
  nehmen(mon) {
    if (!mon.item) {
      this.textfenster.zeige(`${anzeigename(mon)} trägt gerade nichts.`);
      return;
    }
    const item = mon.item;
    mon.item = null;
    gibGegenstand(item, 1);
    effekt('item');
    this.textfenster.zeige(`${anzeigename(mon)} gibt ${item} zurück in den Beutel.`);
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
        this.textfenster.zeige('Das würde nichts bringen.');
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
    } else if (daten.art === 'levelauf') {
      if (mon.stufe >= 100) {
        this.textfenster.zeige('Das würde nichts bringen.');
        return;
      }
      const { neueAttacken } = stufeErhoehen(mon);
      nimmGegenstand(this.gegenstand, 1);
      effekt('aufstieg');
      const meldungen = [`${anzeigename(mon)} ist jetzt auf Stufe ${mon.stufe}!`];
      for (const attacke of neueAttacken) meldungen.push(`${anzeigename(mon)} lernt ${attacke}!`);

      const zielArt = entwicklungFaellig(mon);
      if (zielArt) {
        const alterName = anzeigename(mon);
        entwickle(mon, zielArt);
        merkeGefangen(zielArt.id);
        meldungen.push(`Was passiert denn da? ${alterName} wird zu ${zielArt.name}!`);
      }
      this.textfenster.zeige(meldungen);
    } else if (daten.art === 'anlege') {
      this.trageAn(mon, this.gegenstand);
      return;
    }

    if (!spiel.beutel[this.gegenstand]) this.gegenstand = null;
  }

  /**
   * Legt ein Gegenstand zum Tragen an (oder wieder ab, wenn er es schon ist).
   * Trägt das Hardtekkmon bereits etwas anderes, wandert das zurück in den
   * Beutel – es kann immer nur ein Item gleichzeitig getragen werden.
   */
  trageAn(mon, name) {
    const bisher = mon.item;
    if (bisher === name) {
      mon.item = null;
      gibGegenstand(name, 1);
      effekt('item');
      this.textfenster.zeige(`${anzeigename(mon)} legt ${name} wieder ab.`);
    } else {
      if (bisher) gibGegenstand(bisher, 1);
      mon.item = name;
      nimmGegenstand(name, 1);
      effekt('item');
      this.textfenster.zeige(bisher
        ? `${anzeigename(mon)} tauscht ${bisher} gegen ${name}.`
        : `${anzeigename(mon)} trägt jetzt ${name}.`);
    }

    if (this.gegenstand && !spiel.beutel[this.gegenstand]) this.gegenstand = null;
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
      zeichneText(ctx, mon.item ? `St.${mon.stufe} · ${mon.item}` : `St.${mon.stufe}`, x + 34, y + 12,
        { farbe: UI.text });

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

    if (this.untermenue) this.zeichneUntermenue(ctx);
    if (this.gebenListe) this.zeichneGebenListe(ctx);

    this.textfenster.zeichnen(ctx);
  }

  /** Geben/Nehmen/Tauschen, aufgeklappt neben der Zeile des gewählten Hardtekkmon. */
  zeichneUntermenue(ctx) {
    const hoehe = UNTERMENUE_EINTRAEGE.length * 14 + 8;
    const y = Math.max(4, Math.min(16 + this.untermenueMon * 23, HOEHE - hoehe - 4));
    this.untermenue.zeichnen(ctx, 128, y, 108, hoehe, { zeilenhoehe: 14 });
  }

  /** Auswahl der trag- und gebbaren Gegenstände im Beutel, für "Geben". */
  zeichneGebenListe(ctx) {
    zeichneText(ctx, `${anzeigename(this.gebenMon)} tragen lassen:`, 8, 5,
      { farbe: UI.textHell, schatten: UI.dunkel });
    this.gebenListe.zeichnen(ctx, 20, 16, BREITE - 40, HOEHE - 28, {
      zeilenhoehe: 12,
      zusatz: (index) => `×${spiel.beutel[this.gebenNamen[index]] ?? 0}`,
    });
  }
}
