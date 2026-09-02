// ============================================================================
// Laborfilm
// ----------------------------------------------------------------------------
// Die Bilder zur Erklärung des Professors: elf kurze Animationen, die den
// Ablauf zeigen, von dem er erzählt – Abgabe an der Theke, Scan, Klon aus der
// Kapsel, Austausch, und am Ende das Original an der Maschine.
//
// Alles hier sind reine Zeichenfunktionen: Sie bekommen den Fortschritt `t`
// (0 bis 1) des laufenden Abschnitts und malen daraus ein Bild. Die Zeit
// zählt die Szene (siehe scenes/laborfilm.js), die Reihenfolge steht in
// KLONFILM (siehe data/world/klonlabor.js).
// ============================================================================

import { BREITE, neueFlaeche } from '../engine/screen.js';
import { zeichneText, textBreite } from './font.js';
import { zeichneMensch } from './menschen.js';

/** Höhe der Spielfläche über dem Textfeld. */
export const BUEHNE_HOEHE = 102;

const DUNKEL = '#0c0e12';
const WAND = '#242a34';
const BODEN = '#3a4450';
const STAHL = '#c8ccd8';
const STAHL_DUNKEL = '#98a0ac';
const GRUEN = '#48f078';
const BLUT = '#8c1020';
const BLUT_HELL = '#c8203c';
const WARNUNG = '#f0c040';

const klemme = (wert) => Math.min(1, Math.max(0, wert));
/** Weicher Verlauf zwischen zwei Punkten eines Abschnitts. */
const abschnitt = (t, von, bis) => klemme((t - von) / (bis - von));

// --- Bausteine ----------------------------------------------------------------

/** Eingefärbte Fassung eines Sprites – für Blankoklon, Scan und Leichen. */
const einfaerbungen = new Map();
export function eingefaerbt(quelle, farbe, schluessel) {
  const kennung = `${schluessel}:${farbe}`;
  const fertig = einfaerbungen.get(kennung);
  if (fertig) return fertig;

  const { canvas, ctx } = neueFlaeche(quelle.width, quelle.height);
  ctx.drawImage(quelle, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = farbe;
  ctx.fillRect(0, 0, quelle.width, quelle.height);
  einfaerbungen.set(kennung, canvas);
  return canvas;
}

/** Grundraum: dunkle Wand, Boden, Vignette. */
function raum(ctx, wandfarbe = WAND, bodenY = 78) {
  ctx.fillStyle = DUNKEL;
  ctx.fillRect(0, 0, BREITE, BUEHNE_HOEHE);
  ctx.fillStyle = wandfarbe;
  ctx.fillRect(0, 0, BREITE, bodenY);
  ctx.fillStyle = '#1a1e26';
  ctx.fillRect(0, bodenY - 2, BREITE, 2);
  ctx.fillStyle = BODEN;
  ctx.fillRect(0, bodenY, BREITE, BUEHNE_HOEHE - bodenY);
  // Fugen im Boden, damit die Tiefe stimmt.
  ctx.fillStyle = '#2e3742';
  for (let x = 0; x < BREITE; x += 24) ctx.fillRect(x, bodenY, 1, BUEHNE_HOEHE - bodenY);
}

/** Rohre und Kabel unter der Decke. */
function rohre(ctx) {
  ctx.fillStyle = '#3a4450';
  ctx.fillRect(0, 6, BREITE, 3);
  ctx.fillRect(0, 12, BREITE, 2);
  ctx.fillStyle = '#2a3038';
  for (let x = 10; x < BREITE; x += 40) ctx.fillRect(x, 0, 3, 6);
}

/** Figur in doppelter Größe – im Film stehen die Leute größer da als auf der Karte. */
function mensch2x(ctx, schluessel, richtung, bild, x, y) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(2, 2);
  zeichneMensch(ctx, schluessel, richtung, bild, 0, 0);
  ctx.restore();
}

/** Sprite, um 90 Grad gekippt – ein Hardtekkmon, das nicht mehr steht. */
function liegend(ctx, sprite, x, y, groesse) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(sprite, -groesse / 2, -groesse / 2, groesse, groesse);
  ctx.restore();
}

