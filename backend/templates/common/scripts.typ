// A paragraph with a vertical line on the left
#let emph_block(content) = {
  block(above: 3em, below: 3em, outset: (left: 6pt, top: 3pt, bottom: 3pt), stroke: (left: 1pt), text(
    size: 10pt,
    content,
  ))
}

// A box with optional titles, aligned horizontally
#let textbox(..args) = {
  rect(
    width: 100%,
    height: 6em,
    inset: 1em,
    stroke: (
      top: 0.5pt,
      left: 0.5pt,
      right: 0.5pt,
      bottom: 1pt,
    ),
    grid(
      columns: args.pos().map(a => 1fr),
      ..args
    ),
  )
}

/// Display a checkmark for usage in a checkbox
#let checkmark() = {
  box(width: 8pt, height: 8pt, clip: true, curve(
    stroke: black,
    curve.move((0%, 50%)),
    curve.line((40%, 90%)),
    curve.line((100%, 0%)),
  ))
}

/// Display a checkbox, optionally already checked when the `checked` parameter is set to `true`
#let checkbox(checked: false, large: true, content) = {
  let size = if large { 14pt } else { 10pt }

  grid(
    columns: (size + 6pt, auto),
    align: horizon,
    box(width: size, height: size, inset: 3pt, stroke: 0.5pt, clip: true, if checked {
      checkmark()
    }),
    content,
  )
}

/// Display a box with a prefixed label and a value
#let letterbox(letter, light: true, value, content) = {
  let bg = if light { luma(213) } else { black }
  let fill = if light { black } else { white }

  grid(
    columns: (8em, 4em, 1fr),
    align: (center, right),
    inset: 9pt,
    grid.cell(align: right, stroke: 0.5pt + black, text(number-width: "tabular", value)),
    grid.cell(stroke: 0.5pt + black, align: center, fill: bg, text(fill: fill, weight: "bold", letter)),
    grid.cell(align: horizon + left, content),
  )
}

// Mathematical addition layout
#let sum(..boxes, sum_box) = {
  grid(
    rows: auto,
    ..boxes,
    v(1em),
    grid(
      columns: (1fr, 5em),
      grid.cell(align: horizon, line(length: 100%, stroke: 0.5pt)),
      grid.cell(align: horizon + right, "+ tel op"),
    ),
    v(1em),
    grid.cell(sum_box)
  )
}

// Default date formatting
#let format_date(date) = {
  let dp = date.split("-")
  let date = datetime(year: int(dp.at(0)), month: int(dp.at(1)), day: int(dp.at(2)))

  date.display("[day]-[month]-[year]")
}

// A title without any numbering
#let title(value) = {
  text(size: 14pt, weight: "semibold", value)
}

// Title (page) layout
#let title_page(title1, title2, subtitle1, subtitle2) = {
  let title_size = 24pt
  let subtitle_size = 20pt
  let space = 1em

  grid(
    columns: 1fr,
    gutter: 1.33em,
    grid.hline(stroke: 2pt),
    v(space),
    text(size: title_size, weight: "semibold", title1),
    text(size: title_size, weight: "semibold", title2),
    v(space),
    text(size: subtitle_size, subtitle1),
    text(size: subtitle_size, subtitle2),
    v(space),
    grid.hline(position: top)
  )

  v(space)
}

// Format the name of a candidate
#let candidate_name(election_candidate) = {
  if "last_name_prefix" in election_candidate {
    election_candidate.last_name_prefix
  }
  election_candidate.last_name
  " "
  election_candidate.initials
  if "first_name" in election_candidate [
    (#election_candidate.first_name)
  ]
  if "gender" in election_candidate {
    if election_candidate.gender == "Male" [
      (m)
    ] else if election_candidate.gender == "Female" [
      (v)
    ] else if election_candidate.gender == "X" [
      (x)
    ]
  }
}

// Default table layout
#let light_table(columns: (), headers: (), values: ()) = {
  table(
    columns: columns,
    stroke: (
      y: 0.25pt + black,
      x: (paint: black, thickness: 0.25pt, dash: "densely-dotted"),
    ),
    inset: (x: 4pt, y: 8pt),
    table.vline(stroke: none),
    table.header(..headers.map(value => {
      table.cell(stroke: none, align: bottom, text(size: 8pt, weight: "semibold", value))
    })),
    table.hline(stroke: 1pt + black),
    ..values.map(value => {
      table.cell(align: horizon, value)
    }),
    table.vline(stroke: none),
  )
}

// Empty table, without any body fields
#let empty_lines(lines) = {
  table(
    columns: 1fr,
    stroke: (
      y: 0.25pt + black,
      x: (paint: black, thickness: 0.25pt, dash: "densely-dotted"),
    ),
    inset: (x: 4pt, y: 8pt),
    table.vline(stroke: none),
    table.hline(stroke: 1pt + black),
    ..range(0, lines).map(_ => table.cell(align: horizon, "")).flatten(),
    table.vline(stroke: none),
  )
}

// Empty table, with body fields specified
#let empty_table(columns: (), headers: (), values: (), rows: 0) = {
  light_table(columns: columns, headers: headers, values: range(0, rows)
    .map(_ => (
      ..values.map(value => {
        align(center, value)
      }),
    ))
    .flatten())
}

// View a votes table, values should be a dictionary with the keys "name", "number" and "votes"
#let votes_table(
  headers: ("", "", ""),
  total: 0,
  values: (),
  column_total: (c, v) => [#c: #v],
  sum_total: [(#columns)],
) = {
  // Counter that keeps track of the column number
  let c = counter("column")

  // Counter that keeps track of the total number of votes within a column
  let v = counter("votes")

  columns(2, table(
    columns: (1fr, 3em, auto),
    inset: 8pt,
    stroke: 0.5pt + silver,
    fill: (_, y) => if y > 1 and calc.even(y) { luma(245) },
    table.hline(stroke: none),
    table.header(..headers.map(h => table.cell(stroke: none, align: bottom, text(size: 8pt, weight: "semibold", h)))),
    table.hline(stroke: 1pt + black),
    ..values
      .map(c => (
        table.cell(c.name),
        table.cell(fill: luma(213), align: center, text(number-width: "tabular", weight: "bold", [#c.number])),
        table.cell(align: right, text(number-width: "tabular", {
          // Sum the number of votes in this column
          v.update(n => n + c.votes)

          str(c.votes)
        })),
      ))
      .flatten(),
    table.footer(
      table.hline(stroke: 1pt + black),
      // Empty line
      table.cell(colspan: 3, stroke: (x: none), fill: white, inset: 3pt, []),
      table.cell(colspan: 3, fill: white, align: center, {
        // Increment the column counter
        c.step()

        // Caller defined render of column totals
        column_total(context c.display(), context v.display())

        // Reset the votes per column counter
        v.update(n => 0)
      }),
    ),
  ))

  grid(
    columns: (1fr, 8em),
    align: (right, right),
    inset: 9pt,
    grid.cell(stroke: 0.5pt + black, align: right, fill: black, text(fill: white, sum_total(context range(
      1,
      c.get().first() + 1,
    )
      .map(str)
      .join(" + ")))),
    grid.cell(stroke: 0.5pt + black)[#total],
  )
}

/// Display a TODO label
#let TODO = {
  box(fill: red, stroke: black, inset: 2pt)[#text(fill: white, size: 6pt)[*TODO*]]
}
