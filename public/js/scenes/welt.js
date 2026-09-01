// ============================================================================
// Weltszene
// ----------------------------------------------------------------------------
// Der Teil des Spiels zwischen den Kämpfen: laufen, reden, aufsammeln,
// Kartenwechsel. Die Szene hat einen kleinen Zustandsautomaten – frei
// beweglich, Text, Frage, Blende, Trainer-Anmarsch – damit sich Eingaben nie
// überschneiden.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt, gehalten, richtung as eingaberichtung } from '../engine/input.js';
import {
  spieleTrack, effekt, schlagDauer, vorlauf, spieleKlang, klangDauer,
} from '../engine/audio.js';
import { BILDER_PRO_SEKUNDE } from '../engine/loop.js';
import {
  KACHEL, kachelInfo, TELLER_PLAETZE, zeichneGoldPlatte, zeichneBrief,
} from '../gfx/tiles.js';
import { zeichneMensch } from '../gfx/menschen.js';
import { monSprite } from '../gfx/monsprites.js';
import { blende as zeichneBlende, fenster, gegenstandSymbol } from '../gfx/ui.js';
import { zeichneText } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { Weltkarte } from '../world/weltkarte.js';
import { kameraPosition } from '../world/kamera.js';
import {
  neueFigur, starteSchritt, bewegeFigur, blickfeld,
  RICHTUNGS_VEKTOR, GEGENRICHTUNG,
} from '../world/spielfigur.js';
import { Textfenster } from '../ui/textfenster.js';
import { Auswahl } from '../ui/auswahl.js';
import { karte as kartendaten } from '../data/world/karten.js';
import { begegnungstabelle } from '../data/world/begegnungen.js';
import { trainerInfo } from '../data/trainer.js';
import { artNachName, ARTEN } from '../data/arten.js';
import { erstelleHardtekkmon, ausTabelle } from '../game/hardtekkmon.js';
import {
  spiel, hatGegenstand, gibGegenstand, merkeAufgesammelt, schonAufgesammelt,
  trainerBesiegt, merkeTrainerBesiegt, gigErhalten, anzahlGigs, heileTeam,
  merkeBoxenstopp, waehleStarter, merkeGesehen, setzeFlagge, hatFlagge,
  ersterKaempfer, speichereSpiel, aendereGeld,
  selectGegenstand, schalteTaschenlampe, taschenlampeAn,
} from '../game/spielstand.js';
import { GEGENSTAENDE } from '../data/gegenstaende.js';
import {
  Saeulenlauf, saeulenStand, sperreRest, sperrText, briefText, startfelder,
  wuerfleAbfolge, BELOHNUNG, SPERRE_MS,
} from '../game/saeulenraetsel.js';
import { KLOPFTUER_ZIEL } from '../data/world/casino.js';
import { starteKampf } from '../battle/kampf.js';
import { schiebe } from './stapel.js';

// 16 Pixel je Kachel: 1.6 ergibt genau 10 Bilder pro Schritt (statt zuvor 8) –
// spürbar ruhiger, ohne dass Laufanimation und Bewegung auseinanderlaufen
// (beide hängen am selben Tempowert, siehe bewegeFigur in spielfigur.js).
const LAUF_TEMPO = 1.6;
const RENN_TEMPO = 4;
const DREHZEIT = 5;
const BEGEGNUNGSCHANCE = 0.12;
const BLENDE_TEMPO = 0.07;

/**
 * Chance auf ein legendäres Hardtekkmon, wenn im hohen Gras eine Begegnung
 * ausgelöst wurde – eine von fünfzig. Höhlen sind bewusst ausgenommen: dort
 * wächst kein Gras.
 */
const LEGENDEN_CHANCE = 1 / 50;
const GRASGRUPPEN = new Set(['wiese', 'moor']);

/**
 * Fundstücke der Routen. Dieselbe Auswahl geben freundliche Leute unterwegs
 * heraus und fällt selten nach einem Trainerkampf ab.
 */
const STRECKENFUNDE = [
  'Samplepack', 'Super-Sample', 'Mate', 'Super-Mate', 'Giga-Mate',
  'Allzweckreiniger', 'Defibrillator', 'Kaugummi', 'Kohletablette',
  'Anlaufhilfe', 'Ohrstöpsel', 'Turnschuh-Wachs', 'Boxenkondensator',
];

/** Nach je so vielen besiegten Trainern gibt es ein Fundstück obendrauf. */
const TRAINER_JE_BELOHNUNG = 10;

/**
 * Heilsequenz im Boxenstopp. Die Heilmusik läuft auf doppeltem Tempo
 * (time-gestreckt, siehe HEILUNG_DATEI_DAUER_S in engine/audio.js) und
 * beginnt mit einem knapp drei Sekunden langen Intro ohne Kick; erst danach
 * bricht sie los. Im Bild passiert deshalb während des Intros bewusst nichts
 * – kein Stroboskop, keine Platten, keine Heilanimation. Genau in dem
 * Moment, in dem die Kick einsetzt, springt alles zugleich an.
 *
 * Beide Längen kommen aus engine/audio.js und damit aus dem Stück selbst:
 * vorlauf('heilung') ist das Intro bis zum Kick-Einsatz, schlagDauer('heilung')
 * ein Take. Vorlauf plus sechs Takes decken das Stück genau ab, Musik und
 * Animation enden also gemeinsam – und weil beide Längen aus der (jetzt
 * halbierten) Dateidauer kommen, laufen Sequenz und Musik automatisch mit,
 * ohne dass hier irgendetwas verdoppelt werden musste.
 */
const HEIL_TICKS = 6;
const HEIL_VORLAUF_BILDER = Math.max(0, Math.round(BILDER_PRO_SEKUNDE * vorlauf('heilung')));
const HEIL_TICK_BILDER = Math.max(1, Math.round(BILDER_PRO_SEKUNDE * schlagDauer('heilung')));
/**
 * Das Stroboskop blitzt nicht einmal pro Take, sondern fünfmal – ein Take
 * ist mit gut 0,34 s dafür viel zu lang. Fünf Blitze je Take ergeben rund
 * 0,068 s Abstand und liegen damit praktisch auf dem Kick-Geknüppel des
 * gestreckten Stücks (gemessener Abstand der Kicks: 0,071 s im Mittel, exakt
 * die Hälfte des Ursprungswerts von 0,139 s – die Verdopplung des Tempos hat
 * sich also 1:1 auf den Kick-Abstand übertragen). Zum Take-Beginn wird der
 * Takt neu gesetzt, damit die Blitze nicht wegdriften.
 */
const HEIL_BLITZE_PRO_TICK = 5;
const HEIL_BLITZ_BILDER = Math.max(1, Math.round(HEIL_TICK_BILDER / HEIL_BLITZE_PRO_TICK));
/** Deckkraft des hellsten Stroboskop-Blitzes. */
const HEIL_BLITZ = 0.72;

/**
 * Die Zocker im Casino (Bewegungsart 'zocker'). Sie hängen am Automaten,
 * schrecken hoch, rennen wirr umher und drehen nach einem Gewinn Runden.
 */
const ZOCKER_RICHTUNGEN = ['oben', 'unten', 'links', 'rechts'];
/**
 * Lauftempo je Zustand in Pixeln pro Bild. Beim wirren Rennen und erst recht
 * bei den Ehrenrunden sind sie schneller unterwegs als der Spieler – anders
 * wäre eine Runde durch den ganzen Saal eine halbe Minute lang.
 */
const ZOCKER_TEMPO = { wirr: 3, jubel: 4, zurueck: 2 };
/**
 * Wie lange am Automaten gewartet wird, bevor wieder etwas passiert. Bewusst
 * lang: Die Zocker sollen primär am Automaten hängen, alles andere ist die
 * Ausnahme.
 */
const ZOCKER_WARTEZEIT = { zocken: 420, schreck: 26, wirr: 0, jubel: 0, zurueck: 60 * 20 };
/** Zusätzliche zufällige Wartezeit am Automaten. */
const ZOCKER_WARTE_STREUUNG = 600;
/** Wie oft ein Aufschrecken stattdessen ein Gewinn ist – selten. */
const ZOCKER_GEWINN_CHANCE = 0.1;
/** Ehrenrunden nach einem Gewinn. */
const ZOCKER_RUNDEN = 5;
/**
 * Wie nah an einer Ecke sie als erreicht gilt. Exakt drauftreten scheitert,
 * wenn dort dauerhaft jemand steht – und im Saal steht an einer Ecke ein
 * Automat samt Bedienung.
 */
