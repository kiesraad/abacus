#import "./style.typ": mono

/// Display a box that alerts the user to a separate section
#let alertbox(content, height: auto) = {
  rect(width: 100%, height: height, inset: 10pt, stroke: 0.5pt + black)[
    #text[#content]
  ]
}

/// Display a checkmark for usage in a checkbox
#let checkmark() = {
  box(width: 6pt, height: 6pt, clip: true)[
    #path(
      stroke: black,
      closed: false,
      (0%, 50%),
      (40%, 90%),
      (100%, 0%),
    )
  ]
}

/// Display a checkbox, optionally already checked when the `checked` parameter is set to `true`
#let checkbox(checked: false) = {
  box(width: 9pt, height: 9pt, inset: 1.5pt, stroke: color.black, clip: true,
    if checked {
      checkmark()
    }
  )
}

/// Display a 'bucket' input field (a field with borders at the bottom, left and right)
#let bucket_input(field_count, output: none) = {
  let output = if output == none { "" } else { output }
  let output_size = output.len()
  let diff = field_count - output_size
  let padding = range(0, diff).map(_ => " ").join("")
  let output = padding + output
  block(
    grid(columns: range(0, field_count).map(_ => 12pt), rows: 9pt, ..range(0, field_count).map(idx =>
      grid.cell(stroke: (bottom: 0.5pt + color.black, left: 0.5pt + color.black, right: 0.5pt + color.black), inset: (left: 3pt, right: 3pt, top: 1pt, bottom: 3pt), mono[#output.at(idx, default: "")])
    ))
  )
}

/// Display an input field for a date, optionally specifying a prefilled date
#let date_input(date: none, day: none, month: none, year: none, label: none, top_label: ()) = {
  // if a date is specified, separate out the components of the date
  if date != none and date.trim() != "" {
    let dp = date.split("-");
    // handle both dd-mm-jjjj and jjjj-mm-dd
    if dp.at(0).len() == 4 {
      dp = dp.rev()
    }
    date_input(day: dp.at(0, default: none), month: dp.at(1, default: none), year: dp.at(2, default: none), label: label, top_label: top_label)
  } else {
    // show top label if it's some visible content, or an array of two elements for each separate field
    let show_top_labels = type(top_label) == str or type(top_label) == content or (type(top_label) == array and top_label.len() == 3)
    // show side label if it's some visible content
    let show_side_label = label != "" and label != none
    let columns = if show_side_label { 6 } else { 5 }
    let rows = if show_top_labels { 2 } else { 1 }

    grid(columns: columns, rows: rows, row-gutter: 5pt, column-gutter: 2pt,
      ..if show_top_labels {
        if type(top_label) == str or type(top_label) == content {
          (grid.cell(colspan: columns, align(center, text(size: 8pt, top_label))),)
        } else {
          (
            grid.cell(align(center, text(size: 8pt, top_label.at(0)))),
            grid.cell()[],
            grid.cell(align(center, text(size: 8pt, top_label.at(1)))),
            grid.cell()[],
            grid.cell(align(center, text(size: 8pt, top_label.at(2)))),
            ..if show_side_label {
              (grid.cell()[],)
            }
          )
        }
      },
      grid.cell(bucket_input(2, output: day)),
      grid.cell()[-],
      grid.cell(bucket_input(2, output: month)),
      grid.cell()[-],
      grid.cell(bucket_input(4, output: year)),
      if show_side_label {
        grid.cell(label)
      },
    )
  }
}

/// Display an input field for a time, optionally specifying a prefilled time
#let time_input(time: none, hour: none, minute: none, label: none, top_label: ()) = {
  if time != none and time.trim() != "" {
    let tp = time.split(":")
    time_input(hour: tp.at(0, default: none), minute: tp.at(1, default: none), label: label, top_label: top_label)
  } else {
    // show top label if it's some visible content, or an array of two elements for each separate field
    let show_top_labels = type(top_label) == str or type(top_label) == content or (type(top_label) == array and top_label.len() == 2)
    // show side label if it's some visible content
    let show_side_label = label != ""
    let columns = if show_side_label { 4 } else { 3 }
    let rows = if show_top_labels { 2 } else { 1 }

    grid(columns: columns, rows: rows, row-gutter: 5pt, column-gutter: 2pt,
      ..if show_top_labels {
        if type(top_label) == str or type(top_label) == content {
          (grid.cell(colspan: columns, align(center, text(size: 8pt, top_label))),)
        } else {
          (
            grid.cell(align(center, text(size: 8pt, top_label.at(0)))),
            grid.cell()[],
            grid.cell(align(center, text(size: 8pt, top_label.at(1)))),
            ..if show_side_label {
              (grid.cell()[],)
            }
          )
        }
      },
      grid.cell(bucket_input(2, output: hour)),
      grid.cell()[:],
      grid.cell(bucket_input(2, output: minute)),
      if show_side_label {
        grid.cell(label)
      },
    )
  }
}

/// Display some content with a checkbox in front of it
#let block_with_checkbox(checked: false, content) = {
  stack(dir: ltr, spacing: 0pt, checkbox(checked: checked), block(inset: (left: 10pt, right: 5pt))[#content])
}

/// Display a box with a prefixed label and a value
#let letterbox = (letter, value, fill: gray, text_color: black, height: auto) => {
  grid(columns: (2em, 1fr), rows: (height,), align: (center, right), stroke: 0.5pt + black, inset: 9pt, grid.cell(fill: fill, text(fill: text_color)[*#letter*]), value)
}

/// Display a box with a prefixed label and a value, with extra emphasis on the label
#let letterbox_main = (letter, value, fill: black, text_color: white, height: auto) => {
  letterbox(letter, value, fill: fill, text_color: text_color, height: height)
}

/// Display a table with a summary of counts
#let summary_table(rows, added_together: none, total: none) = {
  grid(
    columns: (70%, 1fr, 30pt),
    rows: 5,
    column-gutter: 10pt,
    row-gutter: 5pt,
    ..rows.map(((label, letter, value)) => {
      return (
        grid.cell(box(inset: 9pt, stroke: 0.5pt + black, width: 100%, text(size: 8pt)[#label])),
        grid.cell(letterbox(letter, value)),
        grid.cell()[],
      )
    }).flatten(),
    ..if added_together != none {(
      [], grid.cell(align: horizon, line(length: 100%, stroke: 0.5pt + black)), text(size: 8pt, added_together),
    )},
    .. if total != none {(
      grid.cell(align: right + horizon)[
        *#total.at(0)*
      ], letterbox_main([#total.at(1)], [#total.at(2)]), [],
    )}
  )
}

#let text_input(empty_width: 60pt, value: none) = {
  box(
    baseline: 1pt,
    stroke: (bottom: 0.5pt + black),
    width: if value == none { empty_width } else { auto },
    inset: (bottom: 1pt, x: 10pt),
    align(center, mono(value))
  )
}

#let format_date(date) = {
  let dp = date.split("-")
  let date = datetime(year: int(dp.at(0)), month: int(dp.at(1)), day: int(dp.at(2)))
  date.display("[day]-[month]-[year]")
}

/// Display a TODO label
#let TODO = {
    box(fill: red, stroke: black, inset: 2pt)[#text(fill: white, size: 6pt)[*TODO*]]
}
