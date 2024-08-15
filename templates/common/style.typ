#let conf(input, doc) = [
  #set text(
    font: "Bitstream Vera Sans",
    size: 8pt
  )
  #set page(
    paper: "a4",
    margin: (x: 1.8cm, y: 1.5cm),
    numbering: "1 / 1",
    header: {
     text([#input.version: Proces-verbaal van de uitslag van de verkiezing van de #input.leden_van])
     line(length: 100%)
    },
    footer: [
      #grid(
        columns: (3fr, 1fr),
        [
          Datum: #input.gen_datum - SHA-256-Hashcode: \ 
          #input.sha256
        ],
        align(right)[
          pagina #counter(page).display("1 / 1", both: true)
        ]
      )
    ]
  )

  #set heading(numbering: "1a    ")

  #show heading.where(level: 1): it => {
    block(width: 100%, fill: black, inset: 6pt)[
      #text(fill: white)[#it]
    ]
  }

  #doc
]

#let title(version, title, subtitle) = {
  grid(
    columns: (1fr),
    gutter: 13pt,
    text(weight: "extrabold", version),
    text(size: 20pt, title),
    text(subtitle),
    [],
    grid.hline(),
  )
}
