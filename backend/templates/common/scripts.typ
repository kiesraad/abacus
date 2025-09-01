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

/// Conditionally render the body if the condition is true, used to conditionally
/// render cells in grids or tables. The result should always be spread using
/// e.g. `..cell_if(condition, body)`. Can be used with either a single cell or
/// an array of cells for the body.
#let cell_if(condition, body) = {
  if condition {
    if type(body) == array {
      body
    } else {
      (body,)
    }
  } else {
    ()
  }
}

#let small_header_text(value) = {
  text(size: 6pt, weight: "semibold", value)
}

#let prefilled_text(value) = {
  text(font: "Geist Mono", features: ("ss09", ), value)
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
#let checkbox(checked: none, small: false, content) = {
  let has_content = content != none and content != ""
  let size = if checked == true or checked == none and not small { 14pt } else { 10pt }

  grid(
    columns: if has_content { (14pt, 6pt, auto) } else { (size) },
    align: horizon + center,
    box(
      width: size,
      height: size,
      inset: 2.5pt,
      stroke: if checked == none or checked == true { 0.5pt + black } else {
        (thickness: 0.4pt, dash: "densely-dotted", cap: "square")
      },
      clip: true,
      fill: if checked == true { black } else { white },
      if checked == true { checkmark() },
    ),
    if has_content { " " },
    if has_content { align(left, content) },
  )
}

/// Add dashes to a text every `every` characters
#let add-dashes(text, every: 4) = {
  if text == none {
    return
  }

  text.clusters().chunks(every).map(c => c.join("")).join("-")
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

#let prefilled_number(value, thousands-sep: ".", zero: "0") = {
  prefilled_text(fmt-number(value, thousands-sep: thousands-sep, zero: zero))
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

#let empty_letterbox(letter, cells: 5, light: true, original: none, bold_top_border: false, content) = {
  let bg_grey = luma(213)
  let bg = if light { bg_grey } else { black }
  let fill = if light { black } else { white }
  let cell_width = range(0, cells).map(_ => 2em)
  let total_cell_width = cell_width.sum()
  let additional_width = (3.5em, 1fr)
  let grid_columns = if original != none {
    (total_cell_width,) + cell_width + additional_width
  } else {
    cell_width + additional_width
  }
  let top_border_stroke = if bold_top_border {
    (top: (thickness: 1.5pt, paint: black, cap: "butt", join: "miter"))
  } else {
    (top: (thickness: 0.5pt, paint: black))
  }

  grid(
    inset: 9pt,
    columns: grid_columns,
    align: (center, right),
    grid.vline(stroke: (thickness: 0.5pt, dash: "solid")),
    ..cell_if(original != none, (
      grid.cell(stroke: (rest: 0.5pt + black) + top_border_stroke, align: right, fill: bg_grey, prefilled_number(original)),
      grid.vline(stroke: (thickness: 0.5pt, dash: "solid"))
    )),
    ..range(0, cells).map(cell => {
      grid.cell(
        stroke: (
          y: 0.5pt + black,
          x: (paint: black, thickness: 0.5pt, dash: "densely-dotted"),
        ) + top_border_stroke,
        " ",
      )
    }),
    grid.vline(stroke: (thickness: 0.5pt, dash: "solid")),
    grid.cell(stroke: (rest: 0.5pt + black) + top_border_stroke, align: center, fill: bg, text(fill: fill, weight: "bold", letter)),
    grid.cell(align: horizon + left, content),
  )
}

#let correction_title_grid(correction_width: 8em, input_width: 8em) = {
  grid(
    columns: (correction_width, input_width, 3.5em, 1fr),
    grid.cell(inset: 8pt, align(right, small_header_text[Oorspronkelijk])),
    grid.cell(inset: 8pt, align(right, small_header_text[Gecorrigeerd])),
    [],
    []
  )
}

