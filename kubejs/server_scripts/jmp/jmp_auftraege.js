// priority 0
// JMP: Wiederkehrende Auftraege (taeglich und woechentlich) mit Muenzen von Create Numismatics.
// Doku: kubejs/server_scripts/jmp/README.md
//
// Alles steckt in einer Funktion, weil alle Server-Skripte einen gemeinsamen
// globalen Bereich teilen (ATM-Skripte nutzen z. B. schon "config").
(function () {

  // ===================================================================
  // KONFIGURATION
  // ===================================================================
  const KONFIG = {
    // Reset taeglich um diese Stunde (Serverzeit UTC), Wochenreset montags zur selben Stunde.
    resetStunde: 5,
    // Anzahl Auftraege. Stufe je Tagesauftrag: "frueh", "mitte", "spaet" oder null (beliebig).
    taeglichStufen: ["frueh", "mitte", null],
    woechentlichAnzahl: 1,
    // Zielwert in Spur (1 Cog = 64 Spur). Die Menge wird so gewaehlt, dass die Belohnung hier landet.
    zielTaeglich: [64, 128],      // 1 bis 2 Cogs
    zielWoechentlich: [256, 512], // 4 bis 8 Cogs
    // Obergrenze der Auszahlung pro Spieler und Woche in Spur (20 Cogs).
    wochenGrenze: 20 * 64,
    // Belohnung wird auf Vielfache hiervon gerundet (8 = Bevel).
    rundenAuf: 8,
    // Mengen: mindestens so viele Items, hoechstens so viele Stacks.
    minMenge: 4,
    maxStacks: 4,
    // Items mit kleinerer Stack-Groesse lassen sich schlecht in Mengen abgeben.
    minStackGroesse: 16,

    // Tag-Familien der Konvention c:<familie>/<material> mit Basiswert in Spur pro Item.
    // art "tag": jedes Item des Tags zaehlt (z. B. jedes Eisenbarren-Item).
    // art "item": jedes Item ist ein eigener Auftrag (Essen, Feldfruechte).
    familien: {
      ingots:         { wert: 2,    art: "tag",  name: "Barren" },
      gems:           { wert: 3,    art: "tag",  name: "Edelsteine" },
      plates:         { wert: 3,    art: "tag",  name: "Platten" },
      gears:          { wert: 6,    art: "tag",  name: "Zahnraeder" },
      rods:           { wert: 1.5,  art: "tag",  name: "Stangen" },
      dusts:          { wert: 1.5,  art: "tag",  name: "Staub" },
      nuggets:        { wert: 0.25, art: "tag",  name: "Nuggets" },
      raw_materials:  { wert: 1.5,  art: "tag",  name: "Roherze" },
      storage_blocks: { wert: 18,   art: "tag",  name: "Bloecke" },
      crops:          { wert: 0.5,  art: "item", name: "Feldfruechte" },
      foods:          { wert: 1,    art: "item", name: "Essen" } // Wert wird mit dem Saettigungswert skaliert
    },

    // Faktor auf den Basiswert je Stufe und Gewicht bei der Auswahl.
    stufen: {
      frueh: { faktor: 1, gewicht: 5 },
      mitte: { faktor: 2, gewicht: 3 },
      spaet: { faktor: 8, gewicht: 1 }
    },
    // Material-Stichworte (Teil des Tag- oder Item-Namens). Reihenfolge der Pruefung: spaet, mitte, frueh.
    stufeStichworte: {
      spaet: ["allthemodium", "vibranium", "unobtainium", "netherite", "draconium", "chaotic", "wyvern",
              "dragon", "insanium", "supremium", "neutronium", "infinity", "nether_star", "enderium",
              "antimatter", "awakened", "prosperity", "soulium", "crimson_iron", "azure_electrum"],
      mitte: ["brass", "silver", "zinc", "nickel", "lead", "bronze", "steel", "electrum", "invar",
              "constantan", "aluminum", "osmium", "uranium", "platinum", "signalum", "lumium", "diamond",
              "emerald", "quartz", "certus", "fluix", "obsidian", "rose_gold", "cobalt", "iridium",
              "refined", "plastic", "silicon", "graphite", "fluorite", "ruby", "sapphire", "peridot"],
      frueh: ["iron", "copper", "gold", "tin", "coal", "charcoal", "lapis", "redstone", "amethyst", "wood",
              "andesite", "sulfur", "salt", "apatite", "flint", "clay", "glowstone", "zinc_nugget"]
    },
    // Ganze Mods einer Stufe zuordnen (Namespace des Items).
    stufeMods: {
      allthemodium: "spaet", draconicevolution: "spaet", mysticalagradditions: "spaet", allthetweaks: "spaet"
    },
    // Stufe, wenn kein Stichwort passt: Material-Tags "mitte", Essen/Feldfruechte "frueh".
    stufeStandardTag: "mitte",
    stufeStandardItem: "frueh",

    // Gewicht pro Mod (Namespace des angezeigten Items). Standard 1.
    modGewicht: {
      create: 3, numismatics: 3, createaddition: 2, create_enchantment_industry: 2,
      farmersdelight: 1.5, mekanism: 1.5, immersiveengineering: 1.5
    },
    // Welches Item eines Tags angezeigt wird (erste passende Mod gewinnt, sonst alphabetisch).
    anzeigePrioritaet: ["minecraft", "alltheores", "allthemodium", "create", "mekanism", "immersiveengineering",
                        "thermal", "ae2", "modern_industrialization", "oritech"],

    // Sperrliste: Item-IDs als regulaere Ausdruecke, ganze Tags und ganze Mods.
    sperreItems: [
      /creative/, /debug/, /singularit/, /^minecraft:(dirt|gravel|cobblestone|sand|netherrack|rotten_flesh)$/,
      /^numismatics:/, /_compressed/, /^allthecompressed:/, /^kubejs:/, /dense/, /infinity_/
    ],
    sperreTags: [
      "c:foods/raw_fish", "c:foods/food_poisoning", "c:foods/soup", "c:foods/edible_when_placed",
      "c:storage_blocks/dirt", "c:storage_blocks/gravel"
    ],
    sperreMods: ["allthecompressed", "cabletiers"],

    // Debug-Ausgabe beim Bauen des Pools ins KubeJS-Log (server.log).
    poolLoggen: true
  }

  const MUENZEN = [
    { id: "numismatics:sun", wert: 4096, name: "Sun" },
    { id: "numismatics:crown", wert: 512, name: "Crown" },
    { id: "numismatics:cog", wert: 64, name: "Cog" },
    { id: "numismatics:sprocket", wert: 16, name: "Sprocket" },
    { id: "numismatics:bevel", wert: 8, name: "Bevel" },
    { id: "numismatics:spur", wert: 1, name: "Spur" }
  ]
  const DATEN_SCHLUESSEL = "jmp_auftraege"
  const LOG = "[JMP-Auftraege] "

  const $BuiltInRegistries = Java.loadClass("net.minecraft.core.registries.BuiltInRegistries")
  const $DataComponents = Java.loadClass("net.minecraft.core.component.DataComponents")
  const $ResourceLocation = Java.loadClass("net.minecraft.resources.ResourceLocation")
  const $CompoundTag = Java.loadClass("net.minecraft.nbt.CompoundTag")

  // ===================================================================
  // ZUSTAND (Cache, wird beim Laden bzw. beim ersten Befehl gebaut)
  // ===================================================================
  let pool = null          // Array der Pool-Eintraege, stabil sortiert
  let poolFehler = null    // Text, falls der Pool nicht gebaut werden konnte
  let planCache = {}       // Wochenplaene nach Wochennummer
  let muenzenOk = false

  // ===================================================================
  // HILFSFUNKTIONEN
  // ===================================================================
  function mul32(a, b) {
    // 32-Bit-Multiplikation ohne Math.imul
    b = b >>> 0
    let al = a & 0xffff, ah = (a >>> 16) & 0xffff
    return ((al * b) + ((((ah * b) & 0xffff) << 16) >>> 0)) >>> 0
  }
  function hash32(text) {
    let h = 0x811c9dc5
    for (let i = 0; i < text.length; i++) {
      h = (h ^ text.charCodeAt(i)) >>> 0
      h = mul32(h, 0x01000193)
    }
    return h >>> 0
  }
  function zufall(seedText) {
    // Mulberry32, deterministisch aus Text
    let s = hash32(seedText)
    return function () {
      s = (s + 0x6d2b79f5) >>> 0
      let t = s
      t = mul32(t ^ (t >>> 15), t | 1)
      t = (t ^ (t + mul32(t ^ (t >>> 7), t | 61))) >>> 0
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function str(x) { return x == null ? "" : String(x) }
  function kopie(obj) { let o = {}; Object.keys(obj).forEach(k => o[k] = obj[k]); return o }
  function itemId(item) { return str($BuiltInRegistries.ITEM.getKey(item)) }
  function namespace(id) { return id.split(":")[0] }
  function enthaeltStichwort(text, liste) {
    for (let i = 0; i < liste.length; i++) if (text.indexOf(liste[i]) >= 0) return true
    return false
  }
  function stufeVon(material, id, standard) {
    let ns = namespace(id)
    if (KONFIG.stufeMods[ns]) return KONFIG.stufeMods[ns]
    let text = material + " " + id.split(":")[1]
    if (enthaeltStichwort(text, KONFIG.stufeStichworte.spaet)) return "spaet"
    if (enthaeltStichwort(text, KONFIG.stufeStichworte.mitte)) return "mitte"
    if (enthaeltStichwort(text, KONFIG.stufeStichworte.frueh)) return "frueh"
    return standard
  }
  function gesperrt(id) {
    if (KONFIG.sperreMods.indexOf(namespace(id)) >= 0) return true
    for (let i = 0; i < KONFIG.sperreItems.length; i++) if (KONFIG.sperreItems[i].test(id)) return true
    return false
  }
  function muenzText(spur) {
    let teile = []
    let rest = spur
    for (let i = 0; i < MUENZEN.length; i++) {
      let n = Math.floor(rest / MUENZEN[i].wert)
      if (n > 0) { teile.push(n + " " + MUENZEN[i].name); rest -= n * MUENZEN[i].wert }
    }
    return teile.length ? teile.join(", ") : "0 Spur"
  }
  function cogText(spur) {
    let c = Math.round(spur / 64 * 10) / 10
    return String(c).replace(".", ",") + " Cog"
  }

  // ===================================================================
  // ZEIT UND PERIODEN
  // ===================================================================
  function serverDaten(server) {
    let root = server.persistentData
    if (!root.contains(DATEN_SCHLUESSEL)) root.put(DATEN_SCHLUESSEL, new $CompoundTag())
    return root.getCompound(DATEN_SCHLUESSEL)
  }
  function tagVersatz(server) { return serverDaten(server).getInt("tagVersatz") }
  function jetztInfo(server) {
    let ms = Date.now() - KONFIG.resetStunde * 3600000
    let tagEcht = Math.floor(ms / 86400000)
    let tag = tagEcht + tagVersatz(server)
    // Tag 0 = 1970-01-01 (Donnerstag), +3 legt den Wochenbeginn auf Montag
    let woche = Math.floor((tag + 3) / 7)
    let msBisTag = 86400000 - (ms - tagEcht * 86400000)
    let tagInWoche = (tag + 3) - woche * 7 // 0 = Montag
    let msBisWoche = msBisTag + (6 - tagInWoche) * 86400000
    return { tag: tag, woche: woche, tagInWoche: tagInWoche, msBisTag: msBisTag, msBisWoche: msBisWoche }
  }
  function dauerText(ms) {
    let min = Math.max(0, Math.floor(ms / 60000))
    let t = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
    if (t > 0) return t + " T " + h + " Std"
    if (h > 0) return h + " Std " + m + " Min"
    return m + " Min"
  }

  // ===================================================================
  // POOL AUFBAUEN (einmal, aus der geladenen Registry und den Tags)
  // ===================================================================
  function baueEintrag(familie, material, tagId, ids, art) {
    let f = KONFIG.familien[familie]
    // Anzeige-Item waehlen
    let sortiert = ids.slice().sort()
    let anzeige = sortiert[0]
    let bester = 9999
    for (let i = 0; i < sortiert.length; i++) {
      let rang = KONFIG.anzeigePrioritaet.indexOf(namespace(sortiert[i]))
      if (rang >= 0 && rang < bester) { bester = rang; anzeige = sortiert[i] }
    }
    let item = $BuiltInRegistries.ITEM.get($ResourceLocation.parse(anzeige))
    let stack = item.getDefaultMaxStackSize()
    let wert = f.wert
    if (familie == "foods") {
      try {
        let food = item.components().get($DataComponents.FOOD)
        if (food != null) wert = Math.max(0.5, 0.3 * food.nutrition())
      } catch (e) { /* ohne Nahrungswert bleibt der Basiswert */ }
    }
    let stufe = stufeVon(material, anzeige, art == "tag" ? KONFIG.stufeStandardTag : KONFIG.stufeStandardItem)
    let akzeptiert = {}
    for (let i = 0; i < ids.length; i++) akzeptiert[ids[i]] = true
    return {
      schluessel: art == "tag" ? "#" + tagId : anzeige,
      familie: familie,
      tag: art == "tag" ? tagId : null,
      anzeige: anzeige,
      beschreibung: str(item.getDescriptionId()),
      mod: namespace(anzeige),
      stufe: stufe,
      stueckwert: wert * KONFIG.stufen[stufe].faktor,
      stack: stack,
      akzeptiert: akzeptiert,
      anzahlItems: ids.length
    }
  }

  function bauePool() {
    let start = Date.now()
    let eintraege = {}
    let itemEintraege = {}
    let uebersprungen = 0
    let tagSperre = {}
    KONFIG.sperreTags.forEach(t => tagSperre[t] = true)

    // Gesperrte Items aus der ATM-Banliste und versteckte Items
    let banliste = {}
    try {
      let cfg = JsonIO.read("server_banlist_config.json")
      if (cfg != null && cfg.server != null && cfg.server.banned_items != null) {
        cfg.server.banned_items.forEach(id => banliste[str(id)] = true)
      }
    } catch (e) { console.warn(LOG + "Banliste nicht lesbar: " + e) }
    let versteckt = {}

    let alleTags = $BuiltInRegistries.ITEM.getTags().toList()
    // Versteckte Items zuerst einsammeln
    alleTags.forEach(paar => {
      let tagId = str(paar.getFirst().location())
      if (tagId == "c:hidden_from_recipe_viewers") paar.getSecond().forEach(h => versteckt[itemId(h.value())] = true)
    })

    alleTags.forEach(paar => {
      let tagId = str(paar.getFirst().location())
      if (tagId.indexOf("c:") != 0) return
      let teil = tagId.substring(2).split("/")
      if (teil.length != 2) return // nur c:<familie>/<material>
      let familie = teil[0], material = teil[1]
      let f = KONFIG.familien[familie]
      if (!f || tagSperre[tagId]) return

      let ids = []
      paar.getSecond().forEach(h => {
        let id = itemId(h.value())
        if (id == "minecraft:air") return
        if (gesperrt(id) || banliste[id] || versteckt[id]) { uebersprungen++; return }
        try {
          if (h.value().getDefaultMaxStackSize() < KONFIG.minStackGroesse) { uebersprungen++; return }
        } catch (e) { uebersprungen++; return }
        ids.push(id)
      })
      if (ids.length == 0) return

      try {
        if (f.art == "tag") {
          eintraege["#" + tagId] = baueEintrag(familie, material, tagId, ids, "tag")
        } else {
          ids.forEach(id => {
            if (itemEintraege[id]) return // Item steht schon in einem anderen Essens-/Feldfrucht-Tag
            itemEintraege[id] = baueEintrag(familie, material, tagId, [id], "item")
          })
        }
      } catch (e) {
        console.warn(LOG + "Eintrag " + tagId + " uebersprungen: " + e)
      }
    })

    let liste = []
    Object.keys(eintraege).forEach(k => liste.push(eintraege[k]))
    Object.keys(itemEintraege).forEach(k => {
      // Items, die bereits ueber einen Material-Tag abgedeckt sind, nicht doppelt aufnehmen
      for (let i = 0; i < liste.length; i++) if (liste[i].tag && liste[i].akzeptiert[k]) return
      liste.push(itemEintraege[k])
    })
    liste.sort((a, b) => a.schluessel < b.schluessel ? -1 : (a.schluessel > b.schluessel ? 1 : 0))

    // Mod-Groesse fuer die Gewichtung (grosse Mods sollen kleine nicht verdraengen)
    let proMod = {}
    liste.forEach(e => proMod[e.mod] = (proMod[e.mod] || 0) + 1)
    liste.forEach(e => {
      e.gewicht = (KONFIG.modGewicht[e.mod] || 1) * KONFIG.stufen[e.stufe].gewicht / Math.sqrt(proMod[e.mod])
    })

    pool = liste
    planCache = {}
    muenzenOk = MUENZEN.every(m => $BuiltInRegistries.ITEM.containsKey($ResourceLocation.parse(m.id)))
    if (!muenzenOk) console.error(LOG + "Numismatics-Muenzen fehlen in der Registry, Abgabe ist deaktiviert.")
    console.info(LOG + "Pool gebaut: " + liste.length + " Eintraege aus " + Object.keys(proMod).length +
      " Mods, " + uebersprungen + " Items gesperrt/uebersprungen, " + (Date.now() - start) + " ms")
    if (KONFIG.poolLoggen) logPool()
  }

  function holePool() {
    if (pool == null && poolFehler == null) {
      try { bauePool() } catch (e) {
        poolFehler = str(e)
        console.error(LOG + "Pool konnte nicht gebaut werden: " + e)
      }
    }
    return pool || []
  }

  function logPool() {
    console.info(LOG + "Pool-Export (schluessel | mod | stufe | familie | stueckwert | stack | items):")
    pool.forEach(e => console.info(LOG + "  " + e.schluessel + " | " + e.mod + " | " + e.stufe + " | " +
      e.familie + " | " + e.stueckwert + " | " + e.stack + " | " + e.anzahlItems))
  }

  // ===================================================================
  // AUSWAHL (deterministisch aus Woche und Tag)
  // ===================================================================
  function mengeFuer(eintrag, ziel, rnd) {
    let wunsch = ziel[0] + rnd() * (ziel[1] - ziel[0])
    let maxMenge = eintrag.stack * KONFIG.maxStacks
    let menge = Math.round(wunsch / eintrag.stueckwert)
    if (menge > 8) menge = Math.round(menge / 4) * 4 // runde Mengen
    menge = Math.max(KONFIG.minMenge, Math.min(maxMenge, menge))
    let belohnung = Math.round(menge * eintrag.stueckwert / KONFIG.rundenAuf) * KONFIG.rundenAuf
    if (belohnung < ziel[0] * 0.75 || belohnung > ziel[1] * 1.25) return null // passt nicht in den Rahmen
    return { menge: menge, belohnung: belohnung }
  }

  function waehle(kandidaten, rnd, modZaehler, benutzt) {
    let summe = 0
    let gew = kandidaten.map(e => {
      if (benutzt[e.schluessel]) return 0
      let g = e.gewicht * Math.pow(0.3, modZaehler[e.mod] || 0) // gleiche Mod in der Woche seltener
      summe += g
      return g
    })
    if (summe <= 0) return null
    let r = rnd() * summe
    for (let i = 0; i < kandidaten.length; i++) {
      r -= gew[i]
      if (gew[i] > 0 && r <= 0) return kandidaten[i]
    }
    return null
  }

  function ziehe(p, ziel, stufe, rnd, modZaehler, benutzt, modHeute) {
    // Bis zu 30 Versuche, bis Menge und Belohnung passen
    for (let versuch = 0; versuch < 30; versuch++) {
      let kandidaten = p.filter(e => (stufe == null || e.stufe == stufe) && !(modHeute && modHeute[e.mod]))
      if (kandidaten.length == 0) kandidaten = p
      let e = waehle(kandidaten, rnd, modZaehler, benutzt)
      if (e == null) return null
      let m = mengeFuer(e, ziel, rnd)
      if (m == null) { benutzt[e.schluessel] = true; continue }
      return { eintrag: e, menge: m.menge, belohnung: m.belohnung }
    }
    return null
  }

  function wochenPlan(woche) {
    if (planCache[woche]) return planCache[woche]
    let p = holePool()
    let rnd = zufall("JMP-Woche-" + woche)
    let modZaehler = {}
    let benutzt = {}
    let plan = { woche: woche, woechentlich: [], tage: [] }

    for (let w = 0; w < KONFIG.woechentlichAnzahl; w++) {
      let a = ziehe(p, KONFIG.zielWoechentlich, null, rnd, modZaehler, kopie(benutzt), null)
      if (a) {
        benutzt[a.eintrag.schluessel] = true
        modZaehler[a.eintrag.mod] = (modZaehler[a.eintrag.mod] || 0) + 1
        plan.woechentlich.push(a)
      }
    }
    for (let t = 0; t < 7; t++) {
      let heute = []
      let modHeute = {}
      // Gesperrte Fehlversuche gelten nur fuer den jeweiligen Zug
      KONFIG.taeglichStufen.forEach(stufe => {
        let a = ziehe(p, KONFIG.zielTaeglich, stufe, rnd, modZaehler, kopie(benutzt), modHeute)
        if (!a && stufe != null) a = ziehe(p, KONFIG.zielTaeglich, null, rnd, modZaehler, kopie(benutzt), modHeute)
        if (!a) a = ziehe(p, KONFIG.zielTaeglich, null, rnd, modZaehler, kopie(benutzt), null)
        if (a) {
          benutzt[a.eintrag.schluessel] = true
          modHeute[a.eintrag.mod] = true
          modZaehler[a.eintrag.mod] = (modZaehler[a.eintrag.mod] || 0) + 1
          heute.push(a)
        }
      })
      plan.tage.push(heute)
    }
    planCache[woche] = plan
    return plan
  }

  // Aktuelle Auftraege: Nummer 1..n taeglich, danach woechentlich
  function aktuelleAuftraege(server) {
    let z = jetztInfo(server)
    let plan = wochenPlan(z.woche)
    let liste = []
    plan.tage[z.tagInWoche].forEach((a, i) => liste.push({ nr: liste.length + 1, art: "t", index: i, a: a }))
    plan.woechentlich.forEach((a, i) => liste.push({ nr: liste.length + 1, art: "w", index: i, a: a }))
    return { zeit: z, liste: liste }
  }

  // ===================================================================
  // SPIELERDATEN
  // Gespeichert in server.persistentData (Datei kubejs_persistent_data.nbt der Welt) unter der UUID.
  // Nicht player.persistentData: Der Name kollidiert mit NeoForges Entity.getPersistentData(),
  // dessen Daten beim Tod nicht kopiert werden.
  // ===================================================================
  function spielerTag(server, uuid) {
    let root = serverDaten(server)
    if (!root.contains("spieler")) root.put("spieler", new $CompoundTag())
    let alle = root.getCompound("spieler")
    if (!alle.contains(uuid)) alle.put(uuid, new $CompoundTag())
    return alle.getCompound(uuid)
  }
  function spielerDaten(player, z) {
    let d = spielerTag(player.getServer(), str(player.getStringUUID()))
    if (d.getInt("tag") != z.tag || !d.contains("tag")) {
      d.putInt("tag", z.tag)
      d.putString("erledigtT", "")
    }
    if (d.getInt("woche") != z.woche || !d.contains("woche")) {
      d.putInt("woche", z.woche)
      d.putString("erledigtW", "")
      d.putInt("verdientW", 0)
    }
    return d
  }
  function istErledigt(d, auftrag) {
    let feld = auftrag.art == "t" ? "erledigtT" : "erledigtW"
    return ("," + str(d.getString(feld)) + ",").indexOf("," + auftrag.index + ",") >= 0
  }
  function setzeErledigt(player, d, auftrag) {
    let feld = auftrag.art == "t" ? "erledigtT" : "erledigtW"
    let alt = str(d.getString(feld))
    d.putString(feld, alt ? alt + "," + auftrag.index : String(auftrag.index))
  }

  // ===================================================================
  // INVENTAR
  // ===================================================================
  // Hauptinventar 0..35 und Nebenhand 40, keine Ruestung
  function slots(inv) {
    let s = []
    for (let i = 0; i < 36; i++) s.push(i)
    if (inv.getContainerSize() > 40) s.push(40)
    return s
  }
  function passendeStacks(player, eintrag) {
    let inv = player.getInventory()
    let treffer = []
    let summe = 0
    slots(inv).forEach(i => {
      let st = inv.getItem(i)
      if (st.isEmpty() || st.isDamaged()) return
      if (eintrag.akzeptiert[itemId(st.getItem())]) { treffer.push(i); summe += st.getCount() }
    })
    return { slots: treffer, summe: summe }
  }
  function zahleAus(player, spur) {
    let rest = spur
    MUENZEN.forEach(m => {
      let n = Math.floor(rest / m.wert)
      rest -= n * m.wert
      while (n > 0) {
        let k = Math.min(64, n)
        player.give(Item.of(m.id, k))
        n -= k
      }
    })
  }

  // ===================================================================
  // ANZEIGE
  // ===================================================================
  function itemText(e) { return Text.translatable(e.beschreibung) }
  function auftragZeile(auftrag, erledigt) {
    let a = auftrag.a, e = a.eintrag
    let zeile = Text.of(auftrag.nr + ". ").gray()
      .append(Text.of(a.menge + "x ").white())
      .append(itemText(e).white().hover(Text.of(e.tag ? "Jedes Item aus #" + e.tag + " zaehlt" : e.anzeige)))
    if (e.tag && e.anzahlItems > 1) zeile = zeile.append(Text.of(" (beliebige Sorte)").darkGray())
    zeile = zeile.append(Text.of("  " + cogText(a.belohnung)).gold().hover(Text.of(muenzText(a.belohnung))))
    zeile = zeile.append(Text.of("  "))
    if (erledigt) {
      zeile = zeile.append(Text.of("[erledigt]").darkGreen())
    } else {
      zeile = zeile.append(Text.of("[Abgeben]").green().underlined()
        .clickRunCommand("/auftrag abgeben " + auftrag.nr)
        .hover(Text.of("Zieht " + a.menge + " Stueck aus deinem Inventar ab")))
    }
    return zeile
  }

  function zeigeAuftraege(player) {
    let server = player.getServer()
    let pl = holePool()
    if (pl.length == 0) {
      player.tell(Text.red("Auftraege sind gerade nicht verfuegbar (Pool leer). Ein Admin sollte das KubeJS-Log pruefen."))
      return 0
    }
    let akt = aktuelleAuftraege(server)
    let d = spielerDaten(player, akt.zeit)
    player.tell(Text.of("Auftraege").gold().bold())
    player.tell(Text.of("Taeglich, neu in " + dauerText(akt.zeit.msBisTag) + ":").gray())
    akt.liste.filter(x => x.art == "t").forEach(x => player.tell(auftragZeile(x, istErledigt(d, x))))
    player.tell(Text.of("Woechentlich, neu in " + dauerText(akt.zeit.msBisWoche) + ":").gray())
    akt.liste.filter(x => x.art == "w").forEach(x => player.tell(auftragZeile(x, istErledigt(d, x))))
    let verdient = d.getInt("verdientW")
    player.tell(Text.of("Diese Woche verdient: " + cogText(verdient) + " von " + cogText(KONFIG.wochenGrenze)).darkGray())
    return 1
  }

  function abgeben(player, nr) {
    let server = player.getServer()
    if (holePool().length == 0 || !muenzenOk) {
      player.tell(Text.red("Abgabe ist gerade nicht moeglich. Ein Admin sollte das KubeJS-Log pruefen."))
      return 0
    }
    let akt = aktuelleAuftraege(server)
    let auftrag = akt.liste.filter(x => x.nr == nr)[0]
    if (!auftrag) { player.tell(Text.red("Auftrag " + nr + " gibt es nicht. Liste: /auftraege")); return 0 }
    let d = spielerDaten(player, akt.zeit)
    if (istErledigt(d, auftrag)) { player.tell(Text.yellow("Auftrag " + nr + " hast du in dieser Periode schon erledigt.")); return 0 }

    let a = auftrag.a
    let verdient = d.getInt("verdientW")
    if (verdient + a.belohnung > KONFIG.wochenGrenze) {
      player.tell(Text.yellow("Wochengrenze erreicht. Diese Woche sind noch " + muenzText(Math.max(0, KONFIG.wochenGrenze - verdient)) +
        " moeglich, der Auftrag bringt " + muenzText(a.belohnung) + "."))
      return 0
    }

    // 1. pruefen
    let gefunden = passendeStacks(player, a.eintrag)
    if (gefunden.summe < a.menge) {
      player.tell(Text.red("Nicht genug: ").append(Text.of(gefunden.summe + " von " + a.menge + " ")).append(itemText(a.eintrag)).append(Text.of(" im Inventar.")))
      return 0
    }
    // 2. abziehen
    let inv = player.getInventory()
    let rest = a.menge
    gefunden.slots.forEach(i => {
      if (rest <= 0) return
      let st = inv.getItem(i)
      let k = Math.min(rest, st.getCount())
      st.shrink(k)
      rest -= k
    })
    inv.setChanged()
    if (rest > 0) {
      // Darf nicht passieren, weil vorher gezaehlt wurde. Zur Sicherheit melden statt auszahlen.
      console.error(LOG + "Abgabe inkonsistent bei " + player.getUsername() + ", Rest " + rest)
      player.tell(Text.red("Fehler bei der Abgabe, bitte einem Admin melden."))
      return 0
    }
    // 3. markieren und auszahlen
    setzeErledigt(player, d, auftrag)
    d.putInt("verdientW", verdient + a.belohnung)
    zahleAus(player, a.belohnung)
    player.tell(Text.green("Auftrag " + nr + " erledigt: ").append(Text.of(muenzText(a.belohnung)).gold()))
    console.info(LOG + player.getUsername() + " gab Auftrag " + nr + " ab (" + a.menge + "x " + a.eintrag.schluessel + ", " + a.belohnung + " Spur)")
    return 1
  }

  // ===================================================================
  // DEBUG (nur OP)
  // ===================================================================
  function debugPool(src) {
    let p = holePool()
    let antwort = t => src.sendSystemMessage(Text.of(t))
    if (poolFehler) antwort("Fehler beim Bauen: " + poolFehler)
    let proMod = {}, proStufe = {}, proFamilie = {}
    p.forEach(e => {
      proMod[e.mod] = (proMod[e.mod] || 0) + 1
      proStufe[e.stufe] = (proStufe[e.stufe] || 0) + 1
      proFamilie[e.familie] = (proFamilie[e.familie] || 0) + 1
    })
    let mods = Object.keys(proMod).sort((a, b) => proMod[b] - proMod[a])
    antwort("Pool: " + p.length + " Eintraege, " + mods.length + " Mods")
    antwort("Stufen: " + Object.keys(proStufe).map(k => k + " " + proStufe[k]).join(", "))
    antwort("Familien: " + Object.keys(proFamilie).map(k => k + " " + proFamilie[k]).join(", "))
    antwort("Mods: " + mods.map(m => m + " " + proMod[m]).join(", "))
    // Pruefung der Wochenvielfalt
    let z = jetztInfo(src.getServer())
    let plan = wochenPlan(z.woche)
    let alle = plan.woechentlich.slice()
    plan.tage.forEach(t => t.forEach(a => alle.push(a)))
    let schluessel = {}, planMods = {}
    alle.forEach(a => { schluessel[a.eintrag.schluessel] = true; planMods[a.eintrag.mod] = true })
    antwort("Woche " + z.woche + ": " + alle.length + " Auftraege, " + Object.keys(schluessel).length +
      " verschieden, " + Object.keys(planMods).length + " Mods (" + Object.keys(planMods).join(", ") + ")")
    plan.tage.forEach((t, i) => antwort("  Tag " + (i + 1) + (i == z.tagInWoche ? " (heute)" : "") + ": " +
      t.map(a => a.menge + "x " + a.eintrag.schluessel + " = " + a.belohnung).join("; ")))
    plan.woechentlich.forEach(a => antwort("  Woche: " + a.menge + "x " + a.eintrag.schluessel + " = " + a.belohnung))
    if (p.length) logPool()
    antwort("Vollstaendige Liste steht in logs/kubejs/server.log")
    return 1
  }

  // ===================================================================
  // EVENTS UND BEFEHLE
  // ===================================================================
  ServerEvents.loaded(event => { holePool() })

  ServerEvents.commandRegistry(event => {
    const Commands = event.commands
    const Arguments = event.arguments

    let liste = ctx => {
      let p = ctx.source.getPlayer()
      if (p == null) { ctx.source.sendSystemMessage(Text.of("Nur fuer Spieler.")); return 0 }
      return zeigeAuftraege(p)
    }

    event.register(Commands.literal("auftraege").executes(liste))
    event.register(Commands.literal("auftrag")
      .executes(liste)
      .then(Commands.literal("abgeben")
        .then(Commands.argument("nr", Arguments.INTEGER.create(event))
          .executes(ctx => {
            let p = ctx.source.getPlayer()
            if (p == null) return 0
            return abgeben(p, Arguments.INTEGER.getResult(ctx, "nr"))
          })))
      .then(Commands.literal("debug")
        .requires(src => src.hasPermission(2))
        .then(Commands.literal("pool").executes(ctx => debugPool(ctx.source)))
        .then(Commands.literal("neuaufbau").executes(ctx => {
          pool = null; poolFehler = null; planCache = {}
          holePool()
          ctx.source.sendSystemMessage(Text.of("Pool neu gebaut: " + (pool ? pool.length : 0) + " Eintraege"))
          return 1
        }))
        .then(Commands.literal("reset")
          .then(Commands.argument("spieler", Arguments.PLAYER.create(event))
            .executes(ctx => {
              let p = Arguments.PLAYER.getResult(ctx, "spieler")
              let root = serverDaten(p.getServer())
              if (root.contains("spieler")) root.getCompound("spieler").remove(str(p.getStringUUID()))
              ctx.source.sendSystemMessage(Text.of("Auftragsstand von " + p.getUsername() + " zurueckgesetzt."))
              return 1
            })))
        .then(Commands.literal("tag")
          .executes(ctx => verschiebeTag(ctx.source, 1))
          .then(Commands.argument("anzahl", Arguments.INTEGER.create(event))
            .executes(ctx => verschiebeTag(ctx.source, Arguments.INTEGER.getResult(ctx, "anzahl")))))))
  })

  function verschiebeTag(src, n) {
    let d = serverDaten(src.getServer())
    d.putInt("tagVersatz", d.getInt("tagVersatz") + n)
    src.getServer().persistentData.put(DATEN_SCHLUESSEL, d)
    let z = jetztInfo(src.getServer())
    src.sendSystemMessage(Text.of("Tagesversatz jetzt " + d.getInt("tagVersatz") + " (Tag " + z.tag + ", Woche " + z.woche +
      ", Wochentag " + (z.tagInWoche + 1) + "). Zuruecksetzen mit /auftrag debug tag " + (-d.getInt("tagVersatz"))))
    return 1
  }

})()
