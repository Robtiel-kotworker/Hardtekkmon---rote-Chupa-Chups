// ============================================================================
// Bruchbude und Casino
// ----------------------------------------------------------------------------
// Vier Karten hintereinander, die zusammen den Weg nach unten erzählen:
//
//   1. Bruchbude – ein winziger, vergammelter Keller mit Gerümpel. Sieht nach
//      nichts aus. Hinten führt eine Treppe weiter runter.
//   2. Treppenschacht – sehr lang, stockdunkel, nur alle paar Meter eine
//      Funzel. Der Abstieg dauert bewusst spürbar lange (siehe SCHACHT_TIEFE).
//   3. Casino – ein viel zu großer, viel zu prächtiger Saal: roter Teppich,
//      Gold an den Wänden, Kronleuchter. Der Bruch zur Bude oben ist der Witz.
//   4. Proberaum – hinter einer unauffälligen Klopftür ganz hinten im Saal:
//      DJ-Pult und fette Boxen, der eigentliche Grund für den ganzen Bau
//      (siehe KLOPFTUER_ZIEL und baueProberaum unten).
//
// Gebaut wird pro Stadt ein eigener Satz, damit der Rückweg wieder in der
// richtigen Stadt herauskommt – genauso wie bei Boxenstopp und Kiosk. Jede
// Stadt bekommt eine; wo genau die Bruchbude in der jeweiligen Stadt
// auftaucht, sucht sich platziereBruchbude() selbst (siehe dort) – anders
// als bei Boxenstopp und Kiosk gibt es also keine feste Übergabeposition.
// ============================================================================

import {
  baueKarte, person, warp, schild,
} from './verzeichnis.js';
import { generator, saatAusText } from '../../engine/rng.js';

/**
 * Länge des Treppenschachts in Kacheln. Bei 16 Pixeln je Kachel und dem
 * Lauftempo der Weltszene sind das rund 40 Sekunden für den Abstieg – lang
 * genug, dass es auffällt, kurz genug, dass es nicht nervt.
 */
const SCHACHT_TIEFE = 46;
/** Alle so viele Stufen hängt eine Funzel an der Wand. */
const LAMPEN_ABSTAND = 7;

/** Innenmaße des Casinosaals. */
const SAAL_BREITE = 26;
const SAAL_HOEHE = 20;

/** Innenmaße des Proberaums hinter der Klopftür. */
const PROBERAUM_BREITE = 10;
const PROBERAUM_HOEHE = 8;

/** Startpunkte auf den erzeugten Karten. */
const EINSTIEG = {
  bude: { x: 5, y: 8 },
  schachtOben: { x: 3, y: 2 },
  schachtUnten: { x: 3, y: SCHACHT_TIEFE - 2 },
  saalOben: { x: 13, y: 2 },
  // Die Ausgangstür des Proberaums – unten mittig, wie in jedem Innenraum.
  proberaum: { x: Math.floor(PROBERAUM_BREITE / 2), y: PROBERAUM_HOEHE - 1 },
};

/**
 * Ziel einer Klopftür: Kartenkennung des Saals -> wohin sie nach dem dritten
 * Klopfen führt. Anders als ein normaler Übergang steht das NICHT in den
 * Warps der Kartendaten – die Klopftür bleibt immer 'fest' (siehe die
 * Kachel in gfx/tiles.js), ein Übergang auf einer festen Kachel würde die
 * Weltprüfung (tools/pruefe-welt.mjs) zu Recht als Fehler melden. Ausgelöst
 * wird der Wechsel stattdessen direkt aus scenes/welt.js, sobald dort genug
 * geklopft wurde.
 * @type {Record<string, {zielId: string, x: number, y: number}>}
 */
export const KLOPFTUER_ZIEL = {};

/**
 * Sprüche der Zocker im Saal. Durcheinander, abgerissen, halb vom Automaten
 * und halb von der Tanzfläche – die Leute hier sind seit Tagen wach.
 */
const ZOCKER_TEXTE = [
  ['Noch drei Freispiele, dann geh ich. Sagt der Kick. Der Kick sagt das.',
    'Welcher Tag ist Dienstag?'],
  ['Ich hab das System. Rot, Rot, Schwarz, Bass, Rot.',
    'Frag mich nicht nach dem Bass. Der Bass war zuerst da.'],
  ['Zwanzig Umdrehungen die Minute. Die Walze auch. Alles dreht.',
    'Hast du meine Jacke? Ich hatte eine Jacke. Glaube ich.'],
  ['GEWONNEN. Nein. Doch nicht. Ich dachte, aber nein.',
    'Egal. Weiter. Das Ding schuldet mir was.'],
  ['Der Teppich atmet, ist dir das aufgefallen? Der atmet im Takt.',
    'Vier Viertel. Wie alles hier unten.'],
  ['Ich war oben. Es gab Tageslicht. War komisch. Bin wieder runter.'],
  ['Setz nie alles. Hör auf mich. Ich hab gerade alles gesetzt.'],
  ['Die Kugel fällt immer irgendwo hin. Das ist das Schöne. Und das Schlimme.',
    'Meistens das Schlimme.'],
];

