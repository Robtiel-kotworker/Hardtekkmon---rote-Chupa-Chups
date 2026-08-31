// ============================================================================
// Das Rätsel an der Briefsäule
// ----------------------------------------------------------------------------
// Hinten in der rechten Ecke jedes Casinosaals steht eine goldene Säule, an
// der ein blauer Brief hängt (siehe die Kachel `briefsaeule` in gfx/tiles.js).
// Im Brief steht eine Laufformation: sechs Richtungen, jede davon "bis es
// nicht mehr weitergeht", und danach die Tastenfolge A, B, B, A. Wer das
// hinbekommt, dem spuckt die Säule 500 Geld aus.
//
// Was hier drin liegt, ist der reine Ablauf: die Abfolge auswürfeln, einen
// Versuch mitschreiben, die Sperre verwalten. Alles, was den Spieler bewegt
// oder zeichnet, bleibt in scenes/welt.js.
//
// Zwei Punkte, die den Zuschnitt erklären:
//
//   * Startpunkt ist immer die Säule. Von welchem der Nachbarfelder aus der
//     Spieler sie anspricht, entscheidet aber er – deshalb muss eine Abfolge
//     von *jedem* dieser Felder aus laufbar sein (siehe wuerfleAbfolge).
//   * Ob ein Lauf am Anschlag endete, wird über die Kachel geprüft, nicht
//     über die zurückgelegte Strecke. Die Formation ist damit unabhängig
//     davon, wo genau man losläuft, und ein herumlaufender Zocker, der einen
//     Lauf früher stoppt, macht den Versuch nicht kaputt.
// ============================================================================

import { RICHTUNGS_VEKTOR, GEGENRICHTUNG } from '../world/spielfigur.js';
import { spiel } from './spielstand.js';

/** So viele Läufe stehen im Brief. */
export const LAUF_ANZAHL = 6;
/** Die Folge, die nach dem sechsten Anschlag kommt. */
export const TASTENFOLGE = ['A', 'B', 'B', 'A'];
/** Was die Säule ausspuckt. */
export const BELOHNUNG = 500;
/** Wie lange die Säule nach einer Belohnung dicht bleibt. */
export const SPERRE_MS = 30 * 60 * 1000;

const RICHTUNGEN = ['oben', 'unten', 'links', 'rechts'];

/** Wie die Richtungen im Brief stehen. */
const RICHTUNGSWORT = {
  oben: 'hoch', unten: 'runter', links: 'links', rechts: 'rechts',
};

/**
 * Zustand je Casinosaal – jeder hat seine eigene Säule, seinen eigenen Brief
 * und seine eigene Sperre. Der Eintrag wandert über den Spielstand mit
 * (nachInnen in spielstand.js übernimmt unbekannte Felder unverändert).
 *
 *   abfolge  – der Brief, den der Spieler gerade in der Hand hat. null heißt:
 *              am Nagel hängt noch einer, der nicht abgenommen wurde.
 *   bereitAb – Zeitstempel, ab dem wieder ein Brief hängt. 0 heißt: jetzt.
 *
 * @param {string} karteId
 */
export function saeulenStand(karteId) {
  if (!spiel.saeulen) spiel.saeulen = {};
  if (!spiel.saeulen[karteId]) spiel.saeulen[karteId] = { abfolge: null, bereitAb: 0 };
  return spiel.saeulen[karteId];
}

/** Verbleibende Sperrzeit in Millisekunden; 0, wenn die Säule offen ist. */
export function sperreRest(stand, jetzt = Date.now()) {
  return Math.max(0, (stand.bereitAb ?? 0) - jetzt);
}

/**
 * Die Restzeit als Text für die Absage der Säule. Glatte Werte werden auch
 * glatt ausgesprochen – "0 Minuten und 12 Sekunden" oder "30 Minuten und 0
 * Sekunden" liest sich beides albern.
 * @param {number} millisekunden
 */