const ZOCKER_ECKE_NAH = 2;
/** Notbremse: So viele Bilder darf eine Jubelrunde höchstens dauern. */
const ZOCKER_JUBEL_HOECHSTDAUER = 60 * 90;

/**
 * Feuerwerk, wenn die Briefsäule im Casino aufgibt (siehe
 * game/saeulenraetsel.js). Es läuft genau so lange wie die Belohnungskick,
 * die dazu abgefeuert wird – die Länge kommt aus der Datei selbst (siehe
 * klangDauer in engine/audio.js), damit Bild und Ton gemeinsam enden.
 */
const FEUERWERK_BILDER = Math.max(1, Math.round(BILDER_PRO_SEKUNDE * klangDauer('belohnung')));
const FEUERWERK_RAKETEN = 11;
const FEUERWERK_FUNKEN = 20;
/** Steiggeschwindigkeit einer Rakete in Pixeln je Bild. */
const RAKETEN_TEMPO = 3.2;
/**
 * Wie lange eine Rakete höchstens braucht, bis sie platzt: vom unteren
 * Bildrand bis zur höchsten Zündhöhe. Zusammen mit der Brenndauer der Funken
 * legt das fest, wann die letzte Rakete spätestens starten muss, damit das
 * Feuerwerk nicht mitten in der Luft abgeschnitten wird.
 */
const RAKETEN_STEIGZEIT = Math.ceil((HOEHE + 4) / RAKETEN_TEMPO);
/** Brenndauer eines Funkens in Bildern. */
const FUNKEN_LEBEN = 42;
/** Schwerkraft auf die Funken, Pixel je Bild und Bild. */
const FUNKEN_SCHWERE = 0.055;
const FEUERWERK_FARBEN = ['#ffe07a', '#ff5a6e', '#7ad0ff', '#8cff9a', '#fff8e0', '#ffb04a'];

/** Kacheln, die auf dunklen Karten selbst Licht abgeben. */
const LEUCHTKACHELN = new Set(['schachtlampe', 'laterne']);
/** Reichweite eines solchen Lichtkreises in Pixeln. */
const LAMPEN_RADIUS = 34;

/**
 * Richtungen zu einem Ziel, in der Reihenfolge, in der sie probiert werden
 * sollen: erst die längere Achse, dann die kürzere, dann die beiden
 * Gegenrichtungen als Ausweichmöglichkeit.
 *
 * Die Ausweichrichtungen sind der Grund, warum das hier eine Liste ist und
 * keine einzelne Richtung: Wer stur nur auf die Hauptachse zuläuft, bleibt an
 * der ersten Säule oder dem ersten Tisch für immer hängen.
 */
function richtungenZu(figur, ziel) {
  const dx = ziel.x - figur.x;
  const dy = ziel.y - figur.y;
  const waagerecht = dx >= 0 ? 'rechts' : 'links';
  const senkrecht = dy >= 0 ? 'unten' : 'oben';
  const zuerst = Math.abs(dx) >= Math.abs(dy)
    ? [waagerecht, senkrecht]
    : [senkrecht, waagerecht];
  return [...zuerst, GEGENRICHTUNG[zuerst[1]], GEGENRICHTUNG[zuerst[0]]];
}

/** Die drei Anfänger im Labor. */
const STARTER = { 1: 'Kickolaus', 2: 'Bassbert', 3: 'Acidchen' };

/**
 * Ersetzt den Platzhalter "{name}" durch den gewählten Spielernamen – damit
 * können Dialogtexte in den Datendateien (Professor, Rivale, Chef der
 * Szene …) den Namen einbauen, ohne dass die Daten selbst dynamisch sein
 * müssten. Wirkt auf einzelne Texte genauso wie auf mehrseitige Arrays.
 * @param {string|string[]} inhalt
 */
function ersetzeName(inhalt) {
  const ersetze = (zeile) => (zeile.includes('{name}') ? zeile.replaceAll('{name}', spiel.spieler.name) : zeile);
  return Array.isArray(inhalt) ? inhalt.map(ersetze) : ersetze(inhalt);
}

/** Pixelposition einer Figur inklusive laufendem Schritt. */
function figurPixel(figur) {
  const vektor = RICHTUNGS_VEKTOR[figur.richtung] ?? RICHTUNGS_VEKTOR.unten;
  const anteil = figur.laeuft ? figur.versatz : 0;
  return { x: figur.x * KACHEL + vektor.x * anteil, y: figur.y * KACHEL + vektor.y * anteil };
}

export class Weltszene {
  constructor() {
    this.karte = null;
    this.figur = neueFigur(spiel.position.x, spiel.position.y, spiel.position.richtung);
    this.textfenster = new Textfenster();
    this.zustand = 'frei';
    this.nachText = null;
    this.frageAuswahl = null;
    this.frageAntwort = null;
    this.blende = { wert: 0, phase: 'keine', beiMitte: null };
    this.bildzaehler = 0;
    this.drehzeit = 0;
    this.warpSperre = true;
    this.anmarsch = null;
    this.kampfNachBlende = null;
    /** Läuft die Heilsequenz? { tick, rest, blitz } – sonst null. */
    this.heilung = null;
    /** Lage der Briefsäule auf dieser Karte – nur im Casinosaal besetzt. */
    this.briefsaeule = null;
    /** Laufender Versuch an der Briefsäule (siehe game/saeulenraetsel.js). */
    this.raetsel = null;
    /** Läuft das Feuerwerk nach einer gelösten Säule? */
    this.feuerwerk = null;
    /**
     * Klopfzähler der Klopftür im Casino (siehe klopfeAnTuer): welche
     * Kachelposition zuletzt beklopft wurde und wie oft hintereinander –
     * jede andere Interaktion dazwischen setzt das zurück.
     */
    this.klopfZiel = null;
    this.klopfAnzahl = 0;
  }

  betreten() {
    this.ladeKarte(spiel.position.karte);
    this.figur = neueFigur(spiel.position.x, spiel.position.y, spiel.position.richtung);
    this.warpSperre = true;
    this.blende = { wert: 1, phase: 'ein', beiMitte: null };
    this.zustand = 'blende';
  }

  // --- Karten ---------------------------------------------------------------

  ladeKarte(id) {
    this.karte = new Weltkarte(id);
    spiel.position.karte = id;
    spieleTrack(this.karte.daten.musik);

    // Ein Versuch an der Säule gilt nur innerhalb ihres Saals: Wer die Karte
    // verlässt, fängt beim nächsten Mal wieder an der Säule an.
    this.briefsaeule = this.karte.findeKachel('briefsaeule');
    this.raetsel = null;
    // Dieselbe Logik für die Klopftür: ein Kartenwechsel setzt den Zähler zurück.
    this.klopfZiel = null;
    this.klopfAnzahl = 0;

    for (const npc of this.karte.npcs) {
      // Einmal gefangene Legenden und abgehakte Wachen bleiben verschwunden.
      if (npc.flagge && hatFlagge(npc.flagge)) npc.entfernt = true;
      if (npc.aktion?.art === 'wache' && this.bedingungErfuellt(npc.aktion.bedingung)) {
        if (hatFlagge(`wache:${id}:${npc.index}`)) npc.entfernt = true;
      }
    }
  }

  wechsleKarte(id, x, y, richtung = null) {
    this.ladeKarte(id);
    this.figur = neueFigur(x, y, richtung ?? this.figur.richtung);
    this.merkePosition();
    this.warpSperre = true;
  }

  merkePosition() {
    spiel.position.x = this.figur.x;
    spiel.position.y = this.figur.y;
    spiel.position.richtung = this.figur.richtung;
  }

  // --- Ablaufsteuerung -------------------------------------------------------

  zeigeText(inhalt, danach = null) {
    this.textfenster.zeige(ersetzeName(inhalt));
    this.nachText = danach;
    this.zustand = 'text';
  }

  frage(inhalt, beiJa, beiNein = null) {
    this.textfenster.zeige(ersetzeName(inhalt));
    this.nachText = () => {
      this.frageAuswahl = new Auswahl({ eintraege: ['Ja', 'Nein'] });
      this.frageAntwort = { beiJa, beiNein };
      this.zustand = 'frage';
    };
    this.zustand = 'text';
  }

  starteBlende(beiMitte) {
    this.blende = { wert: 0, phase: 'aus', beiMitte };
    this.zustand = 'blende';
  }

  aktualisiereBlende() {
    const b = this.blende;
    if (b.phase === 'aus') {
      b.wert += BLENDE_TEMPO;
      if (b.wert >= 1) {
        b.wert = 1;
        b.phase = 'ein';
        b.beiMitte?.();
        b.beiMitte = null;
      }
    } else if (b.phase === 'ein') {
      b.wert -= BLENDE_TEMPO;
      if (b.wert <= 0) {
        b.wert = 0;
        b.phase = 'keine';
        if (this.zustand === 'blende') this.zustand = 'frei';
      }
    }
  }

