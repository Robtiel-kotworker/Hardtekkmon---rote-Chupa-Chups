// ============================================================================
// Lager (Computer im Boxenstopp)
// ----------------------------------------------------------------------------
// Zwei Spalten – Team links, Kiste rechts. Mit A wird ein Hardtekkmon
// aufgenommen und mit erneutem A auf einem anderen Platz abgelegt (Tausch
// innerhalb einer Spalte, Verschieben zwischen Team und Kiste). Das Team
// braucht mindestens ein einsatzbereites Mitglied und ist auf sechs begrenzt –
// beides wird hier durchgesetzt, nicht nur beim Fangen.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster, zeiger } from '../gfx/ui.js';
import { zeichneText } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import { anzeigename, artVon, MAX_TEAM } from '../game/hardtekkmon.js';
import { spiel, speichereSpiel } from '../game/spielstand.js';
import { Textfenster } from '../ui/textfenster.js';
import { poppe } from './stapel.js';

const SICHTBAR = 6;
const ZEILENHOEHE = 24;
const SPALTE_X = { team: 2, lager: 122 };
const SPALTE_BREITE = 116;

export class Lagerszene {
  constructor() {
    this.spalte = 'team';
    this.teamIndex = 0;
    this.lagerIndex = 0;
    this.lagerAnfang = 0;
    /** @type {{ ort: 'team'|'lager', index: number }|null} */
    this.gehalten = null;
    this.textfenster = new Textfenster();
    this.bildzaehler = 0;
  }

  aktiveListe() {
    return this.spalte === 'team' ? spiel.team : spiel.lager;
  }

  aktiverIndex() {
    return this.spalte === 'team' ? this.teamIndex : this.lagerIndex;
  }

  setzeIndex(wert) {
    if (this.spalte === 'team') this.teamIndex = wert;
    else this.lagerIndex = wert;
  }

  aktualisieren() {
    this.bildzaehler += 1;
    if (this.textfenster.aktiv) {
      this.textfenster.aktualisieren();
      return;
    }

    if (gedrueckt('LEFT') && this.spalte !== 'team') {
      this.spalte = 'team';
      effekt('auswahl');
    }
    if (gedrueckt('RIGHT') && this.spalte !== 'lager') {
      this.spalte = 'lager';
      effekt('auswahl');
    }

    const liste = this.aktiveListe();
    if (liste.length > 0) {
      if (gedrueckt('DOWN')) {
        this.setzeIndex((this.aktiverIndex() + 1) % liste.length);
        this.haltePosition();
        effekt('auswahl');
      }
      if (gedrueckt('UP')) {
        this.setzeIndex((this.aktiverIndex() - 1 + liste.length) % liste.length);
        this.haltePosition();
        effekt('auswahl');
      }
    }

    if (gedrueckt('A')) this.bestaetige();
    if (gedrueckt('B')) {
      effekt('zurueck');
      if (this.gehalten) this.gehalten = null;
      else poppe();
    }
  }

  haltePosition() {
    if (this.spalte !== 'lager') return;
    if (this.lagerIndex < this.lagerAnfang) this.lagerAnfang = this.lagerIndex;
    if (this.lagerIndex >= this.lagerAnfang + SICHTBAR) this.lagerAnfang = this.lagerIndex - SICHTBAR + 1;
  }

  bestaetige() {
    const liste = this.aktiveListe();
    if (liste.length === 0) {
      if (this.gehalten) this.lege(this.spalte, null);
      return;
    }

    if (!this.gehalten) {
      this.gehalten = { ort: this.spalte, index: this.aktiverIndex() };
      effekt('bestaetigen');
      return;
    }

    if (this.gehalten.ort === this.spalte && this.gehalten.index === this.aktiverIndex()) {
      // Nochmal auf demselben Platz bestätigt: Aufnehmen rückgängig machen.
      this.gehalten = null;
      effekt('zurueck');
      return;
    }

    this.lege(this.spalte, this.aktiverIndex());
  }

