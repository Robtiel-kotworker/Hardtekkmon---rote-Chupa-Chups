// ============================================================================
// Sequenzerszene
// ----------------------------------------------------------------------------
// Das DJ-Pult im Proberaum (siehe data/world/casino.js): ein 8-Takte-
// Sequenzer im Stil einer Korg Electribe. Drei Schlagzeug-Zeilen (Kick, Clap,
// HiHat, je drei wählbare Klänge), eine Melodie-Zeile (eigene Klavierrolle
// statt Ein/Aus-Schritten) und beliebig viele aufgenommene Vocal-Samples mit
// eigenen Effekten. Jede Zeile lässt sich stummschalten, das Tempo ist
// einstellbar.
//
// Bedienung bewusst schlicht gehalten – kein Maus-"Klicken", nur die üblichen
// acht Tasten. Jede Zeile hat links neben den 32 Schritten ein paar feste
// Sonderspalten (negativer Index): immer eine Stummschalt-Spalte, bei
// Vocal-Samples zusätzlich vier Effekt-Spalten. ←→ bewegt sich frei über
// Sonderspalten und Schritte hinweg, A wirkt je nach Spalte (Schritt an/aus,
// oder die dort liegende Schaltfläche umlegen):
//
//   ←→    Spalte wählen (Sonderspalten links, 32 Schritte rechts)
//   ↑↓    Zeile wählen
//   A     wirkt je nach Spalte/Zeile – Schritt an/aus, Stummschaltung,
//         Effekt an/aus, Klavierrolle öffnen, Aufnahme starten
//   SELECT  Klang der Zeile wechseln (nur Schlagzeug)
//   START Wiedergabe an/aus
//   B     Pult verlassen (in der Klavierrolle/Aufnahme: einen Schritt zurück)
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import {
  effekt, spieleTrack, aktuellerTrack,
  sequenzerStarten, sequenzerStoppen, sequenzerLaeuft, sequenzerAktualisieren,
  sequenzerAnzeigeSchritt, sequenzerVorhoeren, sequenzerBpm, sequenzerBpmSetzen,
  sequenzerMelodieVorhoeren, sequenzerSampleVorhoeren, sequenzerSampleAusAufnahme,
  SEQUENZER_REIHEN, SEQUENZER_SCHRITTE, SEQUENZER_TAKTE, SEQUENZER_BPM_MIN, SEQUENZER_BPM_MAX,
  MELODIE_FARBE, SAMPLE_FARBE,
} from '../engine/audio.js';
import { fenster } from '../gfx/ui.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { poppe } from './stapel.js';

/** Schritte je sichtbarer Seite – zwei Seiten ergeben die vollen 32 Schritte. */
const SEITEN_SCHRITTE = 16;
const SEITEN_ANZAHL = SEQUENZER_SCHRITTE / SEITEN_SCHRITTE;

/** Kachelmaße des Gitters. */
const STEP_START_X = 70;
const ZELLE_BREITE = 9;
const ZELLE_HOEHE = 9;
const ZEILE_HOEHE = 11;
const GRUPPEN_LUECKE = 2;
const SICHTBARE_ZEILEN = 6;
const GITTER_Y = 17;

/** Effekt-Spalten der Vocal-Samples, von links nach rechts (Spalte -5..-2). */
const SAMPLE_FX = [
  { schluessel: 'echo', kurz: 'E' },
  { schluessel: 'hall', kurz: 'H' },
  { schluessel: 'verzerrt', kurz: 'V' },
  { schluessel: 'beatGrid', kurz: 'G' },
];
/** Spalte -1 ist bei jeder Zeile die Stummschaltung. */
const MUTE_SPALTE = -1;
/** Kleinste Spalte einer Vocal-Sample-Zeile (vier Effekte + Stummschaltung). */
const SAMPLE_MIN_SPALTE = -(SAMPLE_FX.length + 1);

const MAX_AUFNAHME_MS = 4000;
/** Eine Oktave chromatisch – reicht für eine knackige Lead-Linie. */
const TONHOEHEN = Array.from({ length: 13 }, (_, i) => 12 - i);

/** X-Position eines Schritts INNERHALB der sichtbaren Seite (0..15). */
function stufeX(schrittInSeite) {
  return STEP_START_X + schrittInSeite * (ZELLE_BREITE + 1) + Math.floor(schrittInSeite / 4) * GRUPPEN_LUECKE;
}

