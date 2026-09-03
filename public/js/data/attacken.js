// ============================================================================
// Attacken
// ----------------------------------------------------------------------------
// Alle Attacken tragen Begriffe aus dem Genre: Technik am Pult, Zustände auf
// der Tanzfläche, Zubehör aus dem Keller. Jede Attacke besteht aus Typ,
// Kategorie, Stärke, Genauigkeit, Aktionspunkten (AP) und optional einem
// Zusatzeffekt.
//
// Zusatzeffekte sind Datensätze, keine Funktionen – der Kampfcode wertet sie
// an einer einzigen Stelle aus (siehe battle/effekte.js).
// ============================================================================

/** Statuszustände (Dauerzustände) – Namen im Ton des Spiels. */
export const STATUS = {
  verkatert: 'verkatert', // Gift: zieht jede Runde Kraftpunkte ab
  weggeratzt: 'weggeratzt', // Schlaf: keine Aktion möglich
  zugedroehnt: 'zugedröhnt', // Paralyse: langsamer, setzt manchmal aus
  ausgebrannt: 'ausgebrannt', // Verbrennung: halber Angriff, Schaden pro Runde
  tiefgekuehlt: 'tiefgekühlt', // Eis: keine Aktion, bis es auftaut
  // Nur durch "Göttliche Dosis" (siehe unten): Acid-Typen sind dagegen immun
  // (siehe setzeStatus() in battle/kampf.js), allen anderen fehlt schlicht
  // die Erfahrung mit der Wirkung.
  ausgeknipst: 'ausgeknipst',
};

const status = (art, chance = 1) => ({ art: 'status', status: art, chance });
const werte = (ziel, aenderungen, chance = 1) => ({ art: 'werte', ziel, aenderungen, chance });
const zucken = (chance) => ({ art: 'zucken', chance });
const rueckstoss = (anteil) => ({ art: 'rueckstoss', anteil });
const saugen = (anteil) => ({ art: 'saugen', anteil });
const heilung = (anteil) => ({ art: 'heilung', anteil });
const mehrfach = (min, max) => ({ art: 'mehrfach', min, max });
const doppelschlag = () => ({ art: 'mehrfach', min: 2, max: 2 });
const krit = () => ({ art: 'krit' });
const verwirren = (chance = 1) => ({ art: 'verwirren', chance });

/** @type {Record<string, object>} */
export const ATTACKEN = {};

/**
 * Vorrang-Attacken kommen bevorzugt zuerst dran: Jede Stufe verschiebt die
 * Initiative-Chance um 15 Punkte (siehe initiativeChance in battle/formeln.js).
 * Das ist bewusst nur für schwache, schnelle Attacken vergeben – Vorrang
 * kostet Durchschlagskraft. Die stärkste Stufe hat entsprechend die
 * schwächste Attacke im Spiel.
 * @param {number} vorrang 0 = keiner, sonst die Stufe
 */
function attacke(name, typ, kategorie, staerke, genauigkeit, ap, effekt, text, vorrang = 0) {
  ATTACKEN[name] = { name, typ, kategorie, staerke, genauigkeit, ap, effekt: effekt ?? null, text, vorrang };
}

// --- KICK -------------------------------------------------------------------
attacke('Schrubber Kick', 'KICK', 'physisch', 55, 100, 30, null, 'Ein trockener Tritt genau auf die Eins.');
attacke('Doppelkick', 'KICK', 'physisch', 35, 95, 25, doppelschlag(), 'Zwei Tritte hintereinander, ohne Pause.');
attacke('Kickdrum', 'KICK', 'physisch', 70, 100, 20, null, 'Ein Schlag mit der Wucht einer Bassdrum.');
attacke('Vollgas', 'KICK', 'physisch', 90, 90, 15, werte('selbst', { ini: -1 }), 'Alles raus, danach fehlt der Speed.');
attacke('Bretterwand', 'KICK', 'physisch', 110, 80, 10, rueckstoss(0.25), 'Volle Kanne gegen den Gegner – tut selbst weh.');
attacke('Kopfnicker', 'KICK', 'physisch', 45, 100, 25, zucken(0.3), 'Nickt so hart, dass der Gegner den Takt verliert.', 1);
attacke('Stampfer', 'KICK', 'physisch', 65, 95, 20, zucken(0.15), 'Ein Stampfen, das den Boden vibrieren lässt.');
attacke('Kesselschlacht', 'KICK', 'physisch', 120, 75, 5, rueckstoss(0.33), 'Die letzte Eskalation der Nacht.');
attacke('Anlauf nehmen', 'KICK', 'status', 0, 100, 20, werte('selbst', { ang: 1, ini: 1 }), 'Kurz Schwung holen, dann geht es los.');

