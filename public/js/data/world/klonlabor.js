// ============================================================================
// Klonlabor unter dem Boxenstopp
// ----------------------------------------------------------------------------
// Unter jedem Heilungscenter liegt dasselbe Geheimnis: ein Kellergeschoss, in
// dem im Expressverfahren Klone gezogen werden. Der Weg dorthin ist bewusst
// unauffällig:
//
//   1. Tastenfeld – ein kleiner grauer Kasten an der Wand hinten rechts im
//      Boxenstopp, direkt neben dem Lagercomputer. Ansprechen öffnet die
//      Codeeingabe (siehe scenes/tastenfeld.js).
//   2. Fahrstuhltür – erscheint erst nach der richtigen Kombination links
//      neben dem Tastenfeld. Bis dahin steht dort schlicht Wand.
//   3. Fahrstuhl – eine eigene Szene mit Türen, Ruckeln und Stockwerksanzeige
//      (siehe scenes/fahrstuhl.js).
//   4. Labor – Kapseln voller Hardtekkmon, ein Haufen derer, die es nicht
//      geschafft haben, und ein Professor, der gerade sehr erschrickt.
//
// Wie bei Boxenstopp, Kiosk und Casino bekommt jede Stadt einen eigenen Satz,
// damit der Rückweg wieder in der richtigen Stadt herauskommt.
// ============================================================================

import { baueKarte, person } from './verzeichnis.js';
import { generator, saatAusText } from '../../engine/rng.js';
import { ARTEN } from '../arten.js';

/** Die Kombination, die das Tastenfeld öffnet. */
export const KLONLABOR_CODE = '666';

/**
 * Wo in einer Karte die geheime Fahrstuhltür sitzt und welche Flagge sie
 * freischaltet. Anders als ein normaler Übergang steht das NICHT in den
 * Kartendaten – die Kachel ist bis zur richtigen Eingabe Wand, und ein Warp
 * auf einer festen Kachel würde die Weltprüfung zu Recht bemängeln. Gesetzt
 * wird die Kachel zur Laufzeit (siehe wendeGeheimtuerAn in scenes/welt.js).
 * @type {Record<string, {x: number, y: number, flagge: string}>}
 */
export const GEHEIMTUER = {};

/**
 * Wohin eine Fahrstuhltür führt – für beide Richtungen eingetragen.
 * @type {Record<string, {zielId: string, x: number, y: number, richtung: 'runter'|'hoch'}>}
 */
export const FAHRSTUHL_ZIEL = {};

/** Flaggenname der geöffneten Tür eines bestimmten Boxenstopps. */
export function klonlaborFlagge(boxenstoppId) {
  return `klonlabor:${boxenstoppId}`;
}

/** Innenmaße des Labors. */
const BREITE = 18;
const HOEHE = 14;

/** Ankunftsfeld unten: direkt vor der Fahrstuhltür, nicht darauf. */
const EINSTIEG = { x: 2, y: 2 };
/** Lage der Fahrstuhltür im Labor (obere Wand, links). */
const FAHRSTUHL = { x: 2, y: 1 };

/** Die Kapseln stehen hinten an der Wand und rechts und links außen. */
const KAPSELPLAETZE = [
  [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2],
  [12, 2], [13, 2], [14, 2], [15, 2],
  [16, 3], [16, 4], [16, 5],
  [1, 3], [1, 4],
];

/** Der Haufen vorne rechts – gestapelt und danebenliegend. */
const HAUFEN = [[15, 10], [16, 10], [15, 11], [16, 11]];
const EINZELNE_LEICHEN = [[14, 11], [16, 9]];

/** Lachen, die sicher liegen: rund um Maschine und Haufen. */
const FESTE_FLECKEN = [
  [14, 10], [13, 11], [14, 12], [15, 12], [16, 12], [13, 10], [15, 9], [14, 9],
];

/** Wie viele zusätzliche Lachen zufällig über den Rest des Bodens gehen. */
const ZUSATZ_FLECKEN = 12;

/**
 * Die Sprüche des Professors. Der Schreck kommt nur beim ersten Mal, danach
 * ist er nur noch genervt – aber verkäuflich (siehe spricheKlonprofessor in
 * scenes/welt.js).
 */
