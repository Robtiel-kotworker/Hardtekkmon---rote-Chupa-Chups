// ============================================================================
// Klang
// ----------------------------------------------------------------------------
// Titelmelodie, Boxenstopp-Ruhepol und Siegesfanfare entstehen weiterhin zur
// Laufzeit über die Web-Audio-API: ein Schrittsequenzer, der aus der
// Spielschleife heraus mit Vorlauf plant (`audioSchritt`). Kernstück dieser
// synthetischen Stücke ist die typische Hardtekk-Kick: ein Sinuston mit steil
// fallender Tonhöhe, durch eine Verzerrerkurve gejagt.
//
// Stadt, Route, Gebäude, Kampf, Gig/Arena und Heilung laufen dagegen als
// fertig produzierte Audioschleifen aus public/audio/ (siehe DATEI_TRACKS).
// Die Dateien liegen als MP3 vor: Ogg/Vorbis spielt Safari und damit die
// iOS-Fassung (Capacitor) nicht ab, MP3 kann jeder Zielbrowser. Einzige
// Ausnahme ist die Heilmusik, die als unkomprimiertes WAV bleibt – ihr
// dichtes, verzerrtes Zaag-Geschrubbe ist das mit Abstand heikelste
// Material für einen verlustbehafteten Kodierer, und sie ist zugleich das
// kürzeste Stück, kostet als WAV also kaum etwas.
// Der Kampf-Track besteht aus vier Varianten, die im Shuffle durchlaufen
// (siehe ziehVariante) – dieselbe Beutel-Logik, die vorher die synthetischen
// Kampf-Taktvarianten gezogen hat.
// ============================================================================

const SCHRITTE_PRO_TAKT = 16;
const VORLAUF_S = 0.12;

/** @type {AudioContext|null} */
let ctx = null;
/** @type {GainNode|null} */
let summe = null;
/** @type {GainNode|null} */
let musikBus = null;
/**
 * Eigener Bus für Zusatzschleifen, die parallel zur Musik laufen – z. B. das
 * Quietschen im Fahrstuhl (siehe starteZusatzschleife). Unabhängig vom
 * Musikbus, damit ein Ducking der Musik (siehe spieleKlang) die Zusatzschleife
 * nicht mit runterzieht.
 * @type {GainNode|null}
 */
let zusatzBus = null;
/** @type {GainNode|null} */
let kickBus = null;
let verzerrer = null;
/** @type {GainNode|null} Vorpegel in die harte Gabber-Kennlinie. */
let gabberEingang = null;

let an = true;
let laufenderTrack = '';
let naechsterSchrittZeit = 0;
let schrittZaehler = 0;

// Shuffle-Beutel für Audiodateien mit mehreren Varianten (siehe
// DATEI_TRACKS.kampf): Fisher-Yates-Ziehung ohne Zurücklegen, Beutel wird bei
// Erschöpfung neu gefüllt. Das garantiert, dass innerhalb eines Durchlaufs
// jede Variante genau einmal drankommt, bevor sich eine wiederholt –
// "richtiger" Shuffle statt reinem Zufall, der dieselbe Variante auch
// zweimal hintereinander hätte ziehen können.
let varianteBeutel = [];
let varianteLetzte = -1;

function ziehVariante(anzahl) {
  if (varianteBeutel.length === 0) {
    const stapel = Array.from({ length: anzahl }, (_, i) => i);
    for (let i = stapel.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [stapel[i], stapel[j]] = [stapel[j], stapel[i]];
    }
    // Verhindert, dass die zuletzt gespielte Variante direkt wieder als
    // erste des neuen Durchlaufs gezogen wird.
    if (stapel.length > 1 && stapel[0] === varianteLetzte) {
      [stapel[0], stapel[1]] = [stapel[1], stapel[0]];
    }
    varianteBeutel = stapel;
  }
  varianteLetzte = varianteBeutel.shift();
  return varianteLetzte;
}

/** Halbtonabstand zu A4 -> Frequenz. */
function hz(halbtoene) {
  return 440 * 2 ** (halbtoene / 12);
}

/**
 * Notennamen wie "a2", "cis3" werden bewusst nicht unterstützt – die Stücke
 * stehen als Halbtonabstände in der Tabelle, das hält den Sequenzer klein.
 * `null` bedeutet Pause.
 *
 * Zweite Fassung, näher an klassischen Pokémon-Melodien orientiert: kurze,
 * wiederkehrende Hooks statt frei springender Läufe und eine überschaubare
 * Hi-Hat-Spur. Der harte Verzerrer sitzt ausschließlich auf dem kickBus
 * (siehe starteAudio) – Bass und Lead bleiben klar.
 *
 * Zusätzliche Felder je Stück:
 *   `kickStaerke` – Vorpegel der Kick VOR dem Verzerrer. Werte über 1 fahren
 *                   die Kick tiefer in die Kennlinie und machen sie damit
 *                   nicht nur lauter, sondern hörbar dreckiger; Werte unter 1
 *                   halten sie drinnen-tauglich rund.
 *
 * Boxenstopp und Sieg sind die einzigen noch synthetisch erzeugten Stücke –
 * Titel-, Orts- und Kampfmusik laufen als Audiodateien (siehe DATEI_TRACKS
 * unten).
 */
const TRACKS = {
  // --- Boxenstopp (Heilungscenter, außerhalb der Heilsequenz) ---------------
  // Bleibt der Ruhepol, ist aber nicht mehr so karg: durchgehender halber
  // Puls, weiche Kick und eine vollständig ausgespielte, tröstliche Linie.
  boxenstopp: {
    bpm: 120,
    kickStaerke: 0.7,
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass: [-24, null, null, null, -17, null, null, null, -22, null, null, null, -19, null, null, null],
    lead: [7, null, 11, null, 12, null, 11, null, 9, null, 7, null, 4, null, null, null],
  },
  sieg: {
    bpm: 144,
    kick: [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0],
    bass: [-24, null, -24, null, -17, null, -17, null, -19, null, -19, null, -12, null, null, null],
    // Klare Dreiklangs-Fanfare nach oben – triumphierend statt hektisch.
    lead: [12, 16, 19, null, 12, 16, 19, null, 21, 19, 16, 12, null, null, null, null],
  },
};

/**
 * Eckdaten der Heilmusik in Sekunden. Beide Werte stehen fest verdrahtet
 * hier, weil scenes/welt.js die Bildlängen der Heilsequenz schon beim Laden
 * des Moduls braucht – lange bevor die Datei dekodiert ist.
 *
 * Das Stück läuft mit ffmpegs atempo=2.0 auf doppeltes Tempo gestreckt (WSOLA
 * time-stretch, keine Neuabtastung – die Tonhöhe bleibt exakt wie im
 * Original, gegengeprüft an der Kick-Grundfrequenz vor und nach dem
 * Stretchen: 40,0 Hz auf beiden Seiten). atempo=2.0 halbiert nicht ganz
 * exakt jeden Zeitpunkt (WSOLA arbeitet in Fenstern), deshalb sind beide
 * Werte am gestreckten Ergebnis neu gemessen statt aus dem Original
 * halbiert:
 *
 *   DAUER – Gesamtlänge, 220160 Frames bei 44100 Hz (statt 441216 im
 *           Original – nicht exakt halbiert, weil atempo in Fenstern
 *           arbeitet, aber auf 1 ms genau).
 *   KICK  – Zeitpunkt, an dem die Kick einsetzt: 129764 Frames (statt
 *           259117 im Original, also 4,7 ms von der reinen Halbierung
 *           entfernt). Das Tiefband (25-140 Hz) liegt davor bei rund
 *           -30 dBFS, danach springt es binnen 100 ms auf -2,5 dBFS – exakt
 *           dasselbe Muster wie im Original, nur mit halber Dauer.
 */