// --- SCHRANZ ----------------------------------------------------------------
attacke('Schranzsäge', 'SCHRANZ', 'spezial', 60, 100, 25, null, 'Eine kreischende Sequenz direkt ins Ohr.');
attacke('Verzerrer', 'SCHRANZ', 'spezial', 75, 95, 20, werte('gegner', { spv: -1 }, 0.3), 'Übersteuertes Signal, das die Deckung zerlegt.');
attacke('Übersteuerung', 'SCHRANZ', 'spezial', 95, 85, 10, werte('selbst', { spv: -1 }), 'Rot im Pegel – Nebenwirkungen inklusive.');
attacke('Kreissäge', 'SCHRANZ', 'physisch', 80, 90, 15, krit(), 'Trifft besonders oft eine empfindliche Stelle.');
attacke('Feedback', 'SCHRANZ', 'spezial', 50, 100, 20, werte('gegner', { spa: -1 }, 0.4), 'Rückkopplung, die dem Gegner die Kraft nimmt.');
attacke('Krachmacher', 'SCHRANZ', 'spezial', 40, 100, 30, verwirren(0.2), 'Lärm ohne jedes System.');
attacke('Bretter', 'SCHRANZ', 'physisch', 100, 85, 10, null, 'Einfach nur: Bretter.');
attacke('Tinnitus', 'SCHRANZ', 'status', 0, 90, 15, status('verkatert'), 'Ein Pfeifen, das einfach nicht mehr aufhört.');
attacke('Pegel aufreißen', 'SCHRANZ', 'status', 0, 100, 20, werte('selbst', { spa: 2 }), 'Der Regler geht bis zum Anschlag.');

// --- ACID -------------------------------------------------------------------
attacke('Säurelinie', 'ACID', 'spezial', 60, 100, 25, status('verkatert', 0.2), 'Eine schleichende Melodie, die sich festfrisst.');
attacke('Filterfahrt', 'ACID', 'spezial', 70, 100, 20, werte('gegner', { spv: -1 }, 0.25), 'Der Filter fährt hoch – die Deckung fällt.');
attacke('Resonanz', 'ACID', 'spezial', 85, 90, 15, verwirren(0.2), 'Eine Resonanz, die im Schädel weiterschwingt.');
attacke('Acid Bad', 'ACID', 'spezial', 100, 85, 10, werte('gegner', { ver: -1 }, 0.3), 'Ein ätzender Klangteppich.');
attacke('Tröpfchen', 'ACID', 'spezial', 40, 100, 30, status('verkatert', 0.3), 'Kleine Menge, große Wirkung.', 1);
attacke('Schleichende Dosis', 'ACID', 'status', 0, 85, 15, status('verkatert'), 'Merkt man erst später. Dann aber richtig.');
attacke('Ätzriff', 'ACID', 'physisch', 75, 95, 15, null, 'Ein Riff mit Widerhaken.');
attacke('Pupillentanz', 'ACID', 'status', 0, 100, 20, verwirren(), 'Der Blick geht in zwei Richtungen gleichzeitig.');
attacke('Göttliche Dosis', 'ACID', 'status', 0, 100, 5, status('ausgeknipst'),
  'Setzt instant eine extrem hochdosierte Dosis LSD-25 frei. Nur Acid-Typen kommen damit klar.');

