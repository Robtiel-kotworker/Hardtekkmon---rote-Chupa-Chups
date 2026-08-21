// ============================================================================
// Trainer
// ----------------------------------------------------------------------------
// Jeder Trainer bringt ein festes Team, drei Sprüche und ein Preisgeld mit.
// Die Kennung wird von den Karten referenziert; besiegte Trainer merkt sich
// der Spielstand über dieselbe Kennung.
// ============================================================================

/** @type {Record<string, object>} */
export const TRAINER = {};

/**
 * @param {string} id
 * @param {string} name
 * @param {string} figur Aussehen (siehe gfx/menschen.js)
 * @param {[string, number][]} team [Artname, Stufe]
 * @param {{ start: string, sieg: string, niederlage: string }} texte
 * @param {{ preisgeld?: number, gig?: number, blick?: number }} [zusatz]
 */
function trainer(id, name, figur, team, texte, zusatz = {}) {
  const hoechsteStufe = team.reduce((max, [, stufe]) => Math.max(max, stufe), 1);
  TRAINER[id] = {
    id,
    name,
    figur,
    team,
    texte,
    blick: zusatz.blick ?? 4,
    gig: zusatz.gig ?? null,
    preisgeld: zusatz.preisgeld ?? hoechsteStufe * 40,
  };
}

// --- Rivale ------------------------------------------------------------------
trainer('rivale1', 'Bierdusche-Benny', 'rivale', [['Trötomat', 6], ['Ratz-Ronny', 5]], {
  start: 'Na? Auch Bock auf Krach? Dann zeig mal, was dein Ding kann!',
  sieg: 'Hab ich dir doch gesagt. Üb noch mal ein Jahr.',
  niederlage: 'Ey. Das war Anfängerglück. Eindeutig.',
}, { preisgeld: 300 });
trainer('rivale2', 'Bierdusche-Benny', 'rivale', [['Trötomat', 18], ['Kabelkurt', 17], ['Schrubbomat', 19]], {
  start: 'Ich hab seitdem drei Nächte durchgemacht. Du auch?',
  sieg: 'Merkst du was? Du bist zu ausgeschlafen für dieses Spiel.',
  niederlage: 'Boah. Okay. Ich brauch erst mal ne Mate.',
}, { preisgeld: 900 });
trainer('rivale3', 'Bierdusche-Benny', 'rivale', [['Trötenherzog Torsten', 34], ['Kabelkorbinian', 33], ['Boxenbert', 33], ['Pogo-Panzer', 35]], {
  start: 'Vier Gigs hab ich schon. Und du läufst noch mit dem Rucksack rum.',
  sieg: 'Geh nach Hause, schlaf dich aus, komm wieder.',
  niederlage: 'Ernsthaft jetzt? Ich hab dafür extra nicht geschlafen!',
}, { preisgeld: 1800 });

// --- Route der Rohlinge (Route 1) --------------------------------------------
trainer('r1_kevin', 'Kettenraucher-Kevin', 'punk', [['Ratz-Ronny', 4], ['Tröti', 4]], {
  start: 'Ey, warte. Ich muss die nur noch schnell zu Ende rauchen.',
  sieg: 'Siehste. Kondition ist überbewertet.',
  niederlage: 'Ich hör auf. Mit dem Kämpfen, meine ich.',
});
trainer('r1_torsten', 'Turnbeutel-Torsten', 'junge', [['Kickolaus', 5]], {
  start: 'In meinem Turnbeutel ist alles drin. Alles!',
  sieg: 'Alles drin, sag ich doch.',
  niederlage: 'Jetzt ist der Beutel leer. Innerlich.',
});
trainer('r1_conny', 'Currywurst-Conny', 'maedchen', [['Donkelchen', 4], ['Schrubbi', 5]], {
  start: 'Pommes rot-weiß und dann kämpfen wir.',
  sieg: 'Die Extraportion hat sich gelohnt.',
  niederlage: 'Mir ist schlecht. Aber nicht wegen dir.',
});