  // --- Kämpfe ----------------------------------------------------------------

  /** Wird nach jedem Kampf aufgerufen – Ergebnis auswerten, Welt aufräumen. */
  kampfEnde(ergebnis, zusatz = {}) {
    if (ergebnis === 'niederlage') {
      const ziel = spiel.letzterBoxenstopp;
      heileTeam();
      this.starteBlende(() => {
        this.wechsleKarte(ziel.karte, ziel.x, ziel.y, 'unten');
        this.zeigeText([
          'Dir wird schwarz vor Augen …',
          'Du wachst im Boxenstopp wieder auf. Alle Hardtekkmon sind frisch gemacht.',
        ]);
      });
      return;
    }

    if (zusatz.trainerId) merkeTrainerBesiegt(zusatz.trainerId);

    // Eine feste Begegnung verschwindet nur, wenn sie besiegt oder gefangen
    // wurde – wer wegläuft, findet sie später wieder.
    const erledigt = ergebnis === 'sieg' || ergebnis === 'gefangen';
    if (zusatz.npc && erledigt) {
      const npc = this.karte.npcs.find((eintrag) => eintrag.index === zusatz.npc.index);
      if (npc && npc.aktion?.art === 'wildkampf') npc.entfernt = true;
      if (zusatz.flagge) setzeFlagge(zusatz.flagge);
    }

    if (zusatz.trainerId) {
      const trainer = trainerInfo(zusatz.trainerId);
      const texte = [trainer.texte.niederlage];

      if (trainer.gig !== null) {
        gigErhalten(trainer.gig);
        texte.push(`Du erhältst die ${trainer.gig + 1}. Gig-Marke!`);
      }

      if (zusatz.trainerId === 'champion') {
        setzeFlagge('champion');
        texte.push('Die Halle tobt. Du bist der neue Kopf der Szene!');
        this.zeigeText(texte, () => {
          import('./abspann.js').then(({ Abspannszene }) => schiebe(new Abspannszene(this)));
        });
        speichereSpiel();
        return;
      }

      // Selten gibt es nach einem Sieg noch ein Fundstück obendrauf. Gezählt
      // werden die tatsächlich besiegten Trainer (die Menge enthält jeden nur
      // einmal), sodass jeder zehnte Trainer eines abwirft.
      if (spiel.besiegteTrainer.size % TRAINER_JE_BELOHNUNG === 0) {
        const fund = STRECKENFUNDE[Math.floor(Math.random() * STRECKENFUNDE.length)];
        gibGegenstand(fund, 1);
        effekt('item');
        texte.push(`${trainer.name} kramt noch was raus: 1× ${fund}!`);
      }

      this.zeigeText(texte);
      speichereSpiel();
      return;
    }

    if (ergebnis === 'gefangen' && zusatz.flagge) speichereSpiel();
  }

  starteKampfszene(vorgabe, zusatz = {}) {
    effekt('bestaetigen');
    this.starteBlende(() => {
      // Der Kampf wird erst nach der Blende geschoben, damit der Wechsel
      // hart auf den Beat kommt.
      this.kampfNachBlende = { vorgabe, zusatz };
    });
  }

  schiebeKampfWennBereit() {
    if (!this.kampfNachBlende) return;
    const { vorgabe, zusatz } = this.kampfNachBlende;
    this.kampfNachBlende = null;

    // Verzögerter Import vermeidet einen Kreis zwischen Welt und Kampf.
    import('./kampfszene.js').then(({ Kampfszene }) => {
      schiebe(new Kampfszene({
        kampf: starteKampf(vorgabe),
        beiEnde: (ergebnis) => this.kampfEnde(ergebnis, zusatz),
      }));
    });
  }

  starteWildkampf(spezies, stufe, zusatz = {}) {
    const wildesMon = erstelleHardtekkmon(spezies, stufe);
    merkeGesehen(wildesMon.artId);
    this.starteKampfszene({ art: 'wild', team: spiel.team, wildesMon }, zusatz);
  }

  starteTrainerkampf(trainerId, npc) {
    const trainer = trainerInfo(trainerId);
    const gegnerTeam = trainer.team.map(([name, stufe]) => erstelleHardtekkmon(name, stufe));
    this.starteKampfszene(
      { art: 'trainer', team: spiel.team, gegnerTeam, trainer },
      { trainerId, npc },
    );
  }

  // --- Eingabe ---------------------------------------------------------------

  aktualisieren() {
    this.bildzaehler += 1;
    this.aktualisiereFiguren();

    switch (this.zustand) {
      case 'blende':
        this.aktualisiereBlende();
        this.schiebeKampfWennBereit();
        break;

      case 'text':
        if (this.textfenster.aktualisieren()) {
          const danach = this.nachText;
          this.nachText = null;
          this.zustand = 'frei';
          danach?.();
        }
        break;

      case 'frage': {
        const antwort = this.frageAuswahl.aktualisieren();
        if (antwort === 'bestaetigt' || antwort === 'abbruch') {
          const ja = antwort === 'bestaetigt' && this.frageAuswahl.index === 0;
          const { beiJa, beiNein } = this.frageAntwort;
          this.frageAuswahl = null;
          this.frageAntwort = null;
          this.zustand = 'frei';
          if (ja) beiJa?.();
          else beiNein?.();
        }
        break;
      }

      case 'anmarsch':
        this.aktualisiereAnmarsch();
        break;

      case 'heilung':
        this.aktualisiereHeilung();
        break;

      case 'feuerwerk':
        this.aktualisiereFeuerwerk();
        break;

      case 'frei':
      default:
        this.aktualisiereFrei();
        break;
    }

    if (this.blende.phase !== 'keine' && this.zustand !== 'blende') this.aktualisiereBlende();
  }

  aktualisiereFrei() {
    if (this.figur.laeuft) {
      const tempo = gehalten('B') ? RENN_TEMPO : LAUF_TEMPO;
      if (bewegeFigur(this.figur, tempo)) this.nachSchritt();
      return;
    }

    if (gedrueckt('START')) {
      import('./menue.js').then(({ Menueszene }) => schiebe(new Menueszene(this)));
      return;
    }
    if (gedrueckt('SELECT')) {
      this.benutzeSelectGegenstand();
      return;
    }

    // Steht der Spieler nach dem sechsten Anschlag der Laufformation, warten
    // A und B auf die Schlussfolge und tun nichts von dem, was sie sonst tun
    // (ansprechen bzw. rennen) – siehe game/saeulenraetsel.js.
    if (this.saeulenTastenBereit()) {
      for (const taste of ['A', 'B']) {
        if (gedrueckt(taste)) {
          this.saeulenTaste(taste);
          return;
        }
      }
    }

    if (gedrueckt('A')) {
      this.interagiere();
      return;
    }

    const neueRichtung = this.gewuenschteRichtung();
    if (!neueRichtung) {
      this.drehzeit = 0;
      this.figur.bild = 0;
      return;
    }

    if (this.figur.richtung !== neueRichtung) {
      this.figur.richtung = neueRichtung;
      this.drehzeit = DREHZEIT;
      this.merkePosition();
      return;
    }
    if (this.drehzeit > 0) {
      this.drehzeit -= 1;
      return;
    }

    this.versucheSchritt();
  }

  /**
   * Gewünschte Laufrichtung. Neben gehaltenen Tasten zählt auch ein kurzes
   * Antippen – auf dem Touchscreen tippt man häufiger, als man hält, und ohne
   * das würde ein kurzer Tipper wirkungslos verpuffen.
   * @returns {string|null}
   */
  gewuenschteRichtung() {
    const eingabe = eingaberichtung();
    if (eingabe.y < 0) return 'oben';
    if (eingabe.y > 0) return 'unten';
    if (eingabe.x < 0) return 'links';
    if (eingabe.x > 0) return 'rechts';

    for (const [taste, richtung] of [['UP', 'oben'], ['DOWN', 'unten'], ['LEFT', 'links'], ['RIGHT', 'rechts']]) {
      if (gedrueckt(taste)) return richtung;
    }
    return null;
  }

  versucheSchritt() {
    const ziel = blickfeld(this.figur);

    if (!this.karte.innen(ziel.x, ziel.y)) {
      this.versucheKartenwechsel();
      return;
    }
    if (!this.karte.istBegehbar(ziel.x, ziel.y)) return;

    starteSchritt(this.figur);
  }

