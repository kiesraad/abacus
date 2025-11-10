#let input = json("inputs/test-teletex-charset.json")
#set text(
  lang: "nl",
  region: "nl",
  font: "DM Sans",
  size: 8pt,
)

// Note that this should be tested through the Rust code with embedded Typst library,
// a local Typst installation will fall back to other fonts installed on the system.

= Teletex codepoints

#columns(2,
  table(
    columns: 3,
    [*Character*], [*Code*], [*Description*],
    ..input.flatten(),
  )
)

== Bold and Italic

#text(weight: 700, style: "italic")[
  #columns(2,
    table(
      columns: 3,
      [*Character*], [*Code*], [*Description*],
      ..input.flatten(),
    )
  )
]