/**
 * Die Bruchbude von innen: ein enger, feuchter Keller. Alles deutet darauf
 * hin, dass hier nichts ist – bis auf die Treppe hinten rechts.
 */
function baueBruchbude(id, ortName, rueck, schachtId) {
  return baueKarte(id, {
    name: `Bruchbude ${ortName}`, breite: 11, hoehe: 10, drinnen: true,
  }, (bauer) => {
    bauer.rechteck(0, 0, 11, 10, 'wandInnen');
    bauer.rechteck(1, 2, 9, 7, 'bodenInnen');

    // Gerümpel an den Wänden – der Raum sieht nach Abstellkammer aus.
    bauer.setze(1, 2, 'geruempel');
    bauer.setze(2, 2, 'geruempel');
    bauer.setze(9, 2, 'geruempel');
    bauer.setze(1, 6, 'tonne');
    bauer.setze(9, 5, 'geruempel');
    bauer.setze(4, 2, 'regal');

    // Ausgangsmatte unten mittig, wie in allen Innenräumen.
    bauer.setze(5, 8, 'tuer');
    bauer.setze(6, 8, 'tuer');

    // Die Treppe nach unten: unscheinbar in der Ecke.
    bauer.setze(8, 3, 'treppeRunter');

    return {
      warps: [
        warp(5, 8, rueck.karte, rueck.x, rueck.y),
        warp(6, 8, rueck.karte, rueck.x, rueck.y),
        warp(8, 3, schachtId, EINSTIEG.schachtOben.x, EINSTIEG.schachtOben.y),
      ],
      npcs: [
        person(2, 4, 'opa', 'rechts', {
          text: ['Der Keller? Der Keller ist nur ein Keller.',
            'Da unten ist nichts. Gar nichts. Nie was gewesen.',
            '… du warst nie hier, ja?'],
        }),
      ],
      schilder: [],
    };
  });
}

/**
 * Der Treppenschacht: schmal, stockdunkel, sehr lang. Die Karte ist
 * `dunkel`, es gibt also nur den Lichtkreis um den Spieler – plus das
 * bisschen, das die Funzeln an der Wand hergeben (siehe zeichneDunkelheit
 * in scenes/welt.js).
 */
function baueSchacht(id, ortName, budeId, saalId) {
  return baueKarte(id, {
    name: `Treppe unter ${ortName}`, breite: 7, hoehe: SCHACHT_TIEFE,
    drinnen: true, dunkel: true, musik: 'gebaeude',
  }, (bauer) => {
    bauer.rechteck(0, 0, 7, SCHACHT_TIEFE, 'schachtwand');
    // Der begehbare Schacht: drei Kacheln breit, über die volle Länge.
    bauer.rechteck(2, 1, 3, SCHACHT_TIEFE - 2, 'stufen');

    // Funzeln alle paar Stufen, abwechselnd links und rechts.
    for (let y = 4; y < SCHACHT_TIEFE - 3; y += LAMPEN_ABSTAND) {
      bauer.setze(y % (LAMPEN_ABSTAND * 2) === 4 ? 1 : 5, y, 'schachtlampe');
    }

    // Oben zurück in die Bude, unten weiter in den Saal.
    bauer.setze(3, 0, 'treppeHoch');
    bauer.setze(3, SCHACHT_TIEFE - 1, 'treppeRunter');

    // Einziger Hinweis im ganzen Schacht, gleich am oberen Ende.
    bauer.schild(5, 2, 'Kein Ausschank. Kein Rückweg. Viel Spaß.');

    return {
      warps: [
        warp(3, 0, budeId, EINSTIEG.bude.x, EINSTIEG.bude.y),
        warp(3, SCHACHT_TIEFE - 1, saalId, EINSTIEG.saalOben.x, EINSTIEG.saalOben.y),
      ],
    };
  });
}

/**
 * Der Proberaum hinter der Klopftür: ein schlichter Raum, roh im Vergleich
 * zum protzigen Saal davor. DJ-Pult an der Rückwand, zwei sehr fette Boxen
 * daneben. Interagieren mit dem Pult öffnet den 16-Step-Sequenzer (siehe
 * scenes/sequenzer.js).
 */
