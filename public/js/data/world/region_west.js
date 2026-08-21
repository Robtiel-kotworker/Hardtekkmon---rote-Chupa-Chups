// ============================================================================
// Region West – von Bassdorf bis Vinylhafen
// ----------------------------------------------------------------------------
// Der erste Teil der Reise: Heimatdorf, Plattenwald, die ersten drei Gigs.
// Karten hängen über `verbindungen` aneinander; die Übergänge sitzen immer
// mittig, sodass die Anschlussposition zur Laufzeit berechnet werden kann.
// ============================================================================

import { baueKarte, person, kaempfer, schild, fundstueck, warp } from './verzeichnis.js';
import {
  baueSpielerzimmer, baueLabor, setzeBoxenstopp, setzeKiosk, setzeGigHalle, setzeWohnhaus,
} from './innenraeume.js';

/** Hauptweg-Position: immer mittig, damit die Karten sauber anschließen. */
const mitteX = (breite) => Math.floor(breite / 2) - 1;
const mitteY = (hoehe) => Math.floor(hoehe / 2) - 1;

/** Setzt ein Schild als Kachel und als lesbaren Eintrag. */
function stelleSchild(bauer, liste, x, y, text) {
  bauer.setze(x, y, 'schild');
  liste.push(schild(x, y, text));
}

const KIOSK_KLEIN = ['Samplepack', 'Mate', 'Kaugummi', 'Kaffee', 'Kohletablette'];
const KIOSK_MITTEL = ['Samplepack', 'Fettes Samplepack', 'Mate', 'Doppelmate', 'Allzweckreiniger', 'Erste-Hilfe-Riegel'];
const KIOSK_GROSS = [
  'Fettes Samplepack', 'Studio-Samplepack', 'Doppelmate', 'Turbo-Mate',
  'Allzweckreiniger', 'Erste-Hilfe-Riegel', 'Anlaufhilfe', 'Ohrstöpsel', 'Turnschuh-Wachs',
];

// --- Bassdorf ----------------------------------------------------------------
baueKarte('bassdorf', {
  name: 'Bassdorf', breite: 28, hoehe: 26, verbindungen: { norden: 'route1' },
}, (bauer) => {
  const weg = mitteX(28);
  bauer.rahmen('baum');
  bauer.streuen(1, 1, 26, 24, 'baum', 0.05, 11);
  // Hauptweg von Norden bis zum Dorfplatz, dann links herum zum Labor.
  bauer.wegY(0, 14, weg);
  bauer.wegX(6, weg + 2, 14, 'weg', 1);
  bauer.wegY(14, 24, 6, 'weg', 2);
  bauer.wegX(6, 22, 23, 'weg', 2);
  bauer.wegX(9, weg, 11, 'weg', 1);
  bauer.wegX(weg + 2, 20, 11, 'weg', 1);

  bauer.haus(6, 6, 6, 5, { dach: 'dachRot', ziel: 'haus_spieler', zx: 5, zy: 8 });
  baueSpielerzimmer('haus_spieler', { karte: 'bassdorf', x: 9, y: 10 });

  setzeWohnhaus(bauer, 17, 6, 'bassdorf', 'haus_bassdorf_1', 'Haus der Nachbarn', [
    person(4, 4, 'oma', 'unten', {
      text: 'Mein Enkel ist auch losgezogen. Seitdem ruft er nur an, wenn er Geld braucht.',
    }),
    person(8, 6, 'junge', 'links', {
      text: 'Hast du schon ein Hardtekkmon? Ich krieg meins erst, wenn ich das Zimmer aufräume.',
    }),
  ]);

  bauer.haus(9, 17, 10, 5, { dach: 'dachBlau', ziel: 'labor', zx: 8, zy: 11 });
  baueLabor('labor', { karte: 'bassdorf', x: 14, y: 21 });

  // Nordausgang auf eine Kachel verengen – hier steht die Wache.
  for (const x of [weg, weg + 2]) {
    bauer.setze(x, 0, 'baum');
    bauer.setze(x, 1, 'baum');
  }

  bauer.wiese(2, 16, 3, 6);
  bauer.wiese(21, 15, 5, 6);
  bauer.setze(4, 4, 'laterne');
  bauer.setze(23, 4, 'laterne');

  const schilder = [];
  stelleSchild(bauer, schilder, 12, 24,
    'BASSDORF – Hier fängt jede Nacht an. Und meistens hört sie hier auch auf.');
  stelleSchild(bauer, schilder, 20, 15,
    'LABOR VON PROF. WUMMER – Bitte nicht an den Reglern drehen.');

  return {
    schilder,
    npcs: [
      person(weg + 1, 2, 'kumpel', 'unten', {
        aktion: {
          art: 'wache',
          bedingung: { flagge: 'starter' },
          freiText: 'Du hast eins! Dann los, die Route nach Norden ist frei.',
        },
        text: 'Ohne eigenes Hardtekkmon lass ich dich hier nicht durch. Geh zum Professor.',
      }),
      person(11, 14, 'oma', 'unten', {
        text: 'Früher war hier nur Wiese. Dann kam der Professor mit seinen Boxen.',
      }),
      person(21, 20, 'kumpel', 'links', {
        bewegung: 'drehen',
        text: 'Im hohen Gras lauern wilde Hardtekkmon. Ohne eigenes solltest du da nicht rein.',
      }),
    ],
  };
});

