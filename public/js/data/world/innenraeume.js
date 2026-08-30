// ============================================================================
// Innenräume
// ----------------------------------------------------------------------------
// Boxenstopps, Kioske, Gig-Bühnen und Wohnhäuser folgen jeweils demselben
// Grundriss und werden deshalb erzeugt statt einzeln gezeichnet. Jede Funktion
// bekommt die Rücksprungstelle (Türkachel der Außenkarte) und legt beide
// Richtungen des Übergangs an.
// ============================================================================

import { baueKarte, person, warp, kaempfer } from './verzeichnis.js';

/**
 * @typedef {{ karte: string, x: number, y: number }} Rueckweg
 */

/** Grundriss: Wand außen, Boden innen, Ausgangsmatte unten mittig. */
function grundriss(bauer, boden = 'bodenInnen') {
  bauer.rechteck(0, 0, bauer.breite, bauer.hoehe, 'wandInnen');
  bauer.rechteck(1, 2, bauer.breite - 2, bauer.hoehe - 3, boden);
  const matteX = Math.floor(bauer.breite / 2) - 1;
  const matteY = bauer.hoehe - 2;
  bauer.setze(matteX, matteY, 'tuer');
  bauer.setze(matteX + 1, matteY, 'tuer');
  return { matteX, matteY };
}

function ausgang(matteX, matteY, rueck) {
  return [
    warp(matteX, matteY, rueck.karte, rueck.x, rueck.y),
    warp(matteX + 1, matteY, rueck.karte, rueck.x, rueck.y),
  ];
}

/**
 * Boxenstopp: hier werden Hardtekkmon kostenlos wieder aufgepäppelt.
 * @param {string} id
 * @param {string} ort
 * @param {Rueckweg} rueck
 */
export function baueBoxenstopp(id, ort, rueck) {
  return baueKarte(id, {
    name: `Boxenstopp ${ort}`, breite: 14, hoehe: 11, musik: 'boxenstopp', drinnen: true,
  }, (bauer) => {
    const { matteX, matteY } = grundriss(bauer);
    bauer.rechteck(2, 3, 7, 1, 'tresen');
    bauer.setze(10, 3, 'heilgeraet');
    bauer.setze(11, 3, 'pflanze');
    bauer.setze(2, 7, 'tisch');
    bauer.setze(3, 7, 'tisch');
    bauer.setze(10, 7, 'plattenspieler');
    bauer.setze(12, 7, 'computer');

    return {
      warps: ausgang(matteX, matteY, rueck),
      npcs: [
        person(5, 2, 'schwester', 'unten', {
          aktion: { art: 'heilen' },
          text: 'Willkommen im Boxenstopp. Soll ich deine Hardtekkmon wieder auf Betriebstemperatur bringen?',
        }),
        person(11, 6, 'kumpel', 'unten', {
          text: 'Hier kannst du dich ausruhen. Kostet nix. Ist auch besser so.',
        }),
      ],
    };
  });
}

/**
 * Kiosk: Verkaufsstelle für Samplepacks und Getränke.
 * @param {string[]} waren
 */
export function baueKiosk(id, ort, rueck, waren) {
  return baueKarte(id, {
    name: `Kiosk ${ort}`, breite: 14, hoehe: 11, drinnen: true,
  }, (bauer) => {
    const { matteX, matteY } = grundriss(bauer);
    bauer.rechteck(3, 3, 8, 1, 'tresen');
    for (let x = 1; x < 13; x += 2) bauer.setze(x, 1, 'regal');
    bauer.setze(1, 7, 'regal');
    bauer.setze(12, 7, 'regal');

    return {
      warps: ausgang(matteX, matteY, rueck),
      npcs: [
        person(6, 2, 'verkaeufer', 'unten', {
          aktion: { art: 'laden', waren },
          text: 'Alles da. Packs, Mate, Kaugummi. Was solls sein?',
        }),
      ],
    };
  });
}

/**
 * Gig-Bühne: der Ort, an dem es die Marken gibt.
 * @param {string} id
 * @param {{ ort: string, leiter: string, trainer: [number, number, string, string][], boden?: string, marke: number }} daten
 * @param {Rueckweg} rueck
 */
export function baueGigHalle(id, daten, rueck) {
  return baueKarte(id, {
    name: `${daten.ort} – Gig`, breite: 18, hoehe: 20, musik: 'gig', drinnen: true,
  }, (bauer) => {
    bauer.rechteck(0, 0, 18, 20, 'wandInnen');
    bauer.rechteck(1, 2, 16, 17, daten.boden ?? 'buehne');

    // Bühne mit Boxentürmen
    bauer.rechteck(4, 2, 10, 4, 'holz');
    for (const x of [3, 14]) {
      bauer.setze(x, 2, 'box');
      bauer.setze(x, 3, 'box');
      bauer.setze(x, 4, 'verstaerker');
    }
    // Boxenreihen als Hindernisse im Saal
    for (const [x, y] of [[3, 9], [4, 9], [13, 9], [14, 9], [6, 13], [7, 13], [10, 13], [11, 13]]) {
      bauer.setze(x, y, 'box');
    }
    bauer.setze(1, 17, 'verstaerker');
    bauer.setze(16, 17, 'verstaerker');

    const matteX = 8;
    const matteY = 18;
    bauer.setze(matteX, matteY, 'tuer');
    bauer.setze(matteX + 1, matteY, 'tuer');

    const npcs = [
      kaempfer(8, 5, 'gigleiter', 'unten', daten.leiter),
      ...daten.trainer.map(([x, y, figur, trainerId]) => kaempfer(x, y, figur, 'unten', trainerId)),
    ];

    return {
      warps: [
        warp(matteX, matteY, rueck.karte, rueck.x, rueck.y),
        warp(matteX + 1, matteY, rueck.karte, rueck.x, rueck.y),
      ],
      npcs,
    };
  });
}

