#let current-chapter-title() = context {
  let headings = query(heading.where(level: 1).before(here()))

  if headings.len() > 0 {
    headings.last().body
  }
}

// Default document styling
#let conf(doc, header: none, footer: none) = [
  #set text(
    font: "DM Sans",
    size: 9pt,
  )

  #set page(
    paper: "a4",
    margin: (x: 2.0cm, y: 2.0cm),
    numbering: "1 / 1",
    header: context (
      grid(
        columns: (1fr, auto),
        text(size: 8pt, current-chapter-title()), text(size: 8pt, weight: "semibold", header),
        v(0.66em),
      )
    ),
    footer: context (
      grid(
        columns: (1fr, auto),
        text(size: 8pt, footer),
        align(
          end,
          counter(page).display(
            (current, total) => [Pagina #current van #total],
            both: true,
          ),
        ),
      )
    ),
  )

  #set list(spacing: 1em)

  #show heading: set block(above: 2em, below: 1.5em)

  #show heading.where(level: 1): set text(size: 16pt, weight: "regular")
  #show heading.where(level: 2): set text(size: 14pt, weight: "semibold")
  #show heading.where(level: 3): set text(size: 10pt, weight: "regular")
  #show heading.where(level: 3): set block(
    stroke: (left: 1pt),
    outset: (left: 6pt, top: 3pt, bottom: 3pt),
  );

  #doc
]

// Document header numbering
#let document_numbering(doc) = [
  #set heading(numbering: "1.1", hanging-indent: 0pt, supplement: "")
  #show heading.where(level: 1): set heading(numbering: "Deel 1.1 -", supplement: "Deel")
  #show heading.where(level: 3): it => [
    #block(
      stroke: (left: 1pt),
      outset: (left: 6pt, top: 3pt, bottom: 3pt),
    )[
      #text(weight: "bold", counter(heading).display(it.numbering))
      #it.body
    ]
  ]

  #doc
]