// --- Plattenwald --------------------------------------------------------------
trainer('wald_bernd', 'Bauchtaschen-Bernd', 'kumpel', [['Schimmi', 8], ['Muffel', 8]], {
  start: 'In der Bauchtasche? Zwei Packs und ein halbes Brötchen.',
  sieg: 'Brötchen ist noch da. Alles gut.',
  niederlage: 'Nimmst du das Brötchen? Ich hab keinen Hunger mehr.',
});
trainer('wald_jaqueline', 'Jogginghosen-Jaqueline', 'raver', [['Tröti', 9], ['Ravelinde', 9]], {
  start: 'Jogginghose ist keine Aufgabe, das ist eine Haltung.',
  sieg: 'Bequem gewinnt. Immer.',
  niederlage: 'Okay, ich zieh mich um. Also gedanklich.',
});
trainer('wald_nils', 'Nadeltausch-Nils', 'techniker', [['Nadel-Nadine', 10]], {
  start: 'Die Nadel ist von 1998. Läuft noch wie am ersten Tag.',
  sieg: 'Original ist Original.',
  niederlage: 'Die Nadel ist krumm. Und mein Stolz auch.',
});
trainer('wald_frieda', 'Feuerzeug-Frieda', 'maedchen', [['Glitchi', 9], ['Dunsti', 10]], {
  start: 'Feuer? Hab ich. Streit? Auch.',
  sieg: 'Ich hab immer Feuer. Merk dir das.',
  niederlage: 'Ist eh leer, das Ding.',
});
trainer('wald_pit', 'Pfandflaschen-Pit', 'opa', [['Ratz-Ronny', 9], ['Ratz-Ronny', 9], ['Kellerkind', 10]], {
  start: 'Erst kämpfen, dann sammeln. Oder umgekehrt.',
  sieg: 'Der Wagen ist voll und ich hab gewonnen.',
  niederlage: 'Kannst du die leeren mitnehmen? Bitte.',
});

// --- Kellerstadt und Umgebung -------------------------------------------------
trainer('keller_frank', 'Fliesenleger-Frank', 'schrauber', [['Fliesi', 12], ['Kellerkind', 12]], {
  start: 'Fugen sind das Wichtigste. Im Leben wie im Kampf.',
  sieg: 'Sauber verfugt. Kein Wasser drin.',
  niederlage: 'Da muss ich noch mal ran. Alles raus.',
});
trainer('keller_mandy', 'Malocher-Mandy', 'techniker', [['Presslufthannes', 13]], {
  start: 'Ich hab heute schon zwölf Stunden. Zwölf!',
  sieg: 'Und jetzt noch drei Stunden Feierabend.',
  niederlage: 'Ich mach Pause. Endlich.',
});
trainer('keller_helmut', 'Hausmeister-Helmut', 'opa', [['Muffel', 13], ['Schimmi', 12], ['Gullideckel-Gustav', 14]], {
  start: 'Hier wird nicht gekämpft! … Na gut, einmal.',
  sieg: 'Und jetzt raus hier, ich muss abschließen.',
  niederlage: 'Der Schlüssel ist eh weg. Wie immer.',
});

// --- Route 3 / Boxenberg ------------------------------------------------------
trainer('r3_zacharias', 'Zahnstein-Zacharias', 'zombie', [['Zahnlücken-Zombie', 15]], {
  start: 'Zahnarzt? Kenn ich nur vom Vorbeifahren.',
  sieg: 'Beißt sich durch, mein Kleiner.',
  niederlage: 'Aua. Und zwar überall.',
});
trainer('r3_waltraud', 'Wodka-Waltraud', 'oma', [['Absacker-Anton', 15], ['Chemie-Chantal', 15]], {
  start: 'Einen zur Begrüßung? Nein? Dann kämpfen wir eben.',
  sieg: 'Prost, mein Kind.',
  niederlage: 'Der war zu klein. Der nächste wird größer.',
});
trainer('berg_dieter', 'Doppelkorn-Dieter', 'kumpel', [['Kellerkind', 16], ['Ratzomat', 16]], {
  start: 'Doppelt hält besser. Sagt mein Arzt nicht, aber ich.',
  sieg: 'Doppelt gewonnen quasi.',
  niederlage: 'Einfach reicht auch. Manchmal.',
});
trainer('berg_renate', 'Restposten-Renate', 'oma', [['Schimmelmann', 17], ['Muffel', 16]], {
  start: 'Alles reduziert! Auch meine Erwartungen an dich.',
  sieg: 'Sonderangebot: du verlierst.',
  niederlage: 'Umtausch ausgeschlossen. Leider.',
});
trainer('berg_achim', 'Aldi-Achim', 'kumpel', [['Bierbankbernd', 18]], {
  start: 'Ich hab alles von der mittleren Gasse. Alles!',
  sieg: 'Marke ist Einbildung.',
  niederlage: 'Nächste Woche gibt es wieder Trainerbedarf.',
});

