# JMP-Skripte

## jmp_muenzen.js: Münzen umtauschen

Formlose Werkbank-Rezepte in beide Richtungen, ohne Wertverlust: 8 Spur = 1 Bevel, 2 Bevel = 1 Sprocket, 4 Sprocket = 1 Cog, 8 Cog = 1 Crown, 8 Crown = 1 Sun. Rezept-IDs `jmp:muenzen/<von>_zu_<nach>`. Ersatz für die Mod "Create Numismatics Recipes", die es nur für Forge 1.20.1 gibt.

## jmp_auftraege.js: wiederkehrende Aufträge

Täglich 3 Aufträge, wöchentlich 1. Abgabe gegen Numismatics-Münzen (Items, kein Bankkonto). Gleiche Aufträge für alle Spieler, deterministisch aus Datum und Woche. Reset täglich 05:00 UTC, Wochenreset montags 05:00 UTC.

### Befehle

| Befehl | Wer | Zweck |
|---|---|---|
| `/auftraege` oder `/auftrag` | alle | Liste mit Status, Belohnung, Restzeit, klickbarem "[Abgeben]" |
| `/auftrag abgeben <nr>` | alle | Items aus dem Inventar abziehen, Münzen auszahlen |
| `/auftrag debug pool` | OP | Pool je Mod/Stufe/Familie, Wochenplan, Vielfalt; vollständige Liste ins Log |
| `/auftrag debug selbsttest` | OP | Prüft UUID, Spielerdaten, Inventar, Text und Münzen, ohne etwas zu verändern |
| `/auftrag debug neuaufbau` | OP | Pool neu aus der Registry bauen |
| `/auftrag debug reset <spieler>` | OP | Auftragsstand eines Spielers löschen |
| `/auftrag debug tag [anzahl]` | OP | Tag vorspulen (Standard 1, negativ zurück). Wirkt für alle Spieler. |

Nummern 1 bis 3 sind Tagesaufträge, 4 der Wochenauftrag. Abgezogen wird aus Hauptinventar und Nebenhand, nicht aus Rüstung oder Rucksäcken. Beschädigte Items zählen nicht.

### Funktionsweise

- **Pool:** beim Serverstart aus allen Item-Tags `c:<familie>/<material>` der geladenen Registry. Material-Familien (Barren, Platten, Zahnräder ...) werden als Tag abgefragt, jede Sorte zählt. Essen und Feldfrüchte sind Einzel-Items.
- **Stufe:** "spät" über `stufeMods` oder Stichworte (Allthemodium, Netherite ...). "früh" nur per Positivliste: Material-Tags mit genauem Materialnamen aus `fruehMaterialien` (Eisen, Kupfer, Gold, Zink, Zinn, Blei, Silber, Kohle, Redstone ...), nur in den Familien Barren, Roherze, Nuggets, Edelsteine, Blöcke und nur, wenn das angezeigte Item aus Vanilla, AllTheOres oder Create kommt. Essen und Feldfrüchte sind nur aus `fruehItemMods` "früh". Alles andere ist "mitte". Staub, Platten, Zahnräder und Stangen sind dadurch nie "früh".
- **Wert:** Basiswert der Familie (Spur pro Item) mal Stufenfaktor (früh 1, mitte 2, spät 8). Die Menge wird so gewählt, dass die Belohnung im Zielbereich liegt (Tag 1 bis 2 Cogs, Woche 4 bis 8 Cogs), begrenzt auf 4 Stacks, in Stufe "früh" auf 2 Stacks. Passt ein Item nicht in den Rahmen, wird es für diesen Auftrag übersprungen.
- **Auswahl:** Gewicht = Mod-Gewicht × Stufengewicht ÷ √(Einträge der Mod). Pro Tag keine Mod doppelt, innerhalb der Woche kein Auftrag doppelt, wiederholte Mods werden seltener.
- **Grenze:** höchstens 20 Cogs pro Spieler und Woche. Ein Auftrag, der darüber läge, wird abgelehnt (Items bleiben im Inventar).
- **Speicher:** Spielerstand pro UUID und Tagesversatz für Tests in den persistenten Serverdaten von KubeJS (`kubejs_persistent_data.nbt` im Weltordner, Schlüssel `jmp_auftraege`). Überlebt Tod, Neustart und `/reload`. Bewusst nicht `player.persistentData`: Der Name kollidiert mit NeoForges `getPersistentData()`, dessen Daten beim Tod verloren gehen.

### Konfiguration

Alles im Block `KONFIG` oben im Skript: Reset-Stunde, Stufen der Tagesaufträge, Zielbereiche, Wochengrenze, Familien und Basiswerte, Stufen-Stichworte, Mod-Gewichte, Sperrliste. Nach Änderungen `/reload` (oder Neustart).

### Pool erweitern

- Neue Familie: Eintrag in `KONFIG.familien` mit Tag-Name aus `c:` (z. B. `dyes: { wert: 0.5, art: "item", name: "Farbstoffe" }`).
- Mod bevorzugen: `KONFIG.modGewicht.<namespace> = 2`.
- Stufe korrigieren: Material in `KONFIG.fruehMaterialien`, Mod in `KONFIG.fruehItemMods` (Essen/Feldfrüchte), Stichwort in `KONFIG.stufeStichworte.spaet` oder ganze Mod in `KONFIG.stufeMods`.
- `neovitae` ist gesperrt: Die Mod erzeugt Staub für viele Materialien, der nur über die Erzverarbeitung von Blood Magic erhältlich ist.
- Item ausschließen: regulärer Ausdruck in `KONFIG.sperreItems`, Tag in `KONFIG.sperreTags`, Mod in `KONFIG.sperreMods`. Items aus der ATM-Banliste und aus `c:hidden_from_recipe_viewers` sind automatisch gesperrt.
- Danach `/auftrag debug pool` prüfen.

### Hinweise

- `/kubejs reload server_scripts` lädt die Logik neu, die Befehle selbst werden aber erst mit `/reload` oder einem Neustart neu registriert.
- Fehler und Pool-Export stehen in `logs/kubejs/server.log` (Präfix `[JMP-Auftraege]`).
