#import "./style.typ": mono

#let emph_block(content) = {
  block(
    above: 3em,
    below: 3em,
    outset: (left: 6pt, top: 3pt, bottom: 3pt),
    stroke: (left: 1pt),
    text(size: 10pt, content),
  )
}

#let textbox(content) = {
  rect(width: 100%, height: 6em, inset: 1em, stroke: 0.5pt, content)
}

/// Display a checkmark for usage in a checkbox
#let checkmark() = {
  box(width: 8pt, height: 8pt, clip: true)[
    #curve(
      stroke: black,
      curve.move((0%, 50%)),
      curve.line((40%, 90%)),
      curve.line((100%, 0%)),
    )
  ]
}

/// Display a checkbox, optionally already checked when the `checked` parameter is set to `true`
#let checkbox(checked: false, large: true, content) = {
  let size = if large { 14pt } else { 10pt }

  grid(
    columns: (size + 6pt, auto),
    align: horizon,
    box(
      width: size,
      height: size,
      inset: 3pt,
      stroke: 0.5pt,
      clip: true,
      if checked {
        checkmark()
      },
    ),
    content,
  )
}

/// Display a box with a prefixed label and a value
#let letterbox = (letter, light: true, value, content) => {
  let bg = if light { luma(221) } else { black }
  let fill = if light { black } else { white }

  grid(
    columns: (8em, 4em, 1fr),
    align: (center, right),
    inset: 9pt,
    grid.cell(align: right, stroke: 0.5pt + black, text(number-width: "tabular", value)),
    grid.cell(stroke: 0.5pt + black, align: center, fill: bg, text(fill: fill, [*#letter*])),
    grid.cell(align: horizon + left, content),
  )
}

#let sum = (..boxes, sum_box) => [
  #grid(
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
]

#let format_date(date) = {
  let dp = date.split("-")
  let date = datetime(year: int(dp.at(0)), month: int(dp.at(1)), day: int(dp.at(2)))
  date.display("[day]-[month]-[year]")
}

#let light_table(columns: (), headers: (), values: ()) = {
  table(
    columns: columns,
    stroke: (
      y: 0.25pt + black,
      x: (paint: black, thickness: 0.25pt, dash: "densely-dotted"),
    ),
    inset: (x: 4pt, y: 8pt),
    table.vline(stroke: none),
    table.header(
      ..headers.map(value => {
        table.cell(stroke: none, align: bottom, text(size: 8pt, weight: "semibold", value))
      }),
    ),
    table.hline(stroke: 1pt + black),
    ..values.map(value => {
      table.cell(align: horizon, value)
    }),
    table.vline(stroke: none),
  )
}

#let empty_table(columns: (), headers: (), values: (), rows: 0) = {
  light_table(
    columns: columns,
    headers: headers,
    values: range(0, rows)
      .map(_ => {
        (
          ..values.map(value => {
            align(center, value)
          }),
        )
      })
      .flatten(),
  )
}

/// Display a TODO label
#let TODO = {
  box(fill: red, stroke: black, inset: 2pt)[#text(fill: white, size: 6pt)[*TODO*]]
}
