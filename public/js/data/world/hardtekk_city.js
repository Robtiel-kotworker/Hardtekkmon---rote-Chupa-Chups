// ============================================================================
// Hardtekk City – die Hauptstadt
// ----------------------------------------------------------------------------
// Liegt zwischen Kellerstadt (erste Gig-Marke) und Route 3 zum Boxenberg.
// Bekanntester Einwohner: niemand weiß es genau, aber im Norden der Stadt hat
// sich ein Fanclub eingenistet, der alle gleich aussieht und ständig von
// "wir" spricht (siehe trainer.js, Abschnitt "Die Helene-Fischer-Ultras").
// Das Hauptquartier ist ein kleiner Gauntlet: Eingangshalle (drei Ultras),
// Büro (der Vize), VIP-Suite (die erste Begegnung mit Helene) und – erst
// freigeschaltet, nachdem Silvio in Vinylhafen ein zweites Mal verloren hat –
// die Tourbus-Kammer für das eigentliche Finale.
// ============================================================================

import {
  baueKarte, person, kaempfer, warp, schild, fundstueck,
} from './verzeichnis.js';
import { setzeBoxenstopp, setzeKiosk, setzeWohnhaus } from './innenraeume.js';

const KIOSK_HARDTEKK_CITY = [
  'Samplepack', 'Super-Sample', 'Mate', 'Super-Mate',
  'Allzweckreiniger', 'Defibrillator', 'Boxenkondensator', 'Subwoofer-Kern',
];

const mitteX = (breite) => Math.floor(breite / 2) - 1;
const mitteY = (hoehe) => Math.floor(hoehe / 2) - 1;

function stelleSchild(bauer, liste, x, y, text) {
  bauer.setze(x, y, 'schild');
  liste.push(schild(x, y, text));
}

// --- Hardtekk City (Außenkarte) -----------------------------------------------
baueKarte('hardtekk_city', {
  name: 'Hardtekk City', breite: 36, hoehe: 30,
  verbindungen: { westen: 'kellerstadt', osten: 'route3' },
}, (bauer) => {
  const weg = mitteX(36);
  const quer = mitteY(30);
  bauer.rechteck(0, 0, 36, 30, 'gras');
  bauer.rahmen('baum');

  // Hauptachse Ost-West (Kellerstadt <-> Route 3) plus eine Nordachse hinauf
  // zum Hauptquartier – eine echte Hauptstadt-Kreuzung statt eines einzelnen
  // Wegs.
  bauer.wegX(0, 35, quer, 'asphalt');
  bauer.wegY(2, quer + 2, weg, 'asphalt');

  // Kleiner Brunnen auf dem Platz vor dem Hauptquartier.
  bauer.see(weg + 5, 9, 3, 3);

  setzeBoxenstopp(bauer, 4, quer - 8, 'hardtekk_city', 'Hardtekk City');
  setzeKiosk(bauer, 28, quer - 8, 'hardtekk_city', 'Hardtekk City', KIOSK_HARDTEKK_CITY);
  setzeWohnhaus(bauer, 4, quer + 6, 'hardtekk_city', 'haus_hardtekk_city_1', 'Haus in Hardtekk City', [
    person(4, 4, 'wirt', 'unten', {
      text: 'Hauptstadt, ja. Aber ehrlich? Seit der Fanclub im Norden eingezogen ist, trau ich mich da nicht mehr lang.',
    }),
  ]);
  setzeWohnhaus(bauer, 28, quer + 6, 'hardtekk_city', 'haus_hardtekk_city_2', 'Haus in Hardtekk City', [
    person(4, 4, 'oma', 'unten', {
      text: 'Alle im gleichen Shirt, alle mit den gleichen langen blonden Haaren. Ich krieg die gar nicht auseinander.',
    }),
  ]);

  // Das Hauptquartier: unübersehbar am Nordende der Stadt, mit demselben
  // auffälligen Baustil wie eine Gig-Halle.
  bauer.rechteck(weg - 5, 3, 11, 7, 'beton');
  // Türkachel liegt bei (weg, 8) – siehe die Rücksprung-Warps in
  // hf_eingangshalle weiter unten, die exakt hierher zurückführen.
  bauer.halle(weg - 4, 4, 9, 5, { dach: 'dachGrau', ziel: 'hf_eingangshalle', zx: 7, zy: 12 });
  bauer.beschriftung(weg - 4, 8, 9, 'HF-Fanclub e.V.');

  const schilder = [];
  stelleSchild(bauer, schilder, weg + 1, quer + 3, 'HARDTEKK CITY – Hauptstadt von Hardtekkmon.');
  stelleSchild(bauer, schilder, weg - 6, 10,
    'Hier residiert offiziell ein "Fanclub". Inoffiziell hat noch niemand gesehen, wer da wieder rauskommt.');

  bauer.streuenAuf('gras', 'blume', 0.08, 501);
  bauer.streuenAuf('gras', 'baum', 0.04, 502);
  for (const [x, y] of [[weg - 8, 4], [weg + 6, 4], [8, quer - 3], [27, quer + 3]]) bauer.setze(x, y, 'laterne');

  return {
    schilder,
    npcs: [
      person(weg + 3, 10, 'punk', 'links', {
        text: 'Wir sind übrigens nicht alle so. Manche von uns hören auch einfach nur Musik, ohne gleich eine Uniform zu tragen.',
      }),
      person(10, quer - 1, 'techniker', 'unten', {
        text: 'Route 3 und der Boxenberg liegen im Osten. Der Fanclub im Norden ist … nun ja, freiwillig.',
      }),
    ],
    gegenstaende: [fundstueck(3, 3, 'Anlaufhilfe'), fundstueck(32, 26, 'Kaffee', 2)],
  };
});

