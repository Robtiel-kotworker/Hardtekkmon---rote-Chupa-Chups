// ============================================================================
// Kampfszene
// ----------------------------------------------------------------------------
// Zeigt an, was der Kampfablauf ausrechnet. Die Ereignisliste einer Runde wird
// Schritt für Schritt abgespielt: Text erscheint, Balken laufen weich nach,
// Sprites zucken, Samplepacks wackeln. Gewartet wird nur so lange wie nötig –
// mit A geht es sofort weiter.
// ============================================================================

import { BREITE, HOEHE } from '../engine/screen.js';
import { gedrueckt } from '../engine/input.js';
import { spieleTrack, effekt, aktuellerTrack } from '../engine/audio.js';
import { fenster, balken, kpFarbe, blende, gegenstandSymbol, typSchild, fangSymbol } from '../gfx/ui.js';
import { zeichneText, textBreite } from '../gfx/font.js';
import { UI } from '../gfx/palette.js';
import { monSprite } from '../gfx/monsprites.js';
import { Textfenster } from '../ui/textfenster.js';
import { Auswahl } from '../ui/auswahl.js';
import { findeAttacke } from '../data/attacken.js';
import { gegenstandInfo, imKampfNutzbar } from '../data/gegenstaende.js';
import {
  anzeigename, artVon, maxKp, erfahrungsAnteil, istUmgekippt, entwickle,
  entwicklungFaellig, lerneAttacke, MAX_ATTACKEN,
} from '../game/hardtekkmon.js';
import {
  spiel, nimmAuf, nimmGegenstand, aendereGeld, merkeGefangen, hatGegenstand,
  typhilfeAn,
} from '../game/spielstand.js';
import { wirksamkeitGegen } from '../data/typen.js';
import { fuehreRunde, wechsleEigenes } from '../battle/kampf.js';
import { poppe } from './stapel.js';

const GEGNER_POS = { x: 152, y: 14 };
const EIGENE_POS = { x: 26, y: 58 };
const SPRITE = 56;

/** Wartezeiten in Bildern. */
const WARTE = { text: 24, treffer: 20, wechsel: 26, wurf: 34, kurz: 12 };

export class Kampfszene {
  /**
   * @param {{ kampf: object, beiEnde: (ergebnis: string) => void }} vorgabe
   */
  constructor(vorgabe) {
    this.kampf = vorgabe.kampf;
    this.beiEnde = vorgabe.beiEnde;

    this.textfenster = new Textfenster();
    this.zustand = 'start';
    this.ereignisse = [];
    this.wartezeit = 0;
    this.bildzaehler = 0;

    this.anzeige = {
      eigeneKp: this.kampf.eigene.mon.kp,
      gegnerKp: this.kampf.gegner.mon.kp,
      // Ziel, dem die Balken hinterherlaufen: wird erst Schritt für Schritt je
      // abgespieltem Ereignis nachgezogen (siehe fuehreEreignisAus) – nicht
      // sofort auf den echten (bereits fertig gerechneten) Endwert der Runde
      // gesetzt. Nur so zeigt die Anzeige erst den eigenen Treffer und danach
      // den gegnerischen, statt beides gleichzeitig vorwegzunehmen.
      zielEigeneKp: this.kampf.eigene.mon.kp,
      zielGegnerKp: this.kampf.gegner.mon.kp,
      erfahrung: erfahrungsAnteil(this.kampf.eigene.mon),
      // Genau wie die KP-Balken: Der EP-Balken folgt erst seinem eigenen
      // Zwischenziel, sobald das 'erfahrung'-Ereignis abgespielt wird – also
      // erst, wenn die gesamte Kampfhandlung (Attacken, Treffer, K.O.) fertig
      // ist, nicht schon während der Kampf noch läuft.
      zielErfahrung: erfahrungsAnteil(this.kampf.eigene.mon),
      eigenerVersatz: 0,
      gegnerVersatz: 0,
      eigenesBlinken: 0,
      gegnerBlinken: 0,
      gegnerSichtbar: true,
      eigenesSichtbar: true,
      wurf: null,
    };

    this.befehlsmenue = new Auswahl({ eintraege: ['KAMPF', 'BEUTEL', 'TEAM', 'ABHAUEN'], spalten: 2 });
    this.attackenmenue = null;
    // Merkt sich den zuletzt gewählten Attackenplatz, damit der Zeiger beim
    // nächsten Öffnen des Attackenmenüs dort stehen bleibt statt auf den
    // ersten Eintrag zurückzuspringen – so lässt sich eine Attacke spammen.
    this.letzterAttackenIndex = 0;
    this.beutelmenue = null;
    this.beutelNamen = [];
    this.teammenue = null;
    this.rueckkehrTrack = aktuellerTrack();
    this.blendenwert = 1;
    this.entwicklungen = [];
  }