// --- RAVE -------------------------------------------------------------------
attacke('Tanzflächenwalze', 'RAVE', 'physisch', 80, 95, 15, null, 'Rollt einmal quer über die Fläche.');
attacke('Moshpit', 'RAVE', 'physisch', 65, 100, 20, zucken(0.2), 'Ellenbogen von allen Seiten.');
attacke('Konfettikanone', 'RAVE', 'spezial', 55, 100, 25, werte('gegner', { gen: -1 }, 0.35), 'Bunt, laut und extrem unübersichtlich.');
attacke('Stagedive', 'RAVE', 'physisch', 95, 85, 10, rueckstoss(0.25), 'Sprung ins Publikum. Manchmal fängt keiner.');
attacke('Crowdsurfen', 'RAVE', 'physisch', 70, 90, 15, werte('selbst', { ini: 1 }, 0.3), 'Über die Menge hinweg direkt zum Ziel.');
attacke('Ravepfeife', 'RAVE', 'spezial', 45, 100, 25, zucken(0.25), 'Ein schriller Pfiff im Sekundentakt.');
attacke('Gästeliste', 'RAVE', 'status', 0, 100, 15, werte('selbst', { ver: 1, spv: 1 }), 'Wer draufsteht, kommt sicher durch.');
attacke('Vollgas Rave', 'RAVE', 'spezial', 110, 80, 10, werte('selbst', { spa: -1 }), 'Der komplette Set-Höhepunkt in einer Attacke.');
attacke('7 Tage Wach', 'RAVE', 'status', 0, 100, 10, werte('selbst', { ang: 2, ini: 1 }), 'Schlaf ist etwas für die Woche danach.');

// --- GLITCH -----------------------------------------------------------------
attacke('Bitfehler', 'GLITCH', 'spezial', 55, 100, 25, werte('gegner', { gen: -1 }, 0.3), 'Ein kurzer Aussetzer im Signal.');
attacke('Stotterbeat', 'GLITCH', 'spezial', 30, 95, 20, mehrfach(2, 5), 'Der Beat hängt – zwei- bis fünfmal.');
attacke('Datensalat', 'GLITCH', 'spezial', 75, 95, 15, verwirren(0.3), 'Alles durcheinander, nichts ergibt Sinn.');
attacke('Cut', 'GLITCH', 'physisch', 70, 100, 20, null, 'Ein sauberer Schnitt mitten im Takt.');
attacke('Absturz', 'GLITCH', 'spezial', 100, 80, 10, werte('gegner', { spa: -1 }, 0.2), 'Das System steigt komplett aus.');
attacke('Pitch Bend', 'GLITCH', 'status', 0, 100, 20, werte('gegner', { ini: -2 }), 'Zieht dem Gegner das Tempo aus den Beinen.');
attacke('Loop Falle', 'GLITCH', 'spezial', 60, 100, 20, zucken(0.3), 'Dieselben vier Takte, immer wieder.');
attacke('Kabelsalat', 'GLITCH', 'status', 0, 90, 20, status('zugedröhnt'), 'Wer sich da verheddert, kommt nicht mehr weit.');

// --- STROM ------------------------------------------------------------------
attacke('Steckdose', 'STROM', 'spezial', 55, 100, 25, status('zugedröhnt', 0.2), 'Ein kurzer, sehr direkter Stromschlag.');
attacke('Kurzschluss', 'STROM', 'spezial', 80, 95, 15, status('zugedröhnt', 0.3), 'Es knallt, es raucht, es wirkt.');
attacke('Sicherung raus', 'STROM', 'status', 0, 90, 15, status('zugedröhnt'), 'Ohne Saft geht auf einmal gar nichts mehr.');
attacke('Hochspannung', 'STROM', 'spezial', 105, 85, 10, status('zugedröhnt', 0.15), 'Das Aggregat gibt alles, was es hat.');
attacke('Notstrom', 'STROM', 'status', 0, 100, 10, heilung(0.5), 'Reserve anzapfen und weitermachen.');
attacke('Blitzlicht', 'STROM', 'spezial', 65, 100, 20, werte('gegner', { gen: -1 }, 0.3), 'Grell genug, um blind zu treffen.');
attacke('Verlängerung', 'STROM', 'physisch', 70, 95, 20, zucken(0.2), 'Zwanzig Meter Kabel als Peitsche.');
attacke('Aggregat', 'STROM', 'status', 0, 100, 20, werte('selbst', { spa: 1, spv: 1 }), 'Der Generator läuft warm.');

