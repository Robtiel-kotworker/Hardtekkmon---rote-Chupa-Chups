// ============================================================================
// Region Ost – von Route 7 bis Backstage
// ----------------------------------------------------------------------------
// Die zweite Hälfte: die Gigs vier bis sieben, das Nebelmoor, der Siegesweg
// und dahinter die Vier Verstärker. Hier stehen auch die legendären
// Hardtekkmon – jeweils als feste Begegnung an einem Ort, den man erst einmal
// finden muss.
// ============================================================================

import { baueKarte, person, kaempfer, schild, fundstueck, warp } from './verzeichnis.js';
import {
  setzeBoxenstopp, setzeKiosk, setzeGigHalle, setzeWohnhaus, baueBackstageRaum,
} from './innenraeume.js';

const mitteX = (breite) => Math.floor(breite / 2) - 1;
const mitteY = (hoehe) => Math.floor(hoehe / 2) - 1;

function stelleSchild(bauer, liste, x, y, text) {
  bauer.setze(x, y, 'schild');
  liste.push(schild(x, y, text));
}

/** Legendäres Hardtekkmon als feste Begegnung auf der Karte. */
function legende(x, y, spezies, stufe, flagge) {
  return {
    x, y, figur: `mon:${spezies}`, richtung: 'unten', bewegung: 'stehen',
    flagge,
    aktion: { art: 'wildkampf', spezies, stufe },
    text: `${spezies} versperrt den Weg!`,
  };
}

const KIOSK_MITTEL = [
  'Samplepack', 'Super-Sample', 'Mate', 'Super-Mate',
  'Allzweckreiniger', 'Defibrillator', 'Boxenkondensator', 'Subwoofer-Kern',
];
const KIOSK_GROSS = [
  'Super-Sample', 'Giga-Sample', 'Super-Mate', 'Giga-Mate', 'Mate-Mate', 'Roter Lolli',
  'Allzweckreiniger', 'Defibrillator', 'Schwarzer Defibrillator', 'Anlaufhilfe', 'Ohrstöpsel', 'Turnschuh-Wachs',
  'Boxenkondensator', 'Subwoofer-Kern',
];

// --- Route 7 -------------------------------------------------------------------
baueKarte('route7', {
  name: 'Route 7 – Schnellstrecke', breite: 44, hoehe: 22,
  begegnungen: 'route7', verbindungen: { westen: 'vinylhafen', osten: 'schranzheim' },
}, (bauer) => {
  const quer = mitteY(22);
  bauer.rahmen('baum');
  bauer.wegX(0, 43, quer, 'asphalt');
  bauer.rechteck(0, quer + 1, 44, 1, 'streifen');
  bauer.wiese(5, 3, 10, 6);
  bauer.wiese(20, 14, 11, 6);
  bauer.wiese(33, 4, 8, 5);
  bauer.streuen(1, 1, 42, 20, 'baum', 0.05, 71);
  bauer.wegX(0, 43, quer, 'asphalt');
  bauer.rechteck(0, quer + 1, 44, 1, 'streifen');

  const schilder = [];
  stelleSchild(bauer, schilder, 20, quer + 4, 'ROUTE 7 – Hier wurde schon mit 180 gefahren. Ohne Auto.');

  return {
    schilder,
    npcs: [
      kaempfer(12, quer - 1, 'maedchen', 'rechts', 'r7_pia'),
      kaempfer(24, quer + 3, 'punk', 'oben', 'r7_olaf'),
      kaempfer(31, quer - 1, 'raver', 'links', 'r7_tanja'),
      kaempfer(38, quer + 3, 'opa', 'oben', 'r7_gerd'),
    ],
    gegenstaende: [fundstueck(7, 18, 'Giga-Sample'), fundstueck(40, 3, 'Giga-Mate')],
  };
});