// --- Hauptquartier: Eingangshalle ----------------------------------------------
baueKarte('hf_eingangshalle', {
  name: 'HFU-Hauptquartier – Eingangshalle', breite: 16, hoehe: 14, drinnen: true,
}, (bauer) => {
  bauer.rechteck(0, 0, 16, 14, 'wandInnen');
  bauer.rechteck(1, 2, 14, 11, 'bodenInnen');
  bauer.rechteck(7, 2, 2, 11, 'teppichRot');
  for (const y of [3, 6, 9]) {
    bauer.setze(2, y, 'regal');
    bauer.setze(13, y, 'regal');
  }
  bauer.setze(2, 11, 'pflanze');
  bauer.setze(13, 11, 'pflanze');

  bauer.setze(7, 1, 'tuer');
  bauer.setze(8, 1, 'tuer');
  bauer.setze(7, 12, 'tuer');
  bauer.setze(8, 12, 'tuer');

  const schilder = [];
  stelleSchild(bauer, schilder, 3, 4, 'Fanartikel: Shirts, Poster, Ohrstöpsel. Nicht zum Verkauf. Nur zur Anbetung.');

  return {
    schilder,
    warps: [
      warp(7, 1, 'hf_buero', 6, 10),
      warp(8, 1, 'hf_buero', 7, 10),
      // Beide Türkacheln führen zurück auf dieselbe Außenkachel (weg = 17,
      // siehe mitteX(36) oben) – die Warp-Sperre nach jedem Kartenwechsel
      // verhindert, dass das sofort wieder zurückwarpt.
      warp(7, 12, 'hardtekk_city', 17, 8),
      warp(8, 12, 'hardtekk_city', 17, 8),
    ],
    // Alle drei stehen direkt im Korridor (x = 7, der Teppichspur) und
    // blicken zum Eingang – so laufen sie dem Spieler nacheinander über den
    // Weg, statt an ihm vorbeizusehen.
    npcs: [
      kaempfer(7, 9, 'hfultra', 'unten', 'hfu_sven'),
      kaempfer(7, 6, 'hfultra', 'unten', 'hfu_sabrina'),
      kaempfer(7, 3, 'hfultra', 'unten', 'hfu_marco'),
    ],
  };
});