// --- Route 1 ------------------------------------------------------------------
baueKarte('route1', {
  name: 'Route 1 – Schotterpiste', breite: 24, hoehe: 40,
  begegnungen: 'route1', verbindungen: { sueden: 'bassdorf', norden: 'schotterhausen' },
}, (bauer) => {
  const weg = mitteX(24);
  bauer.rahmen('baum');
  bauer.wegY(0, 39, weg);
  bauer.wiese(2, 5, 7, 8);
  bauer.wiese(15, 9, 7, 9);
  bauer.wiese(3, 22, 6, 9);
  bauer.wiese(15, 25, 6, 8);
  bauer.streuen(1, 1, 22, 38, 'baum', 0.06, 23);
  bauer.wegY(0, 39, weg);
  bauer.setze(weg - 1, 20, 'zaun');
  bauer.setze(weg + 3, 20, 'zaun');
  // Standplätze der Trainer freihalten – der gestreute Bewuchs trifft sonst zu.
  for (const [x, y] of [[weg - 1, 30], [weg + 3, 18], [weg + 1, 8], [4, 33]]) {
    bauer.setze(x, y, 'gras');
  }

  const schilder = [];
  stelleSchild(bauer, schilder, weg - 1, 36, 'ROUTE 1 – Nach Norden: Schotterhausen. Nach Süden: dein Bett.');

  return {
    schilder,
    npcs: [
      kaempfer(weg - 1, 30, 'punk', 'rechts', 'r1_kevin'),
      kaempfer(weg + 3, 18, 'junge', 'links', 'r1_torsten'),
      kaempfer(weg + 1, 8, 'maedchen', 'unten', 'r1_conny'),
      person(4, 33, 'opa', 'unten', {
        text: 'Hohes Gras? Da wohnt was drin. Immer erst schwächen, dann Samplepack werfen.',
      }),
    ],
    gegenstaende: [fundstueck(20, 4, 'Samplepack', 2), fundstueck(3, 14, 'Mate')],
  };
});