// --- Schranzheim ----------------------------------------------------------------
baueKarte('schranzheim', {
  name: 'Schranzheim', breite: 40, hoehe: 32,
  verbindungen: { westen: 'route7', norden: 'route9' },
}, (bauer) => {
  const weg = mitteX(40);
  const quer = mitteY(32);
  bauer.rechteck(0, 0, 40, 32, 'gras');
  bauer.rahmen('baum');
  bauer.wegX(0, 39, quer, 'asphalt');
  bauer.wegY(0, quer + 2, weg, 'asphalt');

  setzeBoxenstopp(bauer, 4, 8, 'schranzheim', 'Schranzheim');
  setzeKiosk(bauer, 30, 8, 'schranzheim', 'Schranzheim', KIOSK_GROSS);
  setzeGigHalle(bauer, 24, 22, 'schranzheim', {
    id: 'gig4', ort: 'Schranzheim', leiter: 'gig4', marke: 3,
    trainer: [[4, 11, 'raver', 'schranz_dennis'], [12, 11, 'maedchen', 'schranz_sina'],
      [5, 15, 'techniker', 'schranz_karin'], [11, 15, 'schrauber', 'schranz_steffen']],
  });
  setzeWohnhaus(bauer, 5, 22, 'schranzheim', 'haus_schranzheim_1', 'Haus in Schranzheim', [
    person(4, 4, 'punk', 'unten', {
      text: 'Petra hat mir mal was gegeben. Seitdem hör ich Farben. Ist okay.',
    }),
  ]);

  for (const x of [8, 16, 24, 32]) bauer.setze(x, quer - 2, 'laterne');
  bauer.setze(34, 20, 'box');
  bauer.setze(35, 20, 'box');
  bauer.setze(34, 19, 'verstaerker');
  bauer.wiese(30, 25, 6, 5);

  // Was nach Wegen und Gebäuden noch Wiese ist, bekommt Bewuchs.
  bauer.streuenAuf('gras', 'blume', 0.10, 233);
  bauer.streuenAuf('gras', 'baum', 0.06, 234);

  const schilder = [];
  stelleSchild(bauer, schilder, 23, 27, 'GIG 4 – SCHRANZHEIM. Leitung: Pillen-Petra. Ohrstöpsel empfohlen.');

  return {
    schilder,
    npcs: [
      kaempfer(26, quer + 1, 'rivale', 'links', 'rivale3'),
      person(20, quer + 4, 'raver', 'oben', {
        bewegung: 'drehen',
        text: 'Der Kiosk hier hat alles. Sogar Sachen, die es offiziell nicht gibt.',
      }),
      person(12, 20, 'zombie', 'unten', {
        text: 'Ich steh hier seit dem Gig am Freitag. Welcher Freitag, weiß ich nicht.',
      }),
    ],
    gegenstaende: [fundstueck(37, 29, 'Schwarzer Defibrillator')],
  };
});

// --- Route 9 ---------------------------------------------------------------------
baueKarte('route9', {
  name: 'Route 9 – Sägeschneise', breite: 24, hoehe: 36,
  begegnungen: 'route9', verbindungen: { sueden: 'schranzheim', norden: 'nebelmoor' },
}, (bauer) => {
  const weg = mitteX(24);
  bauer.rahmen('baum');
  bauer.wegY(0, 35, weg);
  bauer.wiese(2, 4, 7, 9);
  bauer.wiese(15, 8, 6, 10);
  bauer.wiese(3, 21, 6, 10);
  bauer.wiese(15, 24, 6, 8);
  bauer.streuen(1, 1, 22, 34, 'fels', 0.06, 93);
  bauer.wegY(0, 35, weg);

  return {
    npcs: [
      person(6, 30, 'schrauber', 'oben', {
        text: 'Weiter nördlich wird es feucht. Und neblig. Und irgendwie unheimlich.',
      }),
    ],
    gegenstaende: [fundstueck(20, 5, 'Giga-Sample'), fundstueck(3, 33, 'Mate-Mate')],
  };
});

// --- Nebelmoor ---------------------------------------------------------------------
baueKarte('nebelmoor', {
  name: 'Nebelmoor', breite: 36, hoehe: 32, grund: 'moor',
  begegnungen: 'nebelmoor', verbindungen: { sueden: 'route9', osten: 'route10' },
}, (bauer) => {
  const weg = mitteX(36);
  const quer = mitteY(32);
  bauer.rahmen('baumDunkel');
  bauer.rechteck(2, 2, 32, 28, 'moorGras');
  bauer.wegY(0, 31, weg);
  bauer.wegX(0, 35, quer);
  bauer.see(4, 4, 8, 6);
  bauer.see(24, 22, 8, 6);

  setzeBoxenstopp(bauer, 20, 6, 'nebelmoor', 'Nebelmoor');
  setzeGigHalle(bauer, 5, 20, 'nebelmoor', {
    id: 'gig5', ort: 'Nebelmoor', leiter: 'gig5', marke: 4, boden: 'moor',
    trainer: [[4, 11, 'techniker', 'moor_nico'], [12, 11, 'kumpel', 'moor_timo'],
      [5, 15, 'oma', 'moor_katja'], [11, 15, 'zombie', 'moor_hendrik']],
  });

  const schilder = [];
  stelleSchild(bauer, schilder, 4, 26, 'GIG 5 – NEBELMOOR. Leitung: Nebel-Norbert. Sichtweite: keine.');

  return {
    schilder,
    npcs: [
      person(22, 12, 'oma', 'unten', {
        text: 'Der Nebel kommt nicht aus einer Maschine. Der war schon vorher da.',
      }),
      legende(31, 4, 'Nebelzar', 45, 'legende_nebelzar'),
    ],
    gegenstaende: [fundstueck(3, 15, 'Allzweckreiniger', 2), fundstueck(30, 18, 'Subwoofer-Kern')],
  };
});