// --- Subwoofer City -----------------------------------------------------------
trainer('sub_basti', 'Bassbox-Basti', 'raver', [['Wummi', 20], ['Boxi', 20]], {
  start: 'Hör mal kurz. … Nein, hör RICHTIG hin.',
  sieg: 'Das ist Druck. Das ist Physik.',
  niederlage: 'Meine Membran. Meine arme Membran.',
});
trainer('sub_bodo', 'Boxenschieber-Bodo', 'schrauber', [['Subwoofer-Sepp', 21], ['Boxenbert', 22]], {
  start: 'Ich schiebe seit 20 Jahren Boxen. Rücken ist Auslegungssache.',
  sieg: 'Und jetzt hilf mir mal beim Tragen.',
  niederlage: 'Immerhin muss ich nicht mehr schieben.',
});
trainer('sub_nadine', 'Nachtbus-Nadine', 'maedchen', [['Nachtschicht-Nadja', 22]], {
  start: 'Der N7 fährt in vier Minuten. Das reicht für dich.',
  sieg: 'Und ich krieg ihn sogar noch.',
  niederlage: 'Jetzt muss ich laufen. Danke auch.',
});
trainer('sub_toni', 'Taxi-Toni', 'wirt', [['Kabelkurt', 21], ['Plong', 21], ['Hüpfi', 22]], {
  start: 'Einsteigen? Erst kämpfen. Meter zählt trotzdem.',
  sieg: 'Macht dann 14,80.',
  niederlage: 'Diesmal fahr ich dich umsonst. Einmalig.',
});

// --- Route 5 ------------------------------------------------------------------
trainer('r5_schorsch', 'Schichtarbeiter-Schorsch', 'techniker', [['Aggi', 24], ['Stampfi', 24]], {
  start: 'Nachtschicht, Frühschicht, Kampf. In der Reihenfolge.',
  sieg: 'Und morgen wieder um sechs.',
  niederlage: 'Ich glaub, ich meld mich krank.',
});
trainer('r5_kurt', 'Kippenstummel-Kurt', 'punk', [['Kippen-Kevin', 25]], {
  start: 'Der letzte Zug. Immer der letzte Zug.',
  sieg: 'Feuer hast du nicht, oder?',
  niederlage: 'Jetzt ist wirklich Schluss. Bis morgen.',
});
trainer('r5_enrico', 'Energydrink-Enrico', 'raver', [['Mate-Mandy', 25], ['Chemie-Chantal', 24]], {
  start: 'Sechs Dosen. Heute. Bisher.',
  sieg: 'Die siebte hab ich mir jetzt verdient.',
  niederlage: 'Mein Herz macht Sachen. Komische Sachen.',
});

// --- Vinylhafen ---------------------------------------------------------------
trainer('hafen_vanessa', 'Vinylkoffer-Vanessa', 'raver', [['Plattenpaule', 27], ['Scratchi', 27]], {
  start: 'Der Koffer wiegt 28 Kilo. Frag nicht.',
  sieg: 'Analog gewinnt. Punkt.',
  niederlage: 'Meine Platten! Die sind von 1996!',
});
trainer('hafen_peer', 'Plattenkoffer-Peer', 'wirt', [['Vinyl-Vitali', 28]], {
  start: 'Ich hab hier eine Platte, die es nie gab.',
  sieg: 'Gibt es immer noch nicht. Wie dein Sieg.',
  niederlage: 'Die leg ich jetzt trotzdem auf.',
});
trainer('hafen_sven', 'Slipmat-Sven', 'techniker', [['Nadelnick', 28], ['Bitbert', 27]], {
  start: 'Filz ist Technik. Wusstest du das?',
  sieg: 'Filz gewinnt, immer.',
  niederlage: 'Der Filz ist durch. Nach 15 Jahren.',
});
trainer('hafen_micha', 'Mischpult-Micha', 'schrauber', [['Kabelkorbinian', 29], ['Bytebert', 29]], {
  start: 'Kanal 3 rauscht. Seit 2011. Stört mich nicht.',
  sieg: 'Rauschen gehört dazu.',
  niederlage: 'Jetzt rauschen alle Kanäle.',
});