const HEILUNG_DATEI_DAUER_S = 220160 / 44100;
const HEILUNG_KICK_S = 129764 / 44100;

/**
 * Orts- und Kampfmusik als fertig produzierte Audioschleifen statt
 * synthetisierter Muster. Jeder Eintrag benennt seine Datei(en) unter
 * public/audio/; `kampf` trägt vier Varianten, die im Shuffle laufen (siehe
 * ziehVariante). `schlagDauer` ist nur für Stücke gesetzt, deren Länge eine
 * Animation takten muss (siehe schlagDauer() unten und HEIL_TICKS in
 * scenes/welt.js) – bei einer festen Audiodatei gibt es kein bpm mehr, aus
 * dem sich das ableiten ließe.
 */
const DATEI_TRACKS = {
  /**
   * Titelmusik. Die Werte sind am Stück gemessen (siehe unten) und treiben
   * die Beat-Synchronität des Titelbilds in scenes/titel.js:
   *
   *   schlagDauer – ein Viertel. Das Stück läuft auf exakt 168 BPM: bei
   *                 110,000 s Länge sind das genau 308 Viertel bzw. 77 Takte,
   *                 und ein Kammfilter über die Tiefband-Hüllkurve zeigt bei
   *                 168 BPM einen um den Faktor 4 höheren Ausschlag als bei
   *                 allen Nachbartempi.
   *   phase       – Versatz des Viertelrasters gegenüber dem Dateianfang.
   *                 Auf diesen Punkten liegt gut das Doppelte der mittleren
   *                 Tiefbandenergie, das Raster sitzt also auf der Kick.
   *   vorlauf     – der erste Drop bei 4,999 s. Davor baut das Stück über
   *                 zwei Riser auf (dazwischen ein kurzer Einschub bei
   *                 3,95-4,32 s); ab hier läuft es dann durch.
   */
  titel: {
    dateien: ['audio/titel.mp3'],
    schlagDauer: 60 / 168,
    phase: 0.131,
    vorlauf: 4.999,
  },
  welt: { dateien: ['audio/stadt.mp3'] },
  route: { dateien: ['audio/route.mp3'] },
  gebaeude: { dateien: ['audio/gebaeude.mp3'] },
  // Arena-Track: Musik der Gig-Hallen und zugleich Kampfmusik aller
  // Trainer- und Gig-Kämpfe (siehe KAMPFMUSIK in scenes/kampfszene.js).
  gig: { dateien: ['audio/arena.mp3'] },
  // Bleibt als WAV unkomprimiert, siehe Kopf der Datei. `vorlauf` ist das
  // Intro bis zum Kick-Einsatz, `schlagDauer` teilt den Rest danach in die
  // sechs Takes der Heilsequenz – Intro plus sechs Takes ergeben damit
  // genau die Gesamtlänge des Stücks.
  heilung: {
    dateien: ['audio/heilung.wav'],
    vorlauf: HEILUNG_KICK_S,
    schlagDauer: (HEILUNG_DATEI_DAUER_S - HEILUNG_KICK_S) / 6,
  },
  // Normaler Kampftrack: ausschließlich Kämpfe gegen wilde Hardtekkmon.
  kampf: {
    dateien: ['audio/kampf_v1.mp3', 'audio/kampf_v2.mp3', 'audio/kampf_v3.mp3', 'audio/kampf_v4.mp3'],
  },
  // Nur im Casinosaal unten (siehe data/world/casino.js) – Bruchbude und
  // Treppenschacht darüber laufen weiterhin unter 'gebaeude'.
  casino: { dateien: ['audio/casino.mp3'] },
  // Nur im Klonlabor unter dem Boxenstopp (siehe data/world/klonlabor.js) –
  // Tastenfeld und Fahrstuhl darüber laufen weiterhin unter 'gebaeude'.
  klonlabor: { dateien: ['audio/labor.mp3'] },
  // Läuft nur, solange der Professor seine Erklärung als Film abspielt
  // (siehe scenes/laborfilm.js). Danach übernimmt wieder 'klonlabor'.
  laborfilm: { dateien: ['audio/labor_animation.mp3'] },
  // Nur während der Fahrstuhlfahrt (siehe scenes/fahrstuhl.js) – exakt auf
  // die 172 Bilder (172/60 s) der Fahrt gekürzt, läuft also einmal glatt
  // durch, statt mitten in der Animation abgeschnitten zu werden.
  fahrstuhl: { dateien: ['audio/fahrstuhl.mp3'] },
  // Kämpfe gegen die Helene-Fischer-Ultras (siehe trainer.musik in
  // data/trainer.js und KAMPFMUSIK in scenes/kampfszene.js): vier Varianten
  // im selben Shuffle-Verfahren wie der normale Kampftrack.
  ultrakampf: {
    dateien: [
      'audio/ultrakampf_v1.mp3', 'audio/ultrakampf_v2.mp3',
      'audio/ultrakampf_v3.mp3', 'audio/ultrakampf_v4.mp3',
    ],
  },
  // Nur für Helene Fischer selbst.
  ultrakampfHelene: { dateien: ['audio/ultrakampf_helene.mp3'] },
};

/**
 * Zusatzschleifen laufen parallel ZUR laufenden Musik, statt sie abzulösen –
 * anders als die Stücke oben, von denen immer nur eines gleichzeitig spielt.
 * Bisher gibt es genau eine: das Quietschen im Fahrstuhl, das über der
 * Fahrstuhlmusik liegt (siehe starteZusatzschleife unten und betreten() in
 * scenes/fahrstuhl.js).
 */
const ZUSATZSCHLEIFEN = {
  quietsch: { datei: 'audio/quietsch.mp3' },
};

/**
 * Einmalige Klänge aus einer Datei. Anders als die Stücke in DATEI_TRACKS
 * laufen sie nicht in Schleife und lösen die Musik auch nicht ab: Sie legen
 * sich einmal obendrauf und sind danach vorbei (siehe spieleKlang).
 *
 * `dauer` steht fest verdrahtet hier, weil Szenen die Länge schon beim Laden
 * des Moduls brauchen – lange bevor die Datei dekodiert ist (siehe
 * FEUERWERK_BILDER in scenes/welt.js). Der Wert ist an der Datei gemessen:
 * 135659 Frames bei 44100 Hz.
 *
 * Die Datei bleibt wie die Heilmusik unkomprimiert (siehe Kopf der Datei).
 * Sie ist mit gut drei Sekunden extrem kurz und kostet als WAV deshalb kaum
 * etwas – und eine Kick, die über die volle Länge an der Aussteuerungsgrenze
 * klebt (Spitzenpegel 0 dBFS, Mittelwert durchgehend rund -3 dBFS), ist genau
 * das Material, bei dem ein verlustbehafteter Kodierer als Erstes hörbar wird.
 */