// --- Schotterhausen -------------------------------------------------------------
baueKarte('schotterhausen', {
  name: 'Schotterhausen', breite: 36, hoehe: 30,
  verbindungen: { sueden: 'route1', norden: 'route2' },
}, (bauer) => {
  const weg = mitteX(36);
  bauer.rechteck(0, 0, 36, 30, 'gras');
  bauer.rahmen('baum');
  bauer.wegY(0, 29, weg);
  bauer.wegX(1, 34, 13, 'weg', 3);

  setzeBoxenstopp(bauer, 5, 7, 'schotterhausen', 'Schotterhausen');
  setzeKiosk(bauer, 25, 7, 'schotterhausen', 'Schotterhausen', KIOSK_KLEIN);
  setzeWohnhaus(bauer, 5, 19, 'schotterhausen', 'haus_schotterhausen_1', 'Haus in Schotterhausen', [
    person(5, 4, 'wirt', 'unten', {
      text: 'Die Halle im Norden? Da geht seit Jahren keiner rein. Bis auf den Chef.',
    }),
  ]);

  setzeGigHalle(bauer, 24, 19, 'schotterhausen', {
    id: 'gig8', ort: 'Schotterhausen', leiter: 'gig8', marke: 7,
    trainer: [[4, 10, 'techniker', 'schotter_andi'], [12, 10, 'raver', 'schotter_anni'],
      [5, 15, 'zombie', 'schotter_sammy'], [11, 15, 'techniker', 'schotter_ferdi']],
    bedingung: { gigs: 7 },
    sperrtext: 'Der Türsteher schüttelt den Kopf: "Sieben Marken. Dann reden wir."',
  });

  bauer.rechteck(2, 2, 6, 4, 'beton');
  bauer.setze(3, 3, 'tonne');
  bauer.setze(4, 3, 'tonne');
  bauer.setze(30, 20, 'laterne');
  bauer.setze(30, 25, 'laterne');
  bauer.wiese(28, 22, 5, 5);

  const schilder = [];
  stelleSchild(bauer, schilder, 23, 24, 'GIG-HALLE SCHOTTERHAUSEN – Einlass nur mit sieben Marken.');
  stelleSchild(bauer, schilder, weg + 3, 26, 'SCHOTTERHAUSEN – Die Stadt, die nie ganz aufwacht.');

  return {
    schilder,
    npcs: [
      person(26, 25, 'wache', 'unten', {
        text: 'Sieben Marken brauchst du für die Halle da hinten. Sieben. Nicht sechs.',
      }),
      kaempfer(21, 26, 'rivale', 'links', 'rivale1'),
      person(24, 15, 'maedchen', 'links', {
        bewegung: 'drehen',
        text: 'Im Boxenstopp werden deine Hardtekkmon kostenlos wieder aufgepäppelt.',
      }),
      person(20, 25, 'opa', 'unten', {
        text: 'Nach Norden geht es zum Plattenwald. Nimm eine Taschenlampe mit. Oder Mut.',
      }),
    ],
  };
});

// --- Route 2 --------------------------------------------------------------------
baueKarte('route2', {
  name: 'Route 2 – Waldrand', breite: 22, hoehe: 34,
  begegnungen: 'route2', verbindungen: { sueden: 'schotterhausen', norden: 'plattenwald' },
}, (bauer) => {
  const weg = mitteX(22);
  bauer.rahmen('baum');
  bauer.wegY(0, 33, weg);
  bauer.wiese(2, 4, 6, 9);
  bauer.wiese(14, 6, 6, 8);
  bauer.wiese(3, 20, 6, 10);
  bauer.wiese(14, 21, 6, 9);
  bauer.streuen(1, 1, 20, 32, 'baumDunkel', 0.07, 31);
  bauer.wegY(0, 33, weg);

  const schilder = [];
  stelleSchild(bauer, schilder, weg + 3, 28, 'ROUTE 2 – Ab hier wird es dunkel. Und laut.');

  return {
    schilder,
    npcs: [
      person(6, 16, 'kumpel', 'rechts', {
        text: 'Im Plattenwald verlaufen sich die Leute. Ich steh seit Dienstag hier.',
      }),
    ],
    gegenstaende: [fundstueck(18, 30, 'Samplepack', 3)],
  };
});

// --- Plattenwald -----------------------------------------------------------------
baueKarte('plattenwald', {
  name: 'Plattenwald', breite: 32, hoehe: 40, musik: 'welt',
  begegnungen: 'plattenwald', verbindungen: { sueden: 'route2', norden: 'kellerstadt' },
}, (bauer) => {
  const weg = mitteX(32);
  bauer.rechteck(0, 0, 32, 40, 'grasHoch');
  bauer.rahmen('baumDunkel', 2);

  // Ein Weg, der sich durch den Wald schlängelt.
  bauer.wegY(0, 12, weg);
  bauer.wegX(6, weg + 2, 12, 'weg', 2);
  bauer.wegY(12, 24, 6);
  bauer.wegX(6, 24, 24, 'weg', 2);
  bauer.wegY(24, 33, 24);
  bauer.wegX(weg - 2, 25, 33, 'weg', 2);
  bauer.wegY(33, 39, weg);

  // Baumgruppen als Labyrinth
  bauer.streuen(3, 4, 26, 32, 'baumDunkel', 0.22, 77);
  bauer.wegY(0, 12, weg);
  bauer.wegX(6, weg + 2, 12, 'weg', 2);
  bauer.wegY(12, 24, 6);
  bauer.wegX(6, 24, 24, 'weg', 2);
  bauer.wegY(24, 33, 24);
  bauer.wegX(weg - 2, 25, 33, 'weg', 2);
  bauer.wegY(33, 39, weg);

  for (const [x, y] of [[9, 10], [4, 18], [12, 23], [22, 28], [26, 22], [8, 35]]) {
    bauer.setze(x, y, 'grasHoch');
  }

  const schilder = [];
  stelleSchild(bauer, schilder, weg + 3, 36, 'PLATTENWALD – Bitte nichts liegen lassen. Es holt sich sonst was.');

  return {
    schilder,
    npcs: [
      kaempfer(9, 10, 'kumpel', 'unten', 'wald_bernd'),
      kaempfer(4, 18, 'raver', 'rechts', 'wald_jaqueline'),
      kaempfer(12, 23, 'techniker', 'oben', 'wald_nils'),
      kaempfer(22, 28, 'maedchen', 'links', 'wald_frieda'),
      kaempfer(26, 22, 'opa', 'unten', 'wald_pit'),
      person(8, 35, 'zombie', 'oben', {
        text: 'Ich such hier eine Platte. Seit vier Jahren. Sie ist irgendwo.',
      }),
    ],
    gegenstaende: [
      fundstueck(28, 6, 'Fettes Samplepack'),
      fundstueck(3, 30, 'Doppelmate'),
      fundstueck(17, 17, 'Kohletablette', 2),
    ],
  };
});

