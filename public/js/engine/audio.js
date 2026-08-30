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
/** @type {GainNode|null} Vorpegel in die harte Gabber-Kennlinie. */
let gabberEingang = null;

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
 * wiederkehrende Hooks statt frei springender Läufe und eine überschaubare
 * Hi-Hat-Spur. Der harte Verzerrer sitzt ausschließlich auf dem kickBus
 * (siehe starteAudio) – Bass und Lead bleiben klar.
 *
 * Zusätzliche Felder je Stück:
 *   `kickStaerke` – Vorpegel der Kick VOR dem Verzerrer. Werte über 1 fahren
 *                   die Kick tiefer in die Kennlinie und machen sie damit
 *                   nicht nur lauter, sondern hörbar dreckiger; Werte unter 1
 *                   halten sie drinnen-tauglich rund.
 *   `zaag`        – Sägezahn-Screech durch denselben Verzerrer, das typische
 *                   Hardtekk-"Geschrubbe" (siehe zaag()).
 *
 * Die Ortswechsel sollen klar hörbar sein, deshalb steigen Tempo und Härte
 * gestaffelt: Gebäude 128 < Stadt 140 < Route 156 < Kampf 160/166.
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
  // --- Stadt (außen) --------------------------------------------------------
  // Bewusst nah an der bisherigen Fassung: gleiches Tempo, gleiche Tonart,
  // gleiches Frage-Antwort-Motiv. Neu sind nur ein Auftakt-Kick am Taktende,
  // eine etwas lebendigere Hi-Hat und eine kleine Variation im zweiten Halbtakt,
  // damit die Schleife nicht so stumpf umspringt.
  welt: {
    bpm: 140,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    hat: [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1],
    bass: [-24, null, -24, null, -17, null, -17, null, -22, null, -22, null, -19, null, -19, -17],
    lead: [0, 4, 7, null, 4, null, 5, null, 0, 4, 7, 9, 7, 5, 4, null],
  },
  // --- Route (wildes Gras, Trainer) -----------------------------------------
  // Düster, schnell, hart: phrygische kleine Sekunde über einem stehenden
  // tiefen Bass, dichte Kick, durchlaufende Hi-Hat.
  route: {
    bpm: 156,
    kickStaerke: 1.15,
    kick: [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1],
    bass: [-25, null, -25, null, -25, null, -24, null, -20, null, -20, null, -25, null, -25, null],
    lead: [0, null, 1, null, 0, null, -4, null, 0, null, 1, null, 3, 1, 0, null],
  },
  // --- Gebäude (innen) ------------------------------------------------------
  // Runder und melodischer, aber kein Weichspüler: die Kick läuft weiter
  // durchgehend, nur mit weniger Vorpegel. Darüber eine harmonisch geführte
  // Melodie über einer wandernden Bassfolge.
  gebaeude: {
    bpm: 128,
    kickStaerke: 0.8,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0],
    bass: [-24, null, null, null, -19, null, null, null, -21, null, null, null, -17, null, null, null],
    lead: [7, null, 9, null, 12, null, 9, null, 7, null, 4, null, 5, 7, null, null],
  },
  // --- Kampf gegen wilde Hardtekkmon ----------------------------------------
  // Gabber statt Techno: 180 BPM und die lang gezogene, tonale Gabber-Kick
  // (siehe gabberKick). Weil diese Kick den Bass selbst mitbringt und weit in
  // den nächsten Schlag hineinklingt, steht sie stur auf den Vierteln statt
  // auf Sechzehnteln – und die Bassspur ist auf ein paar Zwischenschläge
  // ausgedünnt, damit unten herum nichts verwischt.
  kampf: {
    bpm: 180,
    gabber: true,
    kickDauer: 0.4,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    bass: [null, null, -24, null, null, null, -24, null, null, null, -22, null, null, null, -22, null],
    lead: [12, null, 11, null, 7, null, 11, null, 12, null, 14, null, 15, 14, 12, null],
    zaag: [null, null, null, null, 12, null, null, null, null, null, null, null, 12, null, 14, null],
  },
  // --- Kampf gegen Trainer, zugleich Musik der Gig-Hallen -------------------
  // Uptempo-Hardcore: noch eine Stufe schneller (190) und mit einer etwas
  // kürzer gehaltenen Kick, damit die dichteren Schläge am Taktende nicht
  // ineinanderlaufen. Der härteste Track im regulären Spiel.
  gig: {
    bpm: 190,
    gabber: true,
    kickDauer: 0.34,
    grundton: -37,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1],
    bass: [null, null, -27, null, null, null, -27, null, null, null, -25, null, null, null, -25, null],
    lead: [16, null, 14, null, 12, null, 14, null, 16, 19, 16, 14, 12, null, null, null],
    zaag: [null, null, null, null, 12, null, null, null, 12, null, null, null, 12, null, 14, null],
  },
  // --- Boxenstopp (Heilungscenter) ------------------------------------------
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
  // --- Heilsequenz ----------------------------------------------------------
  // Das Up-Tempo-Zwischenspiel, während die Hardtekkmon aufgepäppelt werden:
  // stures Vier-Viertel bei 175, darüber durchgehendes Zaag-Geschrubbe. Läuft
  // exakt sechs Schläge lang, im Gleichtakt mit dem Stroboskop – die Weltszene
  // holt sich die Schlagdauer über schlagDauer('heilung').
  heilung: {
    bpm: 175,
    kickStaerke: 1.25,
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    bass: [-24, null, -24, null, -24, null, -24, null, -24, null, -24, null, -24, null, -24, null],
    lead: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    zaag: [12, null, 12, 14, 12, null, 12, 10, 12, null, 12, 14, 15, 14, 12, null],
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

/**
 * Länge eines Viertelschlags eines Stücks in Sekunden. Damit können
 * Animationen im Gleichtakt mit der Musik laufen, ohne dass die Szene das
 * Tempo doppelt hinschreiben muss (siehe Heilsequenz in scenes/welt.js).
 * @param {keyof typeof TRACKS} name
 */
export function schlagDauer(name) {
  const track = TRACKS[name];
  return track ? 60 / track.bpm : 0.5;
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