  /** Legt das aufgenommene Hardtekkmon auf `zielIndex` in `zielOrt` ab (oder ans Ende, wenn null). */
  lege(zielOrt, zielIndex) {
    const { ort: quellOrt, index: quellIndex } = this.gehalten;

    if (quellOrt === zielOrt) {
      if (zielIndex === null) {
        this.gehalten = null;
        return;
      }
      const liste = quellOrt === 'team' ? spiel.team : spiel.lager;
      [liste[quellIndex], liste[zielIndex]] = [liste[zielIndex], liste[quellIndex]];
      this.gehalten = null;
      effekt('bestaetigen');
      speichereSpiel();
      return;
    }

    if (quellOrt === 'team' && zielOrt === 'lager') {
      if (spiel.team.length <= 1) {
        this.textfenster.zeige('Mindestens ein Hardtekkmon muss im Team bleiben.');
        this.gehalten = null;
        return;
      }
      const [mon] = spiel.team.splice(quellIndex, 1);
      if (zielIndex === null || zielIndex >= spiel.lager.length) spiel.lager.push(mon);
      else spiel.lager.splice(zielIndex, 0, mon);
    } else {
      if (spiel.team.length >= MAX_TEAM) {
        this.textfenster.zeige('Das Team ist bereits voll.');
        this.gehalten = null;
        return;
      }
      const [mon] = spiel.lager.splice(quellIndex, 1);
      if (zielIndex === null || zielIndex >= spiel.team.length) spiel.team.push(mon);
      else spiel.team.splice(zielIndex, 0, mon);
    }

    this.teamIndex = Math.min(this.teamIndex, Math.max(0, spiel.team.length - 1));
    this.lagerIndex = Math.min(this.lagerIndex, Math.max(0, spiel.lager.length - 1));
    this.haltePosition();
    this.gehalten = null;
    effekt('bestaetigen');
    speichereSpiel();
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    zeichneText(ctx, 'TEAM', SPALTE_X.team + 4, 4, { farbe: UI.textHell, schatten: UI.dunkel });
    zeichneText(ctx, `KISTE  ${spiel.lager.length}`, SPALTE_X.lager + 4, 4, { farbe: UI.textHell, schatten: UI.dunkel });

    this.zeichneSpalte(ctx, spiel.team, SPALTE_X.team, 'team', 0);
    this.zeichneSpalte(ctx, spiel.lager, SPALTE_X.lager, 'lager', this.lagerAnfang);

    const hinweis = this.gehalten
      ? 'A: hier ablegen   B: abbrechen'
      : 'A: aufnehmen   ←→: Spalte   B: zurück';
    zeichneText(ctx, hinweis, 4, HOEHE - 9, { farbe: UI.textSchatten });

    this.textfenster.zeichnen(ctx);
  }

  zeichneSpalte(ctx, liste, x, ort, anfang) {
    for (let zeile = 0; zeile < SICHTBAR; zeile += 1) {
      const index = anfang + zeile;
      const zeileY = 12 + zeile * ZEILENHOEHE;
      const mon = liste[index];
      const gewaehlt = this.spalte === ort && this.aktiverIndex() === index;
      const aufgenommen = this.gehalten && this.gehalten.ort === ort && this.gehalten.index === index;

      fenster(ctx, x, zeileY, SPALTE_BREITE, ZEILENHOEHE - 2, aufgenommen);

      if (gewaehlt) zeiger(ctx, x - 2, zeileY + 9, this.bildzaehler);

      if (!mon) {
        zeichneText(ctx, '–leer–', x + 8, zeileY + 8, { farbe: UI.textSchatten });
        continue;
      }
      if (aufgenommen) continue;

      ctx.drawImage(monSprite(artVon(mon), 'klein'), x + 2, zeileY - 3, 22, 22);
      zeichneText(ctx, anzeigename(mon), x + 26, zeileY + 3, { farbe: UI.text });
      zeichneText(ctx, `St.${mon.stufe}`, x + 26, zeileY + 12, { farbe: UI.text });
    }

    if (anfang > 0) zeichneText(ctx, '▲', x + SPALTE_BREITE - 10, 4, { farbe: UI.auswahl });
    if (anfang + SICHTBAR < liste.length) {
      zeichneText(ctx, '▼', x + SPALTE_BREITE - 10, 12 + SICHTBAR * ZEILENHOEHE - 8, { farbe: UI.auswahl });
    }
  }
}