const KLANG_DATEIEN = {
  belohnung: { datei: 'audio/belohnungskick.wav', dauer: 135659 / 44100 },
};

/** Wie weit die Musik unter einem einmaligen Klang abgesenkt wird. */
const DUCK_PEGEL = 0.25;
const MUSIK_PEGEL = 0.8;
/** Lautstärke der Zusatzschleifen – etwas leiser als die Musik, damit sie als Extra obendrauf liegen statt sie zu übertönen. */
const ZUSATZ_PEGEL = 0.55;

/** @type {Object<string, AudioBuffer[]>} Dekodierte Puffer je Track, nach dem Laden. */
const dateiPuffer = {};
/** @type {Object<string, AudioBuffer>} Dekodierte Puffer der einmaligen Klänge. */
const klangPuffer = {};
/** @type {Object<string, AudioBuffer>} Dekodierte Puffer der Zusatzschleifen. */
const zusatzPuffer = {};
/** @type {AudioBufferSourceNode|null} Gerade laufende Audiodatei. */
let dateiQuelle = null;
/** @type {AudioBufferSourceNode|null} Gerade laufende Zusatzschleife. */
let zusatzQuelle = null;
/** Welche Zusatzschleife zuletzt angefordert wurde – für das Nachstarten, falls die Datei beim Anfordern noch nicht geladen war. */
let gewuenschteZusatzschleife = '';
/**
 * Uhrzeit des Audiokontexts, zu der die laufende Datei angefangen hat, und
 * ihre Länge. Daraus liest trackZeit() die Abspielposition – die Grundlage
 * für alles, was sich im Bild nach der Musik richten soll (siehe
 * Beat-Synchronität des Titelbilds in scenes/titel.js).
 */
let dateiStartZeit = 0;
let dateiLaenge = 0;

/** Lädt und dekodiert eine Audiodatei zu einem fertigen Puffer. */
async function ladePuffer(pfad) {
  const antwort = await fetch(pfad);
  const rohdaten = await antwort.arrayBuffer();
  return ctx.decodeAudioData(rohdaten);
}

/** Lädt und dekodiert alle Audiodateien einmalig im Hintergrund. */
async function ladeDateien() {
  if (!ctx) return;
  await Promise.all([
    ...Object.entries(DATEI_TRACKS).map(async ([name, eintrag]) => {
      dateiPuffer[name] = await Promise.all(eintrag.dateien.map(ladePuffer));
    }),
    ...Object.entries(KLANG_DATEIEN).map(async ([name, eintrag]) => {
      klangPuffer[name] = await ladePuffer(eintrag.datei);
    }),
    ...Object.entries(ZUSATZSCHLEIFEN).map(async ([name, eintrag]) => {
      zusatzPuffer[name] = await ladePuffer(eintrag.datei);
    }),
  ]);
  // Wurde währenddessen schon ein Datei-Track bzw. eine Zusatzschleife
  // angefordert, jetzt nachstarten.
  if (DATEI_TRACKS[laufenderTrack] && !dateiQuelle) starteDateiTrack(laufenderTrack);
  if (ZUSATZSCHLEIFEN[gewuenschteZusatzschleife] && !zusatzQuelle) {
    starteZusatzschleife(gewuenschteZusatzschleife);
  }
}

function stoppeDateiQuelle() {
  if (!dateiQuelle) return;
  dateiQuelle.onended = null;
  try {
    dateiQuelle.stop();
  } catch {
    // Bereits beendet – kann beim Stoppen kurz nach dem natürlichen Ende passieren.
  }
  dateiQuelle = null;
}

/** Einzelne Datei in Dauerschleife (Titel, Stadt, Route, Gebäude, Gig, Heilung). */
function starteEinzelschleife(name) {
  const puffer = dateiPuffer[name]?.[0];
  if (!ctx || !musikBus || !puffer) return;
  const quelle = ctx.createBufferSource();
  quelle.buffer = puffer;
  quelle.loop = true;
  quelle.connect(musikBus);
  quelle.start();
  dateiQuelle = quelle;
  dateiStartZeit = ctx.currentTime;
  dateiLaenge = puffer.duration;
}

/**
 * Track mit mehreren Varianten (Kampf, Ultra-Kampf): eine wird gezogen,
 * abgespielt, und beim natürlichen Ende (kein loop) sofort die nächste
 * gezogene Variante angeschlossen – so entsteht der lange, im Shuffle
 * laufende Loop.
 */
function starteVariantenSchleife(name) {
  const liste = dateiPuffer[name];
  if (!ctx || !musikBus || !liste || liste.length === 0) return;
  const index = ziehVariante(liste.length);
  const quelle = ctx.createBufferSource();
  quelle.buffer = liste[index];
  quelle.connect(musikBus);
  quelle.onended = () => {
    // Nur weiterziehen, wenn wir noch im selben Track sind und nicht durch
    // ein manuelles stop() (Trackwechsel) hierher kommen.
    if (laufenderTrack === name && dateiQuelle === quelle) starteVariantenSchleife(name);
  };
  quelle.start();
  dateiQuelle = quelle;
}

function starteDateiTrack(name) {
  stoppeDateiQuelle();
  if (dateiPuffer[name]?.length > 1) starteVariantenSchleife(name);
  else starteEinzelschleife(name);
}

function verzerrerKurve(staerke) {
  const punkte = 1024;
  const kurve = new Float32Array(punkte);
  for (let i = 0; i < punkte; i += 1) {
    const x = (i * 2) / punkte - 1;
    kurve[i] = ((1 + staerke) * x) / (1 + staerke * Math.abs(x));
  }
  return kurve;
}

/**
 * Baut den Audiograph. Muss aus einer Nutzereingabe heraus laufen, sonst
 * bleibt der Kontext in vielen Browsern angehalten.
 */