  /** Übergang an den Kartenrand: Nachbarkarten hängen mittig aneinander. */
  versucheKartenwechsel() {
    const seite = { oben: 'norden', unten: 'sueden', links: 'westen', rechts: 'osten' }[this.figur.richtung];
    const zielId = this.karte.daten.verbindungen?.[seite];
    if (!zielId) return;

    const ziel = kartendaten(zielId);
    if (!ziel) return;

    const waagerecht = seite === 'norden' || seite === 'sueden';
    const versatz = waagerecht
      ? Math.floor(ziel.breite / 2) - Math.floor(this.karte.breite / 2)
      : Math.floor(ziel.hoehe / 2) - Math.floor(this.karte.hoehe / 2);

    const neuX = waagerecht
      ? Math.max(1, Math.min(ziel.breite - 2, this.figur.x + versatz))
      : (seite === 'westen' ? ziel.breite - 2 : 1);
    const neuY = waagerecht
      ? (seite === 'norden' ? ziel.hoehe - 2 : 1)
      : Math.max(1, Math.min(ziel.hoehe - 2, this.figur.y + versatz));

    const ankunft = this.freieAnkunft(ziel, neuX, neuY, waagerecht);
    if (!ankunft) return;

    this.starteBlende(() => this.wechsleKarte(zielId, ankunft.x, ankunft.y));
  }

  /**
   * Sucht rund um die berechnete Anschlussstelle eine begehbare Kachel. Ohne
   * diese Absicherung könnte ein enger Kartenrand den Spieler in einer festen
   * Kachel absetzen.
   * @returns {{ x: number, y: number }|null}
   */
  freieAnkunft(ziel, x, y, waagerecht) {
    const kachelFest = (pruefX, pruefY) => {
      if (pruefX < 0 || pruefY < 0 || pruefX >= ziel.breite || pruefY >= ziel.hoehe) return true;
      return Boolean(kachelInfo(ziel.kacheln[pruefY * ziel.breite + pruefX]).fest);
    };

    for (const abstand of [0, -1, 1, -2, 2, -3, 3]) {
      const pruefX = waagerecht ? x + abstand : x;
      const pruefY = waagerecht ? y : y + abstand;
      if (!kachelFest(pruefX, pruefY)) return { x: pruefX, y: pruefY };
    }
    return null;
  }

  /** Läuft nach jedem abgeschlossenen Schritt. */
  nachSchritt() {
    this.merkePosition();
    this.warpSperre = false;
    this.verfolgeSaeulenlauf();

    const warp = this.karte.warpAn(this.figur.x, this.figur.y);
    if (warp) {
      if (warp.bedingung && !this.bedingungErfuellt(warp.bedingung)) {
        this.zeigeText(warp.sperrtext ?? 'Hier geht es gerade nicht weiter.');
        return;
      }
      effekt('zurueck');
      this.starteBlende(() => {
        this.wechsleKarte(warp.ziel, warp.zx, warp.zy);
        this.merkeBoxenstoppWennNoetig();
      });
      return;
    }

    if (this.pruefeTrainerblick()) return;
    this.pruefeBegegnung();
  }

  // --- Heilsequenz ------------------------------------------------------------

  /**
   * Startet die Heilung samt eigener Musik. Geheilt wird sofort (der
   * Spielstand soll auch dann stimmen, wenn die Szene zwischendrin verlassen
   * wird); sichtbar wird das Ganze über die sechs Takes, die aber erst mit
   * dem Kick-Einsatz beginnen – solange läuft nur das Intro des Stücks.
   */
  starteHeilung() {
    heileTeam();
    merkeBoxenstopp(this.karte.id, this.figur.x, this.figur.y);
    speichereSpiel();

    spieleTrack('heilung');
    // Die Lage des Plattenspielers wird einmal gesucht und gemerkt; fehlt er
    // auf der Karte, läuft die Sequenz einfach ohne die Platten weiter.
    this.heilung = {
      vorlauf: HEIL_VORLAUF_BILDER,
      tick: 0,
      rest: HEIL_TICK_BILDER,
      // Im Vorlauf bleibt das Bild unangetastet: kein Blitz, keine Platte.
      blitz: 0,
      blitzRest: HEIL_BLITZ_BILDER,
      teller: this.karte.findeKachel('heilteller'),
    };
    this.zustand = 'heilung';
  }

  /** Läuft die Heilsequenz schon sichtbar, ist das Intro also durch? */
  heilungLaeuft() {
    return Boolean(this.heilung) && this.heilung.vorlauf <= 0;
  }

  aktualisiereHeilung() {
    const stand = this.heilung;

    // --- Intro: Musik läuft, im Bild passiert noch nichts ------------------
    if (stand.vorlauf > 0) {
      stand.vorlauf -= 1;
      if (stand.vorlauf > 0) return;
      // Die Kick setzt ein – ab hier zünden Stroboskop, Platten und
      // Heilanimation gemeinsam.
      this.zuendeHeilTakt(stand);
      return;
    }

    // --- Stroboskop: verglüht über einen Blitzabstand und zündet neu -------
    stand.blitz = Math.max(0, stand.blitz - 1 / HEIL_BLITZ_BILDER);
    stand.blitzRest -= 1;
    if (stand.blitzRest <= 0) {
      stand.blitzRest = HEIL_BLITZ_BILDER;
      stand.blitz = 1;
    }

    stand.rest -= 1;
    if (stand.rest > 0) return;

    stand.tick += 1;
    if (stand.tick >= HEIL_TICKS) {
      this.heilung = null;
      spieleTrack(this.karte.daten.musik);
      this.zeigeText('Alles wieder frisch. Bis zum nächsten Mal!');
      return;
    }

    stand.rest = HEIL_TICK_BILDER;
    this.zuendeHeilTakt(stand);
  }

  /** Beginn eines Takes: Blitz neu zünden und den Blitztakt neu setzen. */
  zuendeHeilTakt(stand) {
    stand.blitz = 1;
    stand.blitzRest = HEIL_BLITZ_BILDER;
    effekt('heilPuls');
  }

  // --- Briefsäule im Casino ----------------------------------------------------

  /** Geht es von diesem Feld aus in diese Richtung nicht mehr weiter? */
  istAnschlag(feld, richtung) {
    const vektor = RICHTUNGS_VEKTOR[richtung];
    return !this.karte.istBegehbar(feld.x + vektor.x, feld.y + vektor.y);
  }

  /**
   * Die Säule ansprechen. Drei Fälle: Sie ist nach einer Belohnung noch
   * gesperrt, es hängt ein frischer Brief dran, oder man hat ihn schon in der
   * Hand und liest ihn eben noch mal.
   *
   * Gelesen wird immer an der Säule – jedes Lesen setzt den Versuch damit
   * zugleich auf Anfang, und genau deshalb kann man beliebig oft neu
   * ansetzen, ohne dass es einen Brief mehr kostet.
   * @param {{x: number, y: number}} saeule
   */
  spricheSaeule(saeule) {
    const stand = saeulenStand(this.karte.id);

    const rest = sperreRest(stand);
    if (rest > 0) {
      effekt('zurueck');
      this.zeigeText(sperrText(rest));
      return;
    }

    const schonAbgenommen = Boolean(stand.abfolge);
    if (!schonAbgenommen) {
      // Ausgewürfelt wird nur gegen den Saal selbst, nicht gegen die Leute
      // darin: Der Brief ist ein Zettel und darf nicht davon abhängen, wo
      // gerade ein Zocker steht. Beim Laufen zählt eine Figur dagegen sehr
      // wohl als Anschlag – da geht es ja tatsächlich nicht weiter.
      const frei = (x, y) => !this.karte.istFest(x, y);
      const abfolge = wuerfleAbfolge(startfelder(saeule, frei), frei);
      if (!abfolge) {
        this.zeigeText('Am Nagel hängt ein blauer Brief. Innen ist er leer.');
        return;
      }
      stand.abfolge = abfolge;
      speichereSpiel();
    }

    this.raetsel = new Saeulenlauf(stand.abfolge);
    effekt('item');
    this.zeigeText(briefText(stand.abfolge, schonAbgenommen));
  }

  /** Schreibt den gerade gemachten Schritt in den laufenden Versuch. */
  verfolgeSaeulenlauf() {
    if (!this.raetsel) return;
    const passt = this.raetsel.schritt(
      this.figur.richtung,
      this.figur,
      (feld, richtung) => this.istAnschlag(feld, richtung),
    );
    if (!passt) this.raetsel = null;
  }

  /** Sind alle sechs Läufe durch und wartet die Säule auf die Schlussfolge? */
  saeulenTastenBereit() {
    if (!this.raetsel) return false;
    return this.raetsel.tastenBereit(
      this.figur,
      (feld, richtung) => this.istAnschlag(feld, richtung),
    );
  }

