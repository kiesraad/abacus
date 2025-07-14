// Get the chapter defined in the current page or the last defined chapter
#let current-chapter() = context {
  let chapters = query(heading.where(level: 1))

  for chapter in chapters {
    if chapter.location().page() == here().page() {
      return chapter
    }
  }

  let prev_chapter = query(heading.where(level: 1).before(here()))

  if prev_chapter.len() > 0 {
    return prev_chapter.last()
  }
}


// Default document styling
#let conf(doc, header: none, footer: none) = [
  #set text(
    lang: "nl",
    region: "nl",
    font: "DM Sans",
    size: 9pt,
  )

  #set page(
    paper: "a4",
    margin: (x: 1.5cm, y: 2.0cm),
    numbering: (current, total) => [Pagina #current van #total],
    header: context (
      grid(
        columns: (1fr, auto),
        text(size: 8pt, {
          show heading: set text(size: 8pt, weight: "regular")
          current-chapter()
        }),
        text(size: 8pt, weight: "semibold", header),

        v(0.66em),
      )
    ),
    footer: context (
      grid(
        columns: (1fr, auto),
        text(size: 8pt, footer), align(end, counter(page).display(both: true)),
      )
    ),
  )

  #set list(spacing: 1.5em)

  #show par: content => block(width: 75%, content)

  #show heading: set block(above: 2em, below: 1.5em)

  #show heading.where(level: 1): set text(size: 16pt, weight: "regular")
  #show heading.where(level: 2): set text(size: 14pt, weight: "semibold")
  #show heading.where(level: 3): set text(size: 10pt, weight: "regular")
  #show heading.where(level: 3): set block(
    width: 75%,
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

// Attachement header numbering
#let attachement_numbering(doc, prefix) = [
  #set heading(numbering: "1.1", hanging-indent: 0pt, supplement: "")

  #show heading: it => [
      #prefix - #counter(heading).display(it.numbering) #it.body
  ]

  #show heading.where(level: 3): it => [
    #block(
      stroke: (left: 1pt),
      outset: (left: 6pt, top: 3pt, bottom: 3pt),
    )[
      #prefix - *#counter(heading).display(it.numbering))*
      #it.body
    ]
  ]

  #doc
]
