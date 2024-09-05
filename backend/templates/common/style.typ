#let conf(input, doc) = [
  #set text(
    font: "DM Sans",
    size: 9pt
  )
  #set page(
    paper: "a4",
    margin: (x: 2.0cm, y: 1.5cm),
    numbering: "1 / 1",
  )

  #set heading(numbering: "1a. ")

  #show heading.where(level: 1): it => {
    block(width: 100%, fill: black, inset: 6pt)[
      #text(fill: white)[#it]
    ]
  }

  #doc
]

#let mono(content) = {
  text(
    font: "Geist Mono",
    content,
  )
}

#let title(version, title, subtitle) = {
  grid(
    columns: (1fr),
    gutter: 13pt,
    grid.hline(),
    grid.cell(
      inset: (
        top: 10pt,
        bottom: -5pt,
      ),
      text(size: 11pt, weight: "extrabold", version),
    ),
    text(size: 15pt, weight: "extrabold", title),
    text(subtitle),
    [],
    grid.hline(),
  )
}
