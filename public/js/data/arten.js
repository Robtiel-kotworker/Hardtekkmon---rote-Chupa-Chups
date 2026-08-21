// ============================================================================
// Die 151 Hardtekkmon
// ----------------------------------------------------------------------------
// Aufgebaut nach Familien: `familie()` verkettet die Formen automatisch zu
// einer Entwicklungsreihe und leitet Fangrate, Basiserfahrung und Lernsatz aus
// der Stellung in der Reihe ab. Dadurch stehen hier nur die Angaben, die ein
// Hardtekkmon wirklich ausmachen – Name, Typen, Basiswerte, Beschreibung.
//
// Eintragsform: [Name, Typen, [KP, ANG, VER, SPA, SPV, INI], Beschreibung]
// ============================================================================

import { attackenNachTyp, GRUNDATTACKEN } from './attacken.js';

/** Stufen, auf denen Attacken erlernt werden. */
const LERNSTUFEN = [1, 1, 5, 9, 13, 17, 21, 25, 30, 35, 41, 48];

/** Entwicklungsstufen je Reihenlänge. */
const ENTWICKLUNGSSTUFEN = { 2: [22], 3: [16, 34] };

/** Fangraten und Erfahrungsausbeute nach Stellung in der Reihe. */
const FANG = { erst: 190, mittel: 105, letzt: 55, einzel: 130, legende: 5 };

/** @type {object[]} */
export const ARTEN = [];

/**
 * Baut den Lernsatz aus den Typen des Hardtekkmon. Die Angriffe werden über
 * den gesamten Vorrat verteilt – von der schwächsten bis zur stärksten
 * Attacke –, damit auf hohen Stufen wirklich die schweren Geschütze stehen.
 * Etwa jede vierte Stelle geht an eine Statusattacke.
 * @param {string[]} typen
 * @param {number} anzahl
 */
function baueLernsatz(typen, anzahl) {
  const gesehen = new Set();
  const angriffe = [];
  const statusattacken = [];

  for (const name of GRUNDATTACKEN.slice(0, 2)) {
    gesehen.add(name);
    angriffe.push({ name, staerke: 0 });
  }

  for (const typ of typen) {
    for (const eintrag of attackenNachTyp(typ)) {
      if (gesehen.has(eintrag.name)) continue;
      gesehen.add(eintrag.name);
      if (eintrag.staerke > 0) angriffe.push({ name: eintrag.name, staerke: eintrag.staerke });
      else statusattacken.push({ name: eintrag.name });
    }
  }

  angriffe.sort((a, b) => a.staerke - b.staerke);

  const auswahl = [];
  const statusVorrat = [...statusattacken];
  const angriffsplaetze = [];

  for (let i = 0; i < anzahl; i += 1) {
    // Die letzte Stelle bleibt immer ein Angriff.
    const statusStelle = i >= 3 && i < anzahl - 1 && i % 4 === 3 && statusVorrat.length > 0;
    if (statusStelle) auswahl.push(statusVorrat.shift().name);
    else { auswahl.push(null); angriffsplaetze.push(auswahl.length - 1); }
  }

  // Angriffe gleichmäßig über den Vorrat verteilen: schwach zuerst, stark zuletzt.
  angriffsplaetze.forEach((platz, i) => {
    const anteil = angriffsplaetze.length === 1 ? 0 : i / (angriffsplaetze.length - 1);
    const index = Math.round(anteil * (angriffe.length - 1));
    auswahl[platz] = angriffe[Math.min(index, angriffe.length - 1)].name;
  });

  // Doppelte durch die Verteilung vermeiden.
  const fertig = [];
  for (const name of auswahl) {
    if (name && !fertig.includes(name)) fertig.push(name);
  }

  return fertig.map((attacke, i) => ({
    stufe: LERNSTUFEN[Math.min(i, LERNSTUFEN.length - 1)],
    attacke,
  }));
}

/**
 * Legt eine Art an und liefert ihre Kennnummer.
 * @param {[string, string[], number[], string]} eintrag
 * @param {{ fang: number, entwicklung: object|null, legende?: boolean }} zusatz
 */
