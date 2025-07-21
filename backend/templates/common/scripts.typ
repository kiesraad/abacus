// A paragraph with a vertical line on the left
#let emph_block(content) = {
  block(width: 75%, above: 3em, below: 3em, outset: (left: 6pt, top: 3pt, bottom: 3pt), stroke: (left: 1pt), text(
    size: 10pt,
    content,
  ))
}

#let paragraph(content) = block(width: 75%, content)

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
  box(width: 8pt, height: 8pt, clip: false, curve(
    stroke: (thickness: 2pt, cap: "round", join: "miter", paint: white),
    curve.move((0%, 50%)),
    curve.line((40%, 90%)),
    curve.line((90%, 0%)),
  ))
}

/// Display a checkbox, optionally already checked when the `checked` parameter is set to `true`
#let checkbox(checked: false, large: true, content) = {
  let size = if large { 12pt } else { 10pt }

  grid(
    columns: (20pt, auto),
    align: horizon,
    box(
      width: size,
      height: size,
      inset: 2.5pt,
      stroke: if checked { 3pt + black } else { (thickness: 0.5pt, dash: "densely-dotted", cap: "square") },
      clip: true,
      fill: if checked { black } else { white },
      if checked { checkmark() }
    ),
    content,
  )
}

/// Add dashes to a text every `every` characters
#let add-dashes(text, every: 4) = {
  if text == none {
    return
  }

  text.clusters().chunks(every).map((c) => c.join("")).join("-")
}

/// Format a number with thousands separator
#let fmt-number(
  integer,
  thousands-sep: ".",
  zero: "-",
) = {
  if (integer == 0 or integer == none) {
    return zero
  }

  let formatted = str(integer).clusters().rev().chunks(3).map(c => c.join("")).join(thousands-sep).rev()

  text(
    number-width: "tabular",
    formatted,
  )
}

/// Display a box with a prefixed label and a value
#let letterbox(letter, value: none, light: true, content) = {
  let bg = if light { luma(213) } else { black }
  let fill = if light { black } else { white }

  grid(
    columns: (8em, 3.5em, 1fr),
    align: (center, right),
    inset: 9pt,
    grid.cell(align: right, stroke: 0.5pt + black, text(number-width: "tabular", fmt-number(value))),
    grid.cell(stroke: 0.5pt + black, align: center, fill: bg, text(fill: fill, weight: "bold", letter)),
    grid.cell(align: horizon + left, content),
  )
}