  betreten() {
    spieleTrack(this.kampf.art === 'trainer' ? 'gig' : 'kampf');
    const gegner = this.kampf.gegner.mon;
    const einleitung = this.kampf.art === 'trainer'
      ? [`${this.kampf.trainer.name} will einen Kampf!`,
        `${this.kampf.trainer.name} schickt ${anzeigename(gegner)} in den Ring!`]
      : [`Ein wildes ${anzeigename(gegner)} taucht auf!`];

    this.textfenster.zeige([...einleitung, `Los, ${anzeigename(this.kampf.eigene.mon)}!`]);
    this.zustand = 'einleitung';
  }

  // --- Ablauf ----------------------------------------------------------------

  aktualisieren() {
    this.bildzaehler += 1;
    this.blendenwert = Math.max(0, this.blendenwert - 0.08);
    this.animiereAnzeige();

    switch (this.zustand) {
      case 'einleitung':
        if (this.textfenster.aktualisieren()) this.zeigeBefehle();
        break;
      case 'befehl':
        this.aktualisiereBefehle();
        break;
      case 'attacke':
        this.aktualisiereAttackenwahl();
        break;
      case 'beutel':
        this.aktualisiereBeutel();
        break;
      case 'team':
        this.aktualisiereTeam();
        break;
      case 'verarbeitung':
        this.verarbeiteEreignisse();
        break;
      case 'abschluss':
        if (this.textfenster.aktualisieren()) this.beende();
        break;
      default:
        break;
    }
  }

  /** Balken und Sprites laufen ihrem jeweiligen Zwischenziel weich hinterher. */
  animiereAnzeige() {
    const a = this.anzeige;
    const naehere = (wert, ziel, schritt) => (
      Math.abs(ziel - wert) <= schritt ? ziel : wert + Math.sign(ziel - wert) * schritt
    );

    a.eigeneKp = naehere(a.eigeneKp, a.zielEigeneKp, Math.max(1, maxKp(this.kampf.eigene.mon) / 40));
    a.gegnerKp = naehere(a.gegnerKp, a.zielGegnerKp, Math.max(1, maxKp(this.kampf.gegner.mon) / 40));
    a.erfahrung = naehere(a.erfahrung, a.zielErfahrung, 0.02);

    a.eigenerVersatz = naehere(a.eigenerVersatz, 0, 1.5);
    a.gegnerVersatz = naehere(a.gegnerVersatz, 0, 1.5);
    if (a.eigenesBlinken > 0) a.eigenesBlinken -= 1;
    if (a.gegnerBlinken > 0) a.gegnerBlinken -= 1;
    if (a.wurf) this.animiereWurf();
  }

  zeigeBefehle() {
    this.textfenster.zeige(`Was soll ${anzeigename(this.kampf.eigene.mon)} tun?`);
    this.textfenster.ueberspringe();
    this.zustand = 'befehl';
  }

  aktualisiereBefehle() {
    const antwort = this.befehlsmenue.aktualisieren();
    if (antwort !== 'bestaetigt') return;

    switch (this.befehlsmenue.index) {
      case 0:
        this.oeffneAttacken();
        break;
      case 1:
        this.oeffneBeutel();
        break;
      case 2:
        this.oeffneTeam(false);
        break;
      case 3:
      default:
        this.starteRunde({ art: 'flucht' });
        break;
    }
  }