/**
 * Wohnhaus mit ein bis zwei Bewohnern.
 * @param {object[]} bewohner
 */
export function baueHaus(id, name, rueck, bewohner) {
  return baueKarte(id, { name, breite: 12, hoehe: 10, drinnen: true }, (bauer) => {
    const { matteX, matteY } = grundriss(bauer);
    bauer.setze(1, 2, 'bett');
    bauer.setze(1, 3, 'bett');
    bauer.setze(9, 2, 'regal');
    bauer.setze(10, 2, 'regal');
    bauer.setze(4, 5, 'tisch');
    bauer.setze(5, 5, 'tisch');
    bauer.setze(10, 6, 'pflanze');

    return { warps: ausgang(matteX, matteY, rueck), npcs: bewohner };
  });
}

/**
 * Zimmer des Spielers – hier startet das Spiel.
 */
export function baueSpielerzimmer(id, rueck) {
  return baueKarte(id, { name: 'Dein Zimmer', breite: 12, hoehe: 10, drinnen: true }, (bauer) => {
    const { matteX, matteY } = grundriss(bauer);
    bauer.setze(1, 2, 'bett');
    bauer.setze(1, 3, 'bett');
    bauer.setze(9, 2, 'plattenspieler');
    bauer.setze(10, 2, 'regal');
    bauer.setze(4, 5, 'tisch');
    bauer.setze(10, 6, 'pflanze');

    return {
      warps: ausgang(matteX, matteY, rueck),
      npcs: [
        person(9, 3, 'junge', 'oben', {
          unsichtbar: true,
          text: 'Dein Plattenspieler. Die Nadel ist durch, aber er läuft noch.',
        }),
      ],
    };
  });
}

/**
 * Backstage-Raum der Vier Verstärker. Die Tür nach oben öffnet erst, wenn der
 * Raum geschafft ist.
 * @param {{ name: string, trainer: string, weiter: string, weiterX: number, weiterY: number }} daten
 * @param {Rueckweg} rueck
 */
export function baueBackstageRaum(id, daten, rueck) {
  return baueKarte(id, {
    name: daten.name, breite: 14, hoehe: 16, musik: 'gig', drinnen: true,
  }, (bauer) => {
    bauer.rechteck(0, 0, 14, 16, 'wandInnen');
    bauer.rechteck(1, 2, 12, 13, 'buehne');
    bauer.rechteck(4, 2, 6, 2, 'teppich');
    for (const x of [2, 11]) {
      bauer.setze(x, 4, 'box');
      bauer.setze(x, 5, 'box');
      bauer.setze(x, 10, 'verstaerker');
    }

    bauer.setze(6, 1, 'tuerGig');
    bauer.setze(7, 1, 'tuerGig');
    bauer.setze(6, 14, 'tuer');
    bauer.setze(7, 14, 'tuer');

    const sperre = {
      bedingung: { trainerBesiegt: daten.trainer },
      sperrtext: 'Die Tür ist zu. Erst der Auftritt, dann der Backstage-Bereich.',
    };

    return {
      warps: [
        { ...warp(6, 1, daten.weiter, daten.weiterX, daten.weiterY), ...sperre },
        { ...warp(7, 1, daten.weiter, daten.weiterX, daten.weiterY), ...sperre },
        warp(6, 14, rueck.karte, rueck.x, rueck.y),
        warp(7, 14, rueck.karte, rueck.x, rueck.y),
      ],
      npcs: [kaempfer(7, 6, 'gigleiter', 'unten', daten.trainer)],
    };
  });
}

// ----------------------------------------------------------------------------
// Bequeme Kombinationen: Gebäude auf der Außenkarte setzen und den passenden
// Innenraum gleich mit anlegen. Die Rücksprungstelle ergibt sich aus der Tür.
// ----------------------------------------------------------------------------

/**
 * Gepflasterter Streifen rund um ein Gebäude. Er hebt Häuser vom Grün ab und
 * hält gleichzeitig den Bewuchs von den Türen fern.
 * @param {import('./bauplan.js').Kartenbauer} bauer
 */
function vorplatz(bauer, x, y, breite, hoehe) {
  bauer.rechteck(x - 1, y - 1, breite + 2, hoehe + 2, 'beton');
}

