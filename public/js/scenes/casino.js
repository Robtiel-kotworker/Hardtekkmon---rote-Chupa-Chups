// ============================================================================
// Casinoszene
// ----------------------------------------------------------------------------
// Die Bedienung der vier Spiele. Die Regeln und Quoten stehen vollständig in
// game/casino.js – hier geht es nur um Einsatz wählen, Knöpfe drücken und das
// Ergebnis anzeigen.
//
// Ablauf überall gleich: erst der Einsatz, dann die Wette (soweit das Spiel
// eine kennt), dann das Ergebnis. Der Einsatz wird sofort abgebucht, die
// Auszahlung kommt am Ende zurück – so stimmt der Kontostand auch dann, wenn
// mitten in der Runde etwas schiefgeht.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster, dunklesFenster } from '../gfx/ui.js';
import { zeichneText, textBreite, umbrechen } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { Auswahl } from '../ui/auswahl.js';
import { spiel, aendereGeld } from '../game/spielstand.js';
import {
  ROULETTE_EINSAETZE, dreheRoulette, ziehBandit, wirfRisiko,
  neuesDeck, handwert, istBlackjack, werteBlackjack, RISIKO_CHANCE,
} from '../game/casino.js';
import { poppe } from './stapel.js';

/** Mögliche Einsätze. Der Risikotisch bekommt zusätzlich "ALLES". */
const EINSAETZE = [50, 200, 1000];

/** Anzeigenamen der vier Spiele. */
const TITEL = {
  roulette: 'ROULETTE',
  blackjack: 'BLACKJACK',
  bandit: 'EINARMIGER BANDIT',
  risiko: 'ALLES ODER NICHTS',
};

/** Wie lange ein Ergebnis stehen bleibt, bevor wieder gesetzt werden kann. */
const ERGEBNIS_BILDER = 90;

export class Casinoszene {
  /** @param {'roulette'|'blackjack'|'bandit'|'risiko'} spielart */
  constructor(spielart) {
    this.spielart = spielart;
    this.modus = 'einsatz';
    this.bildzaehler = 0;
    this.einsatz = EINSAETZE[0];
    this.meldung = [];
    this.ergebnisRest = 0;
    /** Laufende Blackjack-Runde: { deck, spieler, geber } */
    this.runde = null;
    /** Zuletzt gedrehte Walzen, nur zur Anzeige. */
    this.walzen = null;
    /** Zuletzt gefallene Roulettezahl, nur zur Anzeige. */
    this.kugel = null;

    this.einsatzmenue = new Auswahl({ eintraege: this.einsatzEintraege() });
    this.wettmenue = new Auswahl({
      eintraege: Object.values(ROULETTE_EINSAETZE).map((e) => e.name),
      spalten: 2,
    });
    this.zugmenue = new Auswahl({ eintraege: ['KARTE', 'STEHEN'] });
  }

  /** Einsatzliste. Alles-Setzen gibt es nur am Risikotisch. */
  einsatzEintraege() {
    const liste = EINSAETZE.map((betrag) => `${betrag}`);
    if (this.spielart === 'risiko') liste.push('ALLES');
    liste.push('AUFHÖREN');
    return liste;
  }

  get geld() {
    return spiel.spieler.geld;
  }

  // --- Ablauf -----------------------------------------------------------------

  aktualisieren() {
    this.bildzaehler += 1;

    if (this.ergebnisRest > 0) {
      this.ergebnisRest -= 1;
      // Ergebnis lässt sich wegdrücken, sobald es kurz gestanden hat.
      if (this.ergebnisRest < ERGEBNIS_BILDER - 20 && (gedrueckt('A') || gedrueckt('B'))) {
        this.ergebnisRest = 0;
      }
      if (this.ergebnisRest === 0) this.modus = 'einsatz';
      return;
    }

    switch (this.modus) {
      case 'einsatz': this.aktualisiereEinsatz(); break;
      case 'wette': this.aktualisiereWette(); break;
      case 'zug': this.aktualisiereZug(); break;
      default: break;
    }
  }

  aktualisiereEinsatz() {
    const antwort = this.einsatzmenue.aktualisieren();
    if (antwort === 'abbruch') { poppe(); return; }
    if (antwort !== 'bestaetigt') return;

    const gewaehlt = this.einsatzmenue.eintraege[this.einsatzmenue.index];
    if (gewaehlt === 'AUFHÖREN') { poppe(); return; }

    const betrag = gewaehlt === 'ALLES' ? this.geld : Number(gewaehlt);
    if (betrag <= 0) {
      this.zeigeErgebnis(['Ohne Geld läuft hier gar nichts.']);
      return;
    }
    if (betrag > this.geld) {
      this.zeigeErgebnis([`So viel hast du nicht. Du hast ${this.geld}.`]);
      return;
    }

    this.einsatz = betrag;
    // Der Einsatz ist ab jetzt weg – zurück kommt nur die Auszahlung.
    aendereGeld(-betrag);
    effekt('bestaetigen');

    if (this.spielart === 'roulette') this.modus = 'wette';
    else if (this.spielart === 'blackjack') this.starteBlackjack();
    else if (this.spielart === 'bandit') this.zieheBandit();
    else this.wirfRisiko();
  }