// --- CHEMIE -----------------------------------------------------------------
attacke('Pillenpower', 'CHEMIE', 'spezial', 70, 95, 20, status('verkatert', 0.25), 'Wirkstoff unbekannt, Wirkung gewaltig.');
attacke('Mate Attacke', 'CHEMIE', 'physisch', 60, 100, 25, werte('selbst', { ini: 1 }, 0.3), 'Koffein trifft Zucker trifft Gegner.');
attacke('Energydrink', 'CHEMIE', 'status', 0, 100, 15, werte('selbst', { ang: 1, ini: 2 }), 'Flügel gibt es hier nicht, aber Puls.');
attacke('Restalkohol', 'CHEMIE', 'spezial', 85, 90, 15, verwirren(0.25), 'Der Rest von gestern, direkt ins Gesicht.');
attacke('Kater', 'CHEMIE', 'status', 0, 85, 15, status('verkatert'), 'Kommt zuverlässig und bleibt lange.');
attacke('Absacker', 'CHEMIE', 'spezial', 95, 90, 10, saugen(0.5), 'Nimmt dem Gegner, was man selbst braucht.');
attacke('Trockeneis', 'CHEMIE', 'spezial', 75, 95, 15, status('tiefgekühlt', 0.15), 'Klirrend kalt und schwer wie Blei.');
attacke('Chupa Chups', 'CHEMIE', 'status', 0, 100, 10, heilung(0.5), 'Ein roter Lolli wirkt Wunder.');
attacke('Laborunfall', 'CHEMIE', 'spezial', 120, 70, 5, status('verkatert', 0.4), 'Sollte so nicht passieren. Passiert trotzdem.');

// --- NEBEL ------------------------------------------------------------------
attacke('Nebelmaschine', 'NEBEL', 'spezial', 60, 100, 25, werte('gegner', { gen: -1 }, 0.4), 'Zwei Stöße und man sieht die Hand nicht mehr.');
attacke('Nebelwand', 'NEBEL', 'status', 0, 100, 20, werte('selbst', { ver: 1, spv: 1 }), 'Wer nichts sieht, trifft auch nichts.');
attacke('Bodennebel', 'NEBEL', 'spezial', 75, 95, 15, werte('gegner', { ini: -1 }, 0.3), 'Kriecht über den Boden und bremst alles aus.');
attacke('Rauchmelder', 'NEBEL', 'spezial', 50, 100, 25, zucken(0.3), 'Ein Piepen, das jeden aus dem Takt bringt.');
attacke('Blackout', 'NEBEL', 'status', 0, 75, 10, status('weggeratzt'), 'Licht aus. Und der Gegner gleich mit.');
attacke('Dunstglocke', 'NEBEL', 'spezial', 90, 90, 10, werte('gegner', { spa: -1 }, 0.25), 'Schwerer Dunst legt sich über alles.');
attacke('Geisterstunde', 'NEBEL', 'spezial', 100, 85, 10, verwirren(0.2), 'Um diese Zeit war da eben noch niemand.');
attacke('Verpuffen', 'NEBEL', 'status', 0, 100, 20, werte('selbst', { ini: 2 }), 'Kurz weg und ganz woanders wieder da.');