  oeffneAttacken() {
    const attacken = this.kampf.eigene.mon.attacken;
    this.attackenmenue = new Auswahl({
      eintraege: attacken.map((eintrag) => eintrag.name),
      spalten: 2,
    });
    // Zeiger auf den zuletzt gewählten Platz setzen (begrenzt auf die
    // tatsächlich vorhandenen Attacken), statt immer bei der ersten
    // anzufangen.
    this.attackenmenue.index = Math.min(this.letzterAttackenIndex, attacken.length - 1);
    this.attackenmenue.haltePosition();
    this.zustand = 'attacke';
  }

  aktualisiereAttackenwahl() {
    const antwort = this.attackenmenue.aktualisieren();
    if (antwort === 'abbruch') {
      this.zeigeBefehle();
      return;
    }
    if (antwort !== 'bestaetigt') return;

    this.letzterAttackenIndex = this.attackenmenue.index;
    const eintrag = this.kampf.eigene.mon.attacken[this.attackenmenue.index];
    if (!eintrag || eintrag.ap <= 0) {
      this.textfenster.zeige('Da ist nichts mehr drin! Nimm eine andere.');
      return;
    }
    this.starteRunde({ art: 'attacke', index: this.attackenmenue.index });
  }

  oeffneBeutel() {
    this.beutelNamen = Object.keys(spiel.beutel).filter(imKampfNutzbar);
    if (this.beutelNamen.length === 0) {
      this.textfenster.zeige('Der Beutel ist leer. Peinlich.');
      this.textfenster.ueberspringe();
      return;
    }
    this.beutelmenue = new Auswahl({
      eintraege: this.beutelNamen.map((name) => `${name}`),
      sichtbar: 4,
    });
    this.zustand = 'beutel';
  }

  aktualisiereBeutel() {
    const antwort = this.beutelmenue.aktualisieren();
    if (antwort === 'abbruch') {
      this.zeigeBefehle();
      return;
    }
    if (antwort !== 'bestaetigt') return;

    const name = this.beutelNamen[this.beutelmenue.index];
    if (!hatGegenstand(name)) return;

    const daten = gegenstandInfo(name);

    // Vorab prüfen, statt Gegenstand und Zug für nichts zu verbrauchen: Ein
    // Mate, das nichts mehr heilt, oder ein Sample gegen einen Trainer,
    // bleibt im Beutel und kostet keinen Zug.
    if (daten.art === 'heilung' && this.kampf.eigene.mon.kp >= maxKp(this.kampf.eigene.mon)) {
      this.textfenster.zeige('Das würde nichts bringen.');
      return;
    }
    if (daten.art === 'fang' && this.kampf.art === 'trainer') {
      this.textfenster.zeige('Das würde nichts bringen.');
      return;
    }
    if (daten.art === 'levelauf' && this.kampf.eigene.mon.stufe >= 100) {
      this.textfenster.zeige('Das würde nichts bringen.');
      return;
    }

    nimmGegenstand(name, 1);

    if (daten.art === 'heilung' || daten.art === 'status' || daten.art === 'beleben' || daten.art === 'levelauf') {
      this.starteRunde({ art: 'gegenstand', gegenstand: name, zielIndex: this.kampf.eigenesIndex });
    } else {
      this.starteRunde({ art: 'gegenstand', gegenstand: name });
    }
  }

  oeffneTeam(erzwungen) {
    this.teammenue = new Auswahl({
      eintraege: spiel.team.map((mon) => `${anzeigename(mon)}  ${mon.kp}/${maxKp(mon)}`),
      sichtbar: 6,
    });
    this.teamErzwungen = erzwungen;
    this.zustand = 'team';
  }

  aktualisiereTeam() {
    const antwort = this.teammenue.aktualisieren();
    if (antwort === 'abbruch' && !this.teamErzwungen) {
      this.zeigeBefehle();
      return;
    }
    if (antwort !== 'bestaetigt') return;

    const index = this.teammenue.index;
    const mon = spiel.team[index];
    if (!mon || istUmgekippt(mon)) {
      this.textfenster.zeige('Das steht nicht mehr. Nimm ein anderes!');
      this.textfenster.ueberspringe();
      return;
    }
    if (index === this.kampf.eigenesIndex) {
      this.textfenster.zeige('Das ist doch schon im Ring!');
      this.textfenster.ueberspringe();
      return;
    }

    if (this.teamErzwungen) {
      const ereignisse = wechsleEigenes(this.kampf, index);
      this.setzeAnzeigeNeu();
      this.spieleEreignisse(ereignisse);
    } else {
      this.starteRunde({ art: 'wechsel', index });
    }
  }