function baueProberaum(id, ortName, rueck) {
  return baueKarte(id, {
    name: `Proberaum ${ortName}`, breite: PROBERAUM_BREITE, hoehe: PROBERAUM_HOEHE, drinnen: true,
  }, (bauer) => {
    bauer.rechteck(0, 0, PROBERAUM_BREITE, PROBERAUM_HOEHE, 'wandInnen');
    bauer.rechteck(1, 1, PROBERAUM_BREITE - 2, PROBERAUM_HOEHE - 2, 'bodenInnen');

    const mitte = Math.floor(PROBERAUM_BREITE / 2);
    bauer.setze(2, 2, 'box');
    bauer.setze(PROBERAUM_BREITE - 3, 2, 'box');
    bauer.setze(mitte, 2, 'djpult');

    bauer.setze(EINSTIEG.proberaum.x, EINSTIEG.proberaum.y, 'tuer');

    return {
      warps: [warp(EINSTIEG.proberaum.x, EINSTIEG.proberaum.y, rueck.karte, rueck.x, rueck.y)],
      npcs: [
        person(2, PROBERAUM_HOEHE - 3, 'schrauber', 'rechts', {
          text: ['Klingt scheiße, aber laut. Reicht doch.',
            'Wer angeklopft hat, darf bleiben. So läuft das hier.'],
        }),
      ],
      schilder: [],
    };
  });
}

/**
 * Der Saal. Roter Teppich, goldene Lampen an allen Wänden, Säulen, und in der
 * Mitte die Tische. Die Automaten stehen an der linken Wand – dort hängen
 * auch die Zocker (siehe Bewegungsart 'zocker' in scenes/welt.js).
 */