export function starteAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }

  const Kontext = window.AudioContext ?? window.webkitAudioContext;
  if (!Kontext) return;

  ctx = new Kontext();
  summe = ctx.createGain();
  summe.gain.value = an ? 0.5 : 0;

  // Nur die Kick läuft durch den harten Verzerrer – das gibt ihr den
  // typischen Hardtekk-Punch. Liefen früher Hi-Hat, Bass und Lead mit durch
  // denselben Verzerrer, machte das die ganze Musik unangenehm scharf.
  verzerrer = ctx.createWaveShaper();
  verzerrer.curve = verzerrerKurve(7);
  verzerrer.oversample = '2x';

  kickBus = ctx.createGain();
  kickBus.gain.value = 0.85;
  kickBus.connect(verzerrer);
  verzerrer.connect(summe);

  // Zweite, deutlich härtere Kennlinie nur für die Gabber-Kick. Der hohe
  // Vorpegel fährt das Signal absichtlich weit über die Aussteuerung, sodass
  // aus dem Sinus eine geclippte, obertonreiche Rechteckwelle wird – genau
  // der übersteuerte 909-Klang, aus dem das Genre gebaut ist.
  const gabberVerzerrer = ctx.createWaveShaper();
  gabberVerzerrer.curve = verzerrerKurve(60);
  gabberVerzerrer.oversample = '4x';

  const gabberAusgang = ctx.createGain();
  gabberAusgang.gain.value = 0.28;

  gabberEingang = ctx.createGain();
  gabberEingang.gain.value = 5;
  gabberEingang.connect(gabberVerzerrer);
  gabberVerzerrer.connect(gabberAusgang);
  gabberAusgang.connect(summe);

  musikBus = ctx.createGain();
  musikBus.gain.value = MUSIK_PEGEL;
  musikBus.connect(summe);

  zusatzBus = ctx.createGain();
  zusatzBus.gain.value = ZUSATZ_PEGEL;
  zusatzBus.connect(summe);

  summe.connect(ctx.destination);

  naechsterSchrittZeit = ctx.currentTime;
  schrittZaehler = 0;

  ladeDateien();
}

/** @returns {boolean} neuer Zustand */
export function tonUmschalten() {
  an = !an;
  if (summe && ctx) {
    summe.gain.setTargetAtTime(an ? 0.5 : 0, ctx.currentTime, 0.05);
  }
  return an;
}

export function tonIstAn() {
  return an;
}

/**
 * @param {keyof typeof TRACKS | keyof typeof DATEI_TRACKS | ''} name Leerer Name schaltet die Musik ab.
 */
export function spieleTrack(name) {
  if (name === laufenderTrack) return;
  laufenderTrack = name;
  schrittZaehler = 0;
  varianteBeutel = [];
  if (ctx) naechsterSchrittZeit = ctx.currentTime;

  if (DATEI_TRACKS[name]) {
    // Puffer evtl. noch nicht geladen – ladeDateien() startet dann selbst nach.
    if (dateiPuffer[name]) starteDateiTrack(name);
    else stoppeDateiQuelle();
  } else {
    stoppeDateiQuelle();
  }
}

export function aktuellerTrack() {
  return laufenderTrack;
}

/** Stoppt nur die laufende Tonquelle, ohne die gewünschte Schleife zu vergessen. */
function stoppeZusatzQuelle() {
  if (!zusatzQuelle) return;
  try {
    zusatzQuelle.stop();
  } catch {
    // Bereits beendet.
  }
  zusatzQuelle = null;
}

/**
 * Startet eine Zusatzschleife parallel zur laufenden Musik – beide laufen
 * gleichzeitig, keine löst die andere ab (siehe ZUSATZSCHLEIFEN und
 * scenes/fahrstuhl.js). Läuft schon eine, wird sie zuerst gestoppt.
 * @param {keyof typeof ZUSATZSCHLEIFEN} name
 */
export function starteZusatzschleife(name) {
  gewuenschteZusatzschleife = name;
  stoppeZusatzQuelle();

  const puffer = zusatzPuffer[name];
  if (!ctx || !zusatzBus || !puffer) return; // Puffer evtl. noch nicht geladen – ladeDateien() startet dann selbst nach.

  const quelle = ctx.createBufferSource();
  quelle.buffer = puffer;
  quelle.loop = true;
  quelle.connect(zusatzBus);
  quelle.start();
  zusatzQuelle = quelle;
}

/** Beendet die laufende Zusatzschleife, falls eine läuft. */
export function stoppeZusatzschleife() {
  gewuenschteZusatzschleife = '';
  stoppeZusatzQuelle();
}

/**
 * Länge eines Viertelschlags eines Stücks in Sekunden. Damit können
 * Animationen im Gleichtakt mit der Musik laufen, ohne dass die Szene das
 * Tempo doppelt hinschreiben muss (siehe Heilsequenz in scenes/welt.js).
 * @param {keyof typeof TRACKS | keyof typeof DATEI_TRACKS} name
 */
export function schlagDauer(name) {
  const datei = DATEI_TRACKS[name];
  if (datei?.schlagDauer) return datei.schlagDauer;
  const track = TRACKS[name];
  return track ? 60 / track.bpm : 0.5;
}

/**
 * Vorlauf eines Stücks in Sekunden: die Zeit vom Start bis zu dem Moment, an
 * dem es richtig losgeht – bei der Heilmusik der Einsatz der Kick. Szenen
 * können ihre Animation damit auf diesen Punkt legen, statt sofort loszulaufen
 * (siehe Heilsequenz in scenes/welt.js). Stücke ohne Intro liefern 0.
 * @param {keyof typeof TRACKS | keyof typeof DATEI_TRACKS} name
 */
export function vorlauf(name) {
  return DATEI_TRACKS[name]?.vorlauf ?? 0;
}

/**
 * Versatz des Viertelrasters gegenüber dem Dateianfang in Sekunden. Die
 * Schläge eines Stücks liegen bei beatPhase + n * schlagDauer.
 * @param {keyof typeof DATEI_TRACKS} name
 */
export function beatPhase(name) {
  return DATEI_TRACKS[name]?.phase ?? 0;
}

/**
 * Abspielposition des laufenden Datei-Tracks in Sekunden, auf die Länge des
 * Stücks umgebrochen (die Dateien laufen in Dauerschleife). Damit lassen sich
 * Animationen an der Musik ausrichten, statt am Bildzähler zu hängen – der
 * driftet gegenüber der Audio-Uhr weg, sobald ein Bild ausfällt.
 *
 * Liefert null, solange keine Datei läuft: vor der ersten Eingabe gibt es
 * noch keinen Audiokontext, und die synthetischen Stücke (Boxenstopp, Sieg)
 * haben keine Datei. Aufrufer müssen diesen Fall abfangen.
 * @returns {number|null}
 */
export function trackZeit() {
  if (!ctx || !dateiQuelle || dateiLaenge <= 0) return null;
  const seit = ctx.currentTime - dateiStartZeit;
  if (seit < 0) return 0;
  return seit % dateiLaenge;
}

/** Kick: kurzer Sinus mit fallender Tonhöhe, danach in den Verzerrer. */
function kick(zeit, staerke = 1) {
  if (!ctx || !kickBus) return;
  const oszillator = ctx.createOscillator();
  const huellkurve = ctx.createGain();

  oszillator.type = 'sine';
  oszillator.frequency.setValueAtTime(220, zeit);
  oszillator.frequency.exponentialRampToValueAtTime(38, zeit + 0.11);

  huellkurve.gain.setValueAtTime(0.0001, zeit);
  huellkurve.gain.exponentialRampToValueAtTime(0.95 * staerke, zeit + 0.004);
  huellkurve.gain.exponentialRampToValueAtTime(0.0001, zeit + 0.26);

  oszillator.connect(huellkurve);
  huellkurve.connect(kickBus);
  oszillator.start(zeit);
  oszillator.stop(zeit + 0.3);
}

