#let input = json("inputs/test-unsupported-chars.json")
#set text(
  lang: "nl",
  region: "nl",
  font: "DM Sans",
  size: 8pt,
)

// Note that this should be tested through the Rust code with embedded Typst library,
// a local Typst installation will fall back to other fonts installed on the system.

#columns(2,
  table(
    columns: 2,
    [*Description*], [*Text*],
    ..input.flatten(),
  )
)

== Bold and Italic

#text(weight: 700, style: "italic")[
  #columns(2,
    table(
      columns: 2,
      [*Description*], [*Text*],
      ..input.flatten(),
    )
  )
]