// --- KELLER -----------------------------------------------------------------
attacke('Kellerhall', 'KELLER', 'spezial', 65, 100, 20, null, 'Der Hall kommt aus allen vier Wänden zurück.');
attacke('Fliesentisch', 'KELLER', 'physisch', 85, 90, 15, krit(), 'Der Klassiker. Hält selten die zweite Runde.');
attacke('Betonwand', 'KELLER', 'status', 0, 100, 20, werte('selbst', { ver: 2 }), 'Nichts kommt hier durch. Auch keine Luft.');
attacke('Schuttlawine', 'KELLER', 'physisch', 90, 85, 15, zucken(0.15), 'Alles, was im Keller stand, kommt mit.');
attacke('Kellertreppe', 'KELLER', 'physisch', 70, 95, 20, werte('gegner', { ver: -1 }, 0.2), 'Vierzehn Stufen, kein Geländer.');
attacke('Muffige Luft', 'KELLER', 'status', 0, 90, 15, status('verkatert'), 'Seit 1994 nicht mehr gelüftet.');
attacke('Heizungsrohr', 'KELLER', 'physisch', 55, 100, 25, null, 'Was rumliegt, wird benutzt.');
attacke('Hausverbot', 'KELLER', 'status', 0, 85, 10, werte('gegner', { ang: -2 }), 'Ab heute kommt hier keiner mehr rein.');
attacke('Kellerbeben', 'KELLER', 'physisch', 115, 80, 5, rueckstoss(0.2), 'Die Statik war ohnehin nur ein Gerücht.');

// --- BASS -------------------------------------------------------------------
attacke('Druckgeber', 'BASS', 'spezial', 65, 100, 25, null, 'Der Druck sitzt genau in der Magengrube.');
attacke('Subbass Schub', 'BASS', 'spezial', 80, 95, 15, werte('gegner', { ver: -1 }, 0.2), 'Frequenzen, die man mehr fühlt als hört.');
attacke('Bassdrop', 'BASS', 'spezial', 100, 85, 10, zucken(0.2), 'Erst Stille, dann das.');
attacke('Reverse Bass', 'BASS', 'spezial', 70, 100, 20, werte('gegner', { ini: -1 }, 0.3), 'Rückwärts gezogen und trotzdem tödlich.');
attacke('Membranriss', 'BASS', 'physisch', 110, 80, 10, rueckstoss(0.25), 'Die Box überlebt das nicht. Der Gegner auch nicht.');
attacke('Wummern', 'BASS', 'spezial', 45, 100, 30, null, 'Ein tiefes, gleichmäßiges Wummern.');
attacke('Boxenschubser', 'BASS', 'physisch', 75, 95, 20, zucken(0.15), 'Schiebt Gegner und Boxen gleichzeitig weg.');
attacke('Anlage aufreißen', 'BASS', 'status', 0, 100, 15, werte('selbst', { spa: 2 }), 'Die Regler kennen nur eine Richtung.');
attacke('Tiefton Tsunami', 'BASS', 'spezial', 125, 75, 5, werte('selbst', { spa: -1 }), 'Eine Welle, die den ganzen Raum mitnimmt.');

// --- DONK -------------------------------------------------------------------
attacke('Donkschlag', 'DONK', 'physisch', 60, 100, 25, null, 'Das typische Plong direkt auf die Zwölf.');
attacke('Springfeder', 'DONK', 'physisch', 75, 95, 20, werte('selbst', { ini: 1 }, 0.3), 'Auf und ab, immer schneller.');
attacke('Hüpfburg', 'DONK', 'physisch', 50, 100, 25, doppelschlag(), 'Zweimal abgeprallt, zweimal getroffen.');
attacke('Pogo', 'DONK', 'physisch', 85, 90, 15, zucken(0.2), 'Senkrecht rauf, senkrecht drauf.');
attacke('Bounce', 'DONK', 'spezial', 70, 100, 20, werte('gegner', { spv: -1 }, 0.25), 'Federt einmal quer durch die Halle.');
attacke('Gummiwand', 'DONK', 'status', 0, 100, 20, werte('selbst', { ver: 1, ini: 1 }), 'Alles prallt einfach ab.');
attacke('Presslufthammer', 'DONK', 'physisch', 25, 90, 20, mehrfach(2, 5), 'Zwei bis fünf Schläge ohne Luftholen.');
attacke('Vollpfosten', 'DONK', 'physisch', 105, 85, 10, rueckstoss(0.2), 'Kopf voran, Fragen später.');