function leeresMuster() {
  return new Array(SEQUENZER_SCHRITTE).fill(false);
}

export class Sequenzerszene {
  constructor() {
    this.schlagzeug = SEQUENZER_REIHEN.map(() => ({
      muster: leeresMuster(), variante: 0, stumm: false,
    }));
    this.melodie = { noten: new Array(SEQUENZER_SCHRITTE).fill(null), stumm: false };
    /** @type {{id: string, name: string, muster: boolean[], stumm: boolean, fx: object}[]} */
    this.samples = [];

    this.cursorZeile = 0;
    this.cursorSpalte = MUTE_SPALTE;
    this.zeilenAnfang = 0;
    this.sichtbareSeite = 0;

    this.klavierSpalte = 0;
    this.klavierTonIndex = TONHOEHEN.indexOf(0);

    /** 'uebersicht' | 'klavierrolle' | 'aufnahme' */
    this.zustand = 'uebersicht';
    this.aufnahme = null;

    this.bildzaehler = 0;
    this.rueckkehrTrack = aktuellerTrack();
  }

  betreten() {
    spieleTrack('');
  }

  verlassen() {
    sequenzerStoppen();
    this.stoppeMikrofon();
    spieleTrack(this.rueckkehrTrack || 'gebaeude');
  }

  // --- Zeilenliste --------------------------------------------------------

  /** Alle Zeilen in Anzeigereihenfolge – wird bei jedem Zugriff frisch gebaut. */
  zeilenListe() {
    const liste = this.schlagzeug.map((_, i) => ({ typ: 'schlagzeug', index: i }));
    liste.push({ typ: 'melodie' });
    for (let i = 0; i < this.samples.length; i += 1) liste.push({ typ: 'sample', index: i });
    liste.push({ typ: 'neuesSample' });
    liste.push({ typ: 'bpm' });
    return liste;
  }

  minSpalte(eintrag) {
    if (eintrag.typ === 'sample') return SAMPLE_MIN_SPALTE;
    if (eintrag.typ === 'schlagzeug' || eintrag.typ === 'melodie') return MUTE_SPALTE;
    return 0;
  }

  // --- Ablauf ---------------------------------------------------------------

  aktualisieren() {
    this.bildzaehler += 1;
    if (this.zustand !== 'aufnahme') {
      this.sammleZustand();
      sequenzerAktualisieren(this.sequenzerZustand);
    }

    if (this.zustand === 'uebersicht') this.aktualisiereUebersicht();
    else if (this.zustand === 'klavierrolle') this.aktualisiereKlavierrolle();
    else if (this.zustand === 'aufnahme') this.aktualisiereAufnahme();
  }

  /** Baut das kompakte Zustandsobjekt, das engine/audio.js zum Abspielen braucht. */
  sammleZustand() {
    this.sequenzerZustand = {
      schlagzeug: {
        muster: this.schlagzeug.map((z) => z.muster),
        varianten: this.schlagzeug.map((z) => z.variante),
        stumm: this.schlagzeug.map((z) => z.stumm),
      },
      melodie: this.melodie,
      samples: this.samples,
    };
  }

  aktualisiereUebersicht() {
    const zeilen = this.zeilenListe();
    const eintrag = zeilen[this.cursorZeile];

    if (gedrueckt('B')) {
      effekt('zurueck');
      poppe();
      return;
    }
    if (gedrueckt('START')) this.schalteWiedergabe();

    if (gedrueckt('UP') || gedrueckt('DOWN')) {
      const richtung = gedrueckt('UP') ? -1 : 1;
      this.cursorZeile = Math.max(0, Math.min(zeilen.length - 1, this.cursorZeile + richtung));
      this.cursorSpalte = MUTE_SPALTE;
      this.haltePosition();
      effekt('auswahl');
    }

    if (eintrag.typ === 'bpm') {
      if (gedrueckt('LEFT')) this.aendereBpm(-5);
      if (gedrueckt('RIGHT')) this.aendereBpm(5);
      if (gedrueckt('A')) this.setzeBpm(170);
      return;
    }

    if (gedrueckt('LEFT') || gedrueckt('RIGHT')) {
      const richtung = gedrueckt('LEFT') ? -1 : 1;
      const grenze = this.minSpalte(eintrag);
      this.cursorSpalte = Math.max(grenze, Math.min(SEQUENZER_SCHRITTE - 1, this.cursorSpalte + richtung));
      if (this.cursorSpalte >= 0) this.sichtbareSeite = Math.floor(this.cursorSpalte / SEITEN_SCHRITTE);
      effekt('auswahl');
    }

    if (gedrueckt('SELECT') && eintrag.typ === 'schlagzeug') {
      const zeile = this.schlagzeug[eintrag.index];
      zeile.variante = (zeile.variante + 1) % SEQUENZER_REIHEN[eintrag.index].varianten.length;
      sequenzerVorhoeren(eintrag.index, zeile.variante);
      effekt('auswahl');
    }

    if (gedrueckt('A')) this.bestaetigeUebersicht(eintrag);
  }