/** Zwei gekreuzte Striche als Augen: hier ist nichts mehr zu retten. */
function kreuzAugen(ctx, x, y, farbe = '#12121a') {
  ctx.fillStyle = farbe;
  for (const versatz of [0, 6]) {
    ctx.fillRect(x + versatz, y, 1, 1);
    ctx.fillRect(x + versatz + 2, y, 1, 1);
    ctx.fillRect(x + versatz + 1, y + 1, 1, 1);
    ctx.fillRect(x + versatz, y + 2, 1, 1);
    ctx.fillRect(x + versatz + 2, y + 2, 1, 1);
  }
}

/** Theke des Boxenstopps, von vorn. */
function theke(ctx, y) {
  ctx.fillStyle = '#6a4828';
  ctx.fillRect(0, y, BREITE, 16);
  ctx.fillStyle = '#b0844c';
  ctx.fillRect(0, y, BREITE, 4);
  ctx.fillStyle = '#8a6038';
  ctx.fillRect(0, y + 12, BREITE, 4);
}

/** Der silberne Teller, auf dem oben geheilt wird. */
function teller(ctx, x, y, breite = 40) {
  ctx.fillStyle = STAHL_DUNKEL;
  ctx.fillRect(x, y, breite, 6);
  ctx.fillStyle = STAHL;
  ctx.fillRect(x + 2, y, breite - 4, 3);
  ctx.fillStyle = '#6a7280';
  ctx.fillRect(x + breite / 2 - 2, y + 6, 4, 4);
}

/** Glasröhre mit Nährlösung; `fuellung` von 0 (leer) bis 1 (voll). */
function kapsel(ctx, x, y, breite, hoehe, fuellung, bildzaehler) {
  ctx.fillStyle = '#2a3038';
  ctx.fillRect(x - 3, y - 3, breite + 6, hoehe + 8);
  ctx.fillStyle = '#5a6470';
  ctx.fillRect(x - 1, y - 1, breite + 2, hoehe + 2);
  ctx.fillStyle = '#12181c';
  ctx.fillRect(x, y, breite, hoehe);

  const stand = Math.round(hoehe * klemme(fuellung));
  ctx.fillStyle = '#1e5a68';
  ctx.fillRect(x, y + hoehe - stand, breite, stand);
  if (stand > 4) {
    // Blasen steigen auf.
    ctx.fillStyle = '#7ad0e8';
    for (let i = 0; i < 4; i += 1) {
      const bx = x + 4 + ((i * 7 + Math.floor(bildzaehler / 6)) % (breite - 8));
      const by = y + hoehe - ((bildzaehler * 0.8 + i * 23) % stand);
      ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
    }
  }
  // Glanzkante
  ctx.fillStyle = 'rgba(232, 248, 255, 0.28)';
  ctx.fillRect(x + 2, y + 2, 2, hoehe - 4);
  ctx.fillStyle = STAHL_DUNKEL;
  ctx.fillRect(x - 3, y + hoehe + 1, breite + 6, 4);
}

/** Die Tötungsmaschine, groß: Trichter, Gehäuse, Warnstreifen, roter Knopf. */
function maschine(ctx, x, y, breite, hoehe, ruckeln, alarm) {
  ctx.save();
  ctx.translate(ruckeln, 0);
  ctx.fillStyle = '#20242e';
  ctx.fillRect(x, y, breite, hoehe);
  ctx.fillStyle = '#586470';
  ctx.fillRect(x + 3, y + 3, breite - 6, hoehe - 6);
  // Warnstreifen oben
  for (let i = 0; i * 8 < breite - 6; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? WARNUNG : '#20242e';
    ctx.fillRect(x + 3 + i * 8, y + 3, 8, 4);
  }
  // Trichter
  ctx.fillStyle = '#12121a';
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 10);
  ctx.lineTo(x + breite - 6, y + 10);
  ctx.lineTo(x + breite - 14, y + 26);
  ctx.lineTo(x + 14, y + 26);
  ctx.closePath();
  ctx.fill();
  // Schlund. Er bleibt auch im Alarm dunkel – sonst frisst das Rot das
  // ganze Bild und man sieht nicht mehr, was hineinfährt.
  ctx.fillStyle = alarm ? '#a01424' : BLUT;
  ctx.fillRect(x + 14, y + 26, breite - 28, hoehe - 34);
  ctx.fillStyle = '#12121a';
  ctx.fillRect(x + 14, y + 26, breite - 28, 3);
  // Lampe
  ctx.fillStyle = alarm ? '#ff6070' : '#601018';
  ctx.fillRect(x + breite - 12, y + hoehe - 12, 6, 6);
  ctx.restore();
}

