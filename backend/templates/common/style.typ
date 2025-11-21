// Get the chapter defined in the current page or the last defined chapter
#let current_chapter() = {
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

// convert any typst value to a string
#let to-string(it) = {
  if type(it) == str {
    it
  } else if type(it) != content {
    str(it)
  } else if it.has("text") {
    it.text
  } else if it.has("children") {
    it.children.map(to-string).join()
  } else if it.has("body") {
    to-string(it.body)
  } else if it == [ ] {
    " "
  }
}

// Get the current chapter title, with possible overrides
#let current_chapter_title() = {
  if current_chapter() == none {
    return ""
  }

  let chapter_string = to-string(current_chapter())

  if chapter_string.starts-with("Gecorrigeerde telresultaten van") {
    return "Deel 1 - Gecorrigeerde telresultaten"
  }

  if chapter_string.starts-with("Telresultaten van") {
    return "Deel 1 - Telresultaten"
  }

  return current_chapter()
}

#let default_header(header-left, header-right) = context {
  grid(
    columns: (1fr, auto),
    text(size: 8pt, {
      show heading: set text(size: 8pt, weight: "regular")
      set align(top + left)

      if header-left != none {
        header-left
      } else {
        current_chapter_title()
      }
    }),
    text(size: 8pt, weight: "semibold", align(top + right, header-right)),
    v(0.66em),
  )
}

#let default_footer(footer) = context {
  grid(
    columns: (1fr, auto),
    text(size: 8pt, footer), align(bottom + end, counter(page).display(both: true)),
  )
}

// Default document styling
#let conf(doc, header-left: none, header-right: none, footer: none) = [
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
    header: default_header(header-left, header-right),
    footer: default_footer(footer),
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

// Attachment header numbering
#let attachment_numbering(doc, prefix) = [
  #set heading(numbering: "1.1", hanging-indent: 0pt, supplement: "")

  #show heading: it => {
    if it.level >= 4 {
      block(it.body)
    } else {
      [#prefix - #counter(heading).display(it.numbering) #it.body]
    }
  }

  #show heading.where(level: 3): it => [
    #block(
      stroke: (left: 1pt),
      outset: (left: 6pt, top: 3pt, bottom: 3pt),
    )[
      #prefix - *#counter(heading).display(it.numbering)*
      #it.body
    ]
  ]

  #doc
]