function baueCasinoSaal(id, ortName, schachtId, saat, stadtId) {
  const breite = SAAL_BREITE;
  const hoehe = SAAL_HOEHE;

  return baueKarte(id, {
    name: `Casino ${ortName}`, breite, hoehe, drinnen: true, musik: 'casino',
  }, (bauer) => {
    bauer.rechteck(0, 0, breite, hoehe, 'goldwand');
    bauer.rechteck(1, 2, breite - 2, hoehe - 3, 'teppichRot');

    // Goldene Lampen in gleichmäßigem Abstand an der oberen Wand.
    for (let x = 2; x < breite - 2; x += 4) bauer.setze(x, 1, 'goldlampe');

    // Säulenpaare, die den Saal gliedern.
    for (const y of [5, 12]) {
      bauer.setze(6, y, 'goldsaeule');
      bauer.setze(breite - 7, y, 'goldsaeule');
    }

    // Goldener Läufer vom Treppenfuß bis in die Mitte.
    for (let y = 2; y <= 6; y += 1) bauer.setze(Math.floor(breite / 2), y, 'teppichGold');

    // Treppe zurück nach oben, oben mittig.
    bauer.setze(Math.floor(breite / 2), 1, 'treppeHoch');

    // --- Automatenreihe an der linken Wand -----------------------------------
    const automaten = [];
    for (let y = 4; y <= 14; y += 2) {
      bauer.setze(2, y, 'automat');
      automaten.push({ x: 3, y });
    }

    // --- Tische in der Mitte und rechts --------------------------------------
    bauer.setze(11, 8, 'roulettetisch');
    bauer.setze(12, 8, 'roulettetisch');
    bauer.setze(17, 6, 'kartentisch');
    bauer.setze(18, 6, 'kartentisch');
    bauer.setze(17, 13, 'risikotisch');
    bauer.setze(18, 13, 'risikotisch');

    // Ein wenig Ausstattung, damit der Saal bewohnt wirkt.
    bauer.setze(breite - 3, 3, 'pflanze');
    bauer.setze(breite - 3, hoehe - 4, 'pflanze');
    bauer.setze(2, hoehe - 4, 'tonne');

    // Die Briefsäule, ganz hinten in der rechten Ecke – so weit weg vom
    // Treppenfuß, wie der Saal es hergibt. An ihr hängt der blaue Brief mit
    // der Laufformation (siehe game/saeulenraetsel.js).
    bauer.setze(breite - 2, hoehe - 2, 'briefsaeule');

    // --- Klopftür zum Proberaum ------------------------------------------------
    // Unauffällig in der unteren Wand, weit weg vom Treppenfuß: eine
    // schlichte graue Tür in der ganzen Pracht. Das Schild daneben nutzt die
    // Plaketten-Variante (siehe wandschild in gfx/tiles.js) statt des
    // üblichen Schildpfostens – der wäre auf grünem Grund gedacht und würde
    // mitten in der Goldwand wie ein Fremdkörper wirken.
    const klopfX = 5;
    const klopfY = hoehe - 1;
    const klopfRueck = { x: klopfX, y: hoehe - 2 };
    bauer.setze(klopfX, klopfY, 'klopftuer');
    bauer.setze(klopfX + 3, klopfY, 'wandschild');

    const proberaumId = `proberaum_${stadtId}`;
    baueProberaum(proberaumId, ortName, { karte: id, x: klopfRueck.x, y: klopfRueck.y });
    KLOPFTUER_ZIEL[id] = {
      zielId: proberaumId, x: EINSTIEG.proberaum.x, y: EINSTIEG.proberaum.y,
    };

    // --- Personal ------------------------------------------------------------
    const npcs = [
      // Die drei Croupiers stehen hinter ihren Tischen und starten das Spiel.
      person(11, 7, 'wirt', 'unten', {
        text: 'Rien ne va plus. Oder wie man das hier unten sagt: rein da.',
        aktion: { art: 'casino', spiel: 'roulette' },
      }),
      person(17, 5, 'techniker', 'unten', {
        text: 'Siebzehn und vier. Beziehungsweise einundzwanzig. Setz was.',
        aktion: { art: 'casino', spiel: 'blackjack' },
      }),
      person(17, 12, 'zombie', 'unten', {
        text: 'Alles oder nichts. Dazwischen gibt es hier nicht.',
        aktion: { art: 'casino', spiel: 'risiko' },
      }),
      // Der freie Automat ganz unten ist der des Spielers.
      person(3, 16, 'raver', 'links', {
        text: 'Der da hinten ist frei. Der frisst aber auch gern mal alles.',
        aktion: { art: 'casino', spiel: 'bandit' },
      }),
    ];
    bauer.setze(2, 16, 'automat');

    // --- Zocker --------------------------------------------------------------
    // Wie viele es sind und wo sie hängen, entscheidet die Aussaat des
    // Ortsnamens: immer dieselbe Aufstellung je Stadt, aber von Stadt zu
    // Stadt verschieden.
    const rnd = generator(saat);
    const figuren = ['raver', 'zombie', 'techniker', 'schrauber', 'kumpel'];
    const frei = automaten.filter((a) => a.y !== 16);
    const anzahl = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < anzahl && frei.length > 0; i += 1) {
      const platz = frei.splice(Math.floor(rnd() * frei.length), 1)[0];
      const texte = ZOCKER_TEXTE[Math.floor(rnd() * ZOCKER_TEXTE.length)];
      npcs.push({
        x: platz.x, y: platz.y, figur: figuren[Math.floor(rnd() * figuren.length)],
        richtung: 'links', bewegung: 'zocker', text: texte,
        // Der Automat, an dem dieser Zocker klebt und zu dem er zurückkehrt.
        platz: { x: platz.x, y: platz.y },
      });
    }

    return {
      warps: [warp(Math.floor(breite / 2), 1, schachtId, EINSTIEG.schachtUnten.x, EINSTIEG.schachtUnten.y)],
      npcs,
      schilder: [schild(klopfX + 3, klopfY, 'Shitter. Proberaum. Privat. Bitte dreimal klopfen.')],
      beschriftungen: [],
    };
  });
}

/**
 * Betonfläche um das Häuschen. Anders als bei Boxenstopp und Kiosk gibt es
 * rechts keinen Rand (nur links/oben/unten je 1 Kachel) – so passt die Bude
 * auch noch in schmalere Lücken zwischen Straße und Nachbargebäude.
 */
const BUDE_BREITE = 5;
const BUDE_HOEHE = 5;
/**
 * Nur Felder, die noch genau diese unberührte Grundkachel tragen, kommen als
 * Standort infrage. Jede Stadt füllt sich zu Beginn komplett mit 'gras'
 * (siehe die baueKarte-Aufrufe in region_ost.js/region_west.js); alles, was
 * inzwischen ein Weg, ein anderes Gebäude, Wasser, hohes Gras oder ein
 * gestreuter Baum ist, hat also eine andere Kachel und fällt automatisch
 * raus. Der Kartenrand selbst ist 'baum' (siehe rahmen()), zählt also auch
 * nicht als frei.
 */
const FREIE_KACHEL = 'gras';

/**
 * Baut die Bruchbude an einer festen Stelle: Betonfläche, das kleine graue
 * Häuschen, ein Schild, das nichts verrät – und dahinter die drei
 * Innenkarten (Keller, Schacht, Saal).
 *
 * @param {number} ax linke obere Ecke der Betonfläche
 */