function legeAnAus(eintrag, zusatz) {
  const [name, typen, werte, text] = eintrag;
  const [kp, ang, ver, spa, spv, ini] = werte;
  const gesamt = kp + ang + ver + spa + spv + ini;
  const id = ARTEN.length + 1;

  ARTEN.push({
    id,
    name,
    typen,
    basis: { kp, ang, ver, spa, spv, ini },
    fang: zusatz.fang,
    basisErfahrung: Math.round(gesamt / 4.2),
    entwicklung: zusatz.entwicklung,
    legende: zusatz.legende ?? false,
    text,
    lernsatz: baueLernsatz(typen, zusatz.legende ? 12 : 10),
  });

  return id;
}

/**
 * Entwicklungsreihe aus zwei oder drei Formen.
 * @param {...[string, string[], number[], string]} formen
 */
function familie(...formen) {
  const stufen = ENTWICKLUNGSSTUFEN[formen.length] ?? [];
  const ids = [];

  formen.forEach((form, i) => {
    const letzte = i === formen.length - 1;
    const fang = i === 0 ? FANG.erst : letzte ? FANG.letzt : FANG.mittel;
    ids.push(legeAnAus(form, { fang, entwicklung: null }));
  });

  // Verkettung erst nach dem Anlegen, damit die Nummern feststehen.
  ids.forEach((id, i) => {
    if (i < ids.length - 1) {
      ARTEN[id - 1].entwicklung = { zu: ids[i + 1], stufe: stufen[i] };
    }
  });
}

/** Art ohne Entwicklung. */
function einzel(...formen) {
  for (const form of formen) legeAnAus(form, { fang: FANG.einzel, entwicklung: null });
}

/** Legendäres Hardtekkmon: selten, stark, nicht entwickelbar. */
function legende(...formen) {
  for (const form of formen) {
    legeAnAus(form, { fang: FANG.legende, entwicklung: null, legende: true });
  }
}