  bestaetigeUebersicht(eintrag) {
    if (eintrag.typ === 'schlagzeug') {
      const zeile = this.schlagzeug[eintrag.index];
      if (this.cursorSpalte === MUTE_SPALTE) {
        zeile.stumm = !zeile.stumm;
        effekt(zeile.stumm ? 'zurueck' : 'auswahl');
        return;
      }
      zeile.muster[this.cursorSpalte] = !zeile.muster[this.cursorSpalte];
      if (zeile.muster[this.cursorSpalte]) sequenzerVorhoeren(eintrag.index, zeile.variante);
      effekt(zeile.muster[this.cursorSpalte] ? 'auswahl' : 'zurueck');
      return;
    }

    if (eintrag.typ === 'melodie') {
      if (this.cursorSpalte === MUTE_SPALTE) {
        this.melodie.stumm = !this.melodie.stumm;
        effekt(this.melodie.stumm ? 'zurueck' : 'auswahl');
        return;
      }
      this.oeffneKlavierrolle(this.cursorSpalte);
      return;
    }

    if (eintrag.typ === 'sample') {
      const spur = this.samples[eintrag.index];
      const fxIndex = MUTE_SPALTE - this.cursorSpalte - 1; // -2 -> 0, -3 -> 1, ...
      if (this.cursorSpalte === MUTE_SPALTE) {
        spur.stumm = !spur.stumm;
        effekt(spur.stumm ? 'zurueck' : 'auswahl');
        return;
      }
      if (fxIndex >= 0 && fxIndex < SAMPLE_FX.length) {
        const schluessel = SAMPLE_FX[fxIndex].schluessel;
        spur.fx[schluessel] = !spur.fx[schluessel];
        sequenzerSampleVorhoeren(spur.id, spur.fx);
        effekt('auswahl');
        return;
      }
      spur.muster[this.cursorSpalte] = !spur.muster[this.cursorSpalte];
      if (spur.muster[this.cursorSpalte]) sequenzerSampleVorhoeren(spur.id, spur.fx);
      effekt(spur.muster[this.cursorSpalte] ? 'auswahl' : 'zurueck');
      return;
    }

    if (eintrag.typ === 'neuesSample') this.oeffneAufnahme();
  }

  schalteWiedergabe() {
    if (sequenzerLaeuft()) { sequenzerStoppen(); effekt('zurueck'); } else { sequenzerStarten(); effekt('bestaetigen'); }
  }

  aendereBpm(delta) {
    this.setzeBpm(sequenzerBpm() + delta);
  }

  setzeBpm(wert) {
    sequenzerBpmSetzen(wert);
    effekt('auswahl');
  }

  /** Hält den Zeilen-Zeiger im sichtbaren Fensterbereich (wie Auswahl.haltePosition()). */
  haltePosition() {
    if (this.cursorZeile < this.zeilenAnfang) this.zeilenAnfang = this.cursorZeile;
    if (this.cursorZeile >= this.zeilenAnfang + SICHTBARE_ZEILEN) {
      this.zeilenAnfang = this.cursorZeile - SICHTBARE_ZEILEN + 1;
    }
  }

  // --- Klavierrolle (Melodie) -------------------------------------------------

  oeffneKlavierrolle(startSpalte) {
    this.klavierSpalte = startSpalte;
    const vorhandeneNote = this.melodie.noten[startSpalte];
    this.klavierTonIndex = vorhandeneNote === null
      ? TONHOEHEN.indexOf(0)
      : Math.max(0, TONHOEHEN.indexOf(vorhandeneNote));
    this.zustand = 'klavierrolle';
  }