/** Innenraum-Startpunkte (Ausgangsmatte) der erzeugten Grundrisse. */
const MATTE = {
  klein: { x: 5, y: 8 }, // 12x10 – Wohnhaus
  standard: { x: 6, y: 9 }, // 14x11 – Boxenstopp, Kiosk
  halle: { x: 8, y: 18 }, // 18x20 – Gig-Bühne
};

/**
 * @param {import('./bauplan.js').Kartenbauer} bauer
 */
export function setzeBoxenstopp(bauer, x, y, stadtId, ortName) {
  const id = `boxenstopp_${stadtId}`;
  vorplatz(bauer, x, y, 6, 5);
  const { tuerX, tuerY } = bauer.haus(x, y, 6, 5, {
    dach: 'dachRot', ziel: id, zx: MATTE.standard.x, zy: MATTE.standard.y,
  });
  // Schild neben dem Eingang – von außen sofort als Heilungscenter erkennbar.
  bauer.schild(x + 6, y + 4, 'Heilungscenter');
  baueBoxenstopp(id, ortName, { karte: stadtId, x: tuerX, y: tuerY });
  return { tuerX, tuerY };
}

export function setzeKiosk(bauer, x, y, stadtId, ortName, waren) {
  const id = `kiosk_${stadtId}`;
  vorplatz(bauer, x, y, 6, 5);
  const { tuerX, tuerY } = bauer.haus(x, y, 6, 5, {
    dach: 'dachBlau', ziel: id, zx: MATTE.standard.x, zy: MATTE.standard.y,
  });
  // Schild neben dem Eingang – von außen sofort als Einkaufszentrum erkennbar.
  bauer.schild(x + 6, y + 4, 'Einkaufszentrum');
  baueKiosk(id, ortName, { karte: stadtId, x: tuerX, y: tuerY }, waren);
  return { tuerX, tuerY };
}

/**
 * @param {{ id: string, ort: string, leiter: string, trainer: [number, number, string, string][], marke: number, boden?: string, bedingung?: object, sperrtext?: string }} daten
 */
export function setzeGigHalle(bauer, x, y, stadtId, daten) {
  vorplatz(bauer, x, y, 7, 4);
  const { tuerX, tuerY } = bauer.halle(x, y, 7, 4, {
    dach: 'dachGrau',
    ziel: daten.id,
    zx: MATTE.halle.x,
    zy: MATTE.halle.y,
    bedingung: daten.bedingung,
    sperrtext: daten.sperrtext,
  });
  baueGigHalle(daten.id, daten, { karte: stadtId, x: tuerX, y: tuerY });
  return { tuerX, tuerY };
}

export function setzeWohnhaus(bauer, x, y, stadtId, id, name, bewohner, dach = 'dachGruen') {
  vorplatz(bauer, x, y, 6, 5);
  const { tuerX, tuerY } = bauer.haus(x, y, 6, 5, {
    dach, ziel: id, zx: MATTE.klein.x, zy: MATTE.klein.y,
  });
  baueHaus(id, name, { karte: stadtId, x: tuerX, y: tuerY }, bewohner);
  return { tuerX, tuerY };
}

/**
 * Das Labor von Professor Wummer: Startpunkt der Reise und Heimat der drei
 * Anfänger-Samplepacks.
 */
export function baueLabor(id, rueck) {
  return baueKarte(id, { name: 'Labor von Prof. Wummer', breite: 18, hoehe: 13, drinnen: true }, (bauer) => {
    bauer.rechteck(0, 0, 18, 13, 'wandInnen');
    bauer.rechteck(1, 2, 16, 10, 'bodenInnen');
    for (let x = 1; x < 17; x += 1) bauer.setze(x, 1, 'regal');
    bauer.rechteck(3, 4, 4, 1, 'tisch');
    bauer.rechteck(11, 4, 4, 1, 'tisch');
    bauer.rechteck(6, 8, 6, 1, 'tisch');
    bauer.setze(1, 10, 'pflanze');
    bauer.setze(16, 10, 'pflanze');
    bauer.setze(16, 4, 'plattenspieler');

    bauer.setze(8, 11, 'tuer');
    bauer.setze(9, 11, 'tuer');

    return {
      warps: [
        warp(8, 11, rueck.karte, rueck.x, rueck.y),
        warp(9, 11, rueck.karte, rueck.x, rueck.y),
      ],
      npcs: [
        person(9, 6, 'professor', 'unten', {
          aktion: { art: 'professor' },
          text: 'Ah, {name}! Da bist du ja. Such dir ein Samplepack aus – da ist jeweils ein Hardtekkmon drin.',
        }),
        person(3, 9, 'techniker', 'oben', {
          text: 'Der Professor macht seit 30 Jahren dasselbe. Und es funktioniert immer noch nicht richtig.',
        }),
        person(14, 9, 'maedchen', 'oben', {
          text: 'Ein Samplepack umschließt ein Hardtekkmon komplett. Fragen? Stell sie lieber nicht.',
        }),
      ],
      gegenstaende: [
        { x: 7, y: 8, starter: 1 },
        { x: 9, y: 8, starter: 2 },
        { x: 11, y: 8, starter: 3 },
      ],
    };
  });
}