/**
 * Gabber-Kick: das Herzstück von Gabber und Uptempo-Hardcore und etwas ganz
 * anderes als die kurze Techno-Kick oben. Die Tonhöhe fällt steil ab und
 * bleibt dann auf einem Grundton stehen, statt ins Nichts zu rutschen – die
 * Kick wird dadurch lang gezogen und tonal und trägt zugleich den Bass. Beim
 * Weg durch die harte Kennlinie wird aus dem Sinus praktisch eine geclippte
 * Rechteckwelle mit kräftigen Obertönen.
 *
 * Genau diese Übersteuerung frisst aber die tiefen Anteile auf. Deshalb läuft
 * parallel eine unverzerrte Sinusspur auf demselben Grundton mit: Der
 * verzerrte Teil liefert den Biss, der saubere den Druck im Keller.
 *
 * @param {number} grundton Halbtonabstand zu A4; -36 entspricht A1 (55 Hz).
 */
function gabberKick(zeit, grundton = -36, dauer = 0.38) {
  if (!ctx || !gabberEingang || !summe) return;
  const ziel = hz(grundton);

  const verzerrt = ctx.createOscillator();
  const huellkurve = ctx.createGain();
  verzerrt.type = 'sine';
  verzerrt.frequency.setValueAtTime(ziel * 7, zeit);
  verzerrt.frequency.exponentialRampToValueAtTime(ziel, zeit + 0.055);
  huellkurve.gain.setValueAtTime(0.0001, zeit);
  huellkurve.gain.exponentialRampToValueAtTime(1, zeit + 0.004);
  huellkurve.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);
  verzerrt.connect(huellkurve);
  huellkurve.connect(gabberEingang);
  verzerrt.start(zeit);
  verzerrt.stop(zeit + dauer + 0.02);

  const sub = ctx.createOscillator();
  const subHuelle = ctx.createGain();
  sub.type = 'sine';
  sub.frequency.setValueAtTime(ziel * 3, zeit);
  sub.frequency.exponentialRampToValueAtTime(ziel, zeit + 0.05);
  subHuelle.gain.setValueAtTime(0.0001, zeit);
  subHuelle.gain.exponentialRampToValueAtTime(0.45, zeit + 0.006);
  subHuelle.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer * 0.9);
  sub.connect(subHuelle);
  subHuelle.connect(summe);
  sub.start(zeit);
  sub.stop(zeit + dauer + 0.02);
}

/**
 * Zaag: der Sägezahn-Screech des Hardtekk. Zwei leicht gegeneinander
 * verstimmte Sägezähne durch ein resonantes Tiefpassfilter, dessen Eckfrequenz
 * über die Tondauer nach unten fährt – und dann durch denselben Verzerrer wie
 * die Kick. Genau diese Kette ergibt das typische "Geschrubbe".
 */
function zaag(zeit, halbtoene, dauer, lautstaerke = 0.09) {
  if (!ctx || !kickBus) return;
  const grund = hz(halbtoene);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 9;
  filter.frequency.setValueAtTime(4200, zeit);
  filter.frequency.exponentialRampToValueAtTime(650, zeit + dauer);

  const huellkurve = ctx.createGain();
  huellkurve.gain.setValueAtTime(0.0001, zeit);
  huellkurve.gain.exponentialRampToValueAtTime(lautstaerke, zeit + 0.006);
  huellkurve.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);

  filter.connect(huellkurve);
  huellkurve.connect(kickBus);

  // Zwei Stimmen mit minimalem Versatz – das Schweben macht den Screech breit.
  for (const versatz of [1, 1.008]) {
    const oszillator = ctx.createOscillator();
    oszillator.type = 'sawtooth';
    oszillator.frequency.setValueAtTime(grund * versatz, zeit);
    oszillator.connect(filter);
    oszillator.start(zeit);
    oszillator.stop(zeit + dauer + 0.02);
  }
}

function rauschQuelle(dauer) {
  if (!ctx) return null;
  const laenge = Math.max(1, Math.floor(ctx.sampleRate * dauer));
  const puffer = ctx.createBuffer(1, laenge, ctx.sampleRate);
  const daten = puffer.getChannelData(0);
  for (let i = 0; i < laenge; i += 1) daten[i] = Math.random() * 2 - 1;
  const quelle = ctx.createBufferSource();
  quelle.buffer = puffer;
  return quelle;
}

function hihat(zeit) {
  if (!ctx || !musikBus) return;
  const quelle = rauschQuelle(0.05);
  if (!quelle) return;

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;

  const huellkurve = ctx.createGain();
  huellkurve.gain.setValueAtTime(0.11, zeit);
  huellkurve.gain.exponentialRampToValueAtTime(0.0001, zeit + 0.045);

  quelle.connect(filter);
  filter.connect(huellkurve);
  huellkurve.connect(musikBus);
  quelle.start(zeit);
  quelle.stop(zeit + 0.06);
}

function ton(zeit, halbtoene, dauer, form, lautstaerke) {
  if (!ctx || !musikBus) return;
  const oszillator = ctx.createOscillator();
  const huellkurve = ctx.createGain();

  oszillator.type = form;
  oszillator.frequency.setValueAtTime(hz(halbtoene), zeit);

  huellkurve.gain.setValueAtTime(0.0001, zeit);
  huellkurve.gain.exponentialRampToValueAtTime(lautstaerke, zeit + 0.008);
  huellkurve.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer);

  oszillator.connect(huellkurve);
  huellkurve.connect(musikBus);
  oszillator.start(zeit);
  oszillator.stop(zeit + dauer + 0.02);
}

/**
 * Plant alle Schritte, die innerhalb des Vorlauffensters liegen. Aus der
 * Spielschleife aufzurufen.
 */
export function audioSchritt() {
  if (!ctx || !laufenderTrack) return;
  const track = TRACKS[laufenderTrack];
  if (!track) return;

  const schrittDauer = 60 / track.bpm / 4;
  if (naechsterSchrittZeit < ctx.currentTime) naechsterSchrittZeit = ctx.currentTime;

  while (naechsterSchrittZeit < ctx.currentTime + VORLAUF_S) {
    const i = schrittZaehler % SCHRITTE_PRO_TAKT;
    const zeit = naechsterSchrittZeit;

    if (track.kick[i]) {
      if (track.gabber) gabberKick(zeit, track.grundton ?? -36, track.kickDauer ?? 0.38);
      else kick(zeit, track.kickStaerke ?? 1);
    }
    if (track.hat[i]) hihat(zeit);
    if (track.bass[i] !== null) ton(zeit, track.bass[i], schrittDauer * 1.6, 'square', 0.12);
    if (track.lead[i] !== null) ton(zeit, track.lead[i], schrittDauer * 0.9, 'sawtooth', 0.065);
    if (track.zaag && track.zaag[i] !== null) zaag(zeit, track.zaag[i], schrittDauer * 1.1);

    naechsterSchrittZeit += schrittDauer;
    schrittZaehler += 1;
  }
}

