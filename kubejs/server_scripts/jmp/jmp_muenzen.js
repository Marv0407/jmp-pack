// priority 0
// JMP: Muenzen von Create Numismatics an der Werkbank umtauschen, ohne Wertverlust.
// Ersatz fuer die Mod "Create Numismatics Recipes" (nur Forge 1.20.1).
// 8 Spur = 1 Bevel, 2 Bevel = 1 Sprocket, 4 Sprocket = 1 Cog, 8 Cog = 1 Crown, 8 Crown = 1 Sun, jeweils in beide Richtungen.
(function () {
  const STUFEN = [
    { klein: "spur", gross: "bevel", anzahl: 8 },
    { klein: "bevel", gross: "sprocket", anzahl: 2 },
    { klein: "sprocket", gross: "cog", anzahl: 4 },
    { klein: "cog", gross: "crown", anzahl: 8 },
    { klein: "crown", gross: "sun", anzahl: 8 }
  ]

  ServerEvents.recipes(event => {
    STUFEN.forEach(s => {
      let zutaten = []
      for (let i = 0; i < s.anzahl; i++) zutaten.push("numismatics:" + s.klein)
      event.shapeless(Item.of("numismatics:" + s.gross, 1), zutaten)
        .id("jmp:muenzen/" + s.klein + "_zu_" + s.gross)
      event.shapeless(Item.of("numismatics:" + s.klein, s.anzahl), ["numismatics:" + s.gross])
        .id("jmp:muenzen/" + s.gross + "_zu_" + s.klein)
    })
  })
})()
