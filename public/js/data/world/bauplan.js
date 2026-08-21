// ============================================================================
// Karten-Baukasten
// ----------------------------------------------------------------------------
// Karten werden nicht Kachel für Kachel geschrieben, sondern gebaut: Fläche
// anlegen, Wege ziehen, Häuser setzen, Bewuchs streuen. Das hält die
// Kartendaten kurz und lesbar und macht große Flächen erst möglich.
// Der Bewuchs nutzt einen ausgesäten Zufall – dieselbe Karte sieht also bei
// jedem Start gleich aus.
// ============================================================================

import { generator } from '../../engine/rng.js';

export class Kartenbauer {
  /**
   * @param {number} breite in Kacheln
   * @param {number} hoehe in Kacheln
   * @param {string} grund Grundkachel
   */
  constructor(breite, hoehe, grund) {
    this.breite = breite;
    this.hoehe = hoehe;
    this.kacheln = new Array(breite * hoehe).fill(grund);
    /** @type {{x: number, y: number, ziel: string, zx: number, zy: number}[]} */
    this.warps = [];
  }

  innen(x, y) {
    return x >= 0 && y >= 0 && x < this.breite && y < this.hoehe;
  }

  setze(x, y, kachel) {
    if (this.innen(x, y)) this.kacheln[y * this.breite + x] = kachel;
    return this;
  }

  hole(x, y) {
    return this.innen(x, y) ? this.kacheln[y * this.breite + x] : null;
  }

  rechteck(x, y, breite, hoehe, kachel) {
    for (let dy = 0; dy < hoehe; dy += 1) {
      for (let dx = 0; dx < breite; dx += 1) this.setze(x + dx, y + dy, kachel);
    }
    return this;
  }

  /** Rahmen am Kartenrand – hält den Spieler im Bild. */
  rahmen(kachel, dicke = 1) {
    for (let i = 0; i < dicke; i += 1) {
      for (let x = 0; x < this.breite; x += 1) {
        this.setze(x, i, kachel);
        this.setze(x, this.hoehe - 1 - i, kachel);
      }
      for (let y = 0; y < this.hoehe; y += 1) {
        this.setze(i, y, kachel);
        this.setze(this.breite - 1 - i, y, kachel);
      }
    }
    return this;
  }

  /** Öffnet den Rand an einer Stelle, damit Karten aneinander anschließen. */
  durchgang(seite, position, breite, kachel = 'weg') {
    for (let i = 0; i < breite; i += 1) {
      if (seite === 'norden') {
        this.setze(position + i, 0, kachel);
        this.setze(position + i, 1, kachel);
      } else if (seite === 'sueden') {
        this.setze(position + i, this.hoehe - 1, kachel);
        this.setze(position + i, this.hoehe - 2, kachel);
      } else if (seite === 'westen') {
        this.setze(0, position + i, kachel);
        this.setze(1, position + i, kachel);
      } else {
        this.setze(this.breite - 1, position + i, kachel);
        this.setze(this.breite - 2, position + i, kachel);
      }
    }
    return this;
  }

  /** Waagerechter Weg. */
  wegX(x1, x2, y, kachel = 'weg', dicke = 3) {
    const [von, bis] = x1 <= x2 ? [x1, x2] : [x2, x1];
    for (let x = von; x <= bis; x += 1) {
      for (let d = 0; d < dicke; d += 1) this.setze(x, y + d, kachel);
    }
    return this;
  }

  /** Senkrechter Weg. */
  wegY(y1, y2, x, kachel = 'weg', dicke = 3) {
    const [von, bis] = y1 <= y2 ? [y1, y2] : [y2, y1];
    for (let y = von; y <= bis; y += 1) {
      for (let d = 0; d < dicke; d += 1) this.setze(x + d, y, kachel);
    }
    return this;
  }

  /** Streut eine Kachel zufällig, aber reproduzierbar in ein Feld. */
  streuen(x, y, breite, hoehe, kachel, dichte, saat) {
    const rnd = generator(saat);
    for (let dy = 0; dy < hoehe; dy += 1) {
      for (let dx = 0; dx < breite; dx += 1) {
        if (rnd() < dichte) this.setze(x + dx, y + dy, kachel);
      }
    }
    return this;
  }

