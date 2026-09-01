// ============================================================================
// Casinoszene
// ----------------------------------------------------------------------------
// Die Bedienung der vier Spiele. Die Regeln und Quoten stehen vollständig in
// game/casino.js – hier geht es um Einsatz wählen, Knöpfe drücken und das
// Ergebnis zeigen, und zwar richtig zu sehen: echte Karten beim Blackjack,
// drehende Walzen beim Banditen, ein echtes Rad mit Kugel beim Roulette.
//
// Ablauf überall gleich: erst der Einsatz, dann die Wette (soweit das Spiel
// eine kennt), dann eine kurze Animation, dann das Ergebnis. Der Einsatz wird
// sofort abgebucht, die Auszahlung kommt zurück, sobald die Animation fertig
// ist – so stimmt der Kontostand auch dann, wenn mitten in der Runde etwas
// schiefgeht.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { effekt } from '../engine/audio.js';
import { fenster } from '../gfx/ui.js';
import { zeichneText, textBreite, umbrechen } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { Auswahl } from '../ui/auswahl.js';
import { spiel, aendereGeld } from '../game/spielstand.js';
import {
  ROULETTE_EINSAETZE, dreheRoulette, ziehBandit, wirfRisiko, WALZENFELDER,
  neuesDeck, handwert, istBlackjack, werteBlackjack, RISIKO_CHANCE,
} from '../game/casino.js';
import {
  zeichneKarte, zeichneWalze, zeichneAutomatGehaeuse, baueWalzenstreifen,
  zeichneRouletteRad, zeichneRouletteTisch, RAD_REIHENFOLGE, radWinkel, easeOutKubisch,
  TISCH, feldfarbe,
} from '../gfx/casinoGrafik.js';
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

/** Wie lange ein Ergebnis mindestens stehen bleibt, bevor es sich wegdrücken lässt. */
const ERGEBNIS_BILDER = 100;
const ERGEBNIS_FRUEHESTENS = 30;

// --- Zeittakt der Animationen (in Bildern à 1/60s) -------------------------------
const BANDIT_STOPS = [46, 62, 80];
const BANDIT_NACHLAUF = 14;

const ROULETTE_DREH_DAUER = 150;
const ROULETTE_UMDREHUNGEN = 5;
const ROULETTE_BLINK_DAUER = 48;
const ROULETTE_BLINK_TAKT = 6;
const ROULETTE_AUSBLEND_DAUER = 26;
const ROULETTE_GESAMT = ROULETTE_DREH_DAUER + ROULETTE_BLINK_DAUER + ROULETTE_AUSBLEND_DAUER;

const RISIKO_DAUER = 56;

/** Mittelpunkt und Radien des Rads – dieselben Maße für Dreh- und Ergebnisbild. */
const RAD = { mitteX: BREITE / 2, mitteY: 92, radiusAussen: 58, radiusInnen: 36 };
const TISCH_X = (BREITE - TISCH.breite) / 2;
const TISCH_Y = 28;