// --- Kellerstadt -------------------------------------------------------------------
baueKarte('kellerstadt', {
  name: 'Kellerstadt', breite: 34, hoehe: 28,
  verbindungen: { sueden: 'plattenwald', osten: 'route3' },
}, (bauer) => {
  const weg = mitteX(34);
  const quer = mitteY(28);
  bauer.rechteck(0, 0, 34, 28, 'gras');
  bauer.rahmen('baum');
  bauer.wegY(0, 27, weg, 'asphalt');
  bauer.wegX(0, 33, quer, 'asphalt');

  setzeBoxenstopp(bauer, 4, 6, 'kellerstadt', 'Kellerstadt');
  setzeKiosk(bauer, 24, 6, 'kellerstadt', 'Kellerstadt', KIOSK_KLEIN);
  setzeGigHalle(bauer, 22, 18, 'kellerstadt', {
    id: 'gig1', ort: 'Kellerstadt', leiter: 'gig1', marke: 0, boden: 'hoehleBoden',
    trainer: [[4, 11, 'schrauber', 'keller_frank'], [12, 11, 'techniker', 'keller_mandy'],
      [8, 15, 'opa', 'keller_helmut']],
  });
  setzeWohnhaus(bauer, 4, 18, 'kellerstadt', 'haus_kellerstadt_1', 'Haus in Kellerstadt', [
    person(4, 4, 'schrauber', 'unten', {
      text: 'Der Kalle hat den Tisch selbst gebaut. Aus einer einzigen Fliese. Das muss man erst mal machen.',
    }),
  ]);

  bauer.setze(3, 3, 'gully');
  bauer.setze(30, 24, 'gully');
  for (const x of [8, 16, 24, 30]) bauer.setze(x, quer - 2, 'laterne');
  bauer.setze(28, 20, 'tonne');
  bauer.setze(29, 20, 'tonne');
  bauer.wiese(27, 22, 5, 4);

  // Was nach Wegen und Gebäuden noch Wiese ist, bekommt Bewuchs.
  bauer.streuenAuf('gras', 'blume', 0.10, 201);
  bauer.streuenAuf('gras', 'baum', 0.06, 202);

  const schilder = [];
  stelleSchild(bauer, schilder, 21, 23, 'GIG 1 – KELLERCLUB. Leitung: Fliesentisch Kalle.');
  stelleSchild(bauer, schilder, 31, quer - 1, 'Nach Osten: Route 3 und der Boxenberg.');

  return {
    schilder,
    npcs: [
      person(11, 9, 'punk', 'unten', {
        bewegung: 'drehen',
        text: 'Kalle kämpft mit KELLER-Typen. Alles, was Strom hat, kannst du hier vergessen.',
      }),
      person(20, 21, 'oma', 'links', {
        text: 'Der Lärm hört nie auf. Ich hör ihn schon gar nicht mehr. Was sagtest du?',
      }),
    ],
    gegenstaende: [fundstueck(31, 3, 'Anlaufhilfe')],
  };
});