// --- Entwicklungsreihen mit drei Formen --------------------------------------
familie(
  ['Kickolaus', ['KICK'], [45, 62, 45, 42, 45, 62], 'Tritt schon im Ei gegen die Schale – exakt im Vierertakt.'],
  ['Kickomat', ['KICK'], [62, 84, 62, 55, 58, 80], 'Seine Hinterläufe schlagen 180 Mal pro Minute zu.'],
  ['Kickzilla Kalle', ['KICK', 'KELLER'], [85, 118, 88, 68, 78, 96], 'Wo Kalle auftritt, ist der Estrich anschließend Geschichte.'],
);
familie(
  ['Bassbert', ['BASS'], [48, 50, 52, 65, 55, 46], 'Brummt beim Schlafen so tief, dass Gläser wandern.'],
  ['Bassbaron', ['BASS'], [66, 65, 70, 88, 72, 60], 'Sein Bauch ist innen hohl und wirkt wie ein Resonanzkörper.'],
  ['Basstian Blechschaden', ['BASS', 'SCHRANZ'], [92, 82, 92, 118, 88, 74], 'Parkende Autos gehen in seiner Nähe grundsätzlich kaputt.'],
);
familie(
  ['Acidchen', ['ACID'], [44, 46, 44, 68, 52, 62], 'Aus seinen Poren tropft eine leicht zischende Flüssigkeit.'],
  ['Acidberto', ['ACID'], [60, 60, 58, 90, 68, 84], 'Seine Melodielinie kriecht einem stundenlang im Kopf herum.'],
  ['Acidkaiser Alfons', ['ACID', 'CHEMIE'], [82, 78, 76, 122, 90, 104], 'Regiert seit 1989 über einen Kellerclub, der offiziell leer steht.'],
);
familie(
  ['Ratz-Ronny', ['KELLER'], [42, 55, 42, 32, 38, 58], 'Wohnt hinter der Anlage und frisst Kabelisolierung.'],
  ['Ratzomat', ['KELLER'], [60, 78, 60, 45, 55, 78], 'Schleppt alles weg, was nicht festgeschraubt ist.'],
  ['Ratzkönig Rudi', ['KELLER', 'VINYL'], [82, 105, 84, 62, 76, 98], 'Sein Nest besteht aus 400 zerkratzten Platten.'],
);
familie(
  ['Tröti', ['RAVE'], [40, 44, 40, 58, 48, 70], 'Pfeift ununterbrochen, auch im Schlaf.'],
  ['Trötomat', ['RAVE'], [58, 58, 55, 82, 65, 92], 'Ein Pfiff von ihm hört man drei Straßen weiter.'],
  ['Trötenherzog Torsten', ['RAVE', 'SCHRANZ'], [78, 78, 72, 112, 86, 116], 'Hat die Trillerpfeife zur Kunstform erhoben.'],
);
familie(
  ['Schrubbi', ['SCHRANZ'], [46, 58, 48, 48, 44, 54], 'Wischt beim Laufen ununterbrochen den Boden.'],
  ['Schrubbomat', ['SCHRANZ'], [64, 82, 66, 62, 60, 72], 'Zwei Wischmopps als Arme, beide auf Anschlag.'],
  ['Schrubberkönig Sülz', ['SCHRANZ', 'KICK'], [88, 112, 88, 78, 80, 92], 'Sein Schrubber-Kick hat schon Bühnen zersägt.'],
);
familie(
  ['Nebelnils', ['NEBEL'], [48, 40, 46, 60, 58, 48], 'Besteht zu 80 Prozent aus billigem Nebelfluid.'],
  ['Nebelniklas', ['NEBEL'], [66, 55, 64, 84, 80, 62], 'Füllt eine Turnhalle in unter zwei Minuten.'],
  ['Nebelfürst Norbert', ['NEBEL', 'GLITCH'], [90, 74, 86, 114, 106, 82], 'Niemand hat je gesehen, wo Norbert aufhört.'],
);
familie(
  ['Glitchi', ['GLITCH'], [42, 48, 42, 62, 50, 66], 'Flackert alle paar Sekunden kurz weg.'],
  ['Glitchmeister', ['GLITCH'], [58, 66, 58, 86, 68, 88], 'Steht manchmal zweimal gleichzeitig im Raum.'],
  ['Glitchgott Günther', ['GLITCH', 'STROM'], [80, 86, 78, 118, 88, 112], 'Sein Sound-Check dauert seit vier Jahren an.'],
);
familie(
  ['Donkelchen', ['DONK'], [50, 58, 50, 40, 42, 52], 'Hüpft statt zu laufen. Immer. Überall.'],
  ['Donkomat', ['DONK'], [68, 82, 70, 52, 58, 70], 'Federt Angriffe einfach zurück ins Publikum.'],
  ['Donkules', ['DONK', 'KICK'], [95, 112, 96, 66, 80, 88], 'Ein Sprung von ihm löst kleine Erdbeben aus.'],
);
familie(
  ['Stromer Sven', ['STROM'], [44, 46, 42, 66, 52, 64], 'Lädt sich an jeder Steckdose ungefragt nach.'],
  ['Steckdosen-Steve', ['STROM'], [60, 60, 56, 90, 70, 86], 'Hat an beiden Händen eine Mehrfachsteckdose.'],
  ['Hochspannungs-Horst', ['STROM', 'SCHRANZ'], [82, 80, 78, 120, 92, 106], 'Bei ihm fällt reihenweise die Straßenbeleuchtung aus.'],
);
familie(
  ['Kellerkind', ['KELLER'], [52, 50, 58, 46, 50, 40], 'Sieht Tageslicht ausschließlich vom Hörensagen.'],
  ['Kellerkönig', ['KELLER'], [72, 68, 82, 62, 68, 52], 'Kennt jede Ritze im Beton mit Vornamen.'],
  ['Kellermeister Klaus', ['KELLER', 'CHEMIE'], [102, 92, 116, 82, 92, 62], 'Betreibt seit 30 Jahren dieselbe Anlage im selben Keller.'],
);
familie(
  ['Chemie-Chantal', ['CHEMIE'], [50, 44, 46, 62, 60, 50], 'Ihre Haare leuchten unter Schwarzlicht von selbst.'],
  ['Chemie-Chef', ['CHEMIE'], [70, 58, 62, 86, 82, 64], 'Mischt Getränke, die vorher niemand bestellt hat.'],
  ['Chemtrail-Charly', ['CHEMIE', 'NEBEL'], [96, 76, 84, 114, 108, 78], 'Hinter ihm bleibt ein Streifen in der Luft stehen.'],
);
familie(
  ['Ravelinde', ['RAVE'], [52, 48, 44, 58, 54, 60], 'Tanzt seit ihrer Geburt und hat nie aufgehört.'],
  ['Ravemutti', ['RAVE'], [74, 64, 60, 80, 74, 78], 'Passt auf die ganze Tanzfläche auf wie auf ihre Kinder.'],
  ['Ravequeen Renate', ['RAVE', 'CHEMIE'], [104, 84, 80, 108, 100, 96], 'Steht seit 1994 in der ersten Reihe. Immer derselbe Platz.'],
);
familie(
  ['Schranzi', ['SCHRANZ'], [45, 60, 44, 50, 42, 58], 'Kreischt bereits als Baby in perfekter Tonhöhe.'],
  ['Schranzomat', ['SCHRANZ'], [62, 84, 60, 66, 56, 78], 'Aus seinem Rücken ragt eine echte Kreissäge.'],
  ['Schranzgeneral Siegfried', ['SCHRANZ', 'KICK'], [84, 116, 82, 86, 76, 100], 'Kommandiert Tanzflächen wie ein Feldherr.'],
);
familie(
  ['Plattenpaule', ['VINYL'], [46, 52, 54, 46, 48, 52], 'Trägt seine Sammlung immer komplett mit sich herum.'],
  ['Vinyl-Vitali', ['VINYL'], [64, 72, 74, 62, 64, 70], 'Wirft Platten mit tödlicher Präzision.'],
  ['Schallplatten-Schorsch', ['VINYL', 'KELLER'], [88, 98, 102, 80, 86, 88], 'Besitzt 12.000 Platten und kein einziges Regal.'],
);
familie(
  ['Kleinklatsch', ['CHEMIE'], [50, 52, 46, 52, 46, 54], 'Klatscht dauernd, aber nie im Takt.'],
  ['Halbklatsch', ['CHEMIE', 'RAVE'], [70, 72, 62, 72, 62, 74], 'Der Blick geht schon leicht an allem vorbei.'],
  ['Der Verklatschte', ['CHEMIE', 'RAVE'], [98, 100, 84, 100, 84, 98], 'Niemand weiß, seit wann er wach ist. Er selbst am wenigsten.'],
);
familie(
  ['Boxi', ['BASS'], [54, 48, 60, 54, 50, 38], 'Eine kleine Box auf zwei stämmigen Beinen.'],
  ['Boxenbert', ['BASS'], [76, 64, 84, 74, 68, 48], 'Sein Gehäuse ist mit Panzertape geflickt.'],
  ['Boxenkaiser Bodo', ['BASS', 'KELLER'], [108, 88, 118, 100, 92, 58], 'Ein Boxenturm mit Gesicht. Und mit Meinung.'],
);
familie(
  ['Kabelkurt', ['STROM'], [48, 50, 50, 52, 50, 50], 'Verheddert sich täglich in sich selbst.'],
  ['Kabelkorbinian', ['STROM', 'GLITCH'], [66, 68, 68, 72, 68, 70], 'Aus ihm ragen 40 Meter Verlängerungskabel.'],
  ['Kabelbaron Konrad', ['STROM', 'GLITCH'], [92, 92, 92, 100, 92, 96], 'Versorgt eine ganze Halle – ohne Anmeldung.'],
);
familie(
  ['Stampfi', ['KICK'], [56, 60, 54, 34, 44, 46], 'Jeder Schritt hinterlässt einen kleinen Krater.'],
  ['Stampfomat', ['KICK', 'DONK'], [78, 84, 74, 46, 60, 62], 'Stampft Beton in unter einer Minute zu Sand.'],
  ['Stampfmarschall Manni', ['KICK', 'DONK'], [112, 118, 100, 62, 82, 76], 'Sein Marschtritt bringt Hallendächer zum Wackeln.'],
);
familie(
  ['Dunsti', ['NEBEL'], [46, 42, 44, 58, 56, 56], 'Riecht durchdringend nach künstlichem Erdbeer-Nebel.'],
  ['Dunstomat', ['NEBEL', 'GLITCH'], [64, 56, 62, 80, 78, 76], 'Verschluckt Lichtstrahlen komplett.'],
  ['Dunstherzog Dieter', ['NEBEL', 'GLITCH'], [88, 78, 86, 110, 104, 96], 'Wenn er auftaucht, findet keiner mehr den Ausgang.'],
);
familie(
  ['Säuresusi', ['ACID'], [48, 44, 48, 64, 56, 52], 'Ihre Spucke ätzt Löcher in Bierdeckel.'],
  ['Säurebärbel', ['ACID', 'CHEMIE'], [66, 58, 64, 88, 76, 66], 'Trägt Handschuhe – zum Schutz der anderen.'],
  ['Säurebaronin Sabine', ['ACID', 'CHEMIE'], [92, 80, 88, 118, 100, 86], 'Ihr Labor ist ein umgebauter Getränkekiosk.'],
);
familie(
  ['Nadel-Nadine', ['VINYL'], [44, 56, 44, 48, 46, 62], 'Ihre Fingerspitzen sind Abtastnadeln.'],
  ['Nadelnick', ['VINYL', 'GLITCH'], [62, 78, 60, 64, 60, 84], 'Findet jede Rille beim ersten Versuch.'],
  ['Nadelfürst Nino', ['VINYL', 'GLITCH'], [84, 108, 82, 88, 82, 112], 'Scratcht schneller, als das Ohr folgen kann.'],
);
familie(
  ['Hüpfi', ['DONK'], [52, 54, 48, 44, 46, 60], 'Ein Gummiball mit Augen und viel zu viel Energie.'],
  ['Hüpfomat', ['DONK', 'RAVE'], [72, 74, 66, 60, 62, 82], 'Prallt an Wänden ab, ohne Tempo zu verlieren.'],
  ['Hüpfburgen-Harry', ['DONK', 'RAVE'], [100, 100, 90, 80, 84, 106], 'Vermietet sich am Wochenende selbst als Hüpfburg.'],
);
familie(
  ['Schimmi', ['KELLER'], [54, 46, 58, 48, 54, 36], 'Wächst bevorzugt hinter der Rückwand der Anlage.'],
  ['Schimmelmann', ['KELLER', 'NEBEL'], [76, 62, 80, 66, 74, 46], 'Verbreitet einen Geruch, den man nie wieder loswird.'],
  ['Schimmelbaron Schulze', ['KELLER', 'NEBEL'], [106, 84, 112, 88, 100, 58], 'Der Keller gehört ihm. Rechtlich ist das ungeklärt.'],
);
familie(
  ['Aggi', ['STROM'], [56, 58, 52, 50, 46, 44], 'Ein kleines Notstromaggregat mit schlechter Laune.'],
  ['Aggregatus', ['STROM', 'KICK'], [78, 80, 72, 66, 62, 58], 'Läuft auch dann, wenn längst kein Sprit mehr drin ist.'],
  ['Notstrom-Nobbi', ['STROM', 'KICK'], [108, 108, 96, 88, 82, 72], 'Rettet jede Party, direkt nachdem er sie ruiniert hat.'],
);
familie(
  ['Wummi', ['BASS'], [50, 52, 50, 60, 50, 44], 'Ein wandelnder Subwoofer im Miniformat.'],
  ['Wummerer', ['BASS', 'SCHRANZ'], [70, 70, 68, 84, 66, 60], 'Fensterscheiben halten seine Nähe schlecht aus.'],
  ['Wummerkönig Willi', ['BASS', 'SCHRANZ'], [98, 96, 94, 116, 88, 80], 'Sein Auftritt wurde in drei Landkreisen gemessen.'],
);
familie(
  ['Pillepalle', ['CHEMIE'], [46, 48, 44, 62, 58, 58], 'Winzig, bunt und von zweifelhafter Herkunft.'],
  ['Pillenpaul', ['CHEMIE', 'GLITCH'], [64, 62, 60, 86, 78, 78], 'Zählt Farben, die es gar nicht gibt.'],
  ['Pillenpapst Peter', ['CHEMIE', 'GLITCH'], [88, 84, 82, 118, 100, 100], 'Segnet die Tanzfläche mit fragwürdigen Gaben.'],
);
familie(
  ['Federfritz', ['DONK'], [54, 56, 52, 46, 48, 56], 'Sitzt auf einer echten Sprungfeder statt auf Beinen.'],
  ['Federfranz', ['DONK', 'BASS'], [74, 78, 72, 62, 64, 74], 'Springt im Rhythmus der Bassdrum.'],
  ['Federkönig Ferdi', ['DONK', 'BASS'], [102, 106, 96, 84, 86, 92], 'Ein Satz von ihm reicht über die ganze Halle.'],
);
familie(
  ['Sägeseppel', ['SCHRANZ'], [48, 58, 46, 52, 44, 56], 'Sein Kreischen weckt ganze Wohnblöcke.'],
  ['Sägomat', ['SCHRANZ', 'VINYL'], [66, 80, 64, 68, 60, 76], 'Zwei Sägeblätter, ein Mischpult.'],
  ['Sägefürst Sigi', ['SCHRANZ', 'VINYL'], [90, 110, 86, 92, 82, 102], 'Zerlegt Beats in ihre Einzelteile. Und Bühnen gleich mit.'],
);
familie(
  ['Filterfritzi', ['ACID'], [46, 44, 46, 66, 54, 58], 'Dreht ununterbrochen an einem unsichtbaren Regler.'],
  ['Filterfrank', ['ACID', 'GLITCH'], [64, 58, 62, 90, 72, 78], 'Sein Filter fährt hoch, wenn er sich freut.'],
  ['Filterfürst Falko', ['ACID', 'GLITCH'], [88, 78, 84, 122, 94, 100], 'Öffnet den Filter erst, wenn wirklich alle warten.'],
);