/** Laufband, das nach links in die Maschine läuft. */
function laufband(ctx, y, bildzaehler) {
  ctx.fillStyle = '#20242e';
  ctx.fillRect(0, y, BREITE, 12);
  ctx.fillStyle = '#454f5c';
  ctx.fillRect(0, y + 1, BREITE, 8);
  ctx.fillStyle = '#2a3038';
  for (let i = -1; i < BREITE / 12 + 1; i += 1) {
    const x = (i * 12 - (bildzaehler * 1.5) % 12);
    ctx.fillRect(Math.round(x), y + 1, 2, 8);
  }
  ctx.fillStyle = '#12141a';
  ctx.fillRect(0, y + 9, BREITE, 3);
}

/** Ein wachsender Haufen aus Leichen. */
function haufen(ctx, x, y, anzahl, tot, groesse = 18) {
  for (let i = 0; i < anzahl; i += 1) {
    const reihe = Math.floor(i / 3);
    const spalte = i % 3;
    const hx = x + spalte * (groesse - 4) - reihe * 3;
    const hy = y - reihe * (groesse - 8);
    ctx.save();
    ctx.translate(hx + groesse / 2, hy + groesse / 2);
    ctx.rotate(((i * 37) % 90) / 180 * Math.PI - Math.PI / 4);
    ctx.drawImage(tot, -groesse / 2, -groesse / 2, groesse, groesse);
    ctx.restore();
  }
}

/** Lache unter dem Haufen. */
function lache(ctx, x, y, breite, hoehe) {
  ctx.fillStyle = BLUT;
  ctx.fillRect(x, y, breite, hoehe);
  ctx.fillStyle = '#6a0c18';
  ctx.fillRect(x + 4, y + hoehe - 2, breite - 8, 2);
  ctx.fillStyle = BLUT_HELL;
  ctx.fillRect(x + 6, y + 1, breite - 20, 2);
}

/** Spritzer, die vom Punkt (x,y) wegfliegen. */
function spritzer(ctx, x, y, t, anzahl = 14, weite = 40) {
  ctx.fillStyle = BLUT_HELL;
  for (let i = 0; i < anzahl; i += 1) {
    const winkel = (i / anzahl) * Math.PI * 2 + 0.4;
    const strecke = weite * t;
    const px = x + Math.cos(winkel) * strecke;
    const py = y + Math.sin(winkel) * strecke * 0.6 + t * t * 18;
    ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
  }
}

/** Stoppuhr mit Zeiger und Ziffern. */
function stoppuhr(ctx, cx, cy, radius, winkel, beschriftung) {
  ctx.fillStyle = '#20242e';
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8ecf4';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242e';
  ctx.fillRect(cx - 3, cy - radius - 7, 6, 4);
  for (let i = 0; i < 12; i += 1) {
    const w = (i / 12) * Math.PI * 2;
    ctx.fillRect(
      Math.round(cx + Math.cos(w) * (radius - 3)) - 1,
      Math.round(cy + Math.sin(w) * (radius - 3)) - 1, 2, 2,
    );
  }
  ctx.strokeStyle = BLUT_HELL;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(winkel) * (radius - 5), cy + Math.sin(winkel) * (radius - 5));
  ctx.stroke();
  if (beschriftung) {
    zeichneText(ctx, beschriftung, cx - textBreite(beschriftung) / 2, cy + radius + 6, { farbe: '#f8f4e8' });
  }
}