// --- Route 3 --------------------------------------------------------------------
baueKarte('route3', {
  name: 'Route 3 – Zum Boxenberg', breite: 44, hoehe: 22,
  begegnungen: 'route3', verbindungen: { westen: 'kellerstadt' },
}, (bauer) => {
  const quer = mitteY(22);
  bauer.rahmen('baum');
  bauer.wegX(0, 43, quer);
  bauer.wiese(4, 3, 9, 6);
  bauer.wiese(18, 14, 10, 6);
  bauer.wiese(31, 3, 8, 6);
  bauer.streuen(1, 1, 42, 20, 'fels', 0.05, 43);
  bauer.wegX(0, 43, quer);

  // Höhleneingang am östlichen Ende: erst die Felswand, dann der Zuweg.
  bauer.rechteck(38, quer - 3, 6, 8, 'klippe');
  bauer.wegX(34, 41, quer + 1, 'weg', 1);
  bauer.setze(41, quer, 'hoehleAusgang');

  const schilder = [];
  stelleSchild(bauer, schilder, 37, quer + 3, 'BOXENBERG – Drinnen ist es dunkel. Und es wummert.');

  return {
    schilder,
    warps: [warp(41, quer, 'boxenberg', 2, 24)],
    npcs: [
      kaempfer(14, quer - 1, 'zombie', 'rechts', 'r3_zacharias'),
      kaempfer(27, quer + 1, 'oma', 'links', 'r3_waltraud'),
      person(8, 16, 'kumpel', 'oben', {
        text: 'Der Berg heißt Boxenberg, weil da mal jemand 200 Boxen reingeschleppt hat. Sie stehen noch da.',
      }),
    ],
    gegenstaende: [fundstueck(20, 3, 'Fettes Samplepack'), fundstueck(35, 18, 'Taschenlampe')],
  };
});

// --- Boxenberg (Höhle) ------------------------------------------------------------
baueKarte('boxenberg', {
  name: 'Boxenberg', breite: 30, hoehe: 28, grund: 'hoehleWand',
  drinnen: true, dunkel: true, begegnungen: 'boxenberg',
}, (bauer) => {
  bauer.rechteck(1, 1, 28, 26, 'hoehleBoden');
  bauer.rahmen('hoehleWand', 1);
  bauer.streuen(2, 2, 26, 24, 'hoehleWand', 0.16, 91);

  // Zwei Gänge quer durch den Berg, dazwischen Schotterfelder.
  bauer.wegY(2, 25, 2, 'hoehleBoden', 3);
  bauer.wegX(2, 27, 24, 'hoehleBoden', 3);
  bauer.wegX(2, 27, 3, 'hoehleBoden', 3);
  bauer.wegY(2, 25, 25, 'hoehleBoden', 3);
  bauer.wegX(6, 22, 13, 'hoehleBoden', 3);
  bauer.wegY(6, 20, 14, 'hoehleBoden', 2);

  bauer.rechteck(7, 7, 6, 4, 'hoehleSchotter');
  bauer.rechteck(18, 17, 7, 5, 'hoehleSchotter');
  bauer.rechteck(6, 18, 6, 4, 'hoehleSchotter');
  bauer.rechteck(17, 6, 6, 4, 'hoehleSchotter');

  bauer.setze(2, 25, 'hoehleAusgang');
  bauer.setze(27, 3, 'hoehleAusgang');
  bauer.setze(10, 10, 'box');
  bauer.setze(11, 10, 'box');
  bauer.setze(20, 20, 'box');

  return {
    warps: [
      warp(2, 25, 'route3', 41, 11),
      warp(27, 3, 'route4', 2, 10),
    ],
    npcs: [
      kaempfer(15, 22, 'kumpel', 'oben', 'berg_dieter'),
      kaempfer(21, 12, 'oma', 'links', 'berg_renate'),
      kaempfer(5, 8, 'kumpel', 'unten', 'berg_achim'),
    ],
    gegenstaende: [
      fundstueck(24, 24, 'Erste-Hilfe-Riegel'),
      fundstueck(4, 4, 'Doppelmate'),
    ],
  };
});