// --- Entwicklungsreihen mit zwei Formen --------------------------------------
familie(
  ['Trittbrett-Timo', ['KICK'], [55, 68, 52, 40, 46, 64], 'Fährt auf allem mit, was Räder hat.'],
  ['Trittbrett-Tobias', ['KICK', 'DONK'], [80, 102, 78, 60, 70, 92], 'Bremst grundsätzlich mit dem Gegner.'],
);
familie(
  ['Fliesi', ['KELLER'], [58, 62, 70, 40, 50, 40], 'Trägt eine Fliese als Schutzschild vor sich her.'],
  ['Fliesenfürst Fred', ['KELLER', 'BASS'], [86, 92, 108, 66, 78, 56], 'Baut Tische, die genau einen Abend halten.'],
);
familie(
  ['Trockeneis-Toni', ['NEBEL'], [52, 46, 54, 66, 62, 48], 'Dampft leise vor sich hin, auch im Winter.'],
  ['Trockeneis-Theo', ['NEBEL', 'CHEMIE'], [78, 68, 80, 100, 94, 66], 'Verwandelt jede Halle in eine Wolkenlandschaft.'],
);
familie(
  ['Konfetti-Kai', ['RAVE'], [50, 52, 46, 60, 52, 66], 'Verliert bei jeder Bewegung bunte Schnipsel.'],
  ['Konfettikanonen-Kevin', ['RAVE', 'STROM'], [76, 78, 70, 94, 78, 96], 'Ein Schuss von ihm hält den Hausmeister eine Woche auf Trab.'],
);
familie(
  ['Mate-Mandy', ['CHEMIE'], [54, 50, 48, 58, 56, 62], 'Steht ausschließlich unter Koffein.'],
  ['Mate-Melanie', ['CHEMIE', 'STROM'], [80, 74, 72, 88, 84, 96], 'Hat seit vier Tagen nicht geblinzelt.'],
);
familie(
  ['Scratchi', ['VINYL'], [48, 60, 50, 44, 46, 60], 'Übt heimlich an der Anlage der Eltern.'],
  ['Scratch-Schneider', ['VINYL', 'SCHRANZ'], [74, 92, 74, 66, 70, 90], 'Schneidet Takte so sauber wie ein Metzger.'],
);
familie(
  ['Bitbert', ['GLITCH'], [50, 48, 50, 64, 54, 58], 'Besteht aus sichtbar zu wenigen Pixeln.'],
  ['Bytebert', ['GLITCH', 'VINYL'], [76, 72, 74, 96, 80, 86], 'Speichert Beats, die es nie gegeben hat.'],
);
familie(
  ['Blitzbirne', ['STROM'], [46, 50, 44, 68, 52, 66], 'Blinkt bei Aufregung unkontrolliert.'],
  ['Blitzbaron Bernd', ['STROM', 'RAVE'], [72, 76, 68, 102, 78, 98], 'Seine Lichtshow ist medizinisch nicht empfohlen.'],
);
familie(
  ['Subwoofer-Sepp', ['BASS'], [60, 52, 58, 62, 54, 40], 'Ein Bassreflexrohr auf kurzen Beinen.'],
  ['Subbass-Sebastian', ['BASS', 'KELLER'], [92, 78, 88, 96, 82, 58], 'Man hört ihn zwei Straßen früher als man ihn sieht.'],
);
familie(
  ['Plong', ['DONK'], [52, 58, 48, 46, 44, 62], 'Macht plong. Sonst nichts.'],
  ['Plongomat', ['DONK', 'GLITCH'], [78, 88, 72, 68, 66, 92], 'Macht plong – aber sehr, sehr oft.'],
);
familie(
  ['Tröpfi', ['ACID'], [48, 46, 46, 64, 54, 56], 'Hinterlässt Spuren, die man besser nicht anfasst.'],
  ['Tröpfelmann', ['ACID', 'NEBEL'], [74, 68, 70, 96, 82, 82], 'Aus seinen Fingern tropft es blubbernd.'],
);
familie(
  ['Kreissägi', ['SCHRANZ'], [50, 62, 48, 50, 44, 58], 'Ein Sägeblatt, das laufen gelernt hat.'],
  ['Kreissägen-Karsten', ['SCHRANZ', 'KELLER'], [76, 96, 76, 70, 68, 86], 'Renoviert Kellerclubs auf seine ganz eigene Art.'],
);
familie(
  ['Muffel', ['KELLER'], [60, 54, 62, 44, 56, 38], 'Wirkt schlecht gelaunt, ist aber nur müde.'],
  ['Muffelmann', ['KELLER', 'NEBEL'], [90, 80, 92, 68, 84, 54], 'Sein Atem ist ein eigener Wetterbericht.'],
);
familie(
  ['Pogo-Pit', ['RAVE'], [56, 62, 50, 44, 46, 62], 'Springt jedem ungefragt in die Seite.'],
  ['Pogo-Panzer', ['RAVE', 'KICK'], [84, 100, 78, 62, 70, 92], 'Eröffnet den Pit im Alleingang.'],
);
familie(
  ['Absacker-Anton', ['CHEMIE'], [56, 54, 50, 58, 54, 50], 'Der letzte Kurze der Nacht, in Form eines Wesens.'],
  ['Absacker-Alfred', ['CHEMIE', 'NEBEL'], [86, 82, 76, 88, 82, 72], 'Nach ihm kommt statistisch gesehen nichts Gutes mehr.'],
);