function baueBruchbudenGebaeude(bauer, ax, ay, stadtId, ortName) {
  const budeId = `bruchbude_${stadtId}`;
  const schachtId = `casinoschacht_${stadtId}`;
  const saalId = `casino_${stadtId}`;
  const x = ax + 1;
  const y = ay + 1;

  bauer.rechteck(ax, ay, BUDE_BREITE, BUDE_HOEHE, 'beton');
  const { tuerX, tuerY } = bauer.haus(x, y, 4, 3, {
    dach: 'dachGrau', ziel: budeId, zx: EINSTIEG.bude.x, zy: EINSTIEG.bude.y,
  });
  bauer.schild(x + 4, y + 2, 'Privat. Nichts zu sehen.');

  baueBruchbude(budeId, ortName, { karte: stadtId, x: tuerX, y: tuerY }, schachtId);
  baueSchacht(schachtId, ortName, budeId, saalId);
  baueCasinoSaal(saalId, ortName, schachtId, saatAusText(`casino:${stadtId}`), stadtId);

  return { tuerX, tuerY };
}

/**
 * Sucht einen freien Fleck für die Bruchbude und baut sie dort hin – in
 * jeder Stadt woanders, aber mit fester, aus dem Stadtnamen abgeleiteter
 * Aussaat immer an derselben Stelle (sonst zeigt ein gespeicherter Rückweg
 * beim nächsten Laden ins Leere).
 *
 * Aufgerufen wird das, nachdem Wege und alle anderen Gebäude stehen, aber
 * VOR dem gestreuten Bewuchs (bauer.streuenAuf(...) für Blumen und Bäume).
 * Das hat einen konkreten Grund: streuenAuf() setzt zufällig auf jede
 * `gras`-Kachel im ganzen Stadtgebiet, unabhängig von einer Größe – bei den
 * üblichen Dichten (10 % Blumen, 6 % Bäume) übersteht ein zusammenhängender
 * 6x5-Fleck das im Mittel nur zu unter 1 %. Perfekt freie Flächen dieser
 * Größe wären danach also praktisch nie mehr zu finden. Läuft die Suche
 * dagegen vorher, muss sie nur echte Gebäude, Wege und Wasser meiden; die
 * Bruchbude belegt ihre Fläche dann selbst mit eigenen Kacheln (Beton,
 * Hauswand …), sodass der Bewuchs direkt danach automatisch außen vor
 * bleibt – er streut ja ausdrücklich nur auf noch unberührtes 'gras'.
 *
 * @param {import('./bauplan.js').Kartenbauer} bauer
 * @param {string} stadtId
 * @param {string} ortName
 * @param {{x: number, y: number}[]} meiden Zusätzlich zu meidende Punkte –
 *   die Stellen, an denen in dieser Stadt Figuren herumstehen. Die Kachel
 *   unter einer Figur bleibt 'gras', eine reine Kachelprüfung würde sie
 *   also übersehen.
 */
export function platziereBruchbude(bauer, stadtId, ortName, meiden = []) {
  const rnd = generator(saatAusText(`bruchbude:${stadtId}`));

  const kandidaten = [];
  for (let ay = 1; ay <= bauer.hoehe - 1 - BUDE_HOEHE; ay += 1) {
    for (let ax = 1; ax <= bauer.breite - 1 - BUDE_BREITE; ax += 1) {
      kandidaten.push({ ax, ay });
    }
  }
  // Fisher-Yates mit der Stadt-Aussaat: Reihenfolge steht fest, ist aber von
  // Stadt zu Stadt unterschiedlich.
  for (let i = kandidaten.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [kandidaten[i], kandidaten[j]] = [kandidaten[j], kandidaten[i]];
  }

  const passt = ({ ax, ay }) => {
    for (let dy = 0; dy < BUDE_HOEHE; dy += 1) {
      for (let dx = 0; dx < BUDE_BREITE; dx += 1) {
        if (bauer.hole(ax + dx, ay + dy) !== FREIE_KACHEL) return false;
      }
    }
    return meiden.every((p) => (
      p.x < ax || p.x >= ax + BUDE_BREITE || p.y < ay || p.y >= ay + BUDE_HOEHE
    ));
  };

  const treffer = kandidaten.find(passt);
  if (!treffer) throw new Error(`Kein Platz für die Bruchbude in ${stadtId} gefunden.`);

  return baueBruchbudenGebaeude(bauer, treffer.ax, treffer.ay, stadtId, ortName);
}