// --- Route 10 -----------------------------------------------------------------------
baueKarte('route10', {
  name: 'Route 10 – Federweg', breite: 42, hoehe: 22,
  begegnungen: 'route10', verbindungen: { westen: 'nebelmoor', osten: 'donkhausen' },
}, (bauer) => {
  const quer = mitteY(22);
  bauer.rahmen('baum');
  bauer.wegX(0, 41, quer);
  bauer.wiese(4, 3, 10, 6);
  bauer.wiese(19, 14, 11, 6);
  bauer.wiese(32, 3, 8, 6);
  bauer.streuen(1, 1, 40, 20, 'fels', 0.05, 101);
  bauer.wegX(0, 41, quer);
  for (const [x, y] of [[15, quer - 1], [28, quer + 3], [38, 18]]) bauer.setze(x, y, 'gras');

  return {
    npcs: [
      kaempfer(15, quer - 1, 'schrauber', 'rechts', 'donk_manni'),
      kaempfer(28, quer + 3, 'raver', 'oben', 'donk_rita'),
      legende(38, 18, 'Wummerlord', 50, 'legende_wummerlord'),
    ],
    gegenstaende: [fundstueck(9, 18, 'Super-Sample', 3)],
  };
});

// --- Donkhausen ----------------------------------------------------------------------
baueKarte('donkhausen', {
  name: 'Donkhausen', breite: 34, hoehe: 28,
  verbindungen: { westen: 'route10', norden: 'route11' },
}, (bauer) => {
  const weg = mitteX(34);
  const quer = mitteY(28);
  bauer.rechteck(0, 0, 34, 28, 'gras');
  bauer.rahmen('baum');
  bauer.wegX(0, 33, quer, 'asphalt');
  bauer.wegY(0, quer + 2, weg, 'asphalt');

  setzeBoxenstopp(bauer, 4, 7, 'donkhausen', 'Donkhausen');
  setzeKiosk(bauer, 24, 7, 'donkhausen', 'Donkhausen', KIOSK_GROSS);
  setzeGigHalle(bauer, 22, 19, 'donkhausen', {
    id: 'gig6', ort: 'Donkhausen', leiter: 'gig6', marke: 5,
    trainer: [[4, 11, 'schrauber', 'donk_soeren'], [12, 11, 'raver', 'r7_tanja'],
      [8, 15, 'techniker', 'donk_manni']],
  });
  setzeWohnhaus(bauer, 4, 19, 'donkhausen', 'haus_donkhausen_1', 'Haus in Donkhausen', [
    person(4, 4, 'kumpel', 'unten', {
      text: 'Plong. Den ganzen Tag. Man gewöhnt sich dran. Plong.',
    }),
  ]);

  bauer.setze(30, 24, 'box');
  bauer.setze(31, 24, 'box');
  bauer.wiese(28, 12, 5, 5);

  // Was nach Wegen und Gebäuden noch Wiese ist, bekommt Bewuchs.
  bauer.streuenAuf('gras', 'blume', 0.10, 241);
  bauer.streuenAuf('gras', 'baum', 0.06, 242);

  const schilder = [];
  stelleSchild(bauer, schilder, 21, 24, 'GIG 6 – DONKHAUSEN. Leitung: Donk-Detlef. Plong.');

  return {
    schilder,
    npcs: [
      person(18, quer + 4, 'punk', 'oben', {
        bewegung: 'drehen',
        text: 'Detlefs Team federt alles ab. Nimm was Schnelles mit.',
      }),
    ],
    gegenstaende: [fundstueck(31, 3, 'Giga-Mate', 2)],
  };
});