// ============================================================================
// Sequenzer (Proberaum-Minigame)
// ----------------------------------------------------------------------------
// Eigener kleiner Schrittsequenzer für das DJ-Pult im Proberaum (siehe
// scenes/sequenzer.js): drei Schlagzeug-Zeilen (Kick, Clap, HiHat) mit je drei
// wählbaren Klängen, eine Melodie-Zeile mit frei gesetzten Noten (Klavierrolle,
// siehe scenes/sequenzer.js) und beliebig viele aufgenommene Vocal-Samples mit
// eigenen Effekten. 8 Takte zu je 4 Schritten = 32 Schritte insgesamt. Läuft
// nach demselben Vorlaufprinzip wie audioSchritt() oben, aber komplett
// unabhängig davon – eigenes Tempo (einstellbar), eigener Zähler, eigene
// Klänge. Das Muster (welche Schritte an sind, welche Klänge gewählt, welche
// Zeile stummgeschaltet ist) gehört der Szene; hier drin steckt nur, WIE es
// klingt und WANN es dran ist.
// ============================================================================

/** 8 Takte zu je 4 Schritten – doppelt so viel Platz wie ein einzelner Durchlauf vorher. */
export const SEQUENZER_TAKTE = 8;
const SEQ_SCHRITTE_PRO_TAKT = 4;
export const SEQUENZER_SCHRITTE = SEQUENZER_TAKTE * SEQ_SCHRITTE_PRO_TAKT;

export const SEQUENZER_BPM_MIN = 90;
export const SEQUENZER_BPM_MAX = 220;
const SEQ_BPM_STANDARD = 170;

let seqAktiv = false;
let seqZaehler = 0;
let seqNaechsteZeit = 0;
let seqBpm = SEQ_BPM_STANDARD;

/** Weicherer, unverzerrter Kick – bleibt rund statt hart zu clippen. */
function subKick(zeit) {
  if (!ctx || !musikBus) return;
  const oszillator = ctx.createOscillator();
  const huellkurve = ctx.createGain();
  oszillator.type = 'sine';
  oszillator.frequency.setValueAtTime(140, zeit);
  oszillator.frequency.exponentialRampToValueAtTime(45, zeit + 0.16);
  huellkurve.gain.setValueAtTime(0.0001, zeit);
  huellkurve.gain.exponentialRampToValueAtTime(0.9, zeit + 0.006);
  huellkurve.gain.exponentialRampToValueAtTime(0.0001, zeit + 0.34);
  oszillator.connect(huellkurve);
  huellkurve.connect(musikBus);
  oszillator.start(zeit);
  oszillator.stop(zeit + 0.36);
}

/**
 * Klatscher: mehrere kurze, bandpassgefilterte Rauschstöße dicht
 * hintereinander – genau das Stottern, das einen Clap von einem einzelnen
 * Rauschstoß (Snare, HiHat) unterscheidet.
 */
function klatscher(zeit, mitte, guete, versaetze, lautstaerke) {
  if (!ctx || !musikBus) return;
  for (const versatz of versaetze) {
    const quelle = rauschQuelle(0.09);
    if (!quelle) continue;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = mitte;
    filter.Q.value = guete;
    const huellkurve = ctx.createGain();
    const t = zeit + versatz;
    huellkurve.gain.setValueAtTime(0.0001, t);
    huellkurve.gain.exponentialRampToValueAtTime(lautstaerke, t + 0.004);
    huellkurve.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    quelle.connect(filter);
    filter.connect(huellkurve);
    huellkurve.connect(musikBus);
    quelle.start(t);
    quelle.stop(t + 0.1);
  }
}

/** Parametrisierte HiHat – dieselbe Kette wie hihat() oben, nur einstellbar. */
function hatKlang(zeit, dauer, grenzfrequenz, lautstaerke) {
  if (!ctx || !musikBus) return;
  const quelle = rauschQuelle(dauer);
  if (!quelle) return;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = grenzfrequenz;
  const huellkurve = ctx.createGain();
  huellkurve.gain.setValueAtTime(lautstaerke, zeit);
  huellkurve.gain.exponentialRampToValueAtTime(0.0001, zeit + dauer - 0.005);
  quelle.connect(filter);
  filter.connect(huellkurve);
  huellkurve.connect(musikBus);
  quelle.start(zeit);
  quelle.stop(zeit + dauer + 0.01);
}

const KICK_VARIANTEN = [
  (zeit) => kick(zeit, 1),
  (zeit) => subKick(zeit),
  (zeit) => gabberKick(zeit),
];
const CLAP_VARIANTEN = [
  (zeit) => klatscher(zeit, 1500, 3, [0, 0.012, 0.024], 0.22),
  (zeit) => klatscher(zeit, 2600, 5, [0], 0.24),
  (zeit) => klatscher(zeit, 900, 1.5, [0, 0.015, 0.03, 0.045], 0.2),
];
const HIHAT_VARIANTEN = [
  (zeit) => hatKlang(zeit, 0.05, 7000, 0.11),
  (zeit) => hatKlang(zeit, 0.22, 5500, 0.09),
  (zeit) => hatKlang(zeit, 0.035, 9500, 0.13),
];
const SCHLAGZEUG_KLAENGE = [KICK_VARIANTEN, CLAP_VARIANTEN, HIHAT_VARIANTEN];

/**
 * Die drei Schlagzeug-Zeilen des Sequenzers, in fester Reihenfolge. Jede
 * trägt ihre Anzeigefarbe und die Namen ihrer drei wählbaren Klänge –
 * scenes/sequenzer.js braucht nichts davon selbst zu kennen. Die Melodie-Zeile
 * ist separat (eigene Klavierrolle statt Klangvarianten, siehe
 * MELODIE_FARBE/sequenzerMelodieKlang), Vocal-Samples kommen zur Laufzeit dazu
 * (siehe sequenzerSampleRegistrieren).
 */
export const SEQUENZER_REIHEN = [
  { kurz: 'KICK', varianten: ['Kick', 'Sub', 'Gabber'], farbe: '#e0483c' },
  { kurz: 'CLAP', varianten: ['Clap', 'Snap', 'Breitband'], farbe: '#e8c860' },
  { kurz: 'HAT', varianten: ['Hat', 'Open Hat', 'Zisch'], farbe: '#58d0e0' },
];
export const MELODIE_FARBE = '#58c868';
export const SAMPLE_FARBE = '#c860e0';

/** Startet die Wiedergabe wieder bei Schritt 0 – für einen sauberen Einstieg. */
export function sequenzerStarten() {
  seqAktiv = true;
  seqZaehler = 0;
  if (ctx) seqNaechsteZeit = ctx.currentTime;
}

export function sequenzerStoppen() {
  seqAktiv = false;
}

export function sequenzerLaeuft() {
  return seqAktiv;
}

/** Aktuelles Tempo in BPM. */
export function sequenzerBpm() {
  return seqBpm;
}

/**
 * Setzt das Tempo, geklemmt auf einen sinnvollen Bereich. Wirkt sofort auf den
 * nächsten noch nicht verplanten Schritt – ein Wechsel mitten in der
 * Wiedergabe reißt nichts ab, der Takt zieht einfach glatt an oder ab.
 * @returns {number} das tatsächlich gesetzte Tempo
 */