// --- Route 7 ------------------------------------------------------------------
trainer('r7_pia', 'Pitchfader-Pia', 'maedchen', [['Plongomat', 31], ['Glitchmeister', 31]], {
  start: 'Plus acht Prozent. Immer plus acht.',
  sieg: 'Schneller ist einfach besser.',
  niederlage: 'Ich zieh auf null zurück. Beschämend.',
});
trainer('r7_olaf', 'Ohrenschmerz-Olaf', 'punk', [['Ohrwurm-Olga', 32]], {
  start: 'Ich hör dich nicht, aber ich kämpf trotzdem.',
  sieg: 'Was? WAS?',
  niederlage: 'Das hab ich sogar gehört.',
});
trainer('r7_tanja', 'Tinnitus-Tanja', 'raver', [['Sirenen-Sonja', 31], ['Hallenhalunke', 32]], {
  start: 'Es pfeift. Seit sechs Jahren. Konstant in Fis.',
  sieg: 'Jetzt pfeift es zweistimmig.',
  niederlage: 'Endlich mal Ruhe. Für zwei Sekunden.',
});
trainer('r7_gerd', 'Gehörschutz-Gerd', 'opa', [['Boxenbert', 32], ['Muffelmann', 32]], {
  start: 'Stöpsel rein, dann reden wir.',
  sieg: 'Ich hab kein Wort verstanden. Egal.',
  niederlage: 'Ich hätte doch zuhören sollen.',
});

// --- Schranzheim --------------------------------------------------------------
trainer('schranz_dennis', 'Diskokugel-Dennis', 'raver', [['Lichtorgel-Lisa', 34], ['Blitzbirne', 34]], {
  start: 'Die Kugel dreht sich seit 1987 ohne Pause.',
  sieg: 'Und sie dreht sich weiter.',
  niederlage: 'Sie ist runtergefallen. Alles ist runtergefallen.',
});
trainer('schranz_sina', 'Spiegelkugel-Sina', 'maedchen', [['Blitzbaron Bernd', 35]], {
  start: 'Ich hab 1400 kleine Spiegel. Und alle sehen dich.',
  sieg: 'Von allen Seiten verloren.',
  niederlage: 'Sieben Jahre Pech. Mindestens.',
});
trainer('schranz_karin', 'Kabeltrommel-Karin', 'techniker', [['Kabelkorbinian', 35], ['Stromer Sven', 34]], {
  start: 'Immer komplett abrollen. Sonst brennt sie durch.',
  sieg: 'Abgerollt und aufgeräumt.',
  niederlage: 'Sie brennt. Die Trommel brennt tatsächlich.',
});
trainer('schranz_steffen', 'Stromkasten-Steffen', 'schrauber', [['Steckdosen-Steve', 36], ['Aggregatus', 36]], {
  start: 'Der Kasten ist von 1974. Läuft. Frag nicht wie.',
  sieg: 'Alte Technik, neue Sieger.',
  niederlage: 'Jetzt ist die Straße dunkel. Die ganze Straße.',
});