  saeulenTaste(taste) {
    const ergebnis = this.raetsel.taste(taste);
    if (ergebnis === 'fehler') {
      this.raetsel = null;
      effekt('zurueck');
      return;
    }
    if (ergebnis === 'geloest') {
      this.loeseSaeule();
      return;
    }
    effekt('auswahl');
  }

  /**
   * Die Säule gibt auf. Ausgezahlt und weggespeichert wird sofort – der
   * Spielstand soll auch dann stimmen, wenn mitten im Feuerwerk Schluss ist.
   * Sichtbar wird es über Kick und Feuerwerk, der Text kommt danach.
   */
  loeseSaeule() {
    const stand = saeulenStand(this.karte.id);
    stand.abfolge = null;
    stand.bereitAb = Date.now() + SPERRE_MS;
    aendereGeld(BELOHNUNG);
    speichereSpiel();

    this.raetsel = null;
    this.feuerwerk = this.erzeugeFeuerwerk();
    this.zustand = 'feuerwerk';
    spieleKlang('belohnung');
  }

  /**
   * Legt die Raketen an. Sie starten gleichmäßig über die Zeit verteilt, aber
   * nur so lange, dass die letzte noch steigen und ausbrennen kann – sonst
   * hinge am Ende ein halbes Feuerwerk in der Luft, wenn die Kick schon
   * durch ist.
   */
  erzeugeFeuerwerk() {
    const letzterStart = Math.max(0, FEUERWERK_BILDER - RAKETEN_STEIGZEIT - FUNKEN_LEBEN);
    const raketen = [];
    for (let i = 0; i < FEUERWERK_RAKETEN; i += 1) {
      raketen.push({
        start: Math.round((i / FEUERWERK_RAKETEN) * letzterStart),
        x: 24 + Math.random() * (BREITE - 48),
        zuendhoehe: 20 + Math.random() * 56,
        y: HOEHE + 4,
        geplatzt: false,
      });
    }
    return { bild: 0, raketen, funken: [] };
  }

  aktualisiereFeuerwerk() {
    const stand = this.feuerwerk;
    stand.bild += 1;

    for (const rakete of stand.raketen) {
      if (rakete.geplatzt || stand.bild < rakete.start) continue;
      rakete.y -= RAKETEN_TEMPO;
      if (rakete.y > rakete.zuendhoehe) continue;
      rakete.geplatzt = true;
      this.zuendeFunken(stand, rakete.x, rakete.y);
    }

    for (const funke of stand.funken) {
      funke.x += funke.vx;
      funke.y += funke.vy;
      funke.vy += FUNKEN_SCHWERE;
      funke.leben -= 1;
    }
    stand.funken = stand.funken.filter((funke) => funke.leben > 0);

    if (stand.bild < FEUERWERK_BILDER) return;

    this.feuerwerk = null;
    this.zeigeText([
      `In der Säule klackt es. Eine Klappe geht auf und spuckt ${BELOHNUNG} Geld aus.`,
      'Der Brief zerfällt dir in der Hand. Am Nagel hängt in einer halben Stunde ein neuer.',
    ]);
  }

  /** Eine geplatzte Rakete: Funken gleichmäßig im Kreis, alle in einer Farbe. */
  zuendeFunken(stand, x, y) {
    const farbe = FEUERWERK_FARBEN[Math.floor(Math.random() * FEUERWERK_FARBEN.length)];
    for (let i = 0; i < FEUERWERK_FUNKEN; i += 1) {
      const winkel = (i / FEUERWERK_FUNKEN) * Math.PI * 2 + Math.random() * 0.3;
      const tempo = 0.7 + Math.random() * 1.5;
      stand.funken.push({
        x,
        y,
        vx: Math.cos(winkel) * tempo,
        vy: Math.sin(winkel) * tempo,
        farbe,
        leben: Math.round(FUNKEN_LEBEN * (0.6 + Math.random() * 0.4)),
      });
    }
  }

  // --- Klopftür im Casino -----------------------------------------------------

  /**
   * Dreimal hintereinander an dieselbe Tür klopfen, dann geht sie auf. Bloß
   * anlaufen oder einmal (bzw. zweimal) interagieren bleibt wirkungslos –
   * genau das verlangt das Schild daneben. Jede andere Interaktion
   * dazwischen setzt den Zähler zurück (siehe interagiere()).
   */
  klopfeAnTuer(ziel) {
    const dieselbeTuer = this.klopfZiel && this.klopfZiel.x === ziel.x && this.klopfZiel.y === ziel.y;
    this.klopfAnzahl = dieselbeTuer ? this.klopfAnzahl + 1 : 1;
    this.klopfZiel = ziel;

    if (this.klopfAnzahl < 3) {
      effekt('auswahl');
      return;
    }

    this.klopfZiel = null;
    this.klopfAnzahl = 0;

    const tuerZiel = KLOPFTUER_ZIEL[this.karte.id];
    if (!tuerZiel) return;

    effekt('bestaetigen');
    this.starteBlende(() => this.wechsleKarte(tuerZiel.zielId, tuerZiel.x, tuerZiel.y));
  }

  // --- Schlüsselgegenstand auf SELECT -----------------------------------------

  /**
   * Der Gegenstand auf der SELECT-Taste (siehe legeAufSelect() in
   * game/spielstand.js, gesetzt über den Beutel) lässt sich unterwegs direkt
   * benutzen, ohne durchs Menü zu gehen. Karte, Taschenlampe und ähnliche
   * Schlüsselgegenstände bekommen hier ihre eigentliche Wirkung; alles ohne
   * eigene Behandlung zeigt schlicht seinen Beschreibungstext.
   */
  benutzeSelectGegenstand() {
    const name = selectGegenstand();
    if (!name || !hatGegenstand(name)) {
      effekt('zurueck');
      this.zeigeText('Kein Gegenstand auf SELECT gelegt.');
      return;
    }

    effekt('bestaetigen');

    if (name === 'Taschenlampe') {
      const an = schalteTaschenlampe();
      this.zeigeText(an ? 'Taschenlampe an.' : 'Taschenlampe aus.');
      return;
    }
    if (name === 'Tekkdex') {
      import('./tekkdex.js').then(({ Tekkdexszene }) => schiebe(new Tekkdexszene()));
      return;
    }
    if (name === 'Gigpass') {
      import('./menue.js').then(({ Menueszene }) => {
        const menue = new Menueszene(this);
        menue.zeigeGigpass = true;
        schiebe(menue);
      });
      return;
    }
    if (name === 'Stadtplan') {
      this.zeigeText(`Du bist in ${this.karte.daten.name}.`);
      return;
    }
    this.zeigeText(GEGENSTAENDE[name]?.text ?? '…');
  }

  merkeBoxenstoppWennNoetig() {
    if (this.karte.id.startsWith('boxenstopp_')) {
      merkeBoxenstopp(this.karte.id, this.figur.x, this.figur.y);
    }
  }

  bedingungErfuellt(bedingung) {
    if (bedingung.gigs !== undefined && anzahlGigs() < bedingung.gigs) return false;
    if (bedingung.trainerBesiegt && !trainerBesiegt(bedingung.trainerBesiegt)) return false;
    if (bedingung.flagge && !hatFlagge(bedingung.flagge)) return false;
    return true;
  }

  pruefeBegegnung() {
    const gruppe = this.karte.begegnungsgruppe(this.figur.x, this.figur.y);
    if (!gruppe || spiel.team.length === 0) return;
    if (Math.random() >= BEGEGNUNGSCHANCE) return;

    const tabelle = begegnungstabelle(this.karte.daten.begegnungen);
    if (!tabelle) return;

    const eintrag = ausTabelle(tabelle);
    const stufe = eintrag.min + Math.floor(Math.random() * (eintrag.max - eintrag.min + 1));

    // Seltener Ausreißer im hohen Gras: Statt der Tabelle taucht mit 1 zu 50
    // ein legendäres Hardtekkmon auf. Es kommt ein paar Stufen über dem
    // Niveau der Route, damit es sich abhebt, ohne den Fortschritt zu
    // zerlegen – die festen Legenden auf den Karten bleiben davon unberührt.
    if (GRASGRUPPEN.has(gruppe) && Math.random() < LEGENDEN_CHANCE) {
      const legenden = ARTEN.filter((art) => art.legende);
      const gewaehlt = legenden[Math.floor(Math.random() * legenden.length)];
      if (gewaehlt) {
        this.starteWildkampf(gewaehlt.name, Math.min(100, eintrag.max + 3));
        return;
      }
    }

    this.starteWildkampf(eintrag.art, stufe);
  }