/** Kraftpunktbalken, wie im Kampf – nur größer. */
function kpBalken(ctx, x, y, breite, anteil) {
  ctx.fillStyle = '#20242e';
  ctx.fillRect(x - 1, y - 1, breite + 2, 7);
  ctx.fillStyle = '#606078';
  ctx.fillRect(x, y, breite, 5);
  ctx.fillStyle = GRUEN;
  ctx.fillRect(x, y, Math.round(breite * klemme(anteil)), 5);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x, y, Math.round(breite * klemme(anteil)), 1);
}

/** Ziffernregen, wie er beim Scannen über den Schirm läuft. */
function datenregen(ctx, x, y, breite, hoehe, bildzaehler) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, breite, hoehe);
  ctx.clip();
  for (let spalte = 0; spalte < breite / 8; spalte += 1) {
    const versatz = (bildzaehler * (1 + (spalte % 3) * 0.6) + spalte * 17) % (hoehe + 20);
    for (let i = 0; i < 3; i += 1) {
      const zy = y + ((versatz + i * 9) % (hoehe + 12)) - 8;
      const ziffer = String((spalte * 7 + i * 3 + Math.floor(bildzaehler / 8)) % 10);
      zeichneText(ctx, ziffer, x + spalte * 8 + 1, zy, { farbe: i === 0 ? GRUEN : '#1f7a44' });
    }
  }
  ctx.restore();
}

/** Kurzer weißer bzw. roter Blitz über die ganze Bühne. */
function blitz(ctx, staerke, farbe = '#f8f8ff') {
  if (staerke <= 0) return;
  ctx.save();
  ctx.globalAlpha = klemme(staerke);
  ctx.fillStyle = farbe;
  ctx.fillRect(0, 0, BREITE, BUEHNE_HOEHE);
  ctx.restore();
}

// --- Die elf Bilder -------------------------------------------------------------

/** 1. Der Professor macht das Licht an. Vorspann. */
function vorspann(ctx, t, k) {
  raum(ctx, '#1e2028');
  rohre(ctx);

  // Schreibtisch mit Monitor, der erst angeht.
  const an = t > 0.18;
  ctx.fillStyle = '#3a4450';
  ctx.fillRect(126, 52, 96, 26);
  ctx.fillStyle = '#20242e';
  ctx.fillRect(150, 26, 48, 28);
  ctx.fillStyle = an && Math.floor(k.bildzaehler / 4) % 8 !== 0 ? '#123018' : '#0c1410';
  ctx.fillRect(153, 29, 42, 22);
  if (an) {
    datenregen(ctx, 153, 29, 42, 22, k.bildzaehler);
    // Lichtkegel des Schirms in den Raum.
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = GRUEN;
    ctx.beginPath();
    ctx.moveTo(153, 51);
    ctx.lineTo(195, 51);
    ctx.lineTo(232, BUEHNE_HOEHE);
    ctx.lineTo(112, BUEHNE_HOEHE);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  mensch2x(ctx, 'professor', 'unten', 0, 76, 34);
  // Er hebt die Hand Richtung Schirm.
  ctx.fillStyle = '#f0c090';
  ctx.fillRect(110, 48 + (Math.floor(k.bildzaehler / 16) % 2), 6, 4);

  // Kapselreihe im Hintergrund, nur angedeutet.
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = '#2a3038';
    ctx.fillRect(6 + i * 16, 22, 12, 30);
    ctx.fillStyle = '#1e4a56';
    ctx.fillRect(8 + i * 16, 24, 8, 24);
  }

  blitz(ctx, 0.35 * (1 - abschnitt(t, 0, 0.25)), '#000000');
}