  starteRunde(aktion) {
    const ereignisse = fuehreRunde(this.kampf, aktion);
    this.spieleEreignisse(ereignisse);
  }

  spieleEreignisse(ereignisse) {
    this.ereignisse = [...ereignisse];
    this.wartezeit = 0;
    this.zustand = 'verarbeitung';
  }

  /** Neues Hardtekkmon im Ring: Balken springen hart auf den neuen Wert. */
  setzeAnzeigeNeu() {
    this.anzeige.eigeneKp = this.kampf.eigene.mon.kp;
    this.anzeige.gegnerKp = this.kampf.gegner.mon.kp;
    this.anzeige.zielEigeneKp = this.kampf.eigene.mon.kp;
    this.anzeige.zielGegnerKp = this.kampf.gegner.mon.kp;
    this.anzeige.erfahrung = erfahrungsAnteil(this.kampf.eigene.mon);
    this.anzeige.zielErfahrung = this.anzeige.erfahrung;
    this.anzeige.eigenesSichtbar = true;
    this.anzeige.gegnerSichtbar = true;
  }

  verarbeiteEreignisse() {
    if (this.wartezeit > 0) {
      const warFertig = !this.textfenster.aktiv || this.textfenster.seiteFertig;
      this.textfenster.schreibeWeiter();

      if (gedrueckt('A') || gedrueckt('B')) {
        // Erster Druck vervollständigt den Text, der zweite schaltet weiter.
        if (warFertig) this.wartezeit = 0;
        else this.textfenster.ueberspringe();
      } else {
        this.wartezeit -= 1;
      }
      return;
    }

    // Balken noch am Nachlaufen? Dann kurz warten.
    if (!this.anzeigeRuhig()) return;

    const ereignis = this.ereignisse.shift();
    if (!ereignis) {
      this.nachDenEreignissen();
      return;
    }
    this.fuehreEreignisAus(ereignis);
  }

  /**
   * Ist die Anzeige mit ihrem eigenen Zwischenziel im Reinen? Verglichen wird
   * bewusst nicht mit dem (längst fertig berechneten) echten Kraftpunktestand
   * der Runde, sondern mit `zielEigeneKp`/`zielGegnerKp` – die wachsen erst
   * Ereignis für Ereignis mit, siehe fuehreEreignisAus. So wartet die
   * Verarbeitung nur auf die Animation des zuletzt gespielten Ereignisses,
   * nicht auf das Endergebnis der ganzen Runde.
   */
  anzeigeRuhig() {
    const a = this.anzeige;
    return a.eigeneKp === a.zielEigeneKp
      && a.gegnerKp === a.zielGegnerKp
      && a.erfahrung === a.zielErfahrung
      && !a.wurf;
  }