  /** Sieht ein noch nicht besiegter Trainer den Spieler? */
  pruefeTrainerblick() {
    if (!ersterKaempfer()) return false;

    for (const npc of this.karte.npcs) {
      if (npc.entfernt || !npc.trainer || trainerBesiegt(npc.trainer)) continue;

      const trainer = trainerInfo(npc.trainer);
      const weite = trainer.blick ?? 0;
      if (weite <= 0) continue;

      const vektor = RICHTUNGS_VEKTOR[npc.blick ?? npc.richtung];
      for (let schritt = 1; schritt <= weite; schritt += 1) {
        const x = npc.x + vektor.x * schritt;
        const y = npc.y + vektor.y * schritt;
        if (this.karte.istFest(x, y)) break;
        if (x === this.figur.x && y === this.figur.y) {
          this.starteAnmarsch(npc, schritt - 1);
          return true;
        }
      }
    }
    return false;
  }

  starteAnmarsch(npc, schritte) {
    this.zustand = 'anmarsch';
    this.anmarsch = { npc, schritte, wartezeit: 36 };
    npc.richtung = npc.blick ?? npc.richtung;
    effekt('bestaetigen');
  }

  aktualisiereAnmarsch() {
    const stand = this.anmarsch;
    if (stand.wartezeit > 0) {
      stand.wartezeit -= 1;
      return;
    }

    const npc = stand.npc;
    if (npc.laeuft) {
      if (bewegeFigur(npc, LAUF_TEMPO)) stand.schritte -= 1;
      return;
    }
    if (stand.schritte > 0) {
      starteSchritt(npc);
      return;
    }

    this.figur.richtung = GEGENRICHTUNG[npc.richtung];
    const trainer = trainerInfo(npc.trainer);
    this.anmarsch = null;
    this.zeigeText(trainer.texte.start, () => this.starteTrainerkampf(npc.trainer, npc));
  }

  // --- Figuren ---------------------------------------------------------------

  aktualisiereFiguren() {
    for (const npc of this.karte?.npcs ?? []) {
      if (npc.entfernt) continue;

      if (npc.bewegung === 'zocker') {
        this.aktualisiereZocker(npc);
        continue;
      }

      if (npc.laeuft) continue;
      if (npc.bewegung !== 'drehen') continue;

      npc.wartezeit -= 1;
      if (npc.wartezeit <= 0) {
        npc.wartezeit = 90 + Math.floor(Math.random() * 120);
        const richtungen = ['oben', 'unten', 'links', 'rechts'];
        npc.richtung = richtungen[Math.floor(Math.random() * richtungen.length)];
      }
    }
  }

  /**
   * Die Zocker im Casino. Vier Zustände, die ineinander übergehen:
   *
   *   zocken  – kleben am Automaten, starren ihn an. Der Normalzustand.
   *             Ab und zu schrecken sie hoch (-> schreck) und ganz selten
   *             gewinnen sie etwas (-> jubel).
   *   schreck – zucken kurz zusammen und sehen sich um.
   *   wirr    – rennen ein paar Schritte völlig planlos umher.
   *   jubel   – nach einem Gewinn fünf Runden quer durch den Saal.
   *
   * Nach wirr und jubel geht es immer zurück an den eigenen Automaten.
   */
  aktualisiereZocker(npc) {
    if (npc.zustand === undefined) this.setzeZockerZustand(npc, 'zocken');
    // Die Notbremse laeuft in echten Bildern, auch waehrend eines Schritts.
    if (npc.zustand === 'jubel') npc.jubelRest -= 1;

    // Ein begonnener Schritt wird immer zu Ende gelaufen.
    if (npc.laeuft) {
      if (!bewegeFigur(npc, ZOCKER_TEMPO[npc.zustand] ?? 2)) return;
      if (npc.zustand === 'zurueck' && npc.x === npc.platz.x && npc.y === npc.platz.y) {
        this.setzeZockerZustand(npc, 'zocken');
      }
      return;
    }

    npc.wartezeit -= 1;

    switch (npc.zustand) {
      case 'zocken': {
        npc.richtung = 'links';
        if (npc.wartezeit > 0) return;
        // Selten ein Gewinn, sonst nur ein Schreck.
        if (Math.random() < ZOCKER_GEWINN_CHANCE) {
          npc.runden = ZOCKER_RUNDEN;
          npc.jubelRest = ZOCKER_JUBEL_HOECHSTDAUER;
          this.setzeZockerZustand(npc, 'jubel');
        } else {
          this.setzeZockerZustand(npc, 'schreck');
        }
        return;
      }

      case 'schreck': {
        // Zusammenzucken: dreht sich hektisch um, läuft aber noch nicht.
        npc.richtung = ZOCKER_RICHTUNGEN[Math.floor(Math.random() * 4)];
        if (npc.wartezeit > 0) return;
        npc.schritte = 3 + Math.floor(Math.random() * 5);
        this.setzeZockerZustand(npc, 'wirr');
        return;
      }

      case 'wirr': {
        if (npc.schritte <= 0) { this.setzeZockerZustand(npc, 'zurueck'); return; }
        npc.schritte -= 1;
        this.laufeZockerSchritt(npc, ZOCKER_RICHTUNGEN[Math.floor(Math.random() * 4)]);
        return;
      }

      case 'jubel': {
        // Fünf Runden quer durch den Saal: immer die nächste Ecke ansteuern.
        // Die Notbremse über wartezeit stellt sicher, dass ein Zocker auch
        // dann irgendwann zurückkehrt, wenn ihm der Weg dauerhaft verstellt
        // ist – sonst würde er bis zum Kartenwechsel im Saal kreisen.
        if (npc.runden <= 0 || npc.jubelRest <= 0) {
          this.setzeZockerZustand(npc, 'zurueck');
          return;
        }
        const ziel = this.zockerEcke(npc);
        if (Math.abs(npc.x - ziel.x) + Math.abs(npc.y - ziel.y) <= ZOCKER_ECKE_NAH) {
          npc.ecke = (npc.ecke + 1) % 4;
          // Eine volle Runde ist herum, wenn wieder die erste Ecke ansteht.
          if (npc.ecke === 0) npc.runden -= 1;
          return;
        }
        this.laufeZockerSchritt(npc, richtungenZu(npc, ziel));
        return;
      }

      case 'zurueck':
      default: {
        // Angekommen – oder lange genug unterwegs. Der Zeitpuffer ist die
        // Absicherung gegen zwei Zocker, die sich gegenseitig den eigenen
        // Automaten verstellen: Dann setzt sich eben jeder an den, vor dem
        // er gerade steht, statt bis in alle Ewigkeit hin und her zu laufen.
        if ((npc.x === npc.platz.x && npc.y === npc.platz.y) || npc.wartezeit <= 0) {
          this.setzeZockerZustand(npc, 'zocken');
          return;
        }
        this.laufeZockerSchritt(npc, richtungenZu(npc, npc.platz));
        return;
      }
    }
  }

  setzeZockerZustand(npc, zustand) {
    npc.zustand = zustand;
    npc.ecke = npc.ecke ?? 0;
    npc.wartezeit = ZOCKER_WARTEZEIT[zustand] ?? 60;
    if (zustand === 'zocken') npc.wartezeit += Math.floor(Math.random() * ZOCKER_WARTE_STREUUNG);
  }

  /** Die vier Ecken des Saals, die beim Jubel abgeklappert werden. */
  zockerEcke(npc) {
    const ecken = [
      { x: 3, y: 3 },
      { x: this.karte.breite - 4, y: 3 },
      { x: this.karte.breite - 4, y: this.karte.hoehe - 4 },
      { x: 3, y: this.karte.hoehe - 4 },
    ];
    return ecken[npc.ecke % ecken.length];
  }

  /**
   * Setzt den Zocker einen Schritt in Bewegung – aber nur, wenn das Ziel frei
   * ist. Sonst bleibt er stehen und dreht sich nur; der nächste Durchlauf
   * versucht es erneut. Dadurch laufen die Zocker nie in Wände, in Automaten
   * oder in den Spieler.
   */
  laufeZockerSchritt(npc, richtungen) {
    const liste = Array.isArray(richtungen) ? richtungen : [richtungen];
    npc.richtung = liste[0];
    for (const richtung of liste) {
      const vektor = RICHTUNGS_VEKTOR[richtung];
      const zielX = npc.x + vektor.x;
      const zielY = npc.y + vektor.y;
      if (!this.karte.istBegehbar(zielX, zielY)) continue;
      if (this.figur.x === zielX && this.figur.y === zielY) continue;
      npc.richtung = richtung;
      starteSchritt(npc);
      return;
    }
    // Alles dicht: stehen bleiben und es im nächsten Bild erneut versuchen.
  }