/** 2. Elf Sekunden: Das halbtote Hardtekkmon liegt, die Uhr rast. */
function tempo(ctx, t, k) {
  raum(ctx, '#232833');
  const geheilt = t > 0.86;

  teller(ctx, 26, 62, 62);
  if (geheilt) {
    ctx.drawImage(k.mon, 40, 30, 34, 34);
    blitz(ctx, (1 - abschnitt(t, 0.86, 1)) * 0.5, GRUEN);
    const marke = 'FRISCH';
    zeichneText(ctx, marke, 57 - textBreite(marke) / 2, 20, { farbe: GRUEN, schatten: '#0c2412' });
  } else {
    liegend(ctx, k.monMatt, 57, 52, 34);
    kreuzAugen(ctx, 48, 46);
  }

  const sekunden = Math.max(0, Math.ceil(11 * (1 - abschnitt(t, 0.08, 0.86))));
  stoppuhr(ctx, 176, 46, 26, -Math.PI / 2 + t * Math.PI * 12, `${sekunden} s`);

  // Der Balken schnellt am Ende hoch.
  kpBalken(ctx, 140, 84, 72, geheilt ? 1 : 0.08);
}

/** 3. So schnell ist kein Mate. */
function mate(ctx, t, k) {
  raum(ctx, '#232833');

  // Flasche, die viel zu langsam tropft.
  const fx = 58;
  ctx.fillStyle = '#c8c8d8';
  ctx.fillRect(fx + 8, 22, 6, 6);
  ctx.fillStyle = '#f8f8f0';
  ctx.fillRect(fx, 28, 22, 44);
  ctx.fillStyle = '#40c0e0';
  ctx.fillRect(fx + 2, 44, 18, 26);
  ctx.fillStyle = '#1c8ab0';
  ctx.fillRect(fx + 2, 44, 18, 3);
  const tropfen = (k.bildzaehler % 70) / 70;
  ctx.fillStyle = '#40c0e0';
  ctx.fillRect(fx + 10, Math.round(74 + tropfen * 22), 2, 3);

  // Uhr dreht durch.
  stoppuhr(ctx, 176, 46, 26, t * Math.PI * 40, '11 s');

  // Rotes Kreuz über der Flasche.
  const kreuz = abschnitt(t, 0.4, 0.62);
  if (kreuz > 0) {
    ctx.save();
    ctx.globalAlpha = kreuz;
    ctx.strokeStyle = BLUT_HELL;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(fx - 8, 18);
    ctx.lineTo(fx + 30, 78);
    ctx.moveTo(fx + 30, 18);
    ctx.lineTo(fx - 8, 78);
    ctx.stroke();
    ctx.restore();
  }
}

/** 4. Abgabe an der Theke: Der Spieler gibt sein Hardtekkmon ab. */
function abgabe(ctx, t, k) {
  raum(ctx, '#c8a878', 70);
  ctx.fillStyle = '#e8d8b8';
  ctx.fillRect(0, 70, BREITE, BUEHNE_HOEHE - 70);

  // Schwester hinter der Theke, Spieler davor.
  mensch2x(ctx, 'schwester', 'unten', 0, 150, 10);
  theke(ctx, 56);
  teller(ctx, 186, 50, 44);
  mensch2x(ctx, 'spieler', 'oben', Math.floor(k.bildzaehler / 12) % 2, 34, 46);

  // Das Hardtekkmon wandert aus den Händen des Spielers auf den Teller.
  const weg = abschnitt(t, 0.15, 0.82);
  const x = 62 + weg * 138;
  const y = 46 - Math.sin(weg * Math.PI) * 18;
  liegend(ctx, k.monMatt, x, y + 14, 30);
  if (weg >= 1) kreuzAugen(ctx, 196, 44);

  zeichneText(ctx, 'BOXENSTOPP', 6, 8, { farbe: '#8a6038' });
}