// --- VINYL ------------------------------------------------------------------
attacke('Scratch', 'VINYL', 'physisch', 55, 100, 30, null, 'Kurz, kratzig, effektiv.');
attacke('Plattenwurf', 'VINYL', 'physisch', 70, 95, 20, krit(), 'Zwölf Zoll, scharfe Kante.');
attacke('Crossfade', 'VINYL', 'status', 0, 100, 20, werte('gegner', { ang: -1, spa: -1 }), 'Blendet die Kraft des Gegners einfach weg.');
attacke('Beatmatch', 'VINYL', 'status', 0, 100, 15, werte('selbst', { gen: 1, ini: 1 }), 'Wer im Takt liegt, trifft auch besser.');
attacke('Nadelstich', 'VINYL', 'physisch', 40, 100, 30, status('verkatert', 0.25), 'Die Nadel geht tief in die Rille.', 1);
attacke('Rillenriss', 'VINYL', 'physisch', 90, 90, 15, null, 'Ein Riss quer über die ganze Platte.');
attacke('B-Seite', 'VINYL', 'spezial', 80, 95, 15, verwirren(0.2), 'Niemand weiß, was da drauf ist.');
attacke('Vinyl Vollbrett', 'VINYL', 'physisch', 115, 80, 5, rueckstoss(0.25), 'Das ganze Regal auf einmal.');
attacke('Staubwischen', 'VINYL', 'status', 0, 100, 10, heilung(0.5), 'Einmal sauber machen, alles läuft wieder.');

// --- Allgemeine Attacken (jedes Hardtekkmon kann sie erlernen) ---------------
attacke('Rempler', 'KICK', 'physisch', 40, 100, 35, null, 'Ein simpler Schubser.', 1);
attacke('Anschreien', 'SCHRANZ', 'status', 0, 100, 30, werte('gegner', { ang: -1 }), 'Laut genug, um jeden kleinlaut zu machen.');
attacke('Zappeln', 'RAVE', 'physisch', 35, 100, 35, null, 'Wildes Gezappel mit Zufallstreffern.', 2);
attacke('Augenringe', 'NEBEL', 'status', 0, 100, 20, werte('gegner', { gen: -1 }), 'Wer so aussieht, macht anderen Angst.');
attacke('Durchhalten', 'CHEMIE', 'status', 0, 100, 10, werte('selbst', { ver: 1, spv: 1 }), 'Zähne zusammenbeißen und weiter.');
attacke('Powernap', 'CHEMIE', 'status', 0, 100, 10, heilung(0.5), 'Zwanzig Minuten reichen völlig.');
attacke('Schulterstoß', 'DONK', 'physisch', 50, 100, 30, null, 'Kurzer Rempler mit der Schulter.', 1);
attacke('Kaltgetränk', 'CHEMIE', 'status', 0, 100, 10, heilung(0.35), 'Erfrischt und macht den Kopf frei.');

/**
 * Wenn gar nichts mehr geht: Diese Attacke steht in keinem Lernsatz und taucht
 * in keiner Auswahl auf – sie greift automatisch, sobald ein Hardtekkmon keine
 * Aktionspunkte mehr hat.
 */
export const LETZTE_KRAFT = {
  name: 'Letzte Kraft',
  typ: 'KICK',
  kategorie: 'physisch',
  staerke: 50,
  genauigkeit: 100,
  ap: Infinity,
  effekt: rueckstoss(0.25),
  text: 'Nichts mehr in der Kiste – es geht nur noch mit dem eigenen Körper.',
};

/**
 * Attacke nachschlagen.
 * @param {string} name
 */
export function findeAttacke(name) {
  return ATTACKEN[name] ?? null;
}

/** Alle Attacken eines Typs, nach Stärke sortiert (Statusattacken zuerst). */
export function attackenNachTyp(typ) {
  return Object.values(ATTACKEN)
    .filter((eintrag) => eintrag.typ === typ)
    .sort((a, b) => a.staerke - b.staerke);
}

/** Attacken, die jedes Hardtekkmon früh lernen kann. */
export const GRUNDATTACKEN = ['Rempler', 'Zappeln', 'Anschreien', 'Augenringe', 'Schulterstoß'];