// --- Route 11 -------------------------------------------------------------------------
baueKarte('route11', {
  name: 'Route 11 – Datenschneise', breite: 24, hoehe: 34,
  begegnungen: 'route11', verbindungen: { sueden: 'donkhausen', norden: 'glitchstadt' },
}, (bauer) => {
  const weg = mitteX(24);
  bauer.rahmen('baum');
  bauer.wegY(0, 33, weg, 'asphalt');
  bauer.wiese(2, 4, 7, 9);
  bauer.wiese(15, 7, 6, 10);
  bauer.wiese(3, 20, 6, 10);
  bauer.wiese(15, 22, 6, 9);
  bauer.streuen(1, 1, 22, 32, 'baum', 0.05, 113);
  bauer.wegY(0, 33, weg, 'asphalt');
  for (const y of [6, 14, 22, 30]) {
    bauer.setze(weg - 1, y, 'laterne');
    bauer.setze(weg + 3, y, 'laterne');
  }

  return {
    npcs: [
      person(18, 30, 'techniker', 'links', {
        text: 'In Glitchstadt flackert alles. Auch die Leute. Das ist normal hier.',
      }),
      legende(3, 3, 'Acidprophet', 52, 'legende_acidprophet'),
    ],
    gegenstaende: [fundstueck(20, 17, 'Schwarzer Defibrillator')],
  };
});

// --- Glitchstadt -----------------------------------------------------------------------
baueKarte('glitchstadt', {
  name: 'Glitchstadt', breite: 38, hoehe: 30,
  verbindungen: { sueden: 'route11', norden: 'siegesweg' },
}, (bauer) => {
  const weg = mitteX(38);
  const quer = mitteY(30);
  bauer.rechteck(0, 0, 38, 30, 'gras');
  bauer.rahmen('baum');
  bauer.wegX(0, 37, quer, 'asphalt');
  bauer.wegY(quer, 29, weg, 'asphalt');
  // Nordausgang: schmal, damit die Wache ihn wirklich versperrt.
  bauer.rechteck(weg + 1, 0, 1, quer, 'asphalt');

  setzeBoxenstopp(bauer, 4, 6, 'glitchstadt', 'Glitchstadt');
  setzeKiosk(bauer, 28, 6, 'glitchstadt', 'Glitchstadt', KIOSK_GROSS);
  setzeGigHalle(bauer, 22, 20, 'glitchstadt', {
    id: 'gig7', ort: 'Glitchstadt', leiter: 'gig7', marke: 6,
    trainer: [[4, 11, 'wache', 'glitch_tom'], [12, 11, 'maedchen', 'glitch_bea'],
      [5, 15, 'oma', 'glitch_gitta'], [11, 15, 'wirt', 'glitch_kalli']],
  });
  setzeWohnhaus(bauer, 4, 20, 'glitchstadt', 'haus_glitchstadt_1', 'Haus in Glitchstadt', [
    person(4, 4, 'techniker', 'unten', {
      text: 'Mein Fernseher zeigt seit Jahren dasselbe Bild. Ich schau trotzdem.',
    }),
  ]);

  bauer.setze(14, 8, 'laterne');
  bauer.setze(22, 8, 'laterne');
  bauer.setze(16, 26, 'gully');

  // Was nach Wegen und Gebäuden noch Wiese ist, bekommt Bewuchs.
  bauer.streuenAuf('gras', 'blume', 0.10, 251);
  bauer.streuenAuf('gras', 'baum', 0.06, 252);

  const schilder = [];
  stelleSchild(bauer, schilder, 21, 25, 'GIG 7 – GLITCHSTADT. Leitung: Glitch-Gudrun. Bitte nicht neu starten.');
  stelleSchild(bauer, schilder, weg + 3, 6, 'SIEGESWEG – Zutritt ab acht Gig-Marken.');

  return {
    schilder,
    npcs: [
      person(weg + 1, 4, 'wache', 'unten', {
        aktion: {
          art: 'wache',
          bedingung: { gigs: 8 },
          freiText: 'Acht Marken. Alles klar. Der Siegesweg ist offen – viel Erfolg da oben.',
        },
        text: 'Ohne acht Gig-Marken kommt hier keiner durch. So sind die Regeln.',
      }),
      person(12, quer + 4, 'raver', 'oben', {
        text: 'Hinter dem Siegesweg warten die Vier Verstärker. Und danach der Chef.',
      }),
    ],
    gegenstaende: [fundstueck(35, 27, 'Mate-Mate')],
  };
});