/** 5. Der Scan: Jede Zelle, jede Narbe. */
function scan(ctx, t, k) {
  raum(ctx, '#1a2028', 84);

  // Links das Original auf dem Teller, rechts der Datenschirm.
  teller(ctx, 18, 70, 62);
  liegend(ctx, k.mon, 49, 58, 40);

  ctx.fillStyle = '#20242e';
  ctx.fillRect(126, 12, 104, 76);
  ctx.fillStyle = '#0c1a14';
  ctx.fillRect(129, 15, 98, 70);
  datenregen(ctx, 129, 15, 98, 70, k.bildzaehler);

  // Der grüne Abzug baut sich von oben nach unten auf.
  const aufbau = abschnitt(t, 0.12, 0.86);
  ctx.save();
  ctx.beginPath();
  ctx.rect(150, 22, 56, Math.round(56 * aufbau));
  ctx.clip();
  ctx.drawImage(k.monDaten, 150, 22, 56, 56);
  ctx.restore();

  // Scannerlinie über dem Original.
  const linie = 30 + ((k.bildzaehler * 2.2) % 46);
  ctx.fillStyle = GRUEN;
  ctx.fillRect(16, Math.round(linie), 68, 2);
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = GRUEN;
  ctx.fillRect(16, Math.round(linie) - 6, 68, 6);
  ctx.restore();

  const prozent = `${Math.round(aufbau * 100)} %`;
  zeichneText(ctx, prozent, 129, 90, { farbe: GRUEN });
  if (aufbau >= 1) {
    zeichneText(ctx, 'KOMPLETT', 180, 90, { farbe: Math.floor(k.bildzaehler / 8) % 2 ? GRUEN : '#1f7a44' });
  }
}

/** 6. Der Scan fährt runter und wird auf einen Blankoklon gesetzt. */
function klonen(ctx, t, k) {
  raum(ctx, '#161c24', 88);

  // Schacht von oben in die Kapsel.
  ctx.fillStyle = '#20242e';
  ctx.fillRect(46, 0, 14, 34);
  ctx.fillStyle = '#12141a';
  ctx.fillRect(49, 0, 8, 34);

  // Kapsel mit Blankoklon.
  kapsel(ctx, 32, 30, 44, 58, 1, k.bildzaehler);
  const uebergang = abschnitt(t, 0.55, 0.95);
  ctx.save();
  ctx.globalAlpha = 1 - uebergang;
  ctx.drawImage(k.monBlank, 40, 42, 30, 30);
  ctx.restore();
  if (uebergang > 0) {
    ctx.save();
    ctx.globalAlpha = uebergang;
    ctx.drawImage(k.mon, 40, 42, 30, 30);
    ctx.restore();
  }

  // Das Datenpaket rast den Schacht hinunter in die Kapsel.
  const fahrt = abschnitt(t, 0.05, 0.55);
  if (fahrt < 1) {
    const py = fahrt * 40;
    ctx.fillStyle = GRUEN;
    ctx.fillRect(49, Math.round(py), 8, 10);
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillRect(49, Math.round(py) - 12, 8, 12);
    ctx.restore();
  } else if (uebergang < 0.6) {
    blitz(ctx, (0.6 - uebergang) * 0.5, GRUEN);
  }

  // Rechts der Schirm mit dem Bauplan, der abgearbeitet wird.
  ctx.fillStyle = '#20242e';
  ctx.fillRect(104, 14, 126, 74);
  ctx.fillStyle = '#0c1a14';
  ctx.fillRect(107, 17, 120, 68);
  datenregen(ctx, 107, 17, 120, 68, k.bildzaehler);
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.drawImage(k.monDaten, 140, 22, 56, 56);
  ctx.restore();
  zeichneText(ctx, 'EXPRESS', 110, 76, { farbe: WARNUNG });
  kpBalken(ctx, 152, 80, 64, fahrt);
}

/** 7. Der Klon ist fertig: frisch, ohne Kratzer. */
function klonfertig(ctx, t, k) {
  raum(ctx, '#161c24', 84);

  const leert = abschnitt(t, 0.1, 0.6);
  kapsel(ctx, 92, 18, 52, 62, 1 - leert, k.bildzaehler);

  // Der Klon steht auf, sobald die Lösung abgelaufen ist.
  const steht = abschnitt(t, 0.45, 0.8);
  const y = 44 + (1 - steht) * 10;
  ctx.drawImage(k.mon, 102, Math.round(y), 32, 32);

  if (steht > 0.5) {
    // Glanzpunkte – der Klon ist tadellos.
    ctx.fillStyle = '#f8f8ff';
    for (let i = 0; i < 5; i += 1) {
      const w = (k.bildzaehler / 12) + i;
      const px = 118 + Math.cos(w) * 26;
      const py = 58 + Math.sin(w * 1.3) * 22;
      ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
    }
  }

  kpBalken(ctx, 82, 88, 76, abschnitt(t, 0.35, 0.85));
  const marke = 'VOLLE KRAFTPUNKTE';
  zeichneText(ctx, marke, BREITE / 2 - textBreite(marke) / 2, 8, {
    farbe: steht >= 1 ? GRUEN : '#1f7a44', schatten: '#0c1410',
  });
}