export function sequenzerBpmSetzen(bpm) {
  seqBpm = Math.max(SEQUENZER_BPM_MIN, Math.min(SEQUENZER_BPM_MAX, Math.round(bpm)));
  return seqBpm;
}

/** Schritt, der zuletzt ausgelöst wurde – für das Playhead-Rechteck in der Anzeige. */
export function sequenzerAnzeigeSchritt() {
  return (seqZaehler - 1 + SEQUENZER_SCHRITTE) % SEQUENZER_SCHRITTE;
}

/**
 * Hört eine einzelne Schlagzeug-Zeile sofort an, unabhängig vom laufenden
 * Muster – beim Antippen eines Schritts oder beim Durchschalten der Klänge
 * (siehe scenes/sequenzer.js), damit man hört, was man gerade einbaut.
 * @param {number} zeile Index in SEQUENZER_REIHEN
 * @param {number} variante Index in SEQUENZER_REIHEN[zeile].varianten
 */
export function sequenzerVorhoeren(zeile, variante) {
  if (!ctx) return;
  SCHLAGZEUG_KLAENGE[zeile]?.[variante]?.(ctx.currentTime);
}

/** Länge eines Schritts in Sekunden beim aktuellen Tempo – für Anzeige und Beat-Grid. */
export function sequenzerSchrittDauer() {
  return 60 / seqBpm / 4;
}

/**
 * Eine einzelne Note der Melodie-Zeile sofort anhören (Klavierrolle, siehe
 * scenes/sequenzer.js).
 * @param {number} halbtoene Abstand zu A4
 */
export function sequenzerMelodieVorhoeren(halbtoene) {
  if (!ctx) return;
  ton(ctx.currentTime, halbtoene, sequenzerSchrittDauer() * 0.85, 'sawtooth', 0.09);
}

// --- Vocal-Samples -----------------------------------------------------------
// Aufgenommene Häppchen (siehe scenes/sequenzer.js: "+ Sample" nimmt kurz über
// das Mikrofon auf). Registriert wird nur der fertig dekodierte AudioBuffer;
// alles Musterbezogene (welche Schritte, welche Effekte an sind) bleibt bei
// der Szene, genau wie bei den Schlagzeug-Zeilen.

/** @type {Map<string, AudioBuffer>} */
const seqSamplePuffer = new Map();
let seqSampleZaehler = 0;

/**
 * Merkt einen aufgenommenen Puffer unter einer neuen Kennung.
 * @returns {string} die Kennung, die scenes/sequenzer.js ab jetzt benutzt
 */
export function sequenzerSampleRegistrieren(buffer) {
  const id = `sample_${seqSampleZaehler}`;
  seqSampleZaehler += 1;
  seqSamplePuffer.set(id, buffer);
  return id;
}

export function sequenzerSampleEntfernen(id) {
  seqSamplePuffer.delete(id);
}

/**
 * Dekodiert eine frisch aufgenommene Vocal-Sample-Aufnahme (siehe
 * scenes/sequenzer.js: "+ Sample" nimmt über das Mikrofon auf) und registriert
 * sie. `ctx` bleibt dabei vollständig in diesem Modul – die Szene reicht nur
 * die rohen Bytes rein und bekommt eine Kennung zurück.
 * @param {ArrayBuffer} rohdaten
 * @returns {Promise<string|null>} die Kennung, oder null bei einem Dekodierfehler
 */
export async function sequenzerSampleAusAufnahme(rohdaten) {
  if (!ctx) return null;
  try {
    const puffer = await ctx.decodeAudioData(rohdaten);
    return sequenzerSampleRegistrieren(puffer);
  } catch {
    return null;
  }
}

/** Nachhall-Impulsantwort: einmal künstlich erzeugtes, abklingendes Rauschen statt einer Audiodatei. */
let seqImpulsantwort = null;
function impulsantwort() {
  if (seqImpulsantwort || !ctx) return seqImpulsantwort;
  const dauer = 1.1;
  const laenge = Math.floor(ctx.sampleRate * dauer);
  const puffer = ctx.createBuffer(2, laenge, ctx.sampleRate);
  for (let kanal = 0; kanal < 2; kanal += 1) {
    const daten = puffer.getChannelData(kanal);
    for (let i = 0; i < laenge; i += 1) {
      daten[i] = (Math.random() * 2 - 1) * (1 - i / laenge) ** 3;
    }
  }
  seqImpulsantwort = puffer;
  return seqImpulsantwort;
}

/**
 * Spielt ein Vocal-Sample durch die gewählten Effekte. Baut die Kette bei
 * jedem Treffer frisch auf – genau wie jeder andere Klang hier, kein
 * dauerhafter Kanal nötig, nichts, was aufgeräumt werden müsste.
 * @param {number} zeit
 * @param {AudioBuffer} puffer
 * @param {{echo?: boolean, hall?: boolean, verzerrt?: boolean, beatGrid?: boolean}} fx
 */
function spieleSample(zeit, puffer, fx) {
  if (!ctx || !musikBus || !puffer) return;
  const quelle = ctx.createBufferSource();
  quelle.buffer = puffer;

  // Beat-Grid: das Sample auf eine Schrittlänge kürzen, statt in den
  // nächsten Schritt hineinklingen zu lassen – dafür fährt die Hüllkurve
  // kurz vor Schrittende sanft auf null statt hart abzuschneiden.
  const huellkurve = ctx.createGain();
  huellkurve.gain.setValueAtTime(1, zeit);
  if (fx.beatGrid) {
    const schrittDauer = sequenzerSchrittDauer();
    const auslauf = Math.min(0.02, schrittDauer * 0.3);
    huellkurve.gain.setValueAtTime(1, zeit + Math.max(0, schrittDauer - auslauf));
    huellkurve.gain.linearRampToValueAtTime(0.0001, zeit + schrittDauer);
  }
  quelle.connect(huellkurve);
  let ende = huellkurve;

  if (fx.verzerrt) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = verzerrerKurve(9);
    shaper.oversample = '2x';
    ende.connect(shaper);
    ende = shaper;
  }

  if (fx.echo) {
    const trocken = ctx.createGain();
    trocken.gain.value = 0.8;
    ende.connect(trocken);
    trocken.connect(musikBus);

    const verzoegerung = ctx.createDelay(1);
    verzoegerung.delayTime.value = sequenzerSchrittDauer() * 2;
    const rueckkopplung = ctx.createGain();
    rueckkopplung.gain.value = 0.38;
    const echoPegel = ctx.createGain();
    echoPegel.gain.value = 0.5;

    ende.connect(verzoegerung);
    verzoegerung.connect(echoPegel);
    echoPegel.connect(musikBus);
    verzoegerung.connect(rueckkopplung);
    rueckkopplung.connect(verzoegerung);
  } else {
    ende.connect(musikBus);
  }

  if (fx.hall) {
    const antwort = impulsantwort();
    if (antwort) {
      const faltung = ctx.createConvolver();
      faltung.buffer = antwort;
      const hallPegel = ctx.createGain();
      hallPegel.gain.value = 0.35;
      ende.connect(faltung);
      faltung.connect(hallPegel);
      hallPegel.connect(musikBus);
    }
  }

  quelle.start(zeit);
  quelle.stop(zeit + puffer.duration + 1.5);
}