  aktualisiereWette() {
    const antwort = this.wettmenue.aktualisieren();
    if (antwort === 'abbruch') {
      // Zurück zum Einsatz: Der schon abgebuchte Einsatz kommt wieder her.
      aendereGeld(this.einsatz);
      this.modus = 'einsatz';
      return;
    }
    if (antwort !== 'bestaetigt') return;

    const schluessel = Object.keys(ROULETTE_EINSAETZE)[this.wettmenue.index];
    // Bei "ZAHL" wird eine Zahl gezogen, auf die gesetzt wird – die Auswahl
    // einer eigenen Zahl wäre auf diesem Bildschirm zu fummelig.
    const gewaehlteZahl = 1 + Math.floor(Math.random() * 36);
    const ergebnis = dreheRoulette(schluessel, this.einsatz, gewaehlteZahl);
    this.kugel = ergebnis;
    aendereGeld(ergebnis.auszahlung);

    const farbe = ergebnis.zahl === 0 ? 'GRÜN' : (ergebnis.rot ? 'ROT' : 'SCHWARZ');
    const zeilen = [`Die Kugel fällt auf ${ergebnis.zahl} (${farbe}).`];
    if (schluessel === 'zahl') zeilen.push(`Du hattest die ${gewaehlteZahl}.`);
    zeilen.push(ergebnis.gewonnen
      ? `Gewonnen! ${ergebnis.auszahlung} zurück.`
      : `Verloren. ${this.einsatz} weg.`);
    this.zeigeErgebnis(zeilen, ergebnis.gewonnen);
  }

  // --- Blackjack --------------------------------------------------------------

  starteBlackjack() {
    const deck = neuesDeck();
    const runde = {
      deck,
      spieler: [deck.pop(), deck.pop()],
      geber: [deck.pop(), deck.pop()],
    };
    this.runde = runde;

    if (istBlackjack(runde.spieler) || istBlackjack(runde.geber)) {
      this.beendeBlackjack();
      return;
    }
    this.modus = 'zug';
    this.zugmenue.index = 0;
  }

  aktualisiereZug() {
    const antwort = this.zugmenue.aktualisieren();
    if (antwort !== 'bestaetigt') return;

    if (this.zugmenue.index === 0) {
      this.runde.spieler.push(this.runde.deck.pop());
      effekt('auswahl');
      if (handwert(this.runde.spieler) > 21) this.beendeBlackjack();
      return;
    }
    this.beendeBlackjack();
  }

  beendeBlackjack() {
    const { spieler, geber, deck } = this.runde;
    // Der Geber zieht nur, wenn der Spieler noch im Rennen ist.
    if (handwert(spieler) <= 21) {
      while (handwert(geber) < 17) geber.push(deck.pop());
    }

    const ergebnis = werteBlackjack(spieler, geber, this.einsatz);
    aendereGeld(ergebnis.auszahlung);

    const zeilen = [
      `Du: ${handwert(spieler)}   Geber: ${handwert(geber)}`,
    ];
    if (ergebnis.ergebnis === 'blackjack') zeilen.push(`Blackjack! ${ergebnis.auszahlung} zurück.`);
    else if (ergebnis.ergebnis === 'gewonnen') zeilen.push(`Gewonnen! ${ergebnis.auszahlung} zurück.`);
    else if (ergebnis.ergebnis === 'unentschieden') zeilen.push('Unentschieden. Einsatz zurück.');
    else zeilen.push(`Verloren. ${this.einsatz} weg.`);

    this.zeigeErgebnis(zeilen, ergebnis.auszahlung > this.einsatz);
  }

  // --- Bandit und Risiko ------------------------------------------------------

  zieheBandit() {
    const ergebnis = ziehBandit(this.einsatz);
    this.walzen = ergebnis.symbole;
    aendereGeld(ergebnis.auszahlung);

    // Die Walzen stehen schon groß über der Meldung, hier nur das Ergebnis.
    const zeilen = [];
    if (ergebnis.gewinn > 0) {
      zeilen.push(`${ergebnis.anzahl}x ${ergebnis.symbol}: ${ergebnis.gewinn}-fach!`);
      zeilen.push(`${ergebnis.auszahlung} zurück.`);
    } else {
      zeilen.push(`Nichts. ${this.einsatz} weg.`);
    }
    this.zeigeErgebnis(zeilen, ergebnis.gewinn > 0);
  }