/** 8. Austausch: Der Klon fährt hoch, die Schwester lächelt. */
function austausch(ctx, t, k) {
  raum(ctx, '#c8a878', 70);
  ctx.fillStyle = '#e8d8b8';
  ctx.fillRect(0, 70, BREITE, BUEHNE_HOEHE - 70);

  // Links der Schacht, in dem der Klon hochkommt.
  ctx.fillStyle = '#20242e';
  ctx.fillRect(4, 0, 40, BUEHNE_HOEHE);
  ctx.fillStyle = '#12141a';
  ctx.fillRect(8, 0, 32, BUEHNE_HOEHE);
  const fahrt = abschnitt(t, 0, 0.45);
  ctx.drawImage(k.mon, 10, Math.round(78 - fahrt * 62), 28, 28);
  ctx.fillStyle = GRUEN;
  ctx.fillRect(20, 4, 8, 2);

  mensch2x(ctx, 'schwester', 'unten', 0, 150, 10);
  theke(ctx, 56);
  mensch2x(ctx, 'spieler', 'oben', 0, 74, 46);

  // Übergabe: Der Klon wandert von der Schwester zum Spieler.
  const weg = abschnitt(t, 0.5, 0.85);
  if (weg > 0) {
    const x = 176 - weg * 74;
    const y = 40 - Math.sin(weg * Math.PI) * 12;
    ctx.drawImage(k.mon, Math.round(x), Math.round(y), 28, 28);
  }

  // Und ganz zum Schluss blitzt die Nummer auf, die niemand sehen soll.
  if (t > 0.78) {
    const nummer = 'KL-0001';
    const sichtbar = Math.floor(k.bildzaehler / 5) % 3 !== 0;
    zeichneText(ctx, nummer, 96, 30, { farbe: sichtbar ? BLUT_HELL : '#7a3038' });
  }
}

/** 9. Das Original geht durch die Maschine. */
function liquidierung(ctx, t, k) {
  raum(ctx, '#161c24', 84);

  // Erst fährt es hinein, dann schlägt die Maschine zu.
  const drin = t > 0.66;
  const schlag = drin ? abschnitt(t, 0.66, 0.82) : 0;
  const ruckeln = drin && schlag < 1 ? (Math.floor(k.bildzaehler / 2) % 2 ? 2 : -2) : 0;

  laufband(ctx, 64, k.bildzaehler);
  maschine(ctx, 8, 10, 72, 68, ruckeln, drin && Math.floor(k.bildzaehler / 4) % 2 === 0);

  // Das Original fährt in den Schlund – und dahinter wartet schon das nächste.
  const weg = abschnitt(t, 0.05, 0.66);
  if (!drin) {
    const x = 232 - weg * 180;
    liegend(ctx, k.monMatt, x, 54, 30);
    kreuzAugen(ctx, x - 10, 48);
  }
  const naechstes = abschnitt(t, 0.7, 1);
  if (naechstes > 0) {
    const nx = 250 - naechstes * 74;
    liegend(ctx, k.monMatt, nx, 54, 30);
    kreuzAugen(ctx, nx - 10, 48);
  }

  if (drin && schlag < 1) {
    spritzer(ctx, 48, 48, schlag, 16, 52);
    blitz(ctx, (1 - schlag) * 0.22, BLUT_HELL);
  }
  if (drin) lache(ctx, 10, 88, 70, 8);

  zeichneText(ctx, 'RUND UM DIE UHR', 122, 12, {
    farbe: Math.floor(k.bildzaehler / 20) % 2 ? WARNUNG : '#8a6a20',
  });
}