export function restText(millisekunden) {
  const sekunden = Math.ceil(millisekunden / 1000);
  const minuten = Math.floor(sekunden / 60);
  const rest = sekunden % 60;
  const minutenWort = `${minuten} Minute${minuten === 1 ? '' : 'n'}`;
  const sekundenWort = `${rest} Sekunde${rest === 1 ? '' : 'n'}`;

  if (minuten <= 0) return sekundenWort;
  if (rest === 0) return minutenWort;
  return `${minutenWort} und ${sekundenWort}`;
}

/**
 * Die begehbaren Nachbarfelder der Säule – von genau diesen Feldern aus kann
 * der Spieler sie ansprechen, und von jedem davon muss die Abfolge laufen.
 * @param {{x: number, y: number}} saeule
 * @param {(x: number, y: number) => boolean} begehbar
 */
export function startfelder(saeule, begehbar) {
  return RICHTUNGEN
    .map((richtung) => ({
      x: saeule.x + RICHTUNGS_VEKTOR[richtung].x,
      y: saeule.y + RICHTUNGS_VEKTOR[richtung].y,
    }))
    .filter((feld) => begehbar(feld.x, feld.y));
}

/** Läuft von einem Feld aus in eine Richtung, bis es nicht mehr weitergeht. */
function laufeBisAnschlag(feld, richtung, begehbar) {
  const vektor = RICHTUNGS_VEKTOR[richtung];
  let { x, y } = feld;
  while (begehbar(x + vektor.x, y + vektor.y)) {
    x += vektor.x;
    y += vektor.y;
  }
  return { x, y };
}

/**
 * Würfelt eine Abfolge, die tatsächlich laufbar ist.
 *
 * Reiner Zufall reicht dafür nicht: Nach einem Lauf steht der Spieler an
 * einer Wand, und jede Richtung, in der es von dort keinen einzigen Schritt
 * weit geht, wäre eine Sackgasse – der Versuch ließe sich gar nicht zu Ende
 * laufen. Die Abfolge wächst deshalb Lauf für Lauf und es kommen nur
 * Richtungen infrage, in denen von *allen* Startfeldern aus mindestens ein
 * Schritt möglich ist. Damit fällt nebenbei auch die eben gelaufene Richtung
 * von selbst weg: In die geht es ja gerade nicht mehr weiter.
 *
 * Unter den übrigen wird die Gegenrichtung nur genommen, wenn sonst nichts
 * bleibt. Erlaubt ist sie – man darf denselben Weg zurücklaufen –, aber sie
 * führt zwangsläufig an die Wand zurück, von der man gerade kommt, und eine
 * Formation, die zweimal dieselbe Bahn abfährt, sieht nach Fehler aus statt
 * nach Route.
 *
 * @param {{x: number, y: number}[]} felder Startfelder rund um die Säule
 * @param {(x: number, y: number) => boolean} begehbar
 * @param {() => number} [zufall]
 * @returns {string[]|null} null, wenn der Saal keine Formation hergibt
 */
export function wuerfleAbfolge(felder, begehbar, zufall = Math.random) {
  if (felder.length === 0) return null;

  let stellen = felder.map((feld) => ({ ...feld }));
  const abfolge = [];

  for (let lauf = 0; lauf < LAUF_ANZAHL; lauf += 1) {
    const moeglich = RICHTUNGEN.filter((richtung) => stellen.every((stelle) => begehbar(
      stelle.x + RICHTUNGS_VEKTOR[richtung].x,
      stelle.y + RICHTUNGS_VEKTOR[richtung].y,
    )));
    if (moeglich.length === 0) return null;

    const zurueck = GEGENRICHTUNG[abfolge[abfolge.length - 1]];
    const quer = moeglich.filter((richtung) => richtung !== zurueck);
    const auswahl = quer.length > 0 ? quer : moeglich;

    const richtung = auswahl[Math.floor(zufall() * auswahl.length)];
    abfolge.push(richtung);
    stellen = stellen.map((stelle) => laufeBisAnschlag(stelle, richtung, begehbar));
  }
  return abfolge;
}