  aktualisiereKlavierrolle() {
    if (gedrueckt('B')) { effekt('zurueck'); this.zustand = 'uebersicht'; return; }
    if (gedrueckt('START')) this.schalteWiedergabe();

    if (gedrueckt('LEFT')) {
      this.klavierSpalte = Math.max(0, this.klavierSpalte - 1);
      this.sichtbareSeite = Math.floor(this.klavierSpalte / SEITEN_SCHRITTE);
      effekt('auswahl');
    }
    if (gedrueckt('RIGHT')) {
      this.klavierSpalte = Math.min(SEQUENZER_SCHRITTE - 1, this.klavierSpalte + 1);
      this.sichtbareSeite = Math.floor(this.klavierSpalte / SEITEN_SCHRITTE);
      effekt('auswahl');
    }
    if (gedrueckt('UP')) { this.klavierTonIndex = Math.max(0, this.klavierTonIndex - 1); effekt('auswahl'); }
    if (gedrueckt('DOWN')) {
      this.klavierTonIndex = Math.min(TONHOEHEN.length - 1, this.klavierTonIndex + 1);
      effekt('auswahl');
    }

    if (gedrueckt('A')) {
      const ton = TONHOEHEN[this.klavierTonIndex];
      const noten = this.melodie.noten;
      if (noten[this.klavierSpalte] === ton) {
        noten[this.klavierSpalte] = null;
        effekt('zurueck');
      } else {
        noten[this.klavierSpalte] = ton;
        sequenzerMelodieVorhoeren(ton);
        effekt('auswahl');
      }
    }
  }

  // --- Vocal-Sample-Aufnahme ---------------------------------------------------

  oeffneAufnahme() {
    this.zustand = 'aufnahme';
    if (!navigator.mediaDevices?.getUserMedia) {
      this.aufnahme = { phase: 'fehler', fehlerText: 'Kein Mikrofonzugriff auf diesem Gerät.' };
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      this.aufnahme = { phase: 'fehler', fehlerText: 'Aufnahme wird hier nicht unterstützt.' };
      return;
    }
    this.aufnahme = { phase: 'bereit', stream: null, rekorder: null, chunks: [], startZeit: 0, fehlerText: null };
  }

  aktualisiereAufnahme() {
    const stand = this.aufnahme;
    if (gedrueckt('B')) {
      this.stoppeMikrofon();
      effekt('zurueck');
      this.zustand = 'uebersicht';
      return;
    }

    if (stand.phase === 'bereit' && gedrueckt('A')) {
      this.starteAufnahme();
      return;
    }

    if (stand.phase === 'nimmt_auf') {
      const verstrichen = performance.now() - stand.startZeit;
      if (gedrueckt('A') || verstrichen >= MAX_AUFNAHME_MS) this.beendeAufnahme();
    }
  }

