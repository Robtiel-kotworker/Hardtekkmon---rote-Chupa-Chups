// ============================================================================
// Tekkdex
// ----------------------------------------------------------------------------
// Verzeichnis aller 151 Hardtekkmon. Gesehene stehen mit Namen drin, gefangene
// zusätzlich mit Werten und Beschreibung. Alles andere bleibt vorerst ein
// Fragezeichen.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster, typSchild, balken } from '../gfx/ui.js';
import { zeichneText, umbrechen, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import { ARTEN } from '../data/arten.js';
import { spiel } from '../game/spielstand.js';
import { poppe } from './stapel.js';

const ZEILEN = 8;

export class Tekkdexszene {
  constructor() {
    this.index = 0;
    this.anfang = 0;
    this.detail = false;
    this.bildzaehler = 0;
  }

  gesehen(artDaten) {
    return spiel.gesehen.has(artDaten.id);
  }

  gefangen(artDaten) {
    return spiel.gefangen.has(artDaten.id);
  }

  aktualisieren() {
    this.bildzaehler += 1;
    const schritt = (menge) => {
      this.index = (this.index + menge + ARTEN.length) % ARTEN.length;
      if (this.index < this.anfang) this.anfang = this.index;
      if (this.index >= this.anfang + ZEILEN) this.anfang = this.index - ZEILEN + 1;
      effekt('auswahl');
    };

    if (gedrueckt('DOWN')) schritt(1);
    if (gedrueckt('UP')) schritt(-1);
    if (gedrueckt('RIGHT')) schritt(ZEILEN);
    if (gedrueckt('LEFT')) schritt(-ZEILEN);

    if (gedrueckt('A')) {
      if (this.gesehen(ARTEN[this.index])) {
        this.detail = !this.detail;
        effekt('bestaetigen');
      }
    }
    if (gedrueckt('B')) {
      effekt('zurueck');
      if (this.detail) this.detail = false;
      else poppe();
    }
  }

  zeichnen(ctx) {
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    if (this.detail) this.zeichneDetail(ctx);
    else this.zeichneListe(ctx);
  }

  zeichneListe(ctx) {
    zeichneText(ctx, 'TEKKDEX', 8, 5, { farbe: UI.textHell, schatten: UI.dunkel });
    const stand = `Gesehen ${spiel.gesehen.size}  Gefangen ${spiel.gefangen.size}`;
    zeichneText(ctx, stand, BREITE - textBreite(stand) - 34, 5, { farbe: UI.textHell, schatten: UI.dunkel });

    fenster(ctx, 4, 14, BREITE - 8, HOEHE - 20);

    for (let zeile = 0; zeile < ZEILEN; zeile += 1) {
      const eintrag = ARTEN[this.anfang + zeile];
      if (!eintrag) break;

      const y = 20 + zeile * 16;
      const gewaehlt = this.anfang + zeile === this.index;
      if (gewaehlt) {
        ctx.fillStyle = 'rgba(224, 64, 88, 0.18)';
        ctx.fillRect(8, y - 2, BREITE - 16, 15);
      }

      const nummer = String(eintrag.id).padStart(3, '0');
      zeichneText(ctx, nummer, 12, y + 1, { farbe: UI.text });

      if (!this.gesehen(eintrag)) {
        zeichneText(ctx, '???', 40, y + 1, { farbe: UI.textSchatten });
        continue;
      }

      ctx.drawImage(monSprite(eintrag, 'klein'), 34, y - 6, 16, 16);
      zeichneText(ctx, eintrag.name, 54, y + 1, { farbe: UI.text });
      if (this.gefangen(eintrag)) zeichneText(ctx, '★', BREITE - 22, y + 1, { farbe: UI.gold });
    }
  }

  zeichneDetail(ctx) {
    const eintrag = ARTEN[this.index];
    fenster(ctx, 4, 4, BREITE - 8, HOEHE - 8);

    zeichneText(ctx, `Nr. ${String(eintrag.id).padStart(3, '0')}  ${eintrag.name}`, 12, 10, { farbe: UI.text });
    ctx.drawImage(monSprite(eintrag, 'front'), 10, 22);

    let x = 74;
    for (const typ of eintrag.typen) x += typSchild(ctx, typ, x, 24) + 4;

    const werte = [
      ['KP', eintrag.basis.kp], ['ANG', eintrag.basis.ang], ['VER', eintrag.basis.ver],
      ['SPA', eintrag.basis.spa], ['SPV', eintrag.basis.spv], ['INI', eintrag.basis.ini],
    ];
    werte.forEach(([name, wert], i) => {
      const y = 38 + i * 10;
      zeichneText(ctx, name, 74, y, { farbe: UI.text });
      balken(ctx, 98, y + 2, 60, wert / 140, UI.erfahrung, 3);
      zeichneText(ctx, String(wert), 164, y, { farbe: UI.text });
    });

    if (this.gefangen(eintrag)) {
      umbrechen(eintrag.text, BREITE - 30).slice(0, 3).forEach((zeile, i) => {
        zeichneText(ctx, zeile, 12, 108 + i * 10, { farbe: UI.text });
      });
    } else {
      zeichneText(ctx, 'Noch nicht gefangen – keine Daten.', 12, 118, { farbe: UI.textSchatten });
    }

    zeichneText(ctx, 'B: zurück', BREITE - 56, HOEHE - 16, { farbe: UI.text });
  }
}