  // --- Ansprechen ------------------------------------------------------------

  interagiere() {
    let ziel = blickfeld(this.figur);

    // Tresen und Tische blockieren das Laufen, aber nicht den Blick: Steht
    // dort jemand oder etwas Ansprechbares direkt dahinter, zählt das als
    // Ziel – man muss nicht drum herumlaufen, um z. B. die Schwester am
    // Empfangstresen anzusprechen.
    if (this.karte.reichweiteHindernis(ziel.x, ziel.y)) {
      const dahinter = blickfeld(this.figur, 2);
      if (this.karte.npcAn(dahinter.x, dahinter.y) || this.karte.schildAn(dahinter.x, dahinter.y)) {
        ziel = dahinter;
      }
    }

    // Die Kachel steht schon hier fest (nicht erst unten), weil das Klopfen
    // an der Tür zurückgesetzt werden muss, sobald irgendetwas anderes
    // angesprochen wird – auch ein NPC, ein Schild oder ein Gegenstand.
    const kachel = this.karte.kachelAn(ziel.x, ziel.y);
    if (kachel !== 'klopftuer' && this.klopfZiel) {
      this.klopfZiel = null;
      this.klopfAnzahl = 0;
    }

    const npc = this.karte.npcAn(ziel.x, ziel.y);
    if (npc) {
      this.sprich(npc);
      return;
    }

    const schild = this.karte.schildAn(ziel.x, ziel.y);
    if (schild) {
      this.zeigeText(schild.text);
      return;
    }

    const gegenstand = this.karte.gegenstandAn(ziel.x, ziel.y);
    if (gegenstand) {
      this.nimmGegenstand(gegenstand, ziel);
      return;
    }

    if (kachel === 'computer') {
      effekt('bestaetigen');
      import('./lager.js').then(({ Lagerszene }) => schiebe(new Lagerszene()));
      return;
    }
    if (kachel === 'briefsaeule') {
      this.spricheSaeule(ziel);
      return;
    }
    if (kachel === 'klopftuer') {
      this.klopfeAnTuer(ziel);
      return;
    }
    if (kachel === 'djpult') {
      effekt('bestaetigen');
      import('./sequenzer.js').then(({ Sequenzerszene }) => schiebe(new Sequenzerszene()));
      return;
    }
    if (kachel === 'automat') {
      if (this.karte.automatBesetzt(ziel.x, ziel.y)) {
        this.zeigeText('Besetzt. Der lässt hier nicht los.');
        return;
      }
      effekt('bestaetigen');
      import('./casino.js').then(({ Casinoszene }) => schiebe(new Casinoszene('bandit')));
      return;
    }

    const kachelText = {
      plattenspieler: 'Ein Plattenspieler. Die Nadel läuft noch, die Platte auch.',
      heilgeraet: 'Das Gerät summt zufrieden vor sich hin.',
      box: 'Eine Box, größer als du. Sie brummt leise.',
      verstaerker: 'Ein Verstärker. Der Zeiger steht seit Jahren im roten Bereich.',
      regal: 'Nur Zubehör. Kabel, Nadeln, Klebeband.',
      tonne: 'Leere Dosen, so weit das Auge reicht.',
      bett: 'Dein Bett. Sieht verlockend aus.',
      gully: 'Von da unten kommt ein tiefes Wummern.',
      tresen: 'Ein Tresen. Sauber gewischt.',
      tisch: 'Ein Tisch. Nichts Interessantes drauf.',
    }[kachel];
    if (kachelText) this.zeigeText(kachelText);
  }

  nimmGegenstand(gegenstand, ziel) {
    const schluessel = `${this.karte.id}:${ziel.x},${ziel.y}`;

    if (gegenstand.starter) {
      this.nimmStarter(gegenstand, schluessel);
      return;
    }
    if (schonAufgesammelt(schluessel)) {
      this.zeigeText('Hier liegt nichts mehr.');
      return;
    }

    merkeAufgesammelt(schluessel);
    gibGegenstand(gegenstand.gegenstand, gegenstand.anzahl ?? 1);
    effekt('item');
    const anzahl = gegenstand.anzahl ?? 1;
    this.zeigeText(`Du findest ${anzahl}× ${gegenstand.gegenstand}!`);
  }

  nimmStarter(gegenstand, schluessel) {
    if (spiel.startgewaehlt) {
      this.zeigeText('Die anderen Packs sind für die anderen. Finger weg.');
      return;
    }

    const name = STARTER[gegenstand.starter];
    const daten = artNachName(name);
    this.frage(
      `Das Samplepack mit ${name} vom Typ ${daten.typen.join('/')}. Nehmen?`,
      () => {
        merkeAufgesammelt(schluessel);
        waehleStarter(name);
        setzeFlagge('starter');
        gibGegenstand('Samplepack', 5);
        effekt('gefangen');
        this.zeigeText([
          `${name} gehört jetzt dir!`,
          'Prof. Wummer: "Nimm noch fünf Samplepacks mit, {name}. Und pass auf dich auf."',
        ]);
      },
    );
  }

  sprich(npc) {
    npc.richtung = GEGENRICHTUNG[this.figur.richtung];

    if (npc.trainer && !trainerBesiegt(npc.trainer)) {
      if (!ersterKaempfer()) {
        this.zeigeText('Ohne einsatzbereites Hardtekkmon wird das nichts.');
        return;
      }
      const trainer = trainerInfo(npc.trainer);
      this.zeigeText(trainer.texte.start, () => this.starteTrainerkampf(npc.trainer, npc));
      return;
    }
    if (npc.trainer) {
      const trainer = trainerInfo(npc.trainer);
      this.zeigeText(trainer.texte.sieg);
      return;
    }

    const aktion = npc.aktion;
    if (!aktion) {
      this.zeigeText(npc.text ?? '…');
      return;
    }

    switch (aktion.art) {
      case 'heilen':
        this.frage(npc.text, () => this.starteHeilung(),
          () => this.zeigeText('Auch gut. Pass auf dich auf.'));
        break;

      case 'laden':
        this.zeigeText(npc.text, () => {
          import('./laden.js').then(({ Ladenszene }) => {
            schiebe(new Ladenszene(aktion.waren));
          });
        });
        break;

      case 'casino':
        this.zeigeText(npc.text, () => {
          import('./casino.js').then(({ Casinoszene }) => {
            schiebe(new Casinoszene(aktion.spiel));
          });
        });
        break;

      case 'professor':
        this.zeigeText(spiel.startgewaehlt
          ? 'Prof. Wummer: "Na, {name}, läuft die Anlage? Dann raus mit dir, die Welt wartet."'
          : npc.text);
        break;

      case 'wildkampf':
        this.zeigeText(npc.text ?? '…', () => {
          this.starteWildkampf(aktion.spezies, aktion.stufe, { npc, flagge: npc.flagge });
        });
        break;

      case 'wache':
        if (this.bedingungErfuellt(aktion.bedingung)) {
          npc.entfernt = true;
          setzeFlagge(`wache:${this.karte.id}:${npc.index}`);
          this.zeigeText(aktion.freiText ?? 'Geht klar. Du kannst durch.');
        } else {
          this.zeigeText(npc.text);
        }
        break;

      case 'gib':
        if (hatFlagge(aktion.flagge)) {
          this.zeigeText(aktion.nochmalText ?? npc.text);
        } else {
          setzeFlagge(aktion.flagge);
          gibGegenstand(aktion.gegenstand, aktion.anzahl ?? 1);
          effekt('item');
          this.zeigeText([npc.text, `Du erhältst ${aktion.anzahl ?? 1}× ${aktion.gegenstand}!`]);
        }
        break;

      default:
        this.zeigeText(npc.text ?? '…');
        break;
    }
  }

  // --- Darstellung ------------------------------------------------------------