/** Der Inhalt des Briefs. */
export function briefText(abfolge, nochmal = false) {
  const liste = abfolge.map((richtung) => RICHTUNGSWORT[richtung]).join(', ');
  const anfang = nochmal
    ? 'Du faltest den blauen Brief noch mal auf.'
    : 'Du nimmst den blauen Brief vom Nagel. Innen eine Liste, mit Kugelschreiber dreimal durchgedrückt.';
  return [
    anfang,
    `"AB DER SÄULE. Jedes Mal bis zum Anschlag, sonst zählt es nicht: ${liste}."`,
    `"Sechs Stück. Danach stehen bleiben und ${TASTENFOLGE.join(', ')} drücken. Dann macht sie auf."`,
  ];
}

/** Die Absage der Säule, solange die Sperre läuft. */
export function sperrText(millisekunden) {
  return `Die Säule muss wegen Unzucht für ${restText(millisekunden)} gedanklich im `
    + 'Teile-Kloster bei 2CB-Bruder-Benefikkt im Drückeberger-Kämmerchen '
    + '5-gegen-Bene absolvieren.';
}

/**
 * Ein laufender Versuch. Schreibt mit, wie weit der Spieler in der Formation
 * ist, und sagt nach jedem Schritt und jedem Tastendruck, ob es noch passt.
 *
 * Angelegt wird das Ding beim Lesen des Briefs – der Spieler steht dann an
 * der Säule, und genau das ist der Startpunkt. Geht etwas schief, wirft die
 * Weltszene den Versuch weg; der Spieler läuft zurück zur Säule und fängt
 * von vorne an, so oft er will.
 */
export class Saeulenlauf {
  /** @param {string[]} abfolge */
  constructor(abfolge) {
    this.abfolge = abfolge;
    /** Welcher Lauf gerade läuft. -1, solange kein Schritt gemacht wurde. */
    this.lauf = -1;
    /** Richtung dieses Laufs. */
    this.richtung = null;
    /** Wie viele Tasten der Schlussfolge schon sitzen. */
    this.tasten = 0;
  }

  /**
   * Ein abgeschlossener Schritt des Spielers.
   * @param {string} richtung
   * @param {{x: number, y: number}} position Feld NACH dem Schritt
   * @param {(feld: {x: number, y: number}, richtung: string) => boolean} anschlag
   *   Steht auf diesem Feld in dieser Richtung eine Wand?
   * @returns {boolean} false, sobald der Versuch hinüber ist
   */
  schritt(richtung, position, anschlag) {
    // Wer die Schlussfolge angefangen hat, darf nicht mehr loslaufen.
    if (this.tasten > 0) return false;

    if (this.lauf < 0) {
      if (richtung !== this.abfolge[0]) return false;
      this.lauf = 0;
      this.richtung = richtung;
      return true;
    }

    if (richtung === this.richtung) return true;

    // Richtungswechsel. Der Lauf davor endete auf dem Feld, das einen Schritt
    // zurück liegt – und der muss dort an einer Wand geendet haben.
    const vektor = RICHTUNGS_VEKTOR[richtung];
    const ende = { x: position.x - vektor.x, y: position.y - vektor.y };
    if (!anschlag(ende, this.richtung)) return false;

    this.lauf += 1;
    if (this.lauf >= this.abfolge.length) return false;
    if (richtung !== this.abfolge[this.lauf]) return false;
    this.richtung = richtung;
    return true;
  }

  /**
   * Sind alle sechs Läufe durch und steht der Spieler am Anschlag? Erst dann
   * zählt die Tastenfolge – und erst dann darf die Weltszene A und B
   * abfangen, statt sie wie sonst als Ansprechen und Rennen zu werten.
   */
  tastenBereit(position, anschlag) {
    if (this.lauf !== this.abfolge.length - 1) return false;
    return anschlag(position, this.richtung);
  }

  /**
   * Eine Taste der Schlussfolge.
   * @param {string} taste
   * @returns {'weiter'|'fehler'|'geloest'}
   */
  taste(taste) {
    if (taste !== TASTENFOLGE[this.tasten]) return 'fehler';
    this.tasten += 1;
    return this.tasten >= TASTENFOLGE.length ? 'geloest' : 'weiter';
  }
}
