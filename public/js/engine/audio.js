// ============================================================================
// Klang
// ----------------------------------------------------------------------------
// Alle Töne entstehen zur Laufzeit über die Web-Audio-API – es gibt keine
// Audiodateien im Repo. Kernstück ist die typische Hardtekk-Kick: ein
// Sinuston mit steil fallender Tonhöhe, durch eine Verzerrerkurve gejagt.
// Melodien laufen über einen Schrittsequenzer, der aus der Spielschleife
// heraus mit Vorlauf plant (`audioSchritt`).
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

let an = true;
let laufenderTrack = '';
let naechsterSchrittZeit = 0;
let schrittZaehler = 0;

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
 * wiederkehrende Hooks statt frei springender Läufe, spürbar ruhigeres
 * Tempo (132-156 statt 150-180) und eine deutlich dünnere Hi-Hat-Spur.
 * Der harte Verzerrer sitzt jetzt ausschließlich auf der Kick (siehe
 * kickBus in starteAudio) – Bass und Lead bleiben klar, das nimmt dem
 * Ganzen die Härte, ohne den Hardtekk-Punch der Kick zu verlieren.
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
  welt: {
    bpm: 140,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    bass: [-24, null, -24, null, -17, null, -17, null, -22, null, -22, null, -19, null, -19, null],
    // Ein viertaktiges Frage-Antwort-Motiv, wie man es aus Overworld-Themes
    // kennt: erst eine kurze Wendung nach oben, dann die Antwort zurück.
    lead: [0, 4, 7, null, 4, null, 5, null, 0, 4, 7, null, 5, 4, null, null],
  },
  kampf: {
    bpm: 148,
    kick: [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    bass: [-24, null, -24, null, -19, null, -19, null, -22, null, -22, null, -17, null, -17, null],
    // Angespannter, aber wiederholter Ritt über eine kleine Molltonleiter –
    // dringlich statt chaotisch.
    lead: [12, null, 11, null, 7, null, 11, null, 12, null, 14, null, 11, null, 7, null],
  },
  gig: {
    bpm: 154,
    kick: [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0],
    bass: [-27, null, -27, null, -20, null, -20, null, -22, null, -22, null, -25, null, -25, null],
    // Der intensivste Track im Spiel, aber immer noch ein klarer,
    // wiederholter Hook statt eines durchgehenden Sechzehntellaufs.
    lead: [16, null, 14, null, 12, null, 14, null, 16, 19, 16, 14, 12, null, null, null],
  },
  boxenstopp: {
    bpm: 116,
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    bass: [-24, null, null, null, null, null, -19, null, -22, null, null, null, null, null, -17, null],
    // Ruhig fallend und wieder aufsteigend, viel Raum zwischen den Tönen –
    // die Healing-Center-Melodie soll erholen, nicht antreiben.
    lead: [7, null, null, 11, null, 12, null, null, 9, null, null, 7, null, 4, null, null],
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

  musikBus = ctx.createGain();
  musikBus.gain.value = 0.8;
  musikBus.connect(summe);

  summe.connect(ctx.destination);

  naechsterSchrittZeit = ctx.currentTime;
  schrittZaehler = 0;
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
 * @param {keyof typeof TRACKS | ''} name Leerer Name schaltet die Musik ab.
 */
export function spieleTrack(name) {
  if (name === laufenderTrack) return;
  laufenderTrack = name;
  schrittZaehler = 0;
  if (ctx) naechsterSchrittZeit = ctx.currentTime;
}

export function aktuellerTrack() {
  return laufenderTrack;
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

    if (track.kick[i]) kick(zeit);
    if (track.hat[i]) hihat(zeit);
    if (track.bass[i] !== null) ton(zeit, track.bass[i], schrittDauer * 1.6, 'square', 0.12);
    if (track.lead[i] !== null) ton(zeit, track.lead[i], schrittDauer * 0.9, 'sawtooth', 0.065);

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