/** Ein Vocal-Sample sofort anhören, mit denselben Effekten wie im Muster. */
export function sequenzerSampleVorhoeren(id, fx) {
  if (!ctx) return;
  const puffer = seqSamplePuffer.get(id);
  if (puffer) spieleSample(ctx.currentTime, puffer, fx);
}

/**
 * Plant alle Schritte, die innerhalb des Vorlauffensters liegen. Aus
 * scenes/sequenzer.js einmal je Bild aufzurufen, solange der Sequenzer läuft.
 *
 * @param {{
 *   schlagzeug: { muster: boolean[][], varianten: number[], stumm: boolean[] },
 *   melodie: { noten: (number|null)[], stumm: boolean },
 *   samples: { id: string, muster: boolean[], stumm: boolean,
 *     fx: {echo: boolean, hall: boolean, verzerrt: boolean, beatGrid: boolean} }[],
 * }} zustand
 */
export function sequenzerAktualisieren(zustand) {
  if (!ctx || !seqAktiv) return;
  if (seqNaechsteZeit < ctx.currentTime) seqNaechsteZeit = ctx.currentTime;

  while (seqNaechsteZeit < ctx.currentTime + VORLAUF_S) {
    const schrittDauer = 60 / seqBpm / 4;
    const i = seqZaehler % SEQUENZER_SCHRITTE;
    const zeit = seqNaechsteZeit;

    const { schlagzeug, melodie, samples } = zustand;
    schlagzeug.muster.forEach((zeile, reihe) => {
      if (!schlagzeug.stumm[reihe] && zeile[i]) {
        SCHLAGZEUG_KLAENGE[reihe][schlagzeug.varianten[reihe]](zeit);
      }
    });

    if (!melodie.stumm && melodie.noten[i] !== null && melodie.noten[i] !== undefined) {
      ton(zeit, melodie.noten[i], schrittDauer * 0.85, 'sawtooth', 0.09);
    }

    for (const spur of samples) {
      if (!spur.stumm && spur.muster[i]) {
        const puffer = seqSamplePuffer.get(spur.id);
        if (puffer) spieleSample(zeit, puffer, spur.fx);
      }
    }

    seqNaechsteZeit += schrittDauer;
    seqZaehler += 1;
  }
}

/** Kurze Effekte. Unbekannte Namen werden still ignoriert. */
const EFFEKTE = {
  auswahl: { halbtoene: 12, dauer: 0.06, form: 'square', lautstaerke: 0.14 },
  bestaetigen: { halbtoene: 19, dauer: 0.09, form: 'square', lautstaerke: 0.16 },
  zurueck: { halbtoene: 2, dauer: 0.08, form: 'square', lautstaerke: 0.13 },
  treffer: { halbtoene: -5, dauer: 0.14, form: 'sawtooth', lautstaerke: 0.22 },
  starkerTreffer: { halbtoene: -12, dauer: 0.22, form: 'sawtooth', lautstaerke: 0.28 },
  schwacherTreffer: { halbtoene: -2, dauer: 0.1, form: 'triangle', lautstaerke: 0.14 },
  umkippen: { halbtoene: -17, dauer: 0.5, form: 'triangle', lautstaerke: 0.2 },
  wackeln: { halbtoene: 7, dauer: 0.07, form: 'triangle', lautstaerke: 0.18 },
  gefangen: { halbtoene: 24, dauer: 0.3, form: 'square', lautstaerke: 0.2 },
  aufstieg: { halbtoene: 16, dauer: 0.25, form: 'square', lautstaerke: 0.2 },
  item: { halbtoene: 21, dauer: 0.18, form: 'square', lautstaerke: 0.18 },
  // Ein Piep je Stroboskop-Blitz der Heilsequenz.
  heilPuls: { halbtoene: 26, dauer: 0.12, form: 'square', lautstaerke: 0.17 },
  // Der Gong, wenn der Fahrstuhl unten ankommt (siehe scenes/fahrstuhl.js).
  fahrstuhl: { halbtoene: 14, dauer: 0.4, form: 'triangle', lautstaerke: 0.18 },
};

/**
 * Länge eines einmaligen Klangs in Sekunden – siehe KLANG_DATEIEN. Damit
 * können Szenen ihre Animation auf die Dauer des Klangs legen, ohne die Länge
 * ein zweites Mal hinzuschreiben. Unbekannte Namen liefern 0.
 * @param {keyof typeof KLANG_DATEIEN} name
 */
export function klangDauer(name) {
  return KLANG_DATEIEN[name]?.dauer ?? 0;
}

/**
 * Spielt einen einmaligen Klang aus einer Datei (siehe KLANG_DATEIEN) über
 * die laufende Musik. Er hängt direkt an der Summe statt am Musikbus – er
 * soll ja nicht Teil der Musik sein, sondern über ihr liegen. Damit er das
 * auch hörbar tut, geht die Musik für seine Dauer zurück und kommt danach
 * von selbst wieder hoch.
 *
 * Ist die Datei noch nicht dekodiert (das Laden läuft im Hintergrund, siehe
 * ladeDateien), passiert still nichts – ein Belohnungsklang ist keinen
 * Fehler wert.
 * @param {keyof typeof KLANG_DATEIEN} name
 */
export function spieleKlang(name) {
  const puffer = klangPuffer[name];
  if (!ctx || !summe || !musikBus || !puffer) return;

  const quelle = ctx.createBufferSource();
  quelle.buffer = puffer;
  quelle.connect(summe);
  quelle.start();

  const jetzt = ctx.currentTime;
  musikBus.gain.cancelScheduledValues(jetzt);
  musikBus.gain.setTargetAtTime(DUCK_PEGEL, jetzt, 0.03);
  musikBus.gain.setTargetAtTime(MUSIK_PEGEL, jetzt + puffer.duration, 0.25);
}

/** @param {keyof typeof EFFEKTE} name */
export function effekt(name) {
  if (!ctx || !summe) return;
  const daten = EFFEKTE[name];
  if (!daten) return;

  const zeit = ctx.currentTime + 0.005;
  const oszillator = ctx.createOscillator();
  const huellkurve = ctx.createGain();

  oszillator.type = daten.form;
  oszillator.frequency.setValueAtTime(hz(daten.halbtoene), zeit);
  oszillator.frequency.exponentialRampToValueAtTime(
    hz(daten.halbtoene) * (daten.dauer > 0.2 ? 0.5 : 1.6),
    zeit + daten.dauer,
  );

  huellkurve.gain.setValueAtTime(daten.lautstaerke, zeit);
  huellkurve.gain.exponentialRampToValueAtTime(0.0001, zeit + daten.dauer);

  oszillator.connect(huellkurve);
  huellkurve.connect(summe);
  oszillator.start(zeit);
  oszillator.stop(zeit + daten.dauer + 0.02);
}