// --- Nebelmoor ----------------------------------------------------------------
trainer('moor_nico', 'Nebelfluid-Nico', 'techniker', [['Dunstomat', 38], ['Trockeneis-Toni', 38]], {
  start: 'Ich hab 40 Liter dabei. Für heute Abend.',
  sieg: 'Siehst du? Also, du siehst natürlich nichts.',
  niederlage: 'Das Fass ist umgekippt. Alles ist weiß.',
});
trainer('moor_timo', 'Trockeneis-Timo', 'kumpel', [['Trockeneis-Theo', 39]], {
  start: 'Nicht anfassen. Ich mein das ernst.',
  sieg: 'Hab ich doch gesagt.',
  niederlage: 'Meine Finger. Wo sind meine Finger.',
});
trainer('moor_katja', 'Katerfrühstück-Katja', 'oma', [['Absacker-Alfred', 39], ['Klobrillen-Kurti', 38]], {
  start: 'Rollmops und Cola. Das ist die Lösung.',
  sieg: 'Schmeckt scheußlich, wirkt aber.',
  niederlage: 'Ich brauch noch einen Rollmops.',
});
trainer('moor_hendrik', 'Heimweg-Hendrik', 'zombie', [['Afterhour-Achim', 40], ['Augenring-Otto', 40]], {
  start: 'Ich such den Weg nach Hause. Seit Samstag.',
  sieg: 'Ich geh dann mal weiter. Irgendwohin.',
  niederlage: 'Weißt du zufällig, wo ich wohne?',
});

// --- Donkhausen ----------------------------------------------------------------
trainer('donk_manni', 'Monitorbox-Manni', 'schrauber', [['Federfranz', 42], ['Donkomat', 42]], {
  start: 'Der Monitor ist zu leise. Immer.',
  sieg: 'Mehr auf den Monitor! Immer mehr!',
  niederlage: 'Jetzt ist er zu laut. Deutlich zu laut.',
});
trainer('donk_rita', 'Rückkopplungs-Rita', 'raver', [['Hüpfomat', 43], ['Plongomat', 43]], {
  start: 'Gleich pfeift es. Warte kurz. … Jetzt.',
  sieg: 'Rückkopplung ist auch nur ein Instrument.',
  niederlage: 'Aus. Aus! Macht das aus!',
});
trainer('donk_soeren', 'Soundcheck-Sören', 'techniker', [['Kaugummi-Kai', 43], ['Presslufthannes', 44]], {
  start: 'Test. Test. Eins zwei. Eins zwei. Kampf.',
  sieg: 'Check.',
  niederlage: 'Kein Check. Gar kein Check.',
});

// --- Glitchstadt ---------------------------------------------------------------
trainer('glitch_tom', 'Türsteher-Tom', 'wache', [['Türsteher-Theo', 45], ['Gullideckel-Gustav', 45]], {
  start: 'Heute nicht.',
  sieg: 'Hab ich doch gesagt: heute nicht.',
  niederlage: 'Na gut. Rein mit dir.',
});
trainer('glitch_bea', 'Bändchen-Bea', 'maedchen', [['Bytebert', 46], ['Laserpointer-Lars', 46]], {
  start: 'Ohne Bändchen kein Einlass. Ohne Sieg auch nicht.',
  sieg: 'Kein Bändchen für dich.',
  niederlage: 'Hier, dein Bändchen. Nicht abmachen!',
});
trainer('glitch_gitta', 'Garderobe-Gitta', 'oma', [['Nadelfürst Nino', 47]], {
  start: 'Jacke abgeben? Zwei Euro. Kampf? Umsonst.',
  sieg: 'Nummer 47. Nicht verlieren.',
  niederlage: 'Deine Jacke ist weg. Tut mir leid.',
});
trainer('glitch_kalli', 'Klohäuschen-Kalli', 'wirt', [['Klobrillen-Kurti', 46], ['Muffelmann', 46]], {
  start: 'Fünfzig Cent. Auch für Trainer.',
  sieg: 'Und jetzt raus, es warten Leute.',
  niederlage: 'Für dich heute umsonst. Ausnahmsweise.',
});

