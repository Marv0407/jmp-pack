# Jährliche Minecraft Phase: Modpack (Packwiz)

Basis: All the Mods 10 (NeoForge 21.1.266, Minecraft 1.21.1), zusätzlich Create Stock Market und Create Numismatics.
Dieser Ordner enthält nur Verweise auf die Mods, keine JAR-Dateien. Die Mods lädt der Installer direkt von CurseForge.

## Spieler: einmalige Einrichtung (Prism Launcher)
1. Prism Launcher installieren: https://prismlauncher.org
2. Neue Instanz: Minecraft 1.21.1, Mod Loader NeoForge 21.1.266, Name "JMP".
3. Instanz bearbeiten, Einstellungen, Java: mindestens 8 GB RAM (Maximum), Java 21.
4. Instanz bearbeiten, Einstellungen, Benutzerdefinierte Befehle, "Benutzerdefinierte Befehle aktivieren":
   Vor dem Start: `"$INST_JAVA" -jar packwiz-installer-bootstrap.jar PACK_URL`
5. `packwiz-installer-bootstrap.jar` in den Minecraft-Ordner der Instanz legen (Instanz, Ordner öffnen, Minecraft).
6. Starten. Beim ersten Mal lädt der Installer alle Mods, bei jedem weiteren Start nur Änderungen.

## Admin: Änderungen am Pack
Alle Befehle in diesem Ordner, `packwiz.exe` liegt in `..\tools`.
- Mod hinzufügen: `packwiz curseforge add <slug>` oder `packwiz modrinth add <slug>`
- Alle Mods aktualisieren: `packwiz update --all`
- Config ändern: Datei in `config\` bearbeiten
- Danach: `packwiz refresh`, committen, pushen. Spieler bekommen die Änderung beim nächsten Start.
- Version hochzählen: `version` in `pack.toml`.

## Server
Auf dem Server liegt `packwiz-installer-bootstrap.jar` neben dem Start-Script. Vor dem Serverstart:
`java -jar packwiz-installer-bootstrap.jar -g -s server PACK_URL`

Hinweis: IM-Fast (MIT-Lizenz, Autor Bielhiss) liegt unter files/ und wird automatisch geladen, siehe files/IM-FAST-LICENSE.txt.