// --- Einzelgänger ohne Entwicklung -------------------------------------------
einzel(
  ['Cracky Koksberg', ['CHEMIE', 'GLITCH'], [72, 96, 62, 96, 62, 118], 'Redet doppelt so schnell wie alle anderen und wird nie müde.'],
  ['Jesus 2.0', ['RAVE', 'NEBEL'], [88, 78, 84, 108, 108, 74], 'Behauptet, die Tanzfläche geteilt zu haben. Zeugen fehlen.'],
  ['DJ Nasenbär', ['CHEMIE'], [70, 88, 66, 84, 66, 106], 'Seine Nase zuckt im Takt. Immer.'],
  ['Zahnlücken-Zombie', ['KELLER', 'NEBEL'], [96, 92, 88, 60, 70, 48], 'Grinst durchgehend. Es fehlen exakt zwei Zähne.'],
  ['Augenring-Otto', ['NEBEL'], [84, 70, 76, 88, 92, 68], 'Die Ringe unter seinen Augen haben eigene Ringe.'],
  ['Presslufthannes', ['DONK'], [82, 112, 84, 50, 62, 76], 'Arbeitet tagsüber am Bau, nachts auf der Fläche.'],
  ['Bierbankbernd', ['KELLER'], [104, 88, 106, 54, 74, 40], 'Trägt seine eigene Sitzgelegenheit auf dem Rücken.'],
  ['Hallenhalunke', ['SCHRANZ'], [78, 100, 72, 88, 68, 92], 'Kennt jede Halle im Umkreis – und jeden Hinterausgang.'],
  ['Türsteher-Theo', ['KICK', 'KELLER'], [102, 106, 110, 52, 82, 52], 'Sagt nur ein Wort: nein.'],
  ['Kassenwart-Kalle', ['VINYL'], [78, 74, 90, 72, 88, 62], 'Zählt Eintritt in Zwei-Euro-Münzen. Jede Nacht.'],
  ['Lichtorgel-Lisa', ['STROM', 'RAVE'], [74, 66, 70, 106, 88, 96], 'Blinkt in Farben, für die es keine Namen gibt.'],
  ['Laserpointer-Lars', ['STROM', 'GLITCH'], [68, 78, 64, 108, 74, 108], 'Zielt gern auf Dinge, auf die man nicht zielen sollte.'],
  ['Gullideckel-Gustav', ['KELLER', 'DONK'], [98, 96, 118, 48, 76, 44], 'Wiegt 90 Kilo und rollt trotzdem erstaunlich schnell.'],
  ['Kippen-Kevin', ['CHEMIE'], [76, 80, 66, 76, 66, 86], 'Steht grundsätzlich draußen, egal bei welchem Wetter.'],
  ['Ohrwurm-Olga', ['SCHRANZ'], [80, 68, 72, 104, 86, 90], 'Ihre Melodie bleibt drei Wochen. Mindestens.'],
  ['Feierabend-Fabian', ['VINYL', 'CHEMIE'], [90, 84, 84, 84, 84, 74], 'Kennt nur einen Zustand: gleich Feierabend.'],
  ['Frühschicht-Fritz', ['KICK', 'CHEMIE'], [88, 102, 80, 62, 74, 84], 'Geht um sechs zur Arbeit. Direkt von der Fläche.'],
  ['Afterhour-Achim', ['NEBEL', 'RAVE'], [86, 82, 78, 96, 88, 88], 'Beginnt dann, wenn alle anderen fertig sind.'],
  ['Bassbox-Britta', ['BASS'], [92, 78, 96, 104, 82, 48], 'Zwei 18-Zoll-Membranen als Augen.'],
  ['Kaugummi-Kai', ['DONK', 'CHEMIE'], [82, 86, 82, 70, 82, 88], 'Klebt an allem. Vor allem an Gegnern.'],
  ['Nachtschicht-Nadja', ['NEBEL', 'STROM'], [84, 76, 80, 100, 90, 82], 'Arbeitet nur zwischen zwei und sechs Uhr.'],
  ['Sirenen-Sonja', ['SCHRANZ', 'STROM'], [78, 84, 74, 106, 78, 96], 'Ihr Signalton räumt jede Halle in Sekunden.'],
  ['Bunker-Bianca', ['KELLER', 'BASS'], [108, 92, 116, 84, 88, 42], 'Ihre Anlage steht drei Stockwerke unter der Erde.'],
  ['Klobrillen-Kurti', ['CHEMIE', 'KELLER'], [86, 74, 88, 68, 92, 62], 'Verwaltet den einzigen funktionierenden Raum der Halle.'],
  ['Tanzbär Tommy', ['RAVE', 'KICK'], [104, 108, 88, 66, 78, 80], 'Tanzt seit acht Stunden. Ohne Pause. Ohne Wasser.'],
);

