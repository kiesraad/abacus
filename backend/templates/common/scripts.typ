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

#let truncate(text, max_width) = context {
  let ell = "…"

  if measure(text).width <= max_width {
    return text
  }

  let codepoints = text.codepoints()

  let lo = 0
  let hi = codepoints.len()

  while lo < hi {
    let mid = calc.floor((lo + hi) / 2)
    let cand = codepoints.slice(0, mid).join("") + ell
    if measure(cand).width <= max_width {
      lo = mid + 1
    } else {
      hi = mid
    }
  }

  let cut = calc.max(0, lo - 1)

  codepoints.slice(0, cut).join("") + ell
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

/// Format a list of items with comma separation, or return - if empty
#let comma_list(items, empty: "-") = {
  if items.len() == 0 {
    return empty
  }

  items.map(str).join(", ")
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

#let empty_letterbox(letter, cells: 5, light: true, original_value: none, value: none, bold_top_border: false, wide_cells: false, content) = {
  let bg_grey = luma(213)
  let bg = if light { bg_grey } else { black }
  let fill = if light { black } else { white }
  let cell_width = range(0, cells).map(_ => if wide_cells { 8em } else { 2em })
  let total_cell_width = cell_width.sum()
  let additional_width = (3.5em, 1fr)
  let grid_columns = if original_value != none {
    (total_cell_width,) + cell_width + additional_width
  } else {
    cell_width + additional_width
  }
  let top_border_stroke = if bold_top_border {
    (top: (thickness: 1.5pt, paint: black, cap: "butt", join: "miter"))
  } else {
    (top: (thickness: 0.5pt, paint: black))
  }

  if cells != 1 and value != none {
    error("empty_letterbox: 'value' can only be set when 'cells' is 1")
  }

  // Ignore the value if it is the same as the original value
  if original_value != none and value != none and value == original_value {
    value = none
  }

  grid(
    inset: 9pt,
    columns: grid_columns,
    align: (center, right),
    grid.vline(stroke: (thickness: 0.5pt, dash: "solid")),
    ..cell_if(original_value != none, (
      grid.cell(stroke: (rest: 0.5pt + black) + top_border_stroke, align: right, fill: bg_grey, prefilled_number(original_value)),
      grid.vline(stroke: (thickness: 0.5pt, dash: "solid"))
    )),
    ..range(0, cells).enumerate().map(cell => {
      let (index, c) = cell;
      grid.cell(
        align: right,
        stroke: (
          y: 0.5pt + black,
          x: (paint: black, thickness: 0.5pt, dash: "densely-dotted"),
        ) + top_border_stroke,
        if value != none { prefilled_number(value) } else { " " }
      )
    }),
    grid.vline(stroke: (thickness: 0.5pt, dash: "solid")),
    grid.cell(stroke: (rest: 0.5pt + black) + top_border_stroke, align: center, fill: bg, text(fill: fill, weight: "bold", letter)),
    grid.cell(align: horizon + left, content),
  )
}