  fuehreEreignisAus(ereignis) {
    const a = this.anzeige;

    switch (ereignis.typ) {
      case 'text':
        // Der Text schreibt sich mit einem Zeichen je Bild – die Wartezeit
        // deckt das Schreiben ab und lässt danach kurz zum Lesen Zeit.
        this.textfenster.zeige(ereignis.text);
        this.wartezeit = WARTE.text + ereignis.text.length;
        break;

      case 'angriff': {
        const eigen = ereignis.seite === 'spieler';
        if (eigen) a.eigenerVersatz = 10;
        else a.gegnerVersatz = -10;
        effekt('treffer');
        this.wartezeit = WARTE.kurz;
        break;
      }

      case 'schaden':
        // Erst hier – wenn das Ereignis tatsächlich an der Reihe ist – zieht
        // das Ziel des Balkens nach. Bis dahin zeigt die Anzeige noch den
        // Stand vor diesem Treffer, auch wenn der echte Kraftpunktestand für
        // die ganze Runde längst feststeht.
        if (ereignis.seite === 'spieler') {
          a.eigenesBlinken = 20;
          a.zielEigeneKp = Math.max(0, a.zielEigeneKp - ereignis.menge);
        } else {
          a.gegnerBlinken = 20;
          a.zielGegnerKp = Math.max(0, a.zielGegnerKp - ereignis.menge);
        }
        effekt(ereignis.wirkung >= 2 ? 'starkerTreffer'
          : ereignis.wirkung !== undefined && ereignis.wirkung < 1 ? 'schwacherTreffer' : 'treffer');
        this.wartezeit = WARTE.treffer;
        break;

      case 'heilung': {
        const grenze = ereignis.seite === 'spieler' ? maxKp(this.kampf.eigene.mon) : maxKp(this.kampf.gegner.mon);
        if (ereignis.seite === 'spieler') a.zielEigeneKp = Math.min(grenze, a.zielEigeneKp + ereignis.menge);
        else a.zielGegnerKp = Math.min(grenze, a.zielGegnerKp + ereignis.menge);
        effekt('item');
        this.wartezeit = WARTE.kurz;
        break;
      }

      case 'umkippen':
        if (ereignis.seite === 'spieler') {
          a.eigenesSichtbar = false;
          a.zielEigeneKp = 0;
        } else {
          a.gegnerSichtbar = false;
          a.zielGegnerKp = 0;
        }
        effekt('umkippen');
        this.wartezeit = WARTE.wechsel;
        break;

      case 'wurf':
        a.wurf = { schritt: 0, wackler: ereignis.wackler, erfolg: ereignis.erfolg, phase: 'flug' };
        this.wartezeit = WARTE.wurf;
        break;

      case 'gegnerWechsel':
        a.gegnerSichtbar = true;
        this.setzeAnzeigeNeu();
        this.wartezeit = WARTE.wechsel;
        break;

      case 'eigenerWechsel':
        a.eigenesSichtbar = true;
        this.setzeAnzeigeNeu();
        this.wartezeit = WARTE.wechsel;
        break;

      case 'erfahrung':
        // Erst hier – am Ende des Kampfgeschehens – darf der EP-Balken
        // überhaupt loslaufen. Steht noch ein Stufenaufstieg an, füllt er
        // sich zunächst ganz (Ereignis 'aufstieg' setzt danach zurück),
        // sonst direkt auf den neuen (Teil-)Stand.
        a.zielErfahrung = ereignis.wirdAufsteigen ? 1 : erfahrungsAnteil(this.kampf.eigene.mon);
        this.wartezeit = 4;
        break;

      case 'aufstieg':
        effekt('aufstieg');
        // Balken erst bei null neu ansetzen, sobald er tatsächlich voll
        // angekommen ist (anzeigeRuhig() gattert das bereits ab) – dann für
        // den nächsten Aufstieg wieder auf voll oder, beim letzten in dieser
        // Reihe, auf den tatsächlichen Rest der aktuellen Stufe zielen.
        a.erfahrung = 0;
        a.zielErfahrung = ereignis.letzte ? erfahrungsAnteil(this.kampf.eigene.mon) : 1;
        this.wartezeit = WARTE.kurz;
        break;

      case 'lernen':
        this.lerneNeueAttacke(ereignis.attacke);
        break;

      case 'entwicklung':
        this.entwicklungen.push({ mon: this.kampf.eigene.mon, zielId: ereignis.zielId });
        break;

      case 'ende':
        this.ereignisse = [];
        this.beendeKampf(ereignis.ergebnis);
        break;

      case 'status':
      case 'werte':
      default:
        this.wartezeit = 4;
        break;
    }
  }

  /**
   * Neue Attacke einsortieren. Sind schon vier vorhanden, fliegt die erste
   * raus – das hält den Ablauf im Kampf kurz.
   */
  lerneNeueAttacke(name) {
    const mon = this.kampf.eigene.mon;
    if (mon.attacken.length < MAX_ATTACKEN) {
      lerneAttacke(mon, name);
      this.textfenster.zeige(`${anzeigename(mon)} lernt ${name}!`);
    } else {
      const ersetzt = mon.attacken[0].name;
      lerneAttacke(mon, name, 0);
      this.textfenster.zeige(`${anzeigename(mon)} vergisst ${ersetzt} und lernt ${name}!`);
    }
    effekt('aufstieg');
    this.wartezeit = WARTE.text;
  }

