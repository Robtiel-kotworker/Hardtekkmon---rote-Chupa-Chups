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
 * Titel, Boxenstopp und Sieg sind die einzigen noch synthetisch erzeugten
 * Stücke – alle Orts- und Kampf-Tracks laufen als Audiodateien (siehe
 * DATEI_TRACKS unten).
 */
const TRACKS = {
  titel: {
    bpm: 136,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass: [-24, null, null, null, -24, null, -19, null, -22, null, null, null, -22, null, -17, null],
    // Aufsteigendes Dur-Arpeggio und zurück – die Art kurzer, singbarer
    // Fanfare, mit der viele Titelmelodien im Genre öffnen.
    lead: [0, null, 4, null, 7, null, 12, null, 12, null, 7, null, 4, null, null, null],
  },
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
};

/** @type {Object<string, AudioBuffer[]>} Dekodierte Puffer je Track, nach dem Laden. */
const dateiPuffer = {};
/** @type {AudioBufferSourceNode|null} Gerade laufende Audiodatei. */
let dateiQuelle = null;

/** Lädt und dekodiert alle Audiodateien einmalig im Hintergrund. */
async function ladeDateien() {
  if (!ctx) return;
  await Promise.all(Object.entries(DATEI_TRACKS).map(async ([name, eintrag]) => {
    const puffer = await Promise.all(eintrag.dateien.map(async (pfad) => {
      const antwort = await fetch(pfad);
      const rohdaten = await antwort.arrayBuffer();
      return ctx.decodeAudioData(rohdaten);
    }));
    dateiPuffer[name] = puffer;
  }));
  // Wurde währenddessen schon ein Datei-Track angefordert, jetzt nachstarten.
  if (DATEI_TRACKS[laufenderTrack] && !dateiQuelle) starteDateiTrack(laufenderTrack);
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

/** Einzelne Datei in Dauerschleife (Stadt, Route, Gebäude, Gig, Heilung). */
function starteEinzelschleife(name) {
  const puffer = dateiPuffer[name]?.[0];
  if (!ctx || !musikBus || !puffer) return;
  const quelle = ctx.createBufferSource();
  quelle.buffer = puffer;
  quelle.loop = true;
  quelle.connect(musikBus);
  quelle.start();
  dateiQuelle = quelle;
}

/**
 * Kampf-Track: eine der vier Varianten wird gezogen, abgespielt, und beim
 * natürlichen Ende (kein loop) sofort die nächste gezogene Variante
 * angeschlossen – so entsteht der lange, im Shuffle laufende Loop.
 */
function starteKampfVariante() {
  const liste = dateiPuffer.kampf;
  if (!ctx || !musikBus || !liste || liste.length === 0) return;
  const index = ziehVariante(liste.length);
  const quelle = ctx.createBufferSource();
  quelle.buffer = liste[index];
  quelle.connect(musikBus);
  quelle.onended = () => {
    // Nur weiterziehen, wenn wir noch im Kampf sind und nicht durch ein
    // manuelles stop() (Trackwechsel) hierher kommen.
    if (laufenderTrack === 'kampf' && dateiQuelle === quelle) starteKampfVariante();
  };
  quelle.start();
  dateiQuelle = quelle;
}

function starteDateiTrack(name) {
  stoppeDateiQuelle();
  if (name === 'kampf') starteKampfVariante();
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
  musikBus.gain.value = 0.8;
  musikBus.connect(summe);

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
};

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
