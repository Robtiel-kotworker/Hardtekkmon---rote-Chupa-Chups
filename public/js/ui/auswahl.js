// ============================================================================
// Auswahlliste
// ----------------------------------------------------------------------------
// Ein Listenmenü mit Zeiger, wahlweise ein- oder zweispaltig und mit
// Bildlauf. Menüs, Beutel, Team-Übersicht und Kampfmenü benutzen es
// gemeinsam, damit die Steuerung überall gleich funktioniert.
// ============================================================================

import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster, zeiger } from '../gfx/ui.js';
import { zeichneText } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';

export class Auswahl {
  /**
   * @param {{ eintraege: string[], spalten?: number, sichtbar?: number, umlaufend?: boolean }} vorgabe
   */
  constructor(vorgabe) {
    this.setzeEintraege(vorgabe.eintraege);
    this.spalten = vorgabe.spalten ?? 1;
    this.sichtbar = vorgabe.sichtbar ?? this.eintraege.length;
    this.umlaufend = vorgabe.umlaufend ?? true;
    this.index = 0;
    this.anfang = 0;
    this.bildzaehler = 0;
  }

  setzeEintraege(eintraege) {
    this.eintraege = eintraege;
    this.index = Math.min(this.index ?? 0, Math.max(0, eintraege.length - 1));
  }

  get zeilen() {
    return Math.ceil(this.eintraege.length / this.spalten);
  }

  bewege(schritt) {
    const anzahl = this.eintraege.length;
    if (anzahl === 0) return;

    let neu = this.index + schritt;
    if (this.umlaufend) neu = (neu + anzahl) % anzahl;
    else neu = Math.max(0, Math.min(anzahl - 1, neu));

    if (neu !== this.index) {
      this.index = neu;
      effekt('auswahl');
    }
    this.haltePosition();
  }

  /** Hält den Zeiger im sichtbaren Bereich. */
  haltePosition() {
    const zeile = Math.floor(this.index / this.spalten);
    const sichtbareZeilen = Math.ceil(this.sichtbar / this.spalten);
    if (zeile < this.anfang) this.anfang = zeile;
    if (zeile >= this.anfang + sichtbareZeilen) this.anfang = zeile - sichtbareZeilen + 1;
  }

  /**
   * Ein Logikschritt.
   * @returns {'bestaetigt'|'abbruch'|null}
   */
  aktualisieren() {
    this.bildzaehler += 1;
    if (gedrueckt('DOWN')) this.bewege(this.spalten);
    if (gedrueckt('UP')) this.bewege(-this.spalten);
    if (this.spalten > 1) {
      if (gedrueckt('RIGHT')) this.bewege(1);
      if (gedrueckt('LEFT')) this.bewege(-1);
    }
    if (gedrueckt('A')) {
      effekt('bestaetigen');
      return 'bestaetigt';
    }
    if (gedrueckt('B')) {
      effekt('zurueck');
      return 'abbruch';
    }
    return null;
  }

  /**
   * Zeichnet die Liste in ein Fenster.
   * @param {{ zeilenhoehe?: number, rahmen?: boolean, zusatz?: (index: number) => string }} [optionen]
   */
  zeichnen(ctx, x, y, breite, hoehe, optionen = {}) {
    const zeilenhoehe = optionen.zeilenhoehe ?? 12;
    if (optionen.rahmen !== false) fenster(ctx, x, y, breite, hoehe);

    const sichtbareZeilen = Math.ceil(this.sichtbar / this.spalten);
    const spaltenBreite = (breite - 10) / this.spalten;

    for (let zeile = 0; zeile < sichtbareZeilen; zeile += 1) {
      const echteZeile = this.anfang + zeile;
      for (let spalte = 0; spalte < this.spalten; spalte += 1) {
        const index = echteZeile * this.spalten + spalte;
        if (index >= this.eintraege.length) continue;

        const eintragX = x + 5 + spalte * spaltenBreite;
        const eintragY = y + 5 + zeile * zeilenhoehe;

        if (index === this.index) zeiger(ctx, eintragX, eintragY + 1, this.bildzaehler);
        zeichneText(ctx, this.eintraege[index], eintragX + 7, eintragY, { farbe: UI.text });

        const zusatz = optionen.zusatz?.(index);
        if (zusatz) {
          zeichneText(ctx, zusatz, eintragX + spaltenBreite - 4 - zusatz.length * 5, eintragY, { farbe: UI.text });
        }
      }
    }

    // Hinweis auf weitere Einträge
    if (this.anfang > 0) zeichneText(ctx, '▲', x + breite - 10, y + 2, { farbe: UI.auswahl });
    if (this.anfang + sichtbareZeilen < this.zeilen) {
      zeichneText(ctx, '▼', x + breite - 10, y + hoehe - 10, { farbe: UI.auswahl });
    }
  }
}