  /**
   * Streut nur auf Kacheln einer bestimmten Sorte – so bleiben Wege, Plätze
   * und Gebäude garantiert frei.
   */
  streuenAuf(quelle, kachel, dichte, saat) {
    const rnd = generator(saat);
    for (let y = 0; y < this.hoehe; y += 1) {
      for (let x = 0; x < this.breite; x += 1) {
        if (this.hole(x, y) === quelle && rnd() < dichte) this.setze(x, y, kachel);
      }
    }
    return this;
  }

  /** Zusammenhängendes Feld hohen Grases. */
  wiese(x, y, breite, hoehe, kachel = 'grasHoch') {
    return this.rechteck(x, y, breite, hoehe, kachel);
  }

  /** Gewässer mit Sandsaum. */
  see(x, y, breite, hoehe) {
    this.rechteck(x - 1, y - 1, breite + 2, hoehe + 2, 'sand');
    this.rechteck(x, y, breite, hoehe, 'wasser');
    return this;
  }

  /**
   * Haus mit Dach, Wand, Fenstern und Tür.
   * @param {{ dach?: string, tuerVersatz?: number, ziel?: string, zx?: number, zy?: number }} [optionen]
   * @returns {{ tuerX: number, tuerY: number }}
   */
  haus(x, y, breite, hoehe, optionen = {}) {
    const dach = optionen.dach ?? 'dachRot';
    const dachHoehe = Math.max(1, hoehe - 2);
    this.rechteck(x, y, breite, dachHoehe, dach);
    this.rechteck(x, y + dachHoehe, breite, hoehe - dachHoehe, 'hauswand');

    const tuerX = x + (optionen.tuerVersatz ?? Math.floor(breite / 2));
    const tuerY = y + hoehe - 1;

    for (let dx = 0; dx < breite; dx += 1) {
      const stelle = x + dx;
      if (stelle !== tuerX && dx % 2 === 1) this.setze(stelle, tuerY, 'fenster');
    }
    this.setze(tuerX, tuerY, 'tuer');

    this.tuerWarp(tuerX, tuerY, optionen);
    return { tuerX, tuerY };
  }

  /**
   * Legt den Übergang hinter einer Tür an – optional mit Bedingung
   * (z. B. eine Mindestzahl an Gig-Marken).
   */
  tuerWarp(tuerX, tuerY, optionen) {
    if (!optionen.ziel) return;
    const eintrag = {
      x: tuerX, y: tuerY, ziel: optionen.ziel, zx: optionen.zx ?? 0, zy: optionen.zy ?? 0,
    };
    if (optionen.bedingung) {
      eintrag.bedingung = optionen.bedingung;
      eintrag.sperrtext = optionen.sperrtext ?? 'Hier geht es gerade nicht weiter.';
    }
    this.warps.push(eintrag);
  }

  /** Auffällige Halle mit Leuchtschrift-Tür (Gig-Bühnen, Backstage). */
  halle(x, y, breite, hoehe, optionen = {}) {
    const dach = optionen.dach ?? 'dachGrau';
    this.rechteck(x, y, breite, hoehe - 1, dach);
    this.rechteck(x, y + hoehe - 1, breite, 1, 'hauswand');

    const tuerX = x + Math.floor(breite / 2);
    const tuerY = y + hoehe - 1;
    this.setze(tuerX, tuerY, 'tuerGig');
    this.setze(tuerX - 1, tuerY, 'box');
    this.setze(tuerX + 1, tuerY, 'box');

    this.tuerWarp(tuerX, tuerY, optionen);
    return { tuerX, tuerY };
  }

  /** Innenraum: Wandreihe oben, Boden darunter, Rahmen aus Wand. */
  raum(breiteInnen, hoeheInnen, boden = 'bodenInnen') {
    this.rechteck(0, 0, this.breite, this.hoehe, 'wandInnen');
    this.rechteck(1, 2, breiteInnen, hoeheInnen, boden);
    return this;
  }

  fertig() {
    return { kacheln: this.kacheln, warps: this.warps };
  }
}

/**
 * Öffnet den Rand mittig – Karten hängen dadurch immer zentriert aneinander
 * und die Übergabeposition kann zur Laufzeit berechnet werden.
 * @param {Kartenbauer} bauer
 * @param {'norden'|'sueden'|'westen'|'osten'} seite
 */
export function durchgangMitte(bauer, seite, passBreite = 4, kachel = 'weg') {
  const laenge = seite === 'norden' || seite === 'sueden' ? bauer.breite : bauer.hoehe;
  const position = Math.floor((laenge - passBreite) / 2);
  bauer.durchgang(seite, position, passBreite, kachel);
  return position;
}
