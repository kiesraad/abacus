
#let input = csv("inputs/teletex-test.json")
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