  /** Nach dem Abspielen aller Ereignisse: weiter im Kampf oder Ende. */
  nachDenEreignissen() {
    if (this.kampf.vorbei) {
      this.beendeKampf(this.kampf.ergebnis);
      return;
    }
    if (this.kampf.wechselNoetig) {
      this.textfenster.zeige('Wen schickst du jetzt in den Ring?');
      this.textfenster.ueberspringe();
      this.oeffneTeam(true);
      return;
    }
    this.zeigeBefehle();
  }

  beendeKampf(ergebnis) {
    this.ergebnis = ergebnis;
    const meldungen = [];

    if (ergebnis === 'gefangen' && this.kampf.gefangen) {
      const gefangen = this.kampf.gefangen;
      merkeGefangen(gefangen.artId);
      const wohin = nimmAuf(gefangen);
      meldungen.push(`${anzeigename(gefangen)} wurde ins Samplepack gepackt!`);
      if (wohin === 'lager') meldungen.push('Das Team ist voll – es wandert in die Kiste.');
    }

    if (ergebnis === 'sieg' && this.kampf.art === 'trainer') {
      const geld = this.kampf.trainer.preisgeld ?? 200;
      aendereGeld(geld);
      meldungen.push(`${this.kampf.trainer.name} zahlt dir ${geld} Mücken.`);
    }

    for (const eintrag of this.entwicklungen) {
      const ziel = entwicklungFaellig(eintrag.mon);
      if (!ziel) continue;
      const alterName = anzeigename(eintrag.mon);
      entwickle(eintrag.mon, ziel);
      merkeGefangen(ziel.id);
      meldungen.push(`Was passiert denn da? ${alterName} wird zu ${ziel.name}!`);
    }
    this.entwicklungen = [];

    if (meldungen.length > 0) {
      this.textfenster.zeige(meldungen);
      this.zustand = 'abschluss';
    } else {
      this.beende();
    }
  }

  beende() {
    spieleTrack(this.rueckkehrTrack || 'welt');
    poppe();
    this.beiEnde?.(this.ergebnis ?? this.kampf.ergebnis ?? 'sieg');
  }

  animiereWurf() {
    const wurf = this.anzeige.wurf;
    wurf.schritt += 1;

    if (wurf.phase === 'flug' && wurf.schritt > 26) {
      wurf.phase = 'wackeln';
      wurf.schritt = 0;
      this.anzeige.gegnerSichtbar = false;
      effekt('wackeln');
    } else if (wurf.phase === 'wackeln') {
      if (wurf.schritt % 20 === 0 && wurf.schritt / 20 <= wurf.wackler) effekt('wackeln');
      if (wurf.schritt > 20 * (wurf.wackler + 1)) {
        if (wurf.erfolg) effekt('gefangen');
        else this.anzeige.gegnerSichtbar = true;
        this.anzeige.wurf = null;
      }
    }
  }

  // --- Darstellung ------------------------------------------------------------

  zeichnen(ctx) {
    this.zeichneHintergrund(ctx);

    const gegner = this.kampf.gegner.mon;
    const eigenes = this.kampf.eigene.mon;

    if (this.anzeige.gegnerSichtbar && !(this.anzeige.gegnerBlinken > 0 && this.bildzaehler % 6 < 3)) {
      ctx.drawImage(monSprite(artVon(gegner), 'front'),
        GEGNER_POS.x + this.anzeige.gegnerVersatz, GEGNER_POS.y);
    }
    if (this.anzeige.eigenesSichtbar && !(this.anzeige.eigenesBlinken > 0 && this.bildzaehler % 6 < 3)) {
      ctx.drawImage(monSprite(artVon(eigenes), 'rueck'),
        EIGENE_POS.x + this.anzeige.eigenerVersatz, EIGENE_POS.y);
    }

    if (this.anzeige.wurf) this.zeichneWurf(ctx);

    this.zeichneInfobox(ctx, gegner, 8, 10, false);
    this.zeichneInfobox(ctx, eigenes, 126, 68, true);

    this.textfenster.zeichnen(ctx);
    this.zeichneMenues(ctx);
    blende(ctx, BREITE, HOEHE, this.blendenwert);
  }

