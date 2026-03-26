#import "common/style.typ": attachment_numbering, conf
#import "common/scripts.typ": *
#let input = json("inputs/model-p-22-2-bijlage1.json")

#let location_type = [centraal stembureau]

#show: doc => conf(
  doc,
  header-left: [
    Bijlage 1
  ],
  header-right: [Centraal stembureau #input.election.location],
  footer: [
    Proces-verbaal van het #location_type\
    Model P 22-2

    Datum: #input.creation_date_time - SHA-256-Hashcode: \
    #input.hash
  ],
  margin-bottom: 3.2cm
)

= Bijlage 1

= Stemmen per lijst en per kandidaat

#line(length: 100%)

#pagebreak(weak: true)

#for political_group in input.votes_tables {
  votes_table(
    title: [#political_group.number #political_group.name],
    headers: ("Kandidaat", "", "Stemmen"),
    total: political_group.total,
    votes_columns: political_group.columns,
    continue_on_next_page: [#sym.arrow.r De lijst gaat verder op de volgende pagina],
    column_total: "Subtotaal kolom",
    column_total_with_border: false,
    sum_total: columns => [Totaal lijst (kolom #columns)],
  )
}