export class Casinoszene {
  /** @param {'roulette'|'blackjack'|'bandit'|'risiko'} spielart */
  constructor(spielart) {
    this.spielart = spielart;
    this.modus = 'einsatz';
    this.bildzaehler = 0;
    this.einsatz = EINSAETZE[0];
    this.meldung = [];
    this.ergebnisRest = 0;
    /** Welches Bild die Ergebnisphase im Hintergrund zeigt. */
    this.ergebnisArt = spielart;

    /** Laufende Blackjack-Runde: { deck, spieler, geber } */
    this.runde = null;

    /** Banditen-Zustand: Ergebnis plus ein Symbolstreifen je Walze. */
    this.banditErgebnis = null;
    this.banditStreifen = null;
    this.banditStart = 0;
    this.banditGetickt = [false, false, false];

    /** Roulette-Zustand: Ergebnis, Zielfach auf dem Rad, Startbild der Drehung. */
    this.rouletteErgebnis = null;
    this.rouletteSchluessel = null;
    this.rouletteGewaehlteZahl = 0;
    this.rouletteFachIndex = 0;
    this.rouletteStart = 0;
    this.rouletteLetztesFach = -1;

    /** Risikotisch: nur ein Ergebnis, das der Chip am Ende zeigt. */
    this.risikoErgebnis = null;
    this.risikoStart = 0;

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

    switch (this.modus) {
      case 'einsatz': this.aktualisiereEinsatz(); break;
      case 'wette': this.aktualisiereWette(); break;
      case 'zug': this.aktualisiereZug(); break;
      case 'banditSpin': this.aktualisiereBanditSpin(); break;
      case 'rouletteSpin': this.aktualisiereRouletteSpin(); break;
      case 'risikoSpin': this.aktualisiereRisikoSpin(); break;
      case 'ergebnis': this.aktualisiereErgebnisphase(); break;
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
    else if (this.spielart === 'bandit') this.starteBanditSpin();
    else this.starteRisikoSpin();
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

    this.rouletteErgebnis = ergebnis;
    this.rouletteSchluessel = schluessel;
    this.rouletteGewaehlteZahl = gewaehlteZahl;
    this.rouletteFachIndex = RAD_REIHENFOLGE.indexOf(ergebnis.zahl);
    this.rouletteStart = this.bildzaehler;
    this.rouletteLetztesFach = -1;
    this.ergebnisArt = 'roulette';
    this.modus = 'rouletteSpin';
  }

  aktualisiereRouletteSpin() {
    const t = this.bildzaehler - this.rouletteStart;

    // Ein leises Ticken, sobald die Kugel während der Drehung ein neues Fach
    // überquert – seltener, je langsamer sie wird, genau wie am echten Rad.
    if (t < ROULETTE_DREH_DAUER) {
      const fortschritt = easeOutKubisch(t / ROULETTE_DREH_DAUER);
      const zielWinkel = radWinkel(this.rouletteFachIndex);
      const vorlauf = Math.PI * 2 * ROULETTE_UMDREHUNGEN * (1 - fortschritt);
      const fach = Math.round(((zielWinkel + vorlauf) / (Math.PI * 2)) * RAD_REIHENFOLGE.length);
      if (fach !== this.rouletteLetztesFach) {
        this.rouletteLetztesFach = fach;
        effekt('auswahl');
      }
    }

    if (t === ROULETTE_GESAMT) {
      aendereGeld(this.rouletteErgebnis.auszahlung);
      const farbe = this.rouletteErgebnis.zahl === 0 ? 'GRÜN' : (this.rouletteErgebnis.rot ? 'ROT' : 'SCHWARZ');
      const zeilen = [`Die Kugel fällt auf ${this.rouletteErgebnis.zahl} (${farbe}).`];
      if (this.rouletteSchluessel === 'zahl') zeilen.push(`Du hattest die ${this.rouletteGewaehlteZahl}.`);
      zeilen.push(this.rouletteErgebnis.gewonnen
        ? `Gewonnen! ${this.rouletteErgebnis.auszahlung} zurück.`
        : `Verloren. ${this.einsatz} weg.`);
      this.zeigeErgebnis(zeilen, this.rouletteErgebnis.gewonnen);
    }
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
    this.ergebnisArt = 'blackjack';

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

  // --- Einarmiger Bandit --------------------------------------------------------

  starteBanditSpin() {
    const ergebnis = ziehBandit(this.einsatz);
    this.banditErgebnis = ergebnis;
    this.banditStreifen = ergebnis.symbole.map((symbol) => baueWalzenstreifen(WALZENFELDER, symbol));
    this.banditStart = this.bildzaehler;
    this.banditGetickt = [false, false, false];
    this.ergebnisArt = 'bandit';
    this.modus = 'banditSpin';
  }

  aktualisiereBanditSpin() {
    const t = this.bildzaehler - this.banditStart;

    BANDIT_STOPS.forEach((stop, i) => {
      if (t >= stop && !this.banditGetickt[i]) {
        this.banditGetickt[i] = true;
        effekt('auswahl');
      }
    });

    if (t === BANDIT_STOPS[2] + BANDIT_NACHLAUF) {
      const ergebnis = this.banditErgebnis;
      aendereGeld(ergebnis.auszahlung);
      const zeilen = [];
      if (ergebnis.gewinn > 0) {
        zeilen.push(`${ergebnis.anzahl}x ${ergebnis.symbol}: ${ergebnis.gewinn}-fach!`);
        zeilen.push(`${ergebnis.auszahlung} zurück.`);
      } else {
        zeilen.push(`Nichts. ${this.einsatz} weg.`);
      }
      this.zeigeErgebnis(zeilen, ergebnis.gewinn > 0);
    }
  }

  // --- Alles oder Nichts --------------------------------------------------------

  starteRisikoSpin() {
    this.risikoErgebnis = wirfRisiko(this.einsatz);
    this.risikoStart = this.bildzaehler;
    this.ergebnisArt = 'risiko';
    this.modus = 'risikoSpin';
  }

  aktualisiereRisikoSpin() {
    const t = this.bildzaehler - this.risikoStart;
    if (t === RISIKO_DAUER) {
      aendereGeld(this.risikoErgebnis.auszahlung);
      this.zeigeErgebnis(this.risikoErgebnis.gewonnen
        ? ['Verdoppelt!', `${this.risikoErgebnis.auszahlung} zurück.`]
        : ['Nichts. Alles weg.', `${this.einsatz} futsch.`], this.risikoErgebnis.gewonnen);
    }
  }

  // --- Ergebnisanzeige ------------------------------------------------------------

  zeigeErgebnis(zeilen, gewonnen = false) {
    this.meldung = zeilen;
    this.ergebnisRest = ERGEBNIS_BILDER;
    this.modus = 'ergebnis';
    this.einsatzmenue.setzeEintraege(this.einsatzEintraege());
    effekt(gewonnen ? 'gefangen' : 'zurueck');
  }

  aktualisiereErgebnisphase() {
    this.ergebnisRest -= 1;
    // Lässt sich wegdrücken, sobald es kurz gestanden hat.
    if (this.ergebnisRest < ERGEBNIS_BILDER - ERGEBNIS_FRUEHESTENS && (gedrueckt('A') || gedrueckt('B'))) {
      this.ergebnisRest = 0;
    }
    if (this.ergebnisRest <= 0) this.modus = 'einsatz';
  }

  // --- Zeichnen ----------------------------------------------------------------

  zeichnen(ctx) {
    // Sattes Casino-Rot als Grund, damit der Bildschirm zum Saal passt.
    ctx.fillStyle = '#5a0e1a';
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.fillStyle = '#7a1424';
    ctx.fillRect(0, 22, BREITE, HOEHE - 44);

    switch (this.modus) {
      case 'einsatz': this.zeichneSpielvorschau(ctx, 0.45); this.zeichneEinsatz(ctx); break;
      case 'wette': this.zeichneRouletteTischBild(ctx, 1); this.zeichneWette(ctx); break;
      case 'zug': this.zeichneBlackjackTisch(ctx); this.zeichneZug(ctx); break;
      case 'banditSpin': this.zeichneBanditBild(ctx, this.bildzaehler - this.banditStart); break;
      case 'rouletteSpin': this.zeichneRouletteSpinBild(ctx, this.bildzaehler - this.rouletteStart); break;
      case 'risikoSpin': this.zeichneRisikoBild(ctx, this.bildzaehler - this.risikoStart); break;
      case 'ergebnis': this.zeichneErgebnis(ctx); break;
      default: break;
    }

    const titel = TITEL[this.spielart] ?? 'CASINO';
    zeichneText(ctx, titel, (BREITE - textBreite(titel)) / 2, 5, { farbe: '#e8c860', schatten: '#3a0810' });

    // Kontostand oben rechts, immer sichtbar.
    const geld = `${this.geld}`;
    fenster(ctx, BREITE - textBreite(geld) - 18, 14, textBreite(geld) + 14, 14);
    zeichneText(ctx, geld, BREITE - textBreite(geld) - 8, 18, { farbe: UI.text });
  }

  /** Gedämpfte Vorschau des jeweiligen Spiels hinter dem Einsatzmenü. */
  zeichneSpielvorschau(ctx, alpha) {
    if (this.spielart === 'roulette') {
      this.zeichneRouletteTischBild(ctx, alpha);
    } else if (this.spielart === 'blackjack') {
      ctx.save();
      ctx.globalAlpha = alpha;
      zeichneKarte(ctx, null, 150, 40, { verdeckt: true });
      zeichneKarte(ctx, null, 174, 40, { verdeckt: true });
      ctx.restore();
    } else if (this.spielart === 'bandit') {
      ctx.save();
      ctx.globalAlpha = alpha;
      this.zeichneBanditGehaeuseUndWalzen(ctx, ['Platte', 'Kick', 'Mate'], 1);
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      this.zeichneChip(ctx, BREITE - 60, 70, '#e8c860', 1);
      ctx.restore();
    }
  }

  zeichneEinsatz(ctx) {
    const hinweis = this.spielart === 'risiko'
      ? `Einsatz verdoppeln – oder weg. ${Math.round(RISIKO_CHANCE * 100)} % Chance.`
      : 'Wie viel setzt du?';
    zeichneText(ctx, hinweis, 10, 34, { farbe: '#f0d8a0', schatten: '#20242e' });
    this.einsatzmenue.zeichnen(ctx, 10, 46, 96, this.einsatzmenue.eintraege.length * 12 + 8);
  }

  zeichneWette(ctx) {
    const hinweis = `Einsatz ${this.einsatz}. Worauf?`;
    zeichneText(ctx, hinweis, (BREITE - textBreite(hinweis)) / 2, TISCH_Y + TISCH.hoehe + 6, {
      farbe: '#f8f4e8', schatten: '#12121a',
    });
    this.wettmenue.zeichnen(ctx, 44, HOEHE - 50, 150, 4 * 10 + 8, { zeilenhoehe: 10 });
  }

  // --- Blackjack-Bild -------------------------------------------------------------

  zeichneBlackjackTisch(ctx) {
    ctx.fillStyle = '#155029';
    ctx.fillRect(4, 22, BREITE - 8, HOEHE - 66);
    ctx.strokeStyle = '#e8c860';
    ctx.lineWidth = 1;
    ctx.strokeRect(4.5, 22.5, BREITE - 9, HOEHE - 67);

    if (!this.runde) return;
    const { spieler, geber } = this.runde;
    const gebersichtbar = this.modus === 'zug';

    zeichneText(ctx, 'GEBER', 10, 27, { farbe: '#f0e4cc' });
    geber.forEach((karte, i) => {
      zeichneKarte(ctx, karte, 50 + i * 14, 24, { verdeckt: gebersichtbar && i > 0 });
    });
    if (!gebersichtbar) {
      zeichneText(ctx, `${handwert(geber)}`, 10, 40, { farbe: '#f8f8f0' });
    }

    zeichneText(ctx, 'DU', 10, 88, { farbe: '#f0e4cc' });
    spieler.forEach((karte, i) => {
      zeichneKarte(ctx, karte, 50 + i * 14, 84, { verdeckt: false });
    });
    zeichneText(ctx, `${handwert(spieler)}`, 10, 100, { farbe: '#f8f8f0' });
  }

  zeichneZug(ctx) {
    this.zugmenue.zeichnen(ctx, 10, HOEHE - 40, 76, 2 * 12 + 8);
  }

  // --- Banditen-Bild --------------------------------------------------------------

  zeichneBanditGehaeuseUndWalzen(ctx, symbole, fortschritt) {
    const breite = 168;
    const hoehe = 96;
    const x = (BREITE - breite) / 2;
    const y = 26;
    zeichneAutomatGehaeuse(ctx, x, y, breite, hoehe);

    const reelBreite = 30;
    const reelHoehe = hoehe - 20;
    const abstand = 8;
    const gesamtReelBreite = reelBreite * 3 + abstand * 2;
    const reelX = x + (breite - gesamtReelBreite) / 2;
    const reelY = y + 10;

    symbole.forEach((symbol, i) => {
      const streifen = [symbol, symbol, symbol];
      zeichneWalze(ctx, reelX + i * (reelBreite + abstand), reelY, reelHoehe, streifen, fortschritt);
    });

    // Zierleiste mit Hebel rechts, rein optisch.
    ctx.fillStyle = '#c8203c';
    ctx.fillRect(x + breite + 2, y + 10, 6, 30);
    ctx.fillStyle = '#e8c860';
    ctx.beginPath();
    ctx.arc(x + breite + 5, y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  zeichneBanditBild(ctx, t) {
    const breite = 168;
    const hoehe = 96;
    const x = (BREITE - breite) / 2;
    const y = 26;
    zeichneAutomatGehaeuse(ctx, x, y, breite, hoehe);

    const reelBreite = 30;
    const reelHoehe = hoehe - 20;
    const abstand = 8;
    const gesamtReelBreite = reelBreite * 3 + abstand * 2;
    const reelX = x + (breite - gesamtReelBreite) / 2;
    const reelY = y + 10;

    this.banditStreifen.forEach((streifen, i) => {
      const stop = BANDIT_STOPS[i];
      const fortschritt = easeOutKubisch(Math.min(1, t / stop));
      zeichneWalze(ctx, reelX + i * (reelBreite + abstand), reelY, reelHoehe, streifen, fortschritt);
    });

    ctx.fillStyle = '#c8203c';
    ctx.fillRect(x + breite + 2, y + 10, 6, 30);
    ctx.fillStyle = '#e8c860';
    ctx.beginPath();
    ctx.arc(x + breite + 5, y + 8, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Roulette-Bild --------------------------------------------------------------

  zeichneRouletteTischBild(ctx, alpha) {
    zeichneRouletteTisch(ctx, TISCH_X, TISCH_Y, { alpha });
  }

  zeichneRouletteSpinBild(ctx, t) {
    if (t < ROULETTE_DREH_DAUER) {
      const fortschritt = easeOutKubisch(t / ROULETTE_DREH_DAUER);
      const zielWinkel = radWinkel(this.rouletteFachIndex);
      const vorlauf = Math.PI * 2 * ROULETTE_UMDREHUNGEN * (1 - fortschritt);
      const winkel = zielWinkel + vorlauf;

      const abschnitt = t / ROULETTE_DREH_DAUER;
      const ruheRadius = (RAD.radiusAussen + RAD.radiusInnen) / 2;
      const aussenRadius = RAD.radiusAussen + 6;
      const kugelRadius = abschnitt < 0.72
        ? aussenRadius
        : aussenRadius + (ruheRadius - aussenRadius) * easeOutKubisch((abschnitt - 0.72) / 0.28);

      zeichneRouletteRad(ctx, {
        ...RAD, kugelWinkel: winkel, kugelRadius,
      });
      return;
    }

    const tb = t - ROULETTE_DREH_DAUER;
    const ruheRadius = (RAD.radiusAussen + RAD.radiusInnen) / 2;
    const zielWinkel = radWinkel(this.rouletteFachIndex);

    if (tb < ROULETTE_BLINK_DAUER) {
      const blinkAn = Math.floor(tb / ROULETTE_BLINK_TAKT) % 2 === 0;
      zeichneRouletteRad(ctx, {
        ...RAD, kugelWinkel: zielWinkel, kugelRadius: ruheRadius,
        blinkFach: this.rouletteFachIndex, blinkAn,
      });
      return;
    }

    const ta = tb - ROULETTE_BLINK_DAUER;
    if (ta < ROULETTE_AUSBLEND_DAUER) {
      const restAlpha = 1 - ta / ROULETTE_AUSBLEND_DAUER;
      zeichneRouletteRad(ctx, {
        ...RAD, kugelWinkel: zielWinkel, kugelRadius: ruheRadius,
        blinkFach: this.rouletteFachIndex, blinkAn: true, alpha: restAlpha,
      });
      this.zeichneRouletteTischBild(ctx, 1 - restAlpha);
      return;
    }

    this.zeichneRouletteErgebnisTisch(ctx);
  }

  zeichneRouletteErgebnisTisch(ctx) {
    this.zeichneRouletteTischBild(ctx, 1);
    if (this.rouletteErgebnis) {
      // Kleiner Farbpunkt neben dem Titel, damit auf einen Blick klar ist,
      // wo die Kugel gelandet ist – auch während die Meldung obendrüber steht.
      ctx.fillStyle = feldfarbe(this.rouletteErgebnis.zahl);
      ctx.fillRect(BREITE / 2 - 30, 6, 6, 6);
    }
  }

  // --- Risikotisch-Bild -------------------------------------------------------------

  zeichneChip(ctx, x, y, farbe, breitenfaktor) {
    const radius = 20;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(Math.max(0.08, Math.abs(breitenfaktor)), 1);
    ctx.fillStyle = '#181820';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = farbe;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#181820';
    ctx.beginPath();
    ctx.arc(0, 0, radius - 8, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 8; i += 1) {
      const winkel = (i / 8) * Math.PI * 2;
      ctx.fillStyle = '#f8f4e8';
      ctx.fillRect(Math.cos(winkel) * (radius - 2) - 1, Math.sin(winkel) * (radius - 2) - 1, 2, 2);
    }
    ctx.restore();
  }

  zeichneRisikoBild(ctx, t) {
    const x = BREITE / 2;
    const y = 78;
    const abschnitt = Math.min(1, t / RISIKO_DAUER);
    const dreht = abschnitt < 1;
    const breitenfaktor = dreht ? Math.cos(abschnitt * Math.PI * 7) : 1;
    this.zeichneChip(ctx, x, y, '#e8c860', breitenfaktor);

    zeichneText(ctx, `Einsatz ${this.einsatz}`, x - textBreite(`Einsatz ${this.einsatz}`) / 2, y + 34, {
      farbe: '#f0d8a0',
    });
  }

  // --- Gemeinsame Ergebnisanzeige ---------------------------------------------------

  zeichneErgebnis(ctx) {
    if (this.ergebnisArt === 'roulette') {
      this.zeichneRouletteErgebnisTisch(ctx);
    } else if (this.ergebnisArt === 'bandit' && this.banditErgebnis) {
      this.zeichneBanditGehaeuseUndWalzen(ctx, this.banditErgebnis.symbole, 1);
    } else if (this.ergebnisArt === 'blackjack' && this.runde) {
      this.zeichneBlackjackErgebnis(ctx);
    } else if (this.ergebnisArt === 'risiko' && this.risikoErgebnis) {
      this.zeichneChip(ctx, BREITE / 2, 78, this.risikoErgebnis.gewonnen ? '#e8c860' : '#585868', 1);
    }

    const zeilen = this.meldung.flatMap((zeile) => umbrechen(zeile, BREITE - 28));
    const boxY = HOEHE - zeilen.length * 11 - 18;
    fenster(ctx, 8, boxY, BREITE - 16, zeilen.length * 11 + 12);
    zeilen.forEach((zeile, i) => {
      zeichneText(ctx, zeile, 14, boxY + 6 + i * 11, { farbe: UI.text });
    });
  }

  zeichneBlackjackErgebnis(ctx) {
    ctx.fillStyle = '#155029';
    ctx.fillRect(4, 22, BREITE - 8, 84);
    ctx.strokeStyle = '#e8c860';
    ctx.strokeRect(4.5, 22.5, BREITE - 9, 83);

    const { spieler, geber } = this.runde;
    zeichneText(ctx, 'GEBER', 10, 27, { farbe: '#f0e4cc' });
    geber.forEach((karte, i) => zeichneKarte(ctx, karte, 50 + i * 14, 24));
    zeichneText(ctx, `${handwert(geber)}`, 10, 40, { farbe: '#f8f8f0' });

    zeichneText(ctx, 'DU', 10, 60, { farbe: '#f0e4cc' });
    spieler.forEach((karte, i) => zeichneKarte(ctx, karte, 50 + i * 14, 57));
    zeichneText(ctx, `${handwert(spieler)}`, 10, 73, { farbe: '#f8f8f0' });
  }
}