  wirfRisiko() {
    const ergebnis = wirfRisiko(this.einsatz);
    aendereGeld(ergebnis.auszahlung);
    this.zeigeErgebnis(ergebnis.gewonnen
      ? ['Verdoppelt!', `${ergebnis.auszahlung} zurück.`]
      : ['Nichts. Alles weg.', `${this.einsatz} futsch.`], ergebnis.gewonnen);
  }

  // --- Anzeige ----------------------------------------------------------------

  zeigeErgebnis(zeilen, gewonnen = false) {
    this.meldung = zeilen;
    this.ergebnisRest = ERGEBNIS_BILDER;
    this.einsatzmenue.setzeEintraege(this.einsatzEintraege());
    effekt(gewonnen ? 'gefangen' : 'zurueck');
  }

  zeichnen(ctx) {
    // Sattes Casino-Rot als Grund, damit der Bildschirm zum Saal passt.
    ctx.fillStyle = '#5a0e1a';
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.fillStyle = '#7a1424';
    ctx.fillRect(0, 22, BREITE, HOEHE - 44);

    const titel = TITEL[this.spielart] ?? 'CASINO';
    zeichneText(ctx, titel, (BREITE - textBreite(titel)) / 2, 5, { farbe: '#e8c860', schatten: '#3a0810' });

    // Kontostand oben rechts, immer sichtbar.
    const geld = `${this.geld}`;
    fenster(ctx, BREITE - textBreite(geld) - 18, 14, textBreite(geld) + 14, 14);
    zeichneText(ctx, geld, BREITE - textBreite(geld) - 8, 18, { farbe: UI.text });

    if (this.ergebnisRest > 0) { this.zeichneErgebnis(ctx); return; }

    switch (this.modus) {
      case 'einsatz': this.zeichneEinsatz(ctx); break;
      case 'wette': this.zeichneWette(ctx); break;
      case 'zug': this.zeichneZug(ctx); break;
      default: break;
    }
  }

  zeichneEinsatz(ctx) {
    const hinweis = this.spielart === 'risiko'
      ? `Einsatz verdoppeln – oder weg. ${Math.round(RISIKO_CHANCE * 100)} % Chance.`
      : 'Wie viel setzt du?';
    zeichneText(ctx, hinweis, 10, 34, { farbe: '#f0d8a0' });
    this.einsatzmenue.zeichnen(ctx, 10, 46, 96, this.einsatzmenue.eintraege.length * 12 + 8);
  }

  zeichneWette(ctx) {
    zeichneText(ctx, `Einsatz ${this.einsatz}. Worauf?`, 10, 34, { farbe: '#f0d8a0' });
    this.wettmenue.zeichnen(ctx, 10, 46, 150, 4 * 12 + 8);
  }

  zeichneZug(ctx) {
    const { spieler, geber } = this.runde;
    zeichneText(ctx, `Deine Karten: ${spieler.map((k) => k.name).join(' ')}`, 10, 34, { farbe: '#f0d8a0' });
    zeichneText(ctx, `Zusammen ${handwert(spieler)}`, 10, 44, { farbe: '#f8f8f0' });
    zeichneText(ctx, `Geber zeigt: ${geber[0].name}`, 10, 56, { farbe: '#f0d8a0' });
    this.zugmenue.zeichnen(ctx, 10, 70, 76, 2 * 12 + 8);
  }

  zeichneErgebnis(ctx) {
    if (this.walzen) {
      // Die drei Walzen groß in der Mitte.
      const text = this.walzen.join('   ');
      dunklesFenster(ctx, 14, 32, BREITE - 28, 24);
      zeichneText(ctx, text, (BREITE - textBreite(text)) / 2, 40, { farbe: '#e8c860' });
    } else if (this.kugel) {
      const text = `${this.kugel.zahl}`;
      dunklesFenster(ctx, BREITE / 2 - 20, 32, 40, 24);
      zeichneText(ctx, text, (BREITE - textBreite(text)) / 2, 40, {
        farbe: this.kugel.zahl === 0 ? '#48c058' : (this.kugel.rot ? '#e04058' : '#f8f8f0'),
      });
    }

    const zeilen = this.meldung.flatMap((zeile) => umbrechen(zeile, BREITE - 28));
    fenster(ctx, 8, 64, BREITE - 16, zeilen.length * 11 + 12);
    zeilen.forEach((zeile, i) => {
      zeichneText(ctx, zeile, 14, 70 + i * 11, { farbe: UI.text });
    });
  }
}