  zeichneHintergrund(ctx) {
    ctx.fillStyle = '#20243a';
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.fillStyle = '#2a3050';
    ctx.fillRect(0, 0, BREITE, 84);

    // Stroboskop-Streifen im Hintergrund
    ctx.fillStyle = 'rgba(240, 80, 160, 0.10)';
    for (let i = 0; i < 6; i += 1) {
      const x = ((this.bildzaehler * 0.6) + i * 44) % (BREITE + 60) - 30;
      ctx.fillRect(x, 0, 14, 84);
    }

    // Bühnenpodeste
    ctx.fillStyle = '#3a4062';
    ctx.beginPath();
    ctx.ellipse(GEGNER_POS.x + SPRITE / 2, GEGNER_POS.y + SPRITE + 2, 40, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(EIGENE_POS.x + SPRITE / 2, EIGENE_POS.y + SPRITE + 2, 46, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#171a2c';
    ctx.fillRect(0, 84, BREITE, 76);
  }

  zeichneWurf(ctx) {
    const wurf = this.anzeige.wurf;
    const ziel = { x: GEGNER_POS.x + 20, y: GEGNER_POS.y + 20 };

    if (wurf.phase === 'flug') {
      const t = Math.min(1, wurf.schritt / 26);
      const x = 40 + (ziel.x - 40) * t;
      const y = 96 + (ziel.y - 96) * t - Math.sin(t * Math.PI) * 40;
      gegenstandSymbol(ctx, 'samplepack', x, y);
      return;
    }

    const wackelPhase = Math.floor(wurf.schritt / 20);
    const neigung = wackelPhase <= wurf.wackler && wurf.schritt % 20 < 10
      ? Math.sin(wurf.schritt * 0.6) * 3
      : 0;
    gegenstandSymbol(ctx, 'samplepack', ziel.x + neigung, ziel.y + 14);
  }

  /**
   * Anzeige über ein Hardtekkmon.
   * @param {boolean} eigenes zeigt zusätzlich Kraftpunkte und Erfahrung
   */
  zeichneInfobox(ctx, mon, x, y, eigenes) {
    const breite = eigenes ? 108 : 104;
    const hoehe = eigenes ? 40 : 30;
    fenster(ctx, x, y, breite, hoehe);

    const name = anzeigename(mon);
    zeichneText(ctx, name, x + 5, y + 4, { farbe: UI.text });
    // Wildes, schon einmal gefangenes Hardtekkmon: kleines Fang-Symbol neben
    // dem Namen, wie im Tekkdex.
    if (!eigenes && this.kampf.art === 'wild' && spiel.gefangen.has(mon.artId)) {
      fangSymbol(ctx, x + 5 + textBreite(name) + 3, y + 3);
    }
    zeichneText(ctx, `St.${mon.stufe}`, x + breite - 26, y + 4, { farbe: UI.text });

    const grenze = maxKp(mon);
    const angezeigt = eigenes ? this.anzeige.eigeneKp : this.anzeige.gegnerKp;
    const anteil = Math.max(0, angezeigt / grenze);

    zeichneText(ctx, 'KP', x + 5, y + 15, { farbe: '#4058a8' });
    balken(ctx, x + 20, y + 17, breite - 28, anteil, kpFarbe(anteil));

    if (mon.status) {
      const kurz = mon.status.slice(0, 4).toUpperCase();
      ctx.fillStyle = '#c03050';
      ctx.fillRect(x + 5, y + 22, textBreite(kurz) + 4, 8);
      zeichneText(ctx, kurz, x + 7, y + 23, { farbe: '#f8f8f0' });
    }

    if (eigenes) {
      // Aufrunden, solange überhaupt noch etwas übrig ist: Ein Hardtekkmon,
      // das noch steht, darf nie "0" anzeigen (siehe balken() in gfx/ui.js).
      const rest = angezeigt > 0 ? Math.max(1, Math.ceil(angezeigt)) : 0;
      const zahlen = `${rest}/${grenze}`;
      zeichneText(ctx, zahlen, x + breite - textBreite(zahlen) - 5, y + 22, { farbe: UI.text });
      zeichneText(ctx, 'EP', x + 5, y + 31, { farbe: '#4058a8' });
      balken(ctx, x + 20, y + 33, breite - 28, this.anzeige.erfahrung, UI.erfahrung, 2);
    }
  }

  /**
   * Schriftfarbe eines Attackeneintrags für die optionale Typenhilfe
   * ("Cheaten" im Hauptmenü). Ist sie aus, bleibt alles in der normalen
   * Schriftfarbe. Statusattacken ohne Stärke werden nicht eingefärbt – bei
   * ihnen sagt die Typentabelle nichts über den Nutzen aus.
   */
  attackenFarbe(index) {
    if (!typhilfeAn()) return UI.text;

    const eintrag = this.kampf.eigene.mon.attacken[index];
    const daten = eintrag ? findeAttacke(eintrag.name) : null;
    if (!daten || daten.staerke <= 0) return UI.text;

    const faktor = wirksamkeitGegen(daten.typ, artVon(this.kampf.gegner.mon).typen);
    if (faktor > 1) return UI.wirksamGut;
    if (faktor < 1) return UI.wirksamSchlecht;
    return UI.text;
  }

  /**
   * Schriftfarbe eines Team-Eintrags beim Wechseln, für dieselbe optionale
   * Typenhilfe: Grün, wenn einer der eigenen Typen des Hardtekkmon gegen den
   * Gegner mehr als normal austeilen würde, rot, wenn selbst der beste
   * eigene Typ schlechter oder gar nicht wirkt.
   */
  teamFarbe(index) {
    if (!typhilfeAn()) return UI.text;

    const mon = spiel.team[index];
    if (!mon) return UI.text;

    const zielTypen = artVon(this.kampf.gegner.mon).typen;
    const beste = Math.max(...artVon(mon).typen.map((typ) => wirksamkeitGegen(typ, zielTypen)));
    if (beste > 1) return UI.wirksamGut;
    if (beste < 1) return UI.wirksamSchlecht;
    return UI.text;
  }

  zeichneMenues(ctx) {
    if (this.zustand === 'befehl') {
      this.befehlsmenue.zeichnen(ctx, BREITE - 108, HOEHE - 46, 104, 42, { zeilenhoehe: 15 });
      return;
    }

    if (this.zustand === 'attacke') {
      const eintrag = this.kampf.eigene.mon.attacken[this.attackenmenue.index];
      const daten = eintrag ? findeAttacke(eintrag.name) : null;

      this.attackenmenue.zeichnen(ctx, 4, HOEHE - 46, 164, 42, {
        zeilenhoehe: 15,
        farbe: (index) => this.attackenFarbe(index),
      });
      fenster(ctx, 170, HOEHE - 46, 66, 42);
      if (daten && eintrag) {
        zeichneText(ctx, `AP ${eintrag.ap}/${eintrag.maxAp}`, 175, HOEHE - 41, { farbe: UI.text });
        typSchild(ctx, daten.typ, 175, HOEHE - 30);
        zeichneText(ctx, daten.staerke > 0 ? `St ${daten.staerke}` : 'Status', 175, HOEHE - 18, { farbe: UI.text });
      }
      return;
    }

    if (this.zustand === 'beutel') {
      this.beutelmenue.zeichnen(ctx, 4, HOEHE - 62, 160, 58, {
        zeilenhoehe: 12,
        zusatz: (index) => `×${spiel.beutel[this.beutelNamen[index]] ?? 0}`,
      });
      return;
    }

    if (this.zustand === 'team') {
      this.teammenue.zeichnen(ctx, 4, HOEHE - 86, 176, 82, {
        zeilenhoehe: 12,
        farbe: (index) => this.teamFarbe(index),
      });
    }
  }
}