// --- Legendäre Hardtekkmon ----------------------------------------------------
legende(
  ['Wummerlord', ['BASS', 'SCHRANZ'], [106, 108, 100, 132, 104, 90], 'Erzeugt Frequenzen, die man nur im Brustkorb spürt.'],
  ['Kickmonarch', ['KICK', 'STROM'], [104, 134, 104, 92, 96, 110], 'Sein Tritt setzt in drei Straßenzügen die Sicherungen außer Gefecht.'],
  ['Nebelzar', ['NEBEL', 'GLITCH'], [102, 92, 106, 128, 122, 90], 'Erscheint nur, wenn niemand mehr den Ausgang findet.'],
  ['Acidprophet', ['ACID', 'CHEMIE'], [100, 90, 96, 138, 112, 104], 'Predigt in 303 Tönen. Verstanden hat ihn noch keiner.'],
  ['Der Ewige Rave', ['RAVE', 'NEBEL'], [120, 108, 108, 118, 118, 108], 'Läuft seit 1992 durch. Niemand hat je abgeschaltet.'],
  ['Roter Chupa Chups', ['CHEMIE', 'RAVE'], [116, 112, 110, 126, 116, 110], 'Der rote Lolli aus den Legenden. Wer ihn findet, bleibt wach.'],
);

/** @type {Map<string, object>} */
const NACH_NAME = new Map(ARTEN.map((art) => [art.name, art]));

/** Art über Nummer (1-basiert) holen. */
export function art(id) {
  return ARTEN[id - 1] ?? null;
}

/** Art über den Namen holen. */
export function artNachName(name) {
  return NACH_NAME.get(name) ?? null;
}

export const ANZAHL_ARTEN = ARTEN.length;