// --- Hauptquartier: Büro (Silvio) ----------------------------------------------
baueKarte('hf_buero', {
  name: 'HFU-Hauptquartier – Büro', breite: 14, hoehe: 12, drinnen: true,
}, (bauer) => {
  bauer.rechteck(0, 0, 14, 12, 'wandInnen');
  bauer.rechteck(1, 2, 12, 9, 'bodenInnen');
  bauer.rechteck(5, 3, 4, 1, 'tisch');
  bauer.setze(2, 3, 'regal');
  bauer.setze(11, 3, 'regal');
  bauer.setze(2, 8, 'pflanze');
  bauer.setze(11, 8, 'computer');
  bauer.rechteck(4, 6, 6, 3, 'teppich');

  bauer.setze(6, 1, 'tuer');
  bauer.setze(7, 1, 'tuer');
  bauer.setze(6, 10, 'tuer');
  bauer.setze(7, 10, 'tuer');

  const sperre = {
    bedingung: { trainerBesiegt: 'hfu_silvio_hq' },
    sperrtext: 'Die Tür ist zu. "Erst durch mich", sagt eine Stimme von hinten.',
  };

  const schilder = [];
  stelleSchild(bauer, schilder, 2, 5, 'Schreibtisch des Vize-Vorsitzenden. Ordentlich, bis auf die Konzertkarten überall.');

  return {
    schilder,
    warps: [
      { ...warp(6, 1, 'hf_vip_suite', 6, 10), ...sperre },
      { ...warp(7, 1, 'hf_vip_suite', 7, 10), ...sperre },
      warp(6, 10, 'hf_eingangshalle', 7, 1),
      warp(7, 10, 'hf_eingangshalle', 8, 1),
    ],
    npcs: [kaempfer(7, 5, 'hfultra', 'unten', 'hfu_silvio_hq')],
  };
});

// --- Hauptquartier: VIP-Suite (erste Begegnung mit Helene) ---------------------
baueKarte('hf_vip_suite', {
  name: 'HFU-Hauptquartier – VIP-Suite', breite: 14, hoehe: 12, drinnen: true,
}, (bauer) => {
  bauer.rechteck(0, 0, 14, 12, 'wandInnen');
  bauer.rechteck(1, 2, 12, 9, 'bodenInnen');
  bauer.rechteck(3, 4, 8, 5, 'teppichGold');
  for (const x of [2, 11]) {
    bauer.setze(x, 3, 'goldsaeule');
    bauer.setze(x, 8, 'goldlampe');
  }
  bauer.setze(2, 4, 'plattenspieler');

  bauer.setze(6, 1, 'tuer');
  bauer.setze(7, 1, 'tuer');
  bauer.setze(6, 10, 'tuer');
  bauer.setze(7, 10, 'tuer');

  const sperre = {
    bedingung: { trainerBesiegt: 'hfu_silvio_vinylhafen' },
    sperrtext: 'Die Tür ist massiv verriegelt. Was dahinter wartet, bleibt vorerst ein Geheimnis.',
  };

  const schilder = [];
  stelleSchild(bauer, schilder, 3, 6, 'Der Plattenspieler läuft ununterbrochen. Immer dasselbe Lied.');

  return {
    schilder,
    warps: [
      { ...warp(6, 1, 'hf_tourbus', 5, 8), ...sperre },
      { ...warp(7, 1, 'hf_tourbus', 6, 8), ...sperre },
      warp(6, 10, 'hf_buero', 6, 1),
      warp(7, 10, 'hf_buero', 7, 1),
    ],
    npcs: [kaempfer(7, 5, 'helene', 'unten', 'helene_hq')],
  };
});

// --- Hauptquartier: Tourbus-Kammer (das eigentliche Finale) --------------------
baueKarte('hf_tourbus', {
  name: 'HFU-Hauptquartier – Tourbus-Kammer', breite: 12, hoehe: 10, drinnen: true,
}, (bauer) => {
  bauer.rechteck(0, 0, 12, 10, 'wandInnen');
  bauer.rechteck(1, 2, 10, 7, 'teppichGold');
  bauer.setze(2, 3, 'goldsaeule');
  bauer.setze(9, 3, 'goldsaeule');
  bauer.setze(2, 7, 'tresen');
  bauer.setze(9, 7, 'plattenspieler');

  bauer.setze(5, 8, 'tuer');
  bauer.setze(6, 8, 'tuer');

  const schilder = [];
  stelleSchild(bauer, schilder, 3, 6, 'Auf dem Tresen: eine einzelne, angebrochene Flasche Federweißer.');

  return {
    schilder,
    warps: [
      warp(5, 8, 'hf_vip_suite', 6, 1),
      warp(6, 8, 'hf_vip_suite', 7, 1),
    ],
    npcs: [kaempfer(6, 4, 'helene', 'unten', 'helene_final')],
  };
});