// --- Schotterhausen (spät) ------------------------------------------------------
trainer('schotter_andi', 'Absacker-Andi', 'kumpel', [['Absacker-Alfred', 48], ['Feierabend-Fabian', 48]], {
  start: 'Einer noch. Dann wirklich.',
  sieg: 'Einer noch?',
  niederlage: 'Okay, ich geh. Wirklich jetzt.',
});
trainer('schotter_anni', 'Afterhour-Anni', 'raver', [['Afterhour-Achim', 49], ['Der Verklatschte', 49]], {
  start: 'Es ist elf Uhr morgens. Wir fangen gerade erst an.',
  sieg: 'Bis heute Abend dann.',
  niederlage: 'Ich brauch ein Fenster. Und Luft.',
});
trainer('schotter_ferdi', 'Frühschicht-Ferdi', 'techniker', [['Frühschicht-Fritz', 50]], {
  start: 'Ich hab in vier Stunden Schicht. Also los.',
  sieg: 'Und jetzt ab unter die Dusche.',
  niederlage: 'Ich ruf an und sag, der Zug fällt aus.',
});
trainer('schotter_sammy', 'Sonnenaufgang-Sammy', 'zombie', [['Jesus 2.0', 50], ['Augenring-Otto', 49]], {
  start: 'Da vorn geht die Sonne auf. Das ist immer der Moment.',
  sieg: 'Schön, oder?',
  niederlage: 'Schade. Aber schön war es trotzdem.',
});

// --- Gig-Leiter (die acht Bühnen) ------------------------------------------------
trainer('gig1', 'Fliesentisch Kalle', 'gigleiter',
  [['Fliesi', 14], ['Kellerkind', 14], ['Fliesenfürst Fred', 16]], {
    start: 'Der Tisch hält. Der Tisch hält immer. Bis er nicht mehr hält.',
    sieg: 'Tisch steht. Du liegst.',
    niederlage: 'Der Tisch ist hin. Nimm die Marke, du hast sie dir verdient.',
  }, { gig: 0, preisgeld: 1600, blick: 0 });
trainer('gig2', 'Zwei-Zahn Gerald', 'gigleiter',
  [['Wummi', 21], ['Subwoofer-Sepp', 21], ['Bassbox-Britta', 23], ['Boxenbert', 24]], {
    start: 'Zwei Zähne reichen. Zum Reden und zum Grinsen.',
    sieg: 'Und jetzt grins ich. Zweizähnig.',
    niederlage: 'Respekt. Ehrlich. Nimm die Marke.',
  }, { gig: 1, preisgeld: 2400, blick: 0 });
trainer('gig3', 'Augenringe Hugo', 'gigleiter',
  [['Scratchi', 28], ['Plattenpaule', 28], ['Kassenwart-Kalle', 29], ['Vinyl-Vitali', 31]], {
    start: 'Ich hab seit Donnerstag nicht geschlafen. Welcher Donnerstag, weiß ich nicht.',
    sieg: 'Müdigkeit ist eine Superkraft, mein Freund.',
    niederlage: 'Vielleicht sollte ich doch mal schlafen. Hier, die Marke.',
  }, { gig: 2, preisgeld: 3200, blick: 0 });
trainer('gig4', 'Pillen-Petra', 'gigleiter',
  [['Schranzomat', 35], ['Kreissägen-Karsten', 35], ['Sägomat', 36], ['Hallenhalunke', 38]], {
    start: 'Ich hab für alles was da. Für alles.',
    sieg: 'Hättste mal was genommen. Kaugummi zum Beispiel.',
    niederlage: 'Nicht schlecht. Marke ist deine.',
  }, { gig: 3, preisgeld: 4000, blick: 0 });
trainer('gig5', 'Nebel-Norbert', 'gigleiter',
  [['Dunstomat', 41], ['Trockeneis-Theo', 41], ['Nebelniklas', 42], ['Chemtrail-Charly', 44]], {
    start: 'Siehst du mich? Nein? Sehr gut.',
    sieg: 'Ich war die ganze Zeit hinter dir.',
    niederlage: 'Beeindruckend. Irgendwo hier ist die Marke.',
  }, { gig: 4, preisgeld: 4800, blick: 0 });
trainer('gig6', 'Donk-Detlef', 'gigleiter',
  [['Hüpfomat', 45], ['Federfranz', 45], ['Plongomat', 46], ['Hüpfburgen-Harry', 48]], {
    start: 'Plong. Plong. PLONG. Verstehst du?',
    sieg: 'Plong.',
    niederlage: 'Okay. Plong für dich. Und die Marke.',
  }, { gig: 5, preisgeld: 5600, blick: 0 });
