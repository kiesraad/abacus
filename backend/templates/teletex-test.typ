
#let input = json("inputs/teletex-test.json")
#set text(
  lang: "nl",
  region: "nl",
  font: "DM Sans",
  size: 8pt,
)

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