  starteAufnahme() {
    const stand = this.aufnahme;
    stand.phase = 'wartet_auf_erlaubnis';
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      // Kann in der Zwischenzeit abgebrochen worden sein (B gedrückt).
      if (this.aufnahme !== stand) { stream.getTracks().forEach((spur) => spur.stop()); return; }
      const rekorder = new MediaRecorder(stream);
      stand.stream = stream;
      stand.rekorder = rekorder;
      stand.chunks = [];
      rekorder.ondataavailable = (ereignis) => { if (ereignis.data.size > 0) stand.chunks.push(ereignis.data); };
      rekorder.start();
      stand.phase = 'nimmt_auf';
      stand.startZeit = performance.now();
      effekt('bestaetigen');
    }).catch(() => {
      if (this.aufnahme === stand) {
        stand.phase = 'fehler';
        stand.fehlerText = 'Kein Zugriff aufs Mikrofon bekommen.';
      }
    });
  }

  async beendeAufnahme() {
    const stand = this.aufnahme;
    stand.phase = 'verarbeitet';
    effekt('zurueck');

    const rekorder = stand.rekorder;
    const fertig = new Promise((r) => { rekorder.onstop = r; });
    rekorder.stop();
    await fertig;
    this.stoppeMikrofon();
    if (this.aufnahme !== stand) return; // inzwischen abgebrochen

    const blob = new Blob(stand.chunks, { type: rekorder.mimeType || 'audio/webm' });
    const puffer = await blob.arrayBuffer();
    const id = await sequenzerSampleAusAufnahme(puffer);
    if (this.aufnahme !== stand) return;

    if (!id) {
      stand.phase = 'fehler';
      stand.fehlerText = 'Die Aufnahme ließ sich nicht verarbeiten.';
      return;
    }

    this.samples.push({
      id,
      name: `Sample ${this.samples.length + 1}`,
      muster: leeresMuster(),
      stumm: false,
      fx: { echo: false, hall: false, verzerrt: false, beatGrid: true },
    });
    this.zustand = 'uebersicht';
    this.cursorZeile = this.schlagzeug.length + 1 + this.samples.length - 1;
    this.cursorSpalte = MUTE_SPALTE;
    this.haltePosition();
    effekt('gefangen');
  }

  stoppeMikrofon() {
    this.aufnahme?.stream?.getTracks().forEach((spur) => spur.stop());
  }

  // --- Darstellung --------------------------------------------------------

  zeichnen(ctx) {
    ctx.fillStyle = '#161018';
    ctx.fillRect(0, 0, BREITE, HOEHE);

    const titel = this.zustand === 'klavierrolle' ? 'MELODIE' : this.zustand === 'aufnahme' ? 'SAMPLE AUFNEHMEN' : 'DJ-PULT';
    zeichneText(ctx, titel, (BREITE - textBreite(titel)) / 2, 4, { farbe: '#e8c860', schatten: '#3a1810' });

    if (this.zustand === 'klavierrolle') this.zeichneKlavierrolle(ctx);
    else if (this.zustand === 'aufnahme') this.zeichneAufnahme(ctx);
    else this.zeichneUebersicht(ctx);
  }

  farbeVon(eintrag) {
    if (eintrag.typ === 'schlagzeug') return SEQUENZER_REIHEN[eintrag.index].farbe;
    if (eintrag.typ === 'melodie') return MELODIE_FARBE;
    if (eintrag.typ === 'sample') return SAMPLE_FARBE;
    return UI.textHell;
  }

  kurzVon(eintrag) {
    if (eintrag.typ === 'schlagzeug') return SEQUENZER_REIHEN[eintrag.index].kurz;
    if (eintrag.typ === 'melodie') return 'MEL';
    if (eintrag.typ === 'sample') return this.samples[eintrag.index]?.name.replace('Sample ', 'S') ?? '?';
    if (eintrag.typ === 'neuesSample') return '+ SAMPLE';
    return 'BPM';
  }

  zeichneUebersicht(ctx) {
    const zeilen = this.zeilenListe();
    const anzeigeSchritt = sequenzerLaeuft() ? sequenzerAnzeigeSchritt() : -1;
    const seitenStart = this.sichtbareSeite * SEITEN_SCHRITTE;

    // Spotlight-Spalte für den gerade hörbaren Schritt, nur wenn er auf der
    // sichtbaren Seite liegt.
    if (anzeigeSchritt >= seitenStart && anzeigeSchritt < seitenStart + SEITEN_SCHRITTE) {
      ctx.fillStyle = '#2a2438';
      ctx.fillRect(
        stufeX(anzeigeSchritt - seitenStart) - 1, GITTER_Y - 1,
        ZELLE_BREITE + 2, SICHTBARE_ZEILEN * ZEILE_HOEHE + 1,
      );
    }

    const sichtbar = zeilen.slice(this.zeilenAnfang, this.zeilenAnfang + SICHTBARE_ZEILEN);
    sichtbar.forEach((eintrag, i) => {
      const zeileIndex = this.zeilenAnfang + i;
      const y = GITTER_Y + i * ZEILE_HOEHE;
      const aktiv = zeileIndex === this.cursorZeile;
      const farbe = this.farbeVon(eintrag);

      zeichneText(ctx, this.kurzVon(eintrag), 4, y + 1, { farbe: aktiv ? UI.gold : UI.textHell });

      if (eintrag.typ === 'bpm') {
        const text = `${sequenzerBpm()} BPM  ${aktiv ? `←→ ändern (${SEQUENZER_BPM_MIN}-${SEQUENZER_BPM_MAX}), A: 170` : ''}`;
        zeichneText(ctx, text, STEP_START_X, y + 1, { farbe: UI.textSchatten });
        return;
      }
      if (eintrag.typ === 'neuesSample') {
        zeichneText(ctx, 'A zum Aufnehmen', STEP_START_X, y + 1, { farbe: UI.textSchatten });
        return;
      }

      const stumm = eintrag.typ === 'schlagzeug' ? this.schlagzeug[eintrag.index].stumm
        : eintrag.typ === 'melodie' ? this.melodie.stumm
          : this.samples[eintrag.index].stumm;

      // Sonderspalten: Stummschaltung (alle) plus vier Effekte (nur Samples).
      const muteX = STEP_START_X - ZELLE_HOEHE - 1;
      this.zeichneSonderfeld(ctx, muteX, y, stumm ? '#e04058' : '#302838', 'M', aktiv && this.cursorSpalte === MUTE_SPALTE);
      if (eintrag.typ === 'sample') {
        const spur = this.samples[eintrag.index];
        SAMPLE_FX.forEach((fx, fxI) => {
          const x = muteX - (fxI + 1) * (ZELLE_HOEHE + 1);
          const spalte = MUTE_SPALTE - fxI - 1;
          this.zeichneSonderfeld(ctx, x, y, spur.fx[fx.schluessel] ? SAMPLE_FARBE : '#302838', fx.kurz, aktiv && this.cursorSpalte === spalte);
        });
      }

      for (let s = 0; s < SEITEN_SCHRITTE; s += 1) {
        const schritt = seitenStart + s;
        const x = stufeX(s);
        let an;
        if (eintrag.typ === 'schlagzeug') an = this.schlagzeug[eintrag.index].muster[schritt];
        else if (eintrag.typ === 'melodie') an = this.melodie.noten[schritt] !== null;
        else an = this.samples[eintrag.index].muster[schritt];

        const istCursor = aktiv && this.cursorSpalte === schritt;
        if (istCursor) {
          ctx.fillStyle = UI.textHell;
          ctx.fillRect(x - 1, y - 1, ZELLE_BREITE + 2, ZELLE_HOEHE + 2);
        }
        ctx.fillStyle = an ? farbe : '#302838';
        ctx.fillRect(x, y, ZELLE_BREITE, ZELLE_HOEHE);
        if (!an) { ctx.fillStyle = '#201a28'; ctx.fillRect(x + 1, y + 1, ZELLE_BREITE - 2, ZELLE_HOEHE - 2); }
      }
    });

    if (this.zeilenAnfang > 0) zeichneText(ctx, '▲', BREITE - 10, GITTER_Y - 8, { farbe: UI.auswahl });
    if (this.zeilenAnfang + SICHTBARE_ZEILEN < zeilen.length) {
      zeichneText(ctx, '▼', BREITE - 10, GITTER_Y + SICHTBARE_ZEILEN * ZEILE_HOEHE, { farbe: UI.auswahl });
    }

    this.zeichneStatus(ctx, GITTER_Y + SICHTBARE_ZEILEN * ZEILE_HOEHE + 6);
  }

  /** Eine kleine quadratische Schaltfläche einer Sonderspalte (Mute/Effekt). */
  zeichneSonderfeld(ctx, x, y, farbe, buchstabe, cursor) {
    if (cursor) { ctx.fillStyle = UI.textHell; ctx.fillRect(x - 1, y - 1, ZELLE_HOEHE + 2, ZELLE_HOEHE + 2); }
    ctx.fillStyle = farbe;
    ctx.fillRect(x, y, ZELLE_HOEHE, ZELLE_HOEHE);
    zeichneText(ctx, buchstabe, x + 1, y, { farbe: '#12101a' });
  }

  zeichneStatus(ctx, y) {
    fenster(ctx, 4, y, BREITE - 8, HOEHE - y - 4);
    const seite = `Takt ${this.sichtbareSeite * 4 + 1}-${this.sichtbareSeite * 4 + 4} / ${SEQUENZER_TAKTE}`;
    zeichneText(ctx, `${seite}   ${sequenzerLaeuft() ? '▶ läuft' : 'gestoppt'}`, 10, y + 4, {
      farbe: sequenzerLaeuft() ? UI.kpGut : UI.textSchatten,
    });
    zeichneText(ctx, '←→ Spalte  ↑↓ Zeile  A wirkt  SELECT Klang', 10, y + 14, { farbe: UI.textSchatten });
    zeichneText(ctx, 'START ▶/Stopp  B Raus', 10, y + 24, { farbe: UI.textSchatten });
  }

  zeichneKlavierrolle(ctx) {
    const gitterX = 20;
    const gitterY = 15;
    const zellBreite = 9;
    const zellHoehe = 7;
    const seitenStart = this.sichtbareSeite * SEITEN_SCHRITTE;
    const anzeigeSchritt = sequenzerLaeuft() ? sequenzerAnzeigeSchritt() : -1;

    if (anzeigeSchritt >= seitenStart && anzeigeSchritt < seitenStart + SEITEN_SCHRITTE) {
      const s = anzeigeSchritt - seitenStart;
      ctx.fillStyle = '#2a2438';
      ctx.fillRect(gitterX + s * (zellBreite + 1) - 1, gitterY - 1, zellBreite + 2, TONHOEHEN.length * (zellHoehe + 1) + 1);
    }

    TONHOEHEN.forEach((ton, zeile) => {
      const y = gitterY + zeile * (zellHoehe + 1);
      zeichneText(ctx, `${ton >= 0 ? '+' : ''}${ton}`, 2, y, { farbe: ton === 0 ? UI.gold : UI.textSchatten });

      for (let s = 0; s < SEITEN_SCHRITTE; s += 1) {
        const schritt = seitenStart + s;
        const x = gitterX + s * (zellBreite + 1);
        const gesetzt = this.melodie.noten[schritt] === ton;
        const istCursor = schritt === this.klavierSpalte && this.klavierTonIndex === zeile;
        if (istCursor) { ctx.fillStyle = UI.textHell; ctx.fillRect(x - 1, y - 1, zellBreite + 2, zellHoehe + 2); }
        ctx.fillStyle = gesetzt ? MELODIE_FARBE : '#302838';
        ctx.fillRect(x, y, zellBreite, zellHoehe);
      }
    });

    const statusY = gitterY + TONHOEHEN.length * (zellHoehe + 1) + 4;
    fenster(ctx, 4, statusY, BREITE - 8, HOEHE - statusY - 4);
    const seite = `Takt ${this.sichtbareSeite * 4 + 1}-${this.sichtbareSeite * 4 + 4} / ${SEQUENZER_TAKTE}`;
    zeichneText(ctx, `${seite}   ${sequenzerLaeuft() ? '▶ läuft' : 'gestoppt'}`, 10, statusY + 4, {
      farbe: sequenzerLaeuft() ? UI.kpGut : UI.textSchatten,
    });
    zeichneText(ctx, '←→ Schritt  ↑↓ Tonhöhe  A setzen/löschen  B zurück', 10, statusY + 14, { farbe: UI.textSchatten });
  }

  zeichneAufnahme(ctx) {
    const stand = this.aufnahme;
    fenster(ctx, 20, 40, BREITE - 40, 70);

    if (!stand || stand.phase === 'fehler') {
      zeichneText(ctx, stand?.fehlerText ?? 'Unbekannter Fehler.', 28, 60, { farbe: UI.auswahl });
      zeichneText(ctx, 'B zurück', 28, 90, { farbe: UI.textSchatten });
      return;
    }
    if (stand.phase === 'bereit') {
      zeichneText(ctx, 'Bereit.', 28, 55, { farbe: UI.text });
      zeichneText(ctx, 'A zum Aufnehmen (max. 4 s)', 28, 68, { farbe: UI.text });
      zeichneText(ctx, 'B zum Abbrechen', 28, 90, { farbe: UI.textSchatten });
      return;
    }
    if (stand.phase === 'wartet_auf_erlaubnis') {
      zeichneText(ctx, 'Warte auf Mikrofon-Erlaubnis …', 28, 60, { farbe: UI.text });
      return;
    }
    if (stand.phase === 'nimmt_auf') {
      const verstrichen = Math.min(MAX_AUFNAHME_MS, performance.now() - stand.startZeit);
      const anteil = verstrichen / MAX_AUFNAHME_MS;
      zeichneText(ctx, 'Nimmt auf …', 28, 55, { farbe: '#e04058' });
      ctx.fillStyle = '#302838';
      ctx.fillRect(28, 68, BREITE - 56, 6);
      ctx.fillStyle = '#e04058';
      ctx.fillRect(28, 68, Math.round((BREITE - 56) * anteil), 6);
      zeichneText(ctx, 'A zum Beenden', 28, 90, { farbe: UI.textSchatten });
      return;
    }
    zeichneText(ctx, 'Verarbeitet Aufnahme …', 28, 60, { farbe: UI.text });
  }
}