  zeichnen(ctx) {
    if (!this.karte) return;

    const spielerPixel = figurPixel(this.figur);
    const kamera = kameraPosition(this.karte, {
      x: spielerPixel.x + KACHEL / 2,
      y: spielerPixel.y + KACHEL / 2,
    });

    this.karte.zeichne(ctx, kamera, this.bildzaehler);
    this.zeichneGegenstaende(ctx, kamera);
    if (this.briefsaeule) this.zeichneSaeulenbrief(ctx, kamera);
    this.zeichneFiguren(ctx, kamera, spielerPixel);

    if (this.karte.daten.dunkel) this.zeichneDunkelheit(ctx, spielerPixel, kamera);
    if (this.heilungLaeuft()) this.zeichneHeilteller(ctx, kamera);
    if (this.feuerwerk) this.zeichneFeuerwerk(ctx);
    if (this.zustand === 'anmarsch' && this.anmarsch) this.zeichneAusrufezeichen(ctx, kamera);

    this.textfenster.zeichnen(ctx);
    if (this.zustand === 'frage' && this.frageAuswahl) {
      this.frageAuswahl.zeichnen(ctx, BREITE - 56, HOEHE - 100, 50, 32);
    }

    this.zeichneOrtsschild(ctx);

    // Stroboskop der Heilsequenz: liegt über allem außer der Überblendung,
    // damit der Kartenwechsel weiterhin sauber abdunkelt.
    if (this.heilung) {
      zeichneBlende(ctx, BREITE, HOEHE, this.heilung.blitz * HEIL_BLITZ, '#f8f8ff');
    }
    zeichneBlende(ctx, BREITE, HOEHE, this.blende.wert);
  }

  zeichneGegenstaende(ctx, kamera) {
    for (const eintrag of this.karte.daten.gegenstaende ?? []) {
      if (eintrag.starter) {
        if (spiel.startgewaehlt) continue;
      } else if (schonAufgesammelt(`${this.karte.id}:${eintrag.x},${eintrag.y}`)) {
        continue;
      }
      gegenstandSymbol(ctx, 'samplepack', eintrag.x * KACHEL - kamera.x, eintrag.y * KACHEL - kamera.y);
    }
  }

  zeichneFiguren(ctx, kamera, spielerPixel) {
    const alle = [
      ...this.karte.npcs.filter((npc) => !npc.entfernt && !npc.unsichtbar),
      { spieler: true, ...this.figur },
    ].sort((a, b) => a.y - b.y);

    for (const figur of alle) {
      const pixel = figur.spieler ? spielerPixel : figurPixel(figur);
      const x = pixel.x - kamera.x;
      const y = pixel.y - kamera.y;
      if (x < -32 || y < -32 || x > BREITE + 32 || y > HOEHE + 32) continue;

      if (typeof figur.figur === 'string' && figur.figur.startsWith('mon:')) {
        const artDaten = artNachName(figur.figur.slice(4));
        if (artDaten) ctx.drawImage(monSprite(artDaten, 'klein'), Math.round(x - 6), Math.round(y - 12));
        continue;
      }

      const bild = figur.laeuft ? figur.bild : 0;
      zeichneMensch(ctx, figur.spieler ? 'spieler' : figur.figur, figur.richtung, bild, x, y);
    }
  }

  /**
   * Höhlen sind dunkel: Ein Farbverlauf legt sich über das Bild – in der Mitte
   * durchsichtig, außen fast schwarz. Außerhalb des Verlaufsradius gilt die
   * letzte Farbe, damit auch die Bildränder dunkel bleiben.
   */
  zeichneDunkelheit(ctx, spielerPixel, kamera) {
    const mitteX = spielerPixel.x - kamera.x + KACHEL / 2;
    const mitteY = spielerPixel.y - kamera.y + KACHEL / 2;
    const radius = hatGegenstand('Taschenlampe') && taschenlampeAn() ? 78 : 44;

    const verlauf = ctx.createRadialGradient(mitteX, mitteY, radius * 0.3, mitteX, mitteY, radius);
    verlauf.addColorStop(0, 'rgba(0, 0, 0, 0)');
    verlauf.addColorStop(0.6, 'rgba(0, 0, 0, 0.45)');
    verlauf.addColorStop(1, 'rgba(0, 0, 0, 0.93)');

    ctx.fillStyle = verlauf;
    ctx.fillRect(0, 0, BREITE, HOEHE);

    this.zeichneLampenlicht(ctx, kamera);
  }

  /**
   * Lampen an der Wand reißen kleine Löcher in die Dunkelheit. Gezeichnet
   * wird additiv über die schwarze Schicht: ein warmer Lichtkreis je Lampe,
   * die gerade im Bild ist. Ohne das wäre der Treppenschacht auf ganzer
   * Länge gleich schwarz und die Funzeln nur Deko.
   */
  zeichneLampenlicht(ctx, kamera) {
    const vonX = Math.floor(kamera.x / KACHEL) - 1;
    const bisX = Math.ceil((kamera.x + BREITE) / KACHEL) + 1;
    const vonY = Math.floor(kamera.y / KACHEL) - 1;
    const bisY = Math.ceil((kamera.y + HOEHE) / KACHEL) + 1;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let y = vonY; y <= bisY; y += 1) {
      for (let x = vonX; x <= bisX; x += 1) {
        if (!LEUCHTKACHELN.has(this.karte.kachelAn(x, y))) continue;
        const mx = x * KACHEL - kamera.x + KACHEL / 2;
        const my = y * KACHEL - kamera.y + KACHEL / 2;
        const verlauf = ctx.createRadialGradient(mx, my, 1, mx, my, LAMPEN_RADIUS);
        verlauf.addColorStop(0, 'rgba(255, 232, 154, 0.55)');
        verlauf.addColorStop(0.5, 'rgba(255, 216, 120, 0.20)');
        verlauf.addColorStop(1, 'rgba(255, 200, 90, 0)');
        ctx.fillStyle = verlauf;
        ctx.fillRect(mx - LAMPEN_RADIUS, my - LAMPEN_RADIUS, LAMPEN_RADIUS * 2, LAMPEN_RADIUS * 2);
      }
    }
    ctx.restore();
  }

  /**
   * Legt die bisher eingelaufenen goldenen Platten in den Plattenspieler.
   * Mit jedem Take kommt eine dazu, nach sechs Takes sind alle sechs Mulden
   * belegt – im Gleichtakt mit Musik und Stroboskop. Während des Intros
   * bleibt der Plattenspieler leer, die erste Platte fällt mit dem
   * Kick-Einsatz.
   */
  zeichneHeilteller(ctx, kamera) {
    const teller = this.heilung.teller;
    if (!teller) return;

    const x = teller.x * KACHEL - kamera.x;
    const y = teller.y * KACHEL - kamera.y;
    const platten = Math.min(TELLER_PLAETZE.length, this.heilung.tick + 1);
    for (let i = 0; i < platten; i += 1) zeichneGoldPlatte(ctx, x, y, i);
  }

  /**
   * Der blaue Brief an der Säule. Er hängt nur, solange ihn keiner abgenommen
   * hat und die Sperre nach der letzten Belohnung durch ist – am Nagel sieht
   * man der Säule also von Weitem an, woran man gerade ist.
   */
  zeichneSaeulenbrief(ctx, kamera) {
    const stand = saeulenStand(this.karte.id);
    if (stand.abfolge || sperreRest(stand) > 0) return;
    zeichneBrief(
      ctx,
      this.briefsaeule.x * KACHEL - kamera.x,
      this.briefsaeule.y * KACHEL - kamera.y,
    );
  }

  /**
   * Feuerwerk über dem ganzen Bild: erst die aufsteigenden Raketen als kurze
   * Striche, dann die Funken, die mit ihrer Restbrenndauer ausblenden.
   * Gezeichnet wird in Bildschirmkoordinaten – das Feuerwerk gehört zum
   * Moment, nicht zu einer Stelle im Saal.
   */
  zeichneFeuerwerk(ctx) {
    for (const rakete of this.feuerwerk.raketen) {
      if (rakete.geplatzt || this.feuerwerk.bild < rakete.start) continue;
      ctx.fillStyle = '#ffe07a';
      ctx.fillRect(Math.round(rakete.x), Math.round(rakete.y), 1, 3);
    }

    for (const funke of this.feuerwerk.funken) {
      ctx.globalAlpha = Math.min(1, funke.leben / (FUNKEN_LEBEN * 0.6));
      ctx.fillStyle = funke.farbe;
      ctx.fillRect(Math.round(funke.x), Math.round(funke.y), 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  zeichneAusrufezeichen(ctx, kamera) {
    const npc = this.anmarsch.npc;
    const pixel = figurPixel(npc);
    const x = pixel.x - kamera.x + 4;
    const y = pixel.y - kamera.y - 14;
    fenster(ctx, x - 2, y - 2, 12, 14);
    zeichneText(ctx, '!', x + 3, y + 2, { farbe: UI.auswahl });
  }

  /** Ortsname beim Betreten einer Karte kurz einblenden. */
  zeichneOrtsschild(ctx) {
    if (this.blende.phase !== 'ein' || this.karte.daten.drinnen) return;
    const name = this.karte.daten.name;
    const breite = name.length * 6 + 14;
    fenster(ctx, 6, 6, breite, 16);
    zeichneText(ctx, name, 13, 10, { farbe: UI.text });
  }
}