// --- Route 4 ---------------------------------------------------------------------
baueKarte('route4', {
  name: 'Route 4 – Stromtrasse', breite: 40, hoehe: 22,
  begegnungen: 'route4', verbindungen: { osten: 'subwoofer_city' },
}, (bauer) => {
  const quer = mitteY(22);
  bauer.rahmen('baum');
  bauer.rechteck(1, quer - 2, 4, 7, 'klippe');
  bauer.wegX(0, 39, quer);
  bauer.rechteck(1, quer - 2, 4, 2, 'klippe');
  bauer.rechteck(1, quer + 1, 4, 4, 'klippe');
  bauer.setze(2, quer, 'hoehleAusgang');
  bauer.wiese(8, 3, 9, 6);
  bauer.wiese(22, 14, 10, 6);
  bauer.wiese(30, 4, 7, 5);
  for (const x of [10, 18, 26, 34]) {
    bauer.setze(x, quer - 4, 'laterne');
    bauer.setze(x, quer + 5, 'laterne');
  }

  const schilder = [];
  stelleSchild(bauer, schilder, 30, quer + 2, 'ROUTE 4 – Unter den Leitungen bitte nicht campen.');

  return {
    schilder,
    warps: [warp(2, quer, 'boxenberg', 27, 3)],
    npcs: [
      kaempfer(16, quer - 1, 'techniker', 'rechts', 'r5_schorsch'),
      person(24, 6, 'schrauber', 'unten', {
        text: 'Die Leitungen hier oben? Die gehören alle zur Anlage in Subwoofer City.',
      }),
    ],
    gegenstaende: [fundstueck(12, 18, 'Kaugummi', 2)],
  };
});

// --- Subwoofer City ----------------------------------------------------------------
baueKarte('subwoofer_city', {
  name: 'Subwoofer City', breite: 38, hoehe: 30,
  verbindungen: { westen: 'route4', sueden: 'route5' },
}, (bauer) => {
  const weg = mitteX(38);
  const quer = mitteY(30);
  bauer.rechteck(0, 0, 38, 30, 'gras');
  bauer.rahmen('baum');
  bauer.wegX(0, 37, quer, 'asphalt');
  bauer.wegY(quer, 29, weg, 'asphalt');
  bauer.see(24, 3, 11, 8);

  setzeBoxenstopp(bauer, 4, 8, 'subwoofer_city', 'Subwoofer City');
  setzeKiosk(bauer, 12, 8, 'subwoofer_city', 'Subwoofer City', KIOSK_MITTEL);
  setzeGigHalle(bauer, 22, 20, 'subwoofer_city', {
    id: 'gig2', ort: 'Subwoofer City', leiter: 'gig2', marke: 1,
    trainer: [[4, 11, 'raver', 'sub_basti'], [12, 11, 'schrauber', 'sub_bodo'],
      [5, 15, 'maedchen', 'sub_nadine'], [11, 15, 'wirt', 'sub_toni']],
  });
  setzeWohnhaus(bauer, 28, 20, 'subwoofer_city', 'haus_subwoofer_1', 'Haus in Subwoofer City', [
    person(4, 4, 'oma', 'unten', {
      text: 'Seit die Anlage steht, wandern meine Gläser jeden Abend über den Tisch.',
    }),
  ]);

  for (const x of [8, 16, 24, 32]) bauer.setze(x, quer - 2, 'laterne');
  bauer.setze(6, 26, 'box');
  bauer.setze(7, 26, 'box');
  bauer.setze(6, 25, 'verstaerker');

  // Was nach Wegen und Gebäuden noch Wiese ist, bekommt Bewuchs.
  bauer.streuenAuf('gras', 'blume', 0.10, 211);
  bauer.streuenAuf('gras', 'baum', 0.06, 212);

  const schilder = [];
  stelleSchild(bauer, schilder, 21, 25, 'GIG 2 – SUBWOOFER CITY. Leitung: Zwei-Zahn Gerald.');
  stelleSchild(bauer, schilder, 22, quer + 3, 'Nach Süden: Route 5 und der Vinylhafen.');

  return {
    schilder,
    npcs: [
      person(20, quer + 4, 'raver', 'oben', {
        bewegung: 'drehen',
        text: 'Geralds Team ist BASS. Nimm was mit GLITCH oder STROM mit, sonst wird das nichts.',
      }),
      person(30, 14, 'wirt', 'unten', {
        text: 'Der See? Da ist mal eine ganze Anlage reingefallen. Sie brummt angeblich noch.',
      }),
    ],
    gegenstaende: [fundstueck(35, 27, 'Studio-Samplepack')],
  };
});