/** 10. Entsorgung: Der Haufen wächst schneller, als jemand wegräumen kann. */
function entsorgung(ctx, t, k) {
  raum(ctx, '#161c24', 76);

  // Rutsche oben rechts.
  ctx.fillStyle = '#2a3038';
  ctx.beginPath();
  ctx.moveTo(BREITE, 6);
  ctx.lineTo(BREITE, 30);
  ctx.lineTo(150, 44);
  ctx.lineTo(150, 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#12141a';
  ctx.fillRect(150, 30, 8, 12);

  lache(ctx, 26, 86, 150, 10);

  // Alle paar Bilder fällt eine weitere Leiche auf den Haufen.
  const wuerfe = 4;
  const fertig = Math.floor(t * wuerfe);
  haufen(ctx, 62, 76, 3 + fertig * 2, k.monTot);

  const anteil = (t * wuerfe) % 1;
  if (fertig < wuerfe) {
    const fx = 150 - anteil * 44;
    const fy = 38 + anteil * anteil * 44;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(anteil * 3);
    ctx.drawImage(k.monTot, -9, -9, 18, 18);
    ctx.restore();
  }

  const zahl = `${412 + fertig * 3}`;
  zeichneText(ctx, 'ENTSORGT HEUTE', 8, 10, { farbe: '#7a828a' });
  zeichneText(ctx, zahl, 8, 22, { farbe: BLUT_HELL });
}

/** 11. Und oben geht die Schlange weiter. */
function schluss(ctx, t, k) {
  // Oben das Heilungscenter, unten das Labor – ein Bild, zwei Wahrheiten.
  ctx.fillStyle = '#c8a878';
  ctx.fillRect(0, 0, BREITE, 54);
  ctx.fillStyle = '#e8d8b8';
  ctx.fillRect(0, 38, BREITE, 16);
  ctx.fillStyle = '#6a4828';
  ctx.fillRect(0, 54, BREITE, 4);

  mensch2x(ctx, 'schwester', 'unten', 0, 194, 8);
  ctx.fillStyle = '#b0844c';
  ctx.fillRect(150, 36, BREITE - 150, 6);

  // Die Schlange schiebt sich langsam nach rechts.
  const figuren = ['kumpel', 'raver', 'punk', 'maedchen'];
  figuren.forEach((figur, i) => {
    const x = ((k.bildzaehler * 0.35 + i * 46) % (BREITE + 40)) - 40;
    mensch2x(ctx, figur, 'rechts', Math.floor(k.bildzaehler / 10) % 2, x, 12);
  });

  // Unten die Maschine, die weiterläuft.
  ctx.fillStyle = '#161c24';
  ctx.fillRect(0, 58, BREITE, BUEHNE_HOEHE - 58);
  maschine(ctx, 12, 60, 58, 40, 0, Math.floor(k.bildzaehler / 6) % 2 === 0);
  lache(ctx, 78, 92, 148, 8);
  haufen(ctx, 96, 84, 6, k.monTot, 14);

  ctx.save();
  ctx.globalAlpha = 0.16 + Math.sin(k.bildzaehler / 9) * 0.05;
  ctx.fillStyle = BLUT_HELL;
  ctx.fillRect(0, 58, BREITE, BUEHNE_HOEHE - 58);
  ctx.restore();

  // Abblende zum Schluss.
  blitz(ctx, abschnitt(t, 0.82, 1), '#000000');
}

const BILDER = {
  vorspann, tempo, mate, abgabe, scan, klonen, klonfertig,
  austausch, liquidierung, entsorgung, schluss,
};

/**
 * Zeichnet ein Filmbild.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} bild Kennung aus KLONFILM
 * @param {number} t Fortschritt des Abschnitts, 0 bis 1
 * @param {{ mon: CanvasImageSource, monMatt: CanvasImageSource, monBlank: CanvasImageSource,
 *   monDaten: CanvasImageSource, monTot: CanvasImageSource, bildzaehler: number }} k
 */
export function zeichneFilmbild(ctx, bild, t, k) {
  const zeichner = BILDER[bild] ?? vorspann;
  zeichner(ctx, klemme(t), k);
}
