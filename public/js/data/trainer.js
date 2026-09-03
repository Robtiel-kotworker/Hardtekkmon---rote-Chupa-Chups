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
 * @param {{ preisgeld?: number, gig?: number, blick?: number, musik?: string, belohnung?: string }} [zusatz]
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
    // Übersteuert die normale Kampfmusik nach Gegnerart (siehe KAMPFMUSIK in
    // scenes/kampfszene.js) – bisher nur für die Helene-Fischer-Ultras genutzt.
    musik: zusatz.musik ?? null,
    // Einmaliger Gegenstand obendrauf, zusätzlich zum Preisgeld (siehe
    // kampfEnde() in scenes/welt.js) – bisher nur für Helene Fischers Finale.
    belohnung: zusatz.belohnung ?? null,
  };
}

// --- Rivale ------------------------------------------------------------------
trainer('rivale1', 'Bierdusche-Benny', 'rivale', [['Trötomat', 6], ['Ratz-Ronny', 5]], {
  start: 'Na, {name}? Auch Bock auf Krach? Dann zeig mal, was dein Ding kann!',
  sieg: 'Hab ich dir doch gesagt. Üb noch mal ein Jahr.',
  niederlage: 'Ey. Das war Anfängerglück. Eindeutig.',
}, { preisgeld: 300 });
trainer('rivale2', 'Bierdusche-Benny', 'rivale', [['Trötomat', 14], ['Kabelkurt', 14], ['Schrubbomat', 14]], {
  start: 'Ich hab seitdem drei Nächte durchgemacht, {name}. Du auch?',
  sieg: 'Merkst du was? Du bist zu ausgeschlafen für dieses Spiel.',
  niederlage: 'Boah. Okay. Ich brauch erst mal ne Mate.',
}, { preisgeld: 900 });
trainer('rivale3', 'Bierdusche-Benny', 'rivale', [['Trötenherzog Torsten', 19], ['Kabelkorbinian', 19], ['Boxenbert', 19], ['Pogo-Panzer', 20]], {
  start: 'Vier Gigs hab ich schon, {name}. Und du läufst noch mit dem Rucksack rum.',
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
trainer('wald_bernd', 'Bauchtaschen-Bernd', 'kumpel', [['Schimmi', 7], ['Muffel', 7]], {
  start: 'In der Bauchtasche? Zwei Packs und ein halbes Brötchen.',
  sieg: 'Brötchen ist noch da. Alles gut.',
  niederlage: 'Nimmst du das Brötchen? Ich hab keinen Hunger mehr.',
});
trainer('wald_jaqueline', 'Jogginghosen-Jaqueline', 'raver', [['Tröti', 8], ['Ravelinde', 8]], {
  start: 'Jogginghose ist keine Aufgabe, das ist eine Haltung.',
  sieg: 'Bequem gewinnt. Immer.',
  niederlage: 'Okay, ich zieh mich um. Also gedanklich.',
});
trainer('wald_nils', 'Nadeltausch-Nils', 'techniker', [['Nadel-Nadine', 8]], {
  start: 'Die Nadel ist von 1998. Läuft noch wie am ersten Tag.',
  sieg: 'Original ist Original.',
  niederlage: 'Die Nadel ist krumm. Und mein Stolz auch.',
});
trainer('wald_frieda', 'Feuerzeug-Frieda', 'maedchen', [['Glitchi', 8], ['Dunsti', 8]], {
  start: 'Feuer? Hab ich. Streit? Auch.',
  sieg: 'Ich hab immer Feuer. Merk dir das.',
  niederlage: 'Ist eh leer, das Ding.',
});
trainer('wald_pit', 'Pfandflaschen-Pit', 'opa', [['Ratz-Ronny', 8], ['Ratz-Ronny', 8], ['Kellerkind', 8]], {
  start: 'Erst kämpfen, dann sammeln. Oder umgekehrt.',
  sieg: 'Der Wagen ist voll und ich hab gewonnen.',
  niederlage: 'Kannst du die leeren mitnehmen? Bitte.',
});

// --- Kellerstadt und Umgebung -------------------------------------------------
trainer('keller_frank', 'Fliesenleger-Frank', 'schrauber', [['Fliesi', 10], ['Kellerkind', 10]], {
  start: 'Fugen sind das Wichtigste. Im Leben wie im Kampf.',
  sieg: 'Sauber verfugt. Kein Wasser drin.',
  niederlage: 'Da muss ich noch mal ran. Alles raus.',
});
trainer('keller_mandy', 'Malocher-Mandy', 'techniker', [['Presslufthannes', 11]], {
  start: 'Ich hab heute schon zwölf Stunden. Zwölf!',
  sieg: 'Und jetzt noch drei Stunden Feierabend.',
  niederlage: 'Ich mach Pause. Endlich.',
});
trainer('keller_helmut', 'Hausmeister-Helmut', 'opa', [['Muffel', 11], ['Schimmi', 10], ['Gullideckel-Gustav', 12]], {
  start: 'Hier wird nicht gekämpft! … Na gut, einmal.',
  sieg: 'Und jetzt raus hier, ich muss abschließen.',
  niederlage: 'Der Schlüssel ist eh weg. Wie immer.',
});

// --- Route 3 / Boxenberg ------------------------------------------------------
trainer('r3_zacharias', 'Zahnstein-Zacharias', 'zombie', [['Zahnlücken-Zombie', 13]], {
  start: 'Zahnarzt? Kenn ich nur vom Vorbeifahren.',
  sieg: 'Beißt sich durch, mein Kleiner.',
  niederlage: 'Aua. Und zwar überall.',
});
trainer('r3_waltraud', 'Wodka-Waltraud', 'oma', [['Absacker-Anton', 13], ['Chemie-Chantal', 13]], {
  start: 'Einen zur Begrüßung? Nein? Dann kämpfen wir eben.',
  sieg: 'Prost, mein Kind.',
  niederlage: 'Der war zu klein. Der nächste wird größer.',
});
trainer('berg_dieter', 'Doppelkorn-Dieter', 'kumpel', [['Kellerkind', 13], ['Ratzomat', 13]], {
  start: 'Doppelt hält besser. Sagt mein Arzt nicht, aber ich.',
  sieg: 'Doppelt gewonnen quasi.',
  niederlage: 'Einfach reicht auch. Manchmal.',
});
trainer('berg_renate', 'Restposten-Renate', 'oma', [['Schimmelmann', 14], ['Muffel', 13]], {
  start: 'Alles reduziert! Auch meine Erwartungen an dich.',
  sieg: 'Sonderangebot: du verlierst.',
  niederlage: 'Umtausch ausgeschlossen. Leider.',
});
trainer('berg_achim', 'Aldi-Achim', 'kumpel', [['Bierbankbernd', 14]], {
  start: 'Ich hab alles von der mittleren Gasse. Alles!',
  sieg: 'Marke ist Einbildung.',
  niederlage: 'Nächste Woche gibt es wieder Trainerbedarf.',
});

// --- Subwoofer City -----------------------------------------------------------
trainer('sub_basti', 'Bassbox-Basti', 'raver', [['Wummi', 15], ['Boxi', 15]], {
  start: 'Hör mal kurz. … Nein, hör RICHTIG hin.',
  sieg: 'Das ist Druck. Das ist Physik.',
  niederlage: 'Meine Membran. Meine arme Membran.',
});
trainer('sub_bodo', 'Boxenschieber-Bodo', 'schrauber', [['Subwoofer-Sepp', 15], ['Boxenbert', 15]], {
  start: 'Ich schiebe seit 20 Jahren Boxen. Rücken ist Auslegungssache.',
  sieg: 'Und jetzt hilf mir mal beim Tragen.',
  niederlage: 'Immerhin muss ich nicht mehr schieben.',
});
trainer('sub_nadine', 'Nachtbus-Nadine', 'maedchen', [['Nachtschicht-Nadja', 15]], {
  start: 'Der N7 fährt in vier Minuten. Das reicht für dich.',
  sieg: 'Und ich krieg ihn sogar noch.',
  niederlage: 'Jetzt muss ich laufen. Danke auch.',
});
trainer('sub_toni', 'Taxi-Toni', 'wirt', [['Kabelkurt', 15], ['Plong', 15], ['Hüpfi', 15]], {
  start: 'Einsteigen? Erst kämpfen. Meter zählt trotzdem.',
  sieg: 'Macht dann 14,80.',
  niederlage: 'Diesmal fahr ich dich umsonst. Einmalig.',
});

// --- Route 5 ------------------------------------------------------------------
trainer('r5_schorsch', 'Schichtarbeiter-Schorsch', 'techniker', [['Aggi', 16], ['Stampfi', 16]], {
  start: 'Nachtschicht, Frühschicht, Kampf. In der Reihenfolge.',
  sieg: 'Und morgen wieder um sechs.',
  niederlage: 'Ich glaub, ich meld mich krank.',
});
trainer('r5_kurt', 'Kippenstummel-Kurt', 'punk', [['Kippen-Kevin', 16]], {
  start: 'Der letzte Zug. Immer der letzte Zug.',
  sieg: 'Feuer hast du nicht, oder?',
  niederlage: 'Jetzt ist wirklich Schluss. Bis morgen.',
});
trainer('r5_enrico', 'Energydrink-Enrico', 'raver', [['Mate-Mandy', 16], ['Chemie-Chantal', 16]], {
  start: 'Sechs Dosen. Heute. Bisher.',
  sieg: 'Die siebte hab ich mir jetzt verdient.',
  niederlage: 'Mein Herz macht Sachen. Komische Sachen.',
});

// --- Vinylhafen ---------------------------------------------------------------
trainer('hafen_vanessa', 'Vinylkoffer-Vanessa', 'raver', [['Plattenpaule', 17], ['Scratchi', 17]], {
  start: 'Der Koffer wiegt 28 Kilo. Frag nicht.',
  sieg: 'Analog gewinnt. Punkt.',
  niederlage: 'Meine Platten! Die sind von 1996!',
});
trainer('hafen_peer', 'Plattenkoffer-Peer', 'wirt', [['Vinyl-Vitali', 17]], {
  start: 'Ich hab hier eine Platte, die es nie gab.',
  sieg: 'Gibt es immer noch nicht. Wie dein Sieg.',
  niederlage: 'Die leg ich jetzt trotzdem auf.',
});
trainer('hafen_sven', 'Slipmat-Sven', 'techniker', [['Nadelnick', 17], ['Bitbert', 17]], {
  start: 'Filz ist Technik. Wusstest du das?',
  sieg: 'Filz gewinnt, immer.',
  niederlage: 'Der Filz ist durch. Nach 15 Jahren.',
});
trainer('hafen_micha', 'Mischpult-Micha', 'schrauber', [['Kabelkorbinian', 18], ['Bytebert', 18]], {
  start: 'Kanal 3 rauscht. Seit 2011. Stört mich nicht.',
  sieg: 'Rauschen gehört dazu.',
  niederlage: 'Jetzt rauschen alle Kanäle.',
});

// --- Route 7 ------------------------------------------------------------------
trainer('r7_pia', 'Pitchfader-Pia', 'maedchen', [['Plongomat', 18], ['Glitchmeister', 18]], {
  start: 'Plus acht Prozent. Immer plus acht.',
  sieg: 'Schneller ist einfach besser.',
  niederlage: 'Ich zieh auf null zurück. Beschämend.',
});
trainer('r7_olaf', 'Ohrenschmerz-Olaf', 'punk', [['Ohrwurm-Olga', 19]], {
  start: 'Ich hör dich nicht, aber ich kämpf trotzdem.',
  sieg: 'Was? WAS?',
  niederlage: 'Das hab ich sogar gehört.',
});
trainer('r7_tanja', 'Tinnitus-Tanja', 'raver', [['Sirenen-Sonja', 18], ['Hallenhalunke', 19]], {
  start: 'Es pfeift. Seit sechs Jahren. Konstant in Fis.',
  sieg: 'Jetzt pfeift es zweistimmig.',
  niederlage: 'Endlich mal Ruhe. Für zwei Sekunden.',
});
trainer('r7_gerd', 'Gehörschutz-Gerd', 'opa', [['Boxenbert', 19], ['Muffelmann', 19]], {
  start: 'Stöpsel rein, dann reden wir.',
  sieg: 'Ich hab kein Wort verstanden. Egal.',
  niederlage: 'Ich hätte doch zuhören sollen.',
});

// --- Schranzheim --------------------------------------------------------------
trainer('schranz_dennis', 'Diskokugel-Dennis', 'raver', [['Lichtorgel-Lisa', 19], ['Blitzbirne', 19]], {
  start: 'Die Kugel dreht sich seit 1987 ohne Pause.',
  sieg: 'Und sie dreht sich weiter.',
  niederlage: 'Sie ist runtergefallen. Alles ist runtergefallen.',
});
trainer('schranz_sina', 'Spiegelkugel-Sina', 'maedchen', [['Blitzbaron Bernd', 20]], {
  start: 'Ich hab 1400 kleine Spiegel. Und alle sehen dich.',
  sieg: 'Von allen Seiten verloren.',
  niederlage: 'Sieben Jahre Pech. Mindestens.',
});
trainer('schranz_karin', 'Kabeltrommel-Karin', 'techniker', [['Kabelkorbinian', 20], ['Stromer Sven', 19]], {
  start: 'Immer komplett abrollen. Sonst brennt sie durch.',
  sieg: 'Abgerollt und aufgeräumt.',
  niederlage: 'Sie brennt. Die Trommel brennt tatsächlich.',
});
trainer('schranz_steffen', 'Stromkasten-Steffen', 'schrauber', [['Steckdosen-Steve', 20], ['Aggregatus', 20]], {
  start: 'Der Kasten ist von 1974. Läuft. Frag nicht wie.',
  sieg: 'Alte Technik, neue Sieger.',
  niederlage: 'Jetzt ist die Straße dunkel. Die ganze Straße.',
});

// --- Nebelmoor ----------------------------------------------------------------
trainer('moor_nico', 'Nebelfluid-Nico', 'techniker', [['Dunstomat', 21], ['Trockeneis-Toni', 21]], {
  start: 'Ich hab 40 Liter dabei. Für heute Abend.',
  sieg: 'Siehst du? Also, du siehst natürlich nichts.',
  niederlage: 'Das Fass ist umgekippt. Alles ist weiß.',
});
trainer('moor_timo', 'Trockeneis-Timo', 'kumpel', [['Trockeneis-Theo', 22]], {
  start: 'Nicht anfassen. Ich mein das ernst.',
  sieg: 'Hab ich doch gesagt.',
  niederlage: 'Meine Finger. Wo sind meine Finger.',
});
trainer('moor_katja', 'Katerfrühstück-Katja', 'oma', [['Absacker-Alfred', 22], ['Klobrillen-Kurti', 21]], {
  start: 'Rollmops und Cola. Das ist die Lösung.',
  sieg: 'Schmeckt scheußlich, wirkt aber.',
  niederlage: 'Ich brauch noch einen Rollmops.',
});
trainer('moor_hendrik', 'Heimweg-Hendrik', 'zombie', [['Afterhour-Achim', 22], ['Augenring-Otto', 22]], {
  start: 'Ich such den Weg nach Hause. Seit Samstag.',
  sieg: 'Ich geh dann mal weiter. Irgendwohin.',
  niederlage: 'Weißt du zufällig, wo ich wohne?',
});

// --- Donkhausen ----------------------------------------------------------------
trainer('donk_manni', 'Monitorbox-Manni', 'schrauber', [['Federfranz', 23], ['Donkomat', 23]], {
  start: 'Der Monitor ist zu leise. Immer.',
  sieg: 'Mehr auf den Monitor! Immer mehr!',
  niederlage: 'Jetzt ist er zu laut. Deutlich zu laut.',
});
trainer('donk_rita', 'Rückkopplungs-Rita', 'raver', [['Hüpfomat', 24], ['Plongomat', 24]], {
  start: 'Gleich pfeift es. Warte kurz. … Jetzt.',
  sieg: 'Rückkopplung ist auch nur ein Instrument.',
  niederlage: 'Aus. Aus! Macht das aus!',
});
trainer('donk_soeren', 'Soundcheck-Sören', 'techniker', [['Kaugummi-Kai', 24], ['Presslufthannes', 24]], {
  start: 'Test. Test. Eins zwei. Eins zwei. Kampf.',
  sieg: 'Check.',
  niederlage: 'Kein Check. Gar kein Check.',
});

// --- Glitchstadt ---------------------------------------------------------------
trainer('glitch_tom', 'Türsteher-Tom', 'wache', [['Türsteher-Theo', 25], ['Gullideckel-Gustav', 25]], {
  start: 'Heute nicht.',
  sieg: 'Hab ich doch gesagt: heute nicht.',
  niederlage: 'Na gut. Rein mit dir.',
});
trainer('glitch_bea', 'Bändchen-Bea', 'maedchen', [['Bytebert', 25], ['Laserpointer-Lars', 25]], {
  start: 'Ohne Bändchen kein Einlass. Ohne Sieg auch nicht.',
  sieg: 'Kein Bändchen für dich.',
  niederlage: 'Hier, dein Bändchen. Nicht abmachen!',
});
trainer('glitch_gitta', 'Garderobe-Gitta', 'oma', [['Nadelfürst Nino', 26]], {
  start: 'Jacke abgeben? Zwei Euro. Kampf? Umsonst.',
  sieg: 'Nummer 47. Nicht verlieren.',
  niederlage: 'Deine Jacke ist weg. Tut mir leid.',
});
trainer('glitch_kalli', 'Klohäuschen-Kalli', 'wirt', [['Klobrillen-Kurti', 25], ['Muffelmann', 25]], {
  start: 'Fünfzig Cent. Auch für Trainer.',
  sieg: 'Und jetzt raus, es warten Leute.',
  niederlage: 'Für dich heute umsonst. Ausnahmsweise.',
});

// --- Schotterhausen (spät) ------------------------------------------------------
trainer('schotter_andi', 'Absacker-Andi', 'kumpel', [['Absacker-Alfred', 26], ['Feierabend-Fabian', 26]], {
  start: 'Einer noch. Dann wirklich.',
  sieg: 'Einer noch?',
  niederlage: 'Okay, ich geh. Wirklich jetzt.',
});
trainer('schotter_anni', 'Afterhour-Anni', 'raver', [['Afterhour-Achim', 26], ['Der Verklatschte', 26]], {
  start: 'Es ist elf Uhr morgens. Wir fangen gerade erst an.',
  sieg: 'Bis heute Abend dann.',
  niederlage: 'Ich brauch ein Fenster. Und Luft.',
});
trainer('schotter_ferdi', 'Frühschicht-Ferdi', 'techniker', [['Frühschicht-Fritz', 27]], {
  start: 'Ich hab in vier Stunden Schicht. Also los.',
  sieg: 'Und jetzt ab unter die Dusche.',
  niederlage: 'Ich ruf an und sag, der Zug fällt aus.',
});
trainer('schotter_sammy', 'Sonnenaufgang-Sammy', 'zombie', [['Jesus 2.0', 27], ['Augenring-Otto', 26]], {
  start: 'Da vorn geht die Sonne auf. Das ist immer der Moment.',
  sieg: 'Schön, oder?',
  niederlage: 'Schade. Aber schön war es trotzdem.',
});

// --- Gig-Leiter (die acht Bühnen) ------------------------------------------------
trainer('gig1', 'Fliesentisch Kalle', 'gigleiter',
  [['Fliesi', 12], ['Kellerkind', 12], ['Fliesenfürst Fred', 13]], {
    start: 'Der Tisch hält. Der Tisch hält immer. Bis er nicht mehr hält.',
    sieg: 'Tisch steht. Du liegst.',
    niederlage: 'Der Tisch ist hin. Nimm die Marke, du hast sie dir verdient.',
  }, { gig: 0, preisgeld: 1600, blick: 0 });
trainer('gig2', 'Zwei-Zahn Gerald', 'gigleiter',
  [['Wummi', 15], ['Subwoofer-Sepp', 15], ['Bassbox-Britta', 16], ['Boxenbert', 16]], {
    start: 'Zwei Zähne reichen. Zum Reden und zum Grinsen.',
    sieg: 'Und jetzt grins ich. Zweizähnig.',
    niederlage: 'Respekt. Ehrlich. Nimm die Marke.',
  }, { gig: 1, preisgeld: 2400, blick: 0 });
trainer('gig3', 'Augenringe Hugo', 'gigleiter',
  [['Scratchi', 17], ['Plattenpaule', 17], ['Kassenwart-Kalle', 18], ['Vinyl-Vitali', 18]], {
    start: 'Ich hab seit Donnerstag nicht geschlafen. Welcher Donnerstag, weiß ich nicht.',
    sieg: 'Müdigkeit ist eine Superkraft, mein Freund.',
    niederlage: 'Vielleicht sollte ich doch mal schlafen. Hier, die Marke.',
  }, { gig: 2, preisgeld: 3200, blick: 0 });
trainer('gig4', 'Pillen-Petra', 'gigleiter',
  [['Schranzomat', 20], ['Kreissägen-Karsten', 20], ['Sägomat', 20], ['Hallenhalunke', 21]], {
    start: 'Ich hab für alles was da. Für alles.',
    sieg: 'Hättste mal was genommen. Kaugummi zum Beispiel.',
    niederlage: 'Nicht schlecht. Marke ist deine.',
  }, { gig: 3, preisgeld: 4000, blick: 0 });
trainer('gig5', 'Nebel-Norbert', 'gigleiter',
  [['Dunstomat', 23], ['Trockeneis-Theo', 23], ['Nebelniklas', 23], ['Chemtrail-Charly', 24]], {
    start: 'Siehst du mich? Nein? Sehr gut.',
    sieg: 'Ich war die ganze Zeit hinter dir.',
    niederlage: 'Beeindruckend. Irgendwo hier ist die Marke.',
  }, { gig: 4, preisgeld: 4800, blick: 0 });
trainer('gig6', 'Donk-Detlef', 'gigleiter',
  [['Hüpfomat', 25], ['Federfranz', 25], ['Plongomat', 25], ['Hüpfburgen-Harry', 26]], {
    start: 'Plong. Plong. PLONG. Verstehst du?',
    sieg: 'Plong.',
    niederlage: 'Okay. Plong für dich. Und die Marke.',
  }, { gig: 5, preisgeld: 5600, blick: 0 });
trainer('gig7', 'Glitch-Gudrun', 'gigleiter',
  [['Bytebert', 26], ['Plongomat', 26], ['Laserpointer-Lars', 27], ['Glitchgott Günther', 28]], {
    start: 'Ich bin- ich bin- ich bin gleich fertig. Moment.',
    sieg: 'Fehler 404: Sieg nicht gefunden.',
    niederlage: 'Ich starte neu. Nimm solange die Marke.',
  }, { gig: 6, preisgeld: 6400, blick: 0 });
trainer('gig8', 'Laborkittel-Ludwig', 'gigleiter',
  [['Säurebärbel', 28], ['Pillenpaul', 28], ['Chemtrail-Charly', 29], ['Acidkaiser Alfons', 29], ['Der Verklatschte', 30]], {
    start: 'Willkommen im letzten Labor. Hier wird alles ausprobiert.',
    sieg: 'Das Experiment ist gescheitert. Du warst das Experiment.',
    niederlage: 'Erstaunlich. Wirklich erstaunlich. Die achte Marke gehört dir.',
  }, { gig: 7, preisgeld: 7200, blick: 0 });

// --- Die vier Verstärker (Backstage) ----------------------------------------------
trainer('elite1', 'Hallen-Hilde', 'gigleiter',
  [['Sägefürst Sigi', 30], ['Schranzgeneral Siegfried', 30], ['Ohrwurm-Olga', 31], ['Sirenen-Sonja', 31], ['Schrubberkönig Sülz', 32]], {
    start: 'Ich hab Hallen gefüllt, die es offiziell nie gab.',
    sieg: 'Die Halle bleibt meine.',
    niederlage: 'Geh weiter. Der Nächste wartet schon.',
  }, { preisgeld: 8000, blick: 0 });
trainer('elite2', 'Subwoofer-Sigmar', 'gigleiter',
  [['Boxenkaiser Bodo', 31], ['Subbass-Sebastian', 31], ['Basstian Blechschaden', 31], ['Bunker-Bianca', 31], ['Wummerkönig Willi', 33]], {
    start: 'Du hörst mich nicht. Du fühlst mich.',
    sieg: 'Zu wenig Druck, mein Freund.',
    niederlage: 'Ordentlich Druck. Weiter mit dir.',
  }, { preisgeld: 8400, blick: 0 });
trainer('elite3', 'Trockeneis-Torben', 'gigleiter',
  [['Nebelfürst Norbert', 31], ['Dunstherzog Dieter', 31], ['Trockeneis-Theo', 32], ['Nachtschicht-Nadja', 32], ['Jesus 2.0', 33]], {
    start: 'Gleich siehst du gar nichts mehr. Versprochen.',
    sieg: 'Und weg bist du.',
    niederlage: 'Der Nebel lichtet sich. Für dich.',
  }, { preisgeld: 8800, blick: 0 });
trainer('elite4', 'Kabelbinder-Kevin', 'gigleiter',
  [['Kabelbaron Konrad', 32], ['Notstrom-Nobbi', 32], ['Hochspannungs-Horst', 33], ['Glitchgott Günther', 33], ['Konfettikanonen-Kevin', 34]], {
    start: 'Alles festgezurrt. Auch deine Chancen.',
    sieg: 'Kabelbinder halten. Immer.',
    niederlage: 'Ich schneid dich los. Geh zum Chef.',
  }, { preisgeld: 9200, blick: 0 });
trainer('champion', 'Bierdusche-Benny', 'rivale',
  [['Trötenherzog Torsten', 34], ['Kabelbaron Konrad', 34], ['Pogo-Panzer', 35], ['Boxenkaiser Bodo', 35], ['Der Verklatschte', 35], ['Kickzilla Kalle', 36]], {
    start: 'Überraschung, {name}. Ich war schneller. Wie immer.',
    sieg: 'Und deswegen steh ich hier oben und du da unten.',
    niederlage: 'Das … das war stark, {name}. Wirklich stark. Der Platz gehört dir.',
  }, { preisgeld: 12000, blick: 0 });

// --- Die Helene-Fischer-Ultras --------------------------------------------------
// Die Fanfraktion mit Hauptquartier in Hardtekk City (siehe
// data/world/hardtekk_city.js). Jeder Ultra sieht gleich aus (Figur
// 'hfultra', siehe gfx/menschen.js) und bekommt eigene Kampfmusik statt der
// üblichen Arena-Musik (siehe KAMPFMUSIK in scenes/kampfszene.js).

// -- Hauptquartier, Eingangshalle: drei Ultras versperren den Weg -------------
trainer('hfu_sven', 'HF Ultra Sven', 'hfultra', [['Kellerkind', 12], ['Muffel', 12]], {
  start: 'Halt! Erst mal die wichtige Frage: Findest du Helene nicht auch einfach unfassbar schön?',
  sieg: 'Sie wäre trotzdem stolz auf mich. Bestimmt.',
  niederlage: 'Ich heul jetzt. Vor Rührung. Wegen Helene, nicht wegen dir.',
}, { musik: 'ultrakampf' });
trainer('hfu_sabrina', 'HF Ultra Sabrina', 'hfultra', [['Fliesi', 12], ['Schimmi', 13]], {
  start: 'Wusstest du, dass Helene beim Tanzen niemals schwitzt? Hat sie uns persönlich erzählt.',
  sieg: 'Egal. Ich bin trotzdem atemlos. Vor Aufregung.',
  niederlage: 'Mir ist ganz schwindelig. Aber nicht wegen dir. Wegen Helene.',
}, { musik: 'ultrakampf' });
trainer('hfu_marco', 'HF Ultra Marco', 'hfultra', [['Presslufthannes', 13], ['Gullideckel-Gustav', 13]], {
  start: 'Wir tragen alle das gleiche Shirt, damit sofort klar ist: Wir gehören zu ihr.',
  sieg: 'Passt schon. Hardtekk zerstören wir trotzdem noch.',
  niederlage: 'Okay, du bist stark. Aber hast du schon mal ihr Lächeln gesehen? Nein? Eben.',
}, { musik: 'ultrakampf' });

// -- Hauptquartier, Büro: der Vize-Vorsitzende ---------------------------------
trainer('hfu_silvio_hq', 'HF Ultra Silvio', 'hfultra',
  [['Absacker-Anton', 14], ['Chemie-Chantal', 14], ['Zahnlücken-Zombie', 15]], {
    start: 'Vize-Vorsitzender Silvio. Wer zu Helene will, kommt an mir vorbei. Durch die Nacht, sozusagen.',
    sieg: 'Läuft bei mir. Immer. So wie die Musik durch mein Herz läuft.',
    niederlage: 'Nein! Das darf nicht … Helene wird das gar nicht gefallen. Geh trotzdem weiter, wenn du unbedingt musst.',
  }, { musik: 'ultrakampf', preisgeld: 1200 });

// -- Hauptquartier, VIP-Suite: die erste echte Begegnung -----------------------
trainer('helene_hq', 'Helene Fischer', 'helene',
  [['Lichtorgel-Lisa', 17], ['Blitzbirne', 17], ['Blitzbaron Bernd', 18]], {
    start: 'Wir haben von dir gehört, {name}. Ein kleiner Hardtekk-Rebell. Wir finden das … niedlich. Wir lassen dich trotzdem atemlos zurück.',
    sieg: 'Seht ihr? Wir gewinnen immer. Wir beide.',
    niederlage: 'Das … das darf nicht wahr sein. Wir müssen jetzt leider los, der Bus wartet. Wir sind sowieso schon spät dran, mitten durch die Nacht.',
  }, { musik: 'ultrakampfHelene', preisgeld: 2500 });

// -- Verstreute Ultras: die "Mission" läuft nach der ersten Niederlage weiter --
trainer('hfu_jasmin', 'HF Ultra Jasmin', 'hfultra', [['Muffel', 14], ['Kellerkind', 14]], {
  start: 'Du hast unseren Vize besiegt? Dann zeig mal, ob du auch gegen mich durchhältst. Ich hab extra Glitzer aufgelegt.',
  sieg: 'Siehst du? Glitzer gewinnt.',
  niederlage: 'Ich muss Helene sofort eine Sprachnachricht schicken. Ganz dringend.',
}, { musik: 'ultrakampf' });
trainer('hfu_kevin', 'HF Ultra Kevin', 'hfultra', [['Wummi', 16], ['Boxi', 16]], {
  start: 'Ich soll hier heimlich die Boxen umstellen. Auf Helene-Musik. Bevor das jemand merkt.',
  sieg: 'Okay, die Boxen bleiben, wie sie sind. Diesmal.',
  niederlage: 'Sag niemandem, dass ich das vorhatte. Bitte. Bitte bitte.',
}, { musik: 'ultrakampf' });

// -- Vinylhafen: Silvios Rückkampf, danach ist das Finale offen -----------------
trainer('hfu_silvio_vinylhafen', 'HF Ultra Silvio', 'hfultra',
  [['Chemie-Chantal', 18], ['Absacker-Anton', 18], ['Zahnlücken-Zombie', 19], ['Bierbankbernd', 19]], {
    start: 'Du schon wieder! Ich bin seitdem hart im Training. Innerlich. Und musikalisch.',
    sieg: 'Diesmal läuft’s bei mir. Ich mein’s ernst.',
    niederlage: 'Wieder du. Okay. Ich glaub, ich muss Helene sagen, dass wir ein Problem haben.',
  }, { musik: 'ultrakampf', preisgeld: 1900 });

// -- Region Ost: die Bewegung bröckelt bereits ein wenig ------------------------
trainer('hfu_mandy', 'HF Ultra Mandy', 'hfultra', [['Trockeneis-Toni', 21], ['Dunstomat', 22]], {
  start: 'Ehrlich? Ich zweifle schon länger. Aber ein Kampf für Helene geht schon noch.',
  sieg: 'Wenigstens das hat noch geklappt.',
  niederlage: 'Weißt du was? Vielleicht hör ich sowieso auf. Aber erst nach dem nächsten Konzert.',
}, { musik: 'ultrakampf' });

// -- Hauptquartier, Tourbus-Kammer: das echte Finale ----------------------------
trainer('helene_final', 'Helene Fischer', 'helene',
  [['Lichtorgel-Lisa', 29], ['Blitzbirne', 29], ['Blitzbaron Bernd', 30], ['Stromer Sven', 30], ['Aggregatus', 31]], {
    start: 'Wir sind beeindruckt, {name}. Wirklich. Aber jetzt ist Schluss mit nett – wir zeigen dir, warum wir seit Jahren ganz oben stehen.',
    sieg: 'Da. Seht ihr. Wir hatten immer recht.',
    niederlage: 'Wir … wir haben verloren? Das ist eine ganz neue Erfahrung. Wir müssen das erst mal verarbeiten. Zu zweit.',
  }, { musik: 'ultrakampfHelene', preisgeld: 6000, belohnung: 'Master-Sample' });

/** @param {string} id */
export function trainerInfo(id) {
  return TRAINER[id] ?? null;
}