// --- Route 5 -----------------------------------------------------------------------
baueKarte('route5', {
  name: 'Route 5 – Säurewiesen', breite: 22, hoehe: 36,
  begegnungen: 'route5', verbindungen: { norden: 'subwoofer_city', sueden: 'vinylhafen' },
}, (bauer) => {
  const weg = mitteX(22);
  bauer.rahmen('baum');
  bauer.wegY(0, 35, weg);
  bauer.wiese(2, 4, 7, 10);
  bauer.wiese(14, 8, 6, 10);
  bauer.wiese(3, 22, 6, 9);
  bauer.wiese(14, 24, 6, 8);
  bauer.streuen(1, 1, 20, 34, 'fels', 0.04, 55);
  bauer.wegY(0, 35, weg);
  bauer.see(2, 16, 5, 4);
  for (const [x, y] of [[weg - 1, 28], [weg + 3, 12], [17, 33]]) bauer.setze(x, y, 'gras');

  return {
    npcs: [
      kaempfer(weg - 1, 28, 'punk', 'rechts', 'r5_kurt'),
      kaempfer(weg + 3, 12, 'raver', 'links', 'r5_enrico'),
      person(17, 33, 'opa', 'oben', {
        text: 'Der Hafen unten ist voll mit Platten. Und mit Leuten, die keine Platten mehr abgeben wollen.',
      }),
    ],
    gegenstaende: [fundstueck(19, 3, 'Turbo-Mate'), fundstueck(4, 30, 'Fettes Samplepack', 2)],
  };
});

// --- Vinylhafen ---------------------------------------------------------------------
baueKarte('vinylhafen', {
  name: 'Vinylhafen', breite: 38, hoehe: 30,
  verbindungen: { norden: 'route5', osten: 'route7' },
}, (bauer) => {
  const weg = mitteX(38);
  const quer = mitteY(30);
  bauer.rechteck(0, 0, 38, 30, 'gras');
  bauer.rahmen('baum');
  bauer.wegY(0, quer + 2, weg, 'asphalt');
  bauer.wegX(0, 37, quer, 'asphalt');

  // Hafenbecken im Süden mit Steg
  bauer.rechteck(1, quer + 6, 36, 30 - (quer + 6) - 1, 'wasser');
  bauer.rechteck(1, quer + 4, 36, 2, 'holz');
  bauer.rechteck(weg, quer + 6, 3, 5, 'holz');

  setzeBoxenstopp(bauer, 4, 6, 'vinylhafen', 'Vinylhafen');
  setzeKiosk(bauer, 28, 6, 'vinylhafen', 'Vinylhafen', KIOSK_MITTEL);
  setzeGigHalle(bauer, 10, 4, 'vinylhafen', {
    id: 'gig3', ort: 'Vinylhafen', leiter: 'gig3', marke: 2,
    trainer: [[4, 11, 'raver', 'hafen_vanessa'], [12, 11, 'wirt', 'hafen_peer'],
      [5, 15, 'techniker', 'hafen_sven'], [11, 15, 'schrauber', 'hafen_micha']],
  });

  for (const x of [6, 14, 22, 30]) bauer.setze(x, quer + 3, 'laterne');
  bauer.setze(24, 20, 'tonne');
  bauer.setze(25, 20, 'tonne');

  // Was nach Wegen und Gebäuden noch Wiese ist, bekommt Bewuchs.
  bauer.streuenAuf('gras', 'blume', 0.10, 223);
  bauer.streuenAuf('gras', 'baum', 0.06, 224);

  const schilder = [];
  stelleSchild(bauer, schilder, 9, 9, 'GIG 3 – VINYLHAFEN. Leitung: Augenringe Hugo.');
  stelleSchild(bauer, schilder, 33, quer - 1, 'Nach Osten: Route 7. Vorsicht, es wird schneller.');

  return {
    schilder,
    npcs: [
      kaempfer(26, quer + 1, 'rivale', 'links', 'rivale2'),
      person(20, quer + 3, 'wirt', 'unten', {
        text: 'Hugo schläft nie. Das ist keine Redensart, das ist ein Attest.',
      }),
      person(8, 12, 'maedchen', 'rechts', {
        bewegung: 'drehen',
        text: 'Am Steg wurden schon Platten aus dem Wasser gefischt, die noch liefen.',
      }),
    ],
    gegenstaende: [fundstueck(2, 24, 'Allzweckreiniger')],
  };
});