export const PROFESSOR_TEXTE = {
  schreck: [
    'Der Mann am Tisch fährt herum, eine Pipette fällt zu Boden.',
    'WAS?! Wie— nein. NEIN. Das Tastenfeld! Wie sind Sie durch das Tastenfeld gekommen?!',
    'Hier kommt niemand rein. Niemand! Das ist ein Sicherheitsbereich, das ist … das ist eine Katastrophe.',
    'Also gut. Ganz ruhig. Wir zwei reden jetzt über Schweigegeld.',
  ],
  wieder: [
    'Sie schon wieder. Sie waren nie hier, schon vergessen?',
    'Aber gut. Wir können gern noch mal über Schweigegeld reden.',
  ],
  frage: 'Wie viel ist Ihnen Ihr Schweigen wert?',
  zuWenig: [
    'Er sieht auf Ihren Beutel. Dann auf Sie. Dann wieder auf den Beutel.',
    'So viel haben Sie ja nicht mal. Kommen Sie wieder, wenn Sie zahlen können.',
  ],
  klein: [
    'Hundert. Na schön. Für hundert vergesse ich Ihr Gesicht.',
    'Sie haben hier nichts gesehen. Es gibt hier nichts zu sehen. Und jetzt raus.',
  ],
  gross: [
    'Fünfhundert. Sehr vernünftig. Dann setzen Sie sich, das dauert einen Moment.',
    'Sie haben sich nie gefragt, warum ein Boxenstopp Ihr halbtotes Hardtekkmon in elf Sekunden wieder auf Betriebstemperatur hat? Kein Mate der Welt ist so schnell. Nichts ist so schnell.',
    'Oben passiert Folgendes: Sie geben Ihr Hardtekkmon ab, die Schwester legt es auf den Teller, und es wird eingescannt. Jede Zelle, jede Narbe, jede Macke. Zwei Sekunden.',
    'Der Scan kommt hier runter. Wir setzen ihn im Expressverfahren auf einen Blankoklon – so einen, wie sie da hinten in den Kapseln schwimmen. Frisch, ohne Kratzer, volle Kraftpunkte.',
    'Der Klon fährt nach oben. Die Schwester lächelt. Sie bekommen "Ihr" Hardtekkmon zurück, und es ist perfekt. Weil es neu ist.',
    'Und das Original? Das haben Sie an der Theke abgegeben. Das geht hier durch die Maschine da drüben. Die läuft rund um die Uhr.',
    'Den Rest sehen Sie ja selbst da vorne liegen. Wir kommen mit dem Entsorgen kaum hinterher.',
    'Also. Fünfhundert. Und jetzt gehen Sie heilen, wie alle anderen auch.',
  ],
  bezahlt: [
    'Der Professor winkt ab, ohne aufzusehen.',
    'Sie wissen alles. Umso mehr Grund, den Mund zu halten.',
  ],
};

/**
 * Baut das Labor einer Stadt und trägt den Fahrstuhl in beide Richtungen ein.
 * @param {string} id Kartenkennung des Labors
 * @param {string} ortName
 * @param {string} boxenstoppId Karte darüber
 * @param {{x: number, y: number}} tuerOben Lage der Fahrstuhltür im Boxenstopp
 */
export function baueKlonlabor(id, ortName, boxenstoppId, tuerOben) {
  // Feste Aussaat aus dem Ortsnamen: dieselbe Stadt hat immer dieselben
  // Kapseln und dieselben Lachen, verschiedene Städte aber verschiedene.
  const rnd = generator(saatAusText(`klonlabor:${boxenstoppId}`));
  // Jede Kapsel bekommt ein anderes Hardtekkmon; die Stadt-Aussaat sorgt für
  // immer dieselbe Belegung, aber von Stadt zu Stadt eine andere.
  const vorrat = ARTEN.map((art) => art.name);
  const kapseln = KAPSELPLAETZE.map(([x, y]) => ({
    x, y, art: vorrat[Math.floor(rnd() * vorrat.length)],
  }));

  const karte = baueKarte(id, {
    name: `Klonlabor ${ortName}`, breite: BREITE, hoehe: HOEHE, drinnen: true, musik: 'klonlabor',
  }, (bauer) => {
    bauer.rechteck(0, 0, BREITE, HOEHE, 'laborwand');
    bauer.rechteck(1, 2, BREITE - 2, HOEHE - 3, 'laborboden');

    bauer.setze(FAHRSTUHL.x, FAHRSTUHL.y, 'fahrstuhltuer');
    // Der Auswertungsrechner gleich neben dem Fahrstuhl – hier kommen die
    // Scans von oben an.
    bauer.setze(3, 2, 'computer');

    for (const [x, y] of KAPSELPLAETZE) bauer.setze(x, y, 'klonkapsel');

    // Arbeitsplatz des Professors und eine zweite Bank an der linken Seite.
    for (const x of [6, 7, 8]) bauer.setze(x, 7, 'labortisch');
    for (const x of [2, 3]) bauer.setze(x, 7, 'labortisch');

    bauer.setze(15, 8, 'toetungsmaschine');
    bauer.setze(16, 8, 'toetungsmaschine');

    for (const [x, y] of HAUFEN) bauer.setze(x, y, 'leichenhaufen');
    for (const [x, y] of EINZELNE_LEICHEN) bauer.setze(x, y, 'totesMon');

    for (const [x, y] of FESTE_FLECKEN) {
      if (bauer.hole(x, y) === 'laborboden') bauer.setze(x, y, 'blutfleck');
    }
    // Der Rest verteilt sich zufällig, aber nur auf noch blanken Boden.
    for (let i = 0; i < ZUSATZ_FLECKEN; i += 1) {
      const x = 1 + Math.floor(rnd() * (BREITE - 2));
      const y = 2 + Math.floor(rnd() * (HOEHE - 3));
      if (bauer.hole(x, y) === 'laborboden') bauer.setze(x, y, 'blutfleck');
    }

    return {
      kapseln,
      npcs: [
        person(7, 6, 'professor', 'unten', {
          text: PROFESSOR_TEXTE.schreck,
          aktion: { art: 'klonprofessor' },
        }),
      ],
    };
  });

  FAHRSTUHL_ZIEL[id] = { zielId: boxenstoppId, x: tuerOben.x, y: tuerOben.y + 1, richtung: 'hoch' };
  FAHRSTUHL_ZIEL[boxenstoppId] = {
    zielId: id, x: EINSTIEG.x, y: EINSTIEG.y, richtung: 'runter',
  };
  GEHEIMTUER[boxenstoppId] = {
    x: tuerOben.x, y: tuerOben.y, flagge: klonlaborFlagge(boxenstoppId),
  };

  return karte;
}