/// Display a box with a prefixed label and a value
#let letterbox(letter, original_value: none, value: none, light: true, bold_top_border: false, wide_cells: true, content) = {
  empty_letterbox(
    letter,
    cells: 1,
    light: light,
    value: value,
    original_value: original_value,
    bold_top_border: bold_top_border,
    wide_cells: wide_cells,
    content
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

// Default date formatting (input YYYY-MM-DD)
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

// Default date time formatting (input YYYY-MM-DDThh:mm:ss)
#let format_date_time(date_time) = {
  let dt = date_time.split("T")
  let date = dt.at(0)
  let time = dt.at(1)

  format_date(date)
  " "
  time.slice(0, 5)
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
  let name = ""

  if election_candidate == none {
    return name
  }

  if "last_name_prefix" in election_candidate {
    name += election_candidate.last_name_prefix + " "
  }

  name += election_candidate.last_name + ", " + election_candidate.initials + " "
  
  if "first_name" in election_candidate {
    name += "(" + election_candidate.first_name + ") "
  }

  if "gender" in election_candidate {
    if election_candidate.gender == "Male" {
      name += "(m)"
    } else if election_candidate.gender == "Female" {
      name += "(v)"
    } else if election_candidate.gender == "X" {
      name += "(x)"
    }
  }

  name.trim()
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

// Table with empty lines
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

// Text area with given content
#let text_area_with_content(content) = {
  block(
    width: 100%,
    box(
      inset: (x: 16pt, y: 16pt),
      stroke: (
        top: 1pt + black,
        y: 0.25pt + black,
      ),
      fill: rgb("#E7EEF9"),
      width: 1fr,
      block(width: 75%, content)
    )
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
  total: none,
  previous_total: none,
  votes_columns: (),
  continue_on_next_page: "",
  corrected_cells: 4,
  column_total: (c, v) => [#c: #v],
  column_total_with_border: true,
  sum_total: [(#columns)],
  total_instruction: "",
  explainer_text: none,
) = {
  let with_previous_votes = previous_total != none

  // Counter that keeps track of the column number
  let column_index = 0;

  box[
    #box(inset: (bottom: 10pt), text(size: 14pt, weight: "semibold")[Lijst #title])
    #if explainer_text != none {
      box(width: 500pt, explainer_text)
    }
  ]

  set text(size: 8pt)

  columns(2, {
    for column in votes_columns {
      // Increment the column counter
      column_index += 1

      table(
        columns: (1fr, 2.5em) + if with_previous_votes { (6em, 8em) } else { (8em,) },
        rows: (auto,) + range(0, column.votes.len()).map(_ => 23pt) + (8pt, 23pt),
        inset: (x: 4pt, y: 8pt),
        stroke: 0.5pt + gray,
        fill: (_, y) => if y > 1 and calc.even(y) { luma(245) },
        table.hline(stroke: none),
        table.header(
          ..headers.enumerate().map(((idx, h)) => table.cell(stroke: none, align: bottom + if idx == 0 { left } else { right }, small_header_text(h)))
        ),
        table.hline(stroke: 1pt + black),
        ..for cv in column.votes {
          let previous_votes = if with_previous_votes { cv.previous_votes } else { none }


          (
            table.cell(align: horizon, text(top-edge: 5pt, size: 7pt, hyphenate: true, truncate(candidate_name(cv.candidate), 280pt))),
            table.cell(fill: luma(213), align: center + horizon, text(
              number-width: "tabular",
              weight: "bold",
              [#cv.candidate.number],
            )),
            ..cell_if(with_previous_votes, table.cell(inset: 8pt, fill: luma(213), align(right, prefilled_number(previous_votes, zero: if with_previous_votes and previous_votes == 0 { "-" } else { "0" })))),
            if cv.votes == none {
              table.cell(inset: 1pt, empty_grid(cells: corrected_cells, paint: luma(213)))
            } else {
              table.cell(
                align: right + horizon,
                text(number-width: "tabular",
                  if not with_previous_votes {
                    fmt-number(cv.votes, zero: "-")
                  } else {
                    if previous_votes != cv.votes {
                      fmt-number(cv.votes, zero: "0")
                    } else {
                      " "
                    }
                  }
                )
              )
            },
          )
        }.flatten(),
        table.hline(stroke: 1pt + black),
        table.footer(
          // Empty line
          table.cell(colspan: if with_previous_votes { 4 } else { 3 }, stroke: (x: none), fill: white, inset: 0pt, []),
          if type(column_total) == function {
            table.cell(colspan: if with_previous_votes { 4 } else { 3 }, fill: white, align: center, {
              // Caller defined render of column totals
              if with_previous_votes {
                column_total(column_index, column.column_total, column.previous_column_total)
              } else {
                column_total(column_index, column.column_total)
              }
            })
          } else {
            let previous_column_total = if with_previous_votes { column.previous_column_total } else { none }

            table.cell(colspan: if with_previous_votes { 4 } else { 3 }, fill: white, inset: 0pt, {
              grid(
                columns: (1fr,) + if with_previous_votes { (6em, 8em) } else { (8em,) },
                grid.cell(inset: 9pt, align: center)[#column_total #column_index#if not column_total_with_border { ":" }],
                ..cell_if(with_previous_votes, grid.cell(inset: 8pt, fill: luma(213), align(right, prefilled_number(previous_column_total)))),
                grid.vline(stroke: (thickness: if column_total_with_border { 1pt } else { 0pt }, paint: luma(213), dash: "densely-dotted")),
                grid.cell(if column.column_total != none and (not with_previous_votes or column.column_total != column.previous_column_total) { grid.cell(inset: 4pt, align(right + horizon, prefilled_number(column.column_total))) } else { empty_grid(cells: corrected_cells, paint: luma(213)) }, align: center, inset: 0pt),
              )
            })
          },
        ),
      )

      if column_index < votes_columns.len() {
        if (calc.even(column_index)) {
          v(8pt)
          align(right, text(weight: "bold", continue_on_next_page))
        }

        colbreak()

        if (column_index == 2) {
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
    columns: (1fr,) + if with_previous_votes { (6em, 8em) } else { (8em,) },
    align: (right, right),
    inset: 8pt,
    grid.cell(stroke: 0.5pt + black, align: right, fill: black, text(fill: white, sum_total(range(
      1,
      column_index + 1,
    )
      .map(str)
      .join(" + ")))),
    ..cell_if(with_previous_votes, grid.cell(fill: luma(213), stroke: 0.5pt + black, prefilled_number(previous_total))),
    if total == none {
      grid.cell(stroke: 0.5pt + black, inset: 0pt, empty_grid(cells: 5, thickness: 0.5pt))
    } else {
      grid.cell(stroke: 0.5pt + black, if not with_previous_votes or previous_total != total { fmt-number(total, zero: "0") } else { " " })
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