// Mathematical addition layout
#let sum(..boxes, with_correction_title: false, sum_box) = {
  grid(
    rows: auto,
    ..cell_if(with_correction_title, correction_title_grid()),
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
  with_originals: false,
  explainer_text: none,
  break_count: (25, 25, 15, 15)
) = {
  // Counter that keeps track of the column number
  let column = 0

  // Number of rows in the column
  let column_row = 0

  // Row counter
  let rc = 0

  // Vote counter
  let votes = 0

  // Count for the original total column (if rendered)
  let original_total = 0

  // Max rows per table / column
  let total_rows = values.len()

  box[
    #box(inset: (bottom: 10pt), text(size: 14pt, weight: "semibold")[Lijst #title])
    #if explainer_text != none {
      box(width: 500pt, explainer_text)
    }
  ]

  set text(size: 8pt)

  columns(2, {
    while rc < total_rows {
      let rows_in_column = calc.min(break_count.at(column, default: 15), total_rows - rc)

      table(
        columns: (1fr, 2.5em) + if with_originals { (6em, 8em) } else { (8em,) },
        rows: (auto,) + range(0, rows_in_column).map(_ => 23pt) + (8pt, 23pt),
        inset: (x: 4pt, y: 8pt),
        stroke: 0.5pt + gray,
        fill: (_, y) => if y > 1 and calc.even(y) { luma(245) },
        table.hline(stroke: none),
        table.header(
          ..headers.enumerate().map(((idx, h)) => table.cell(stroke: none, align: bottom + if idx == 0 { left } else { right }, small_header_text(h)))
        ),
        table.hline(stroke: 1pt + black),
        ..while rc < total_rows {
          let c = values.at(rc)
          votes += c.votes
          let original_votes = 10;
          if with_originals {
            original_total += 10
          }
          rc += 1
          column_row += 1

          (
            table.cell(align: horizon, text(top-edge: 5pt, [#c.name])),
            table.cell(fill: luma(213), align: center + horizon, text(
              number-width: "tabular",
              weight: "bold",
              [#c.number],
            )),
            ..cell_if(with_originals, table.cell(inset: 8pt, fill: luma(213), align(right, prefilled_number(original_votes)))),
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
          table.cell(colspan: if with_originals { 4 } else { 3 }, stroke: (x: none), fill: white, inset: 0pt, []),
          if type(column_total) == function {
            table.cell(colspan: if with_originals { 4 } else { 3 }, fill: white, align: center, {
              // Increment the column counter
              column += 1

              // Caller defined render of column totals
              if with_originals {
                column_total(column, votes, original_total)
              } else {
                column_total(column, votes)
              }


              // Reset the votes per column counter
              votes = 0
              column_row = 0
              if with_originals {
                original_total = 0
              }
            })
          } else {
            table.cell(colspan: if with_originals { 4 } else { 3 }, fill: white, inset: 0pt, {
              column += 1

              grid(
                columns: (1fr,) + if with_originals { (6em, 8em) } else { (8em,) },
                grid.cell(inset: 9pt, align: center)[#column_total #column],
                ..cell_if(with_originals, grid.cell(inset: 8pt, fill: luma(213), align(right, prefilled_number(original_total)))),
                grid.vline(stroke: (paint: luma(213), dash: "densely-dotted")),
                grid.cell(empty_grid(cells: 4, paint: luma(213)), align: center, inset: 0pt),
              )

              votes = 0
              column_row = 0
              if with_originals {
                original_total = 0
              }
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
          place(top + left, scope: "parent", float: true, box[
            #box(inset: (bottom: 10pt), text(size: 14pt, weight: "semibold")[Vervolg lijst #title])
            #if explainer_text != none {
              box(width: 500pt, explainer_text)
            }
          ])
        }
      }
    }
  })

  align(bottom, grid(
    columns: (1fr,) + if with_originals { (6em, 8em) } else { (8em,) },
    align: (right, right),
    inset: 8pt,
    grid.cell(stroke: 0.5pt + black, align: right, fill: black, text(fill: white, sum_total(range(
      1,
      column + 1,
    )
      .map(str)
      .join(" + ")))),
    ..cell_if(with_originals, grid.cell(fill: luma(213), stroke: 0.5pt + black, prefilled_number(10))),
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
#let TODO(content)= {
  box(fill: red, inset: 2pt, text(fill: white, if content != none { [TODO: #content] } else { "TODO" }))
}