#let empty_letterbox(letter, cells: 5, light: true, content) = {
  let bg = if light { luma(213) } else { black }
  let fill = if light { black } else { white }

  grid(
    inset: 9pt,
    columns: range(0, cells).map(_ => 2em) + (3.5em, 1fr),
    align: (center, right),
    grid.vline(stroke: (thickness: 0.5pt, dash: "solid")),
    ..range(0, cells).map(cell => {
      grid.cell(
        stroke: (
          y: 0.5pt + black,
          x: (paint: black, thickness: 0.5pt, dash: "densely-dotted"),
        ),
        " ",
      )
    }),
    grid.vline(stroke: (thickness: 0.5pt, dash: "solid")),
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

  let weekdays = (
    "maandag",
    "dinsdag",
    "woensdag",
    "donderdag",
    "vrijdag",
    "zaterdag",
    "zondag",
  )

  let months = (
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  )

  weekdays.at(date.weekday() - 1)
  date.display(" [day padding:none] ")
  months.at(date.month() - 1)
  date.display(" [year]")
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
  if election_candidate == none {
    return
  }

  if "last_name_prefix" in election_candidate {
    election_candidate.last_name_prefix
    " "
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
      table.cell(stroke: none, align: bottom, text(size: 8pt, weight: "semibold", number-width: "tabular", value))
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

#let empty_grid(cells: 4, paint: black, thickness: 1pt) = {
  grid(
    inset: 9pt,
    columns: range(0, cells).map(_ => 2em),
    align: (center, right),
    ..range(0, cells - 1)
      .map(_ => (
        grid.cell(" "),
        grid.vline(stroke: (paint: paint, thickness: thickness, dash: "densely-dotted")),
      ))
      .flatten(),
    grid.cell(" "),
  )
}

// View a votes table, values should be a dictionary with the keys "name", "number" and "votes"
#let votes_table(
  headers: ("", "", ""),
  title: "",
  total: 0,
  values: (),
  continue_on_next_page: "",
  column_total: (c, v) => [#c: #v],
  sum_total: [(#columns)],
  total_instruction: "",
) = {
  // Counter that keeps track of the column number
  let column = 0

  // Number of rows in the column
  let column_row = 0

  // Row counter
  let rc = 0

  // Vote counter
  let votes = 0

  // Max rows per table / column
  let break_count = (25, 25, 15, 15)
  let total_rows = values.len()

  text(size: 14pt, weight: "semibold")[Lijst #title]

  set text(size: 8pt)

  columns(2, {
    while rc < total_rows {
      let rows_in_column = calc.min(break_count.at(column, default: 15), total_rows - rc)

      table(
        columns: (1fr, 2.5em, auto),
        rows: (auto,) + range(0, rows_in_column).map(_ => 23pt) + (8pt, 23pt),
        inset: 8pt,
        stroke: 0.5pt + silver,
        fill: (_, y) => if y > 1 and calc.even(y) { luma(245) },
        table.hline(stroke: none),
        table.header(
          ..headers.map(h => table.cell(stroke: none, align: bottom, text(size: 8pt, weight: "semibold", h)))
        ),
        table.hline(stroke: 1pt + black),
        ..while rc < total_rows {
          let c = values.at(rc)
          votes += c.votes
          rc += 1
          column_row += 1

          (
            table.cell(align: horizon, text(top-edge: 5pt, [#c.name])),
            table.cell(fill: luma(213), align: center + horizon, text(
              number-width: "tabular",
              weight: "bold",
              [#c.number],
            )),
            if c.votes == none {
              table.cell(inset: 1pt, empty_grid(paint: luma(213)))
            } else {
              table.cell(align: right + horizon, text(number-width: "tabular", fmt-number(c.votes)))
            },
          )

          if calc.rem(column_row, break_count.at(column, default: 15)) == 0 {
            break
          }
        }.flatten(),
        table.hline(stroke: 1pt + black),
        table.footer(
          // Empty line
          table.cell(colspan: 3, stroke: (x: none), fill: white, inset: 0pt, []),
          if type(column_total) == function {
            table.cell(colspan: 3, fill: white, align: center, {
              // Increment the column counter
              column += 1

              // Caller defined render of column totals
              column_total(column, votes)

              // Reset the votes per column counter
              votes = 0
              column_row = 0
            })
          } else {
            table.cell(colspan: 3, fill: white, inset: 0pt, {
              column += 1

              grid(
                columns: (1fr, 10em),
                grid.cell(inset: 9pt, align: center)[#column_total #column],
                grid.cell(empty_grid(cells: 5, paint: luma(213)), align: center, inset: 0pt),
              )

              votes = 0
              column_row = 0
            })
          },
        ),
      )

      if rc < total_rows {
        if (calc.even(column)) {
          v(8pt)
          align(right, text(weight: "bold", continue_on_next_page))
        }

        colbreak()

        if (column == 2) {
          place(top + left, scope: "parent", float: true, text(
            size: 14pt,
            weight: "semibold",
          )[Vervolg lijst #title])
        }
      }
    }
  })

  align(bottom, grid(
    columns: (1fr, 8em),
    align: (right, right),
    inset: 8pt,
    grid.cell(stroke: 0.5pt + black, align: right, fill: black, text(fill: white, sum_total(range(
      1,
      column + 1,
    )
      .map(str)
      .join(" + ")))),
    if total == none {
      grid.cell(stroke: 0.5pt + black, inset: 0pt, empty_grid(cells: 5, thickness: 0.5pt))
    } else {
      grid.cell(stroke: 0.5pt + black, fmt-number(total, zero: "0"))
    },
  ))

  if total == none {
    align(right, text(
      size: 10pt,
      weight: "bold",
      total_instruction,
    ))
  }

  pagebreak(weak: true)
}

/// Display a TODO label
#let TODO = {
  box(fill: red, stroke: black, inset: 2pt)[#text(fill: white, size: 6pt)[*TODO*]]
}