trainer('gig7', 'Glitch-Gudrun', 'gigleiter',
  [['Bytebert', 49], ['Plongomat', 49], ['Laserpointer-Lars', 50], ['Glitchgott Günther', 52]], {
    start: 'Ich bin- ich bin- ich bin gleich fertig. Moment.',
    sieg: 'Fehler 404: Sieg nicht gefunden.',
    niederlage: 'Ich starte neu. Nimm solange die Marke.',
  }, { gig: 6, preisgeld: 6400, blick: 0 });
trainer('gig8', 'Laborkittel-Ludwig', 'gigleiter',
  [['Säurebärbel', 53], ['Pillenpaul', 53], ['Chemtrail-Charly', 54], ['Acidkaiser Alfons', 55], ['Der Verklatschte', 56]], {
    start: 'Willkommen im letzten Labor. Hier wird alles ausprobiert.',
    sieg: 'Das Experiment ist gescheitert. Du warst das Experiment.',
    niederlage: 'Erstaunlich. Wirklich erstaunlich. Die achte Marke gehört dir.',
  }, { gig: 7, preisgeld: 7200, blick: 0 });

// --- Die vier Verstärker (Backstage) ----------------------------------------------
trainer('elite1', 'Hallen-Hilde', 'gigleiter',
  [['Sägefürst Sigi', 56], ['Schranzgeneral Siegfried', 56], ['Ohrwurm-Olga', 57], ['Sirenen-Sonja', 57], ['Schrubberkönig Sülz', 59]], {
    start: 'Ich hab Hallen gefüllt, die es offiziell nie gab.',
    sieg: 'Die Halle bleibt meine.',
    niederlage: 'Geh weiter. Der Nächste wartet schon.',
  }, { preisgeld: 8000, blick: 0 });
trainer('elite2', 'Subwoofer-Sigmar', 'gigleiter',
  [['Boxenkaiser Bodo', 57], ['Subbass-Sebastian', 57], ['Basstian Blechschaden', 58], ['Bunker-Bianca', 58], ['Wummerkönig Willi', 60]], {
    start: 'Du hörst mich nicht. Du fühlst mich.',
    sieg: 'Zu wenig Druck, mein Freund.',
    niederlage: 'Ordentlich Druck. Weiter mit dir.',
  }, { preisgeld: 8400, blick: 0 });
trainer('elite3', 'Trockeneis-Torben', 'gigleiter',
  [['Nebelfürst Norbert', 58], ['Dunstherzog Dieter', 58], ['Trockeneis-Theo', 59], ['Nachtschicht-Nadja', 59], ['Jesus 2.0', 61]], {
    start: 'Gleich siehst du gar nichts mehr. Versprochen.',
    sieg: 'Und weg bist du.',
    niederlage: 'Der Nebel lichtet sich. Für dich.',
  }, { preisgeld: 8800, blick: 0 });
trainer('elite4', 'Kabelbinder-Kevin', 'gigleiter',
  [['Kabelbaron Konrad', 59], ['Notstrom-Nobbi', 59], ['Hochspannungs-Horst', 60], ['Glitchgott Günther', 60], ['Konfettikanonen-Kevin', 62]], {
    start: 'Alles festgezurrt. Auch deine Chancen.',
    sieg: 'Kabelbinder halten. Immer.',
    niederlage: 'Ich schneid dich los. Geh zum Chef.',
  }, { preisgeld: 9200, blick: 0 });
trainer('champion', 'Bierdusche-Benny', 'rivale',
  [['Trötenherzog Torsten', 62], ['Kabelbaron Konrad', 62], ['Pogo-Panzer', 63], ['Boxenkaiser Bodo', 63], ['Der Verklatschte', 64], ['Kickzilla Kalle', 65]], {
    start: 'Überraschung. Ich war schneller. Wie immer.',
    sieg: 'Und deswegen steh ich hier oben und du da unten.',
    niederlage: 'Das … das war stark. Wirklich stark. Der Platz gehört dir.',
  }, { preisgeld: 12000, blick: 0 });

/** @param {string} id */
export function trainerInfo(id) {
  return TRAINER[id] ?? null;
}