// --- Siegesweg ----------------------------------------------------------------------------
baueKarte('siegesweg', {
  name: 'Siegesweg', breite: 28, hoehe: 44, grund: 'fels',
  begegnungen: 'siegesweg', verbindungen: { sueden: 'glitchstadt' },
}, (bauer) => {
  const weg = mitteX(28);
  bauer.rechteck(1, 1, 26, 42, 'hoehleBoden');
  bauer.rahmen('fels', 1);
  bauer.streuen(2, 2, 24, 40, 'fels', 0.2, 131);

  bauer.wegY(30, 43, weg, 'hoehleBoden', 3);
  bauer.wegX(6, weg + 2, 30, 'hoehleBoden', 2);
  bauer.wegY(18, 30, 6, 'hoehleBoden', 2);
  bauer.wegX(6, 21, 18, 'hoehleBoden', 2);
  bauer.wegY(8, 18, 20, 'hoehleBoden', 2);
  bauer.wegX(weg - 1, 21, 8, 'hoehleBoden', 2);
  bauer.wegY(2, 8, weg, 'hoehleBoden', 3);
  bauer.rechteck(4, 34, 5, 5, 'hoehleSchotter');
  bauer.rechteck(18, 24, 6, 5, 'hoehleSchotter');
  bauer.rechteck(8, 12, 6, 4, 'hoehleSchotter');

  bauer.setze(weg, 2, 'tuerGig');
  bauer.setze(weg + 1, 2, 'tuerGig');

  const schilder = [];
  stelleSchild(bauer, schilder, weg + 3, 40, 'SIEGESWEG – Ab hier gibt es keinen Boxenstopp mehr. Viel Glück.');

  return {
    schilder,
    warps: [
      warp(weg, 2, 'backstage1', 6, 14),
      warp(weg + 1, 2, 'backstage1', 6, 14),
    ],
    npcs: [
      legende(9, 13, 'Kickmonarch', 55, 'legende_kickmonarch'),
      legende(21, 26, 'Der Ewige Rave', 58, 'legende_ewigerrave'),
      legende(5, 36, 'Roter Chupa Chups', 60, 'legende_chupachups'),
    ],
    gegenstaende: [
      fundstueck(24, 40, 'Master-Sample'),
      fundstueck(2, 20, 'Mate-Mate', 2),
      fundstueck(18, 8, 'Roter Lolli'),
    ],
  };
});

// --- Backstage: die Vier Verstärker und der Chef -------------------------------------------
baueBackstageRaum('backstage1', {
  name: 'Backstage I', trainer: 'elite1', weiter: 'backstage2', weiterX: 6, weiterY: 14,
}, { karte: 'siegesweg', x: 13, y: 3 });

baueBackstageRaum('backstage2', {
  name: 'Backstage II', trainer: 'elite2', weiter: 'backstage3', weiterX: 6, weiterY: 14,
}, { karte: 'backstage1', x: 6, y: 1 });

baueBackstageRaum('backstage3', {
  name: 'Backstage III', trainer: 'elite3', weiter: 'backstage4', weiterX: 6, weiterY: 14,
}, { karte: 'backstage2', x: 6, y: 1 });

baueBackstageRaum('backstage4', {
  name: 'Backstage IV', trainer: 'elite4', weiter: 'halle_der_gigs', weiterX: 6, weiterY: 14,
}, { karte: 'backstage3', x: 6, y: 1 });

baueKarte('halle_der_gigs', {
  name: 'Halle der Gigs', breite: 14, hoehe: 16, musik: 'gig', drinnen: true,
}, (bauer) => {
  bauer.rechteck(0, 0, 14, 16, 'wandInnen');
  bauer.rechteck(1, 2, 12, 13, 'buehne');
  bauer.rechteck(3, 2, 8, 3, 'teppich');
  for (const x of [1, 12]) {
    bauer.setze(x, 3, 'box');
    bauer.setze(x, 4, 'box');
    bauer.setze(x, 5, 'verstaerker');
  }
  bauer.setze(6, 14, 'tuer');
  bauer.setze(7, 14, 'tuer');

  return {
    warps: [
      warp(6, 14, 'backstage4', 6, 1),
      warp(7, 14, 'backstage4', 6, 1),
    ],
    npcs: [kaempfer(7, 5, 'rivale', 'unten', 'champion')],
  };
});
