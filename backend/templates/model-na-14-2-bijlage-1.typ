#import "common/style.typ": attachment_numbering, conf
#import "common/scripts.typ": *
#let input = json("inputs/model-na-14-2-bijlage-1-variations/model-na-14-2-bijlage-1-GR.json")

#let is_municipality = (municipal, public_body) => is_municipality(input.election.location, municipal, public_body)
#let is_local_election = (local, other) => is_local_election(input.election.category, local, other)
#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.location]
#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#show: doc => conf(
  doc,
  header-left: [
    Bijlage 1
  ],
  header-right: [
    #location_name \
    Stembureau #input.polling_station.number
  ],
  footer: [
    Corrigendum van een #location_type \
    Model Na 14-2 (versie 2027)
  ]
)

= Bijlage 1

#attachment_or_corrigendum_title([Verslagen van tellingen van stembureaus die zijn herteld door het #location_type])

_Let op! Alleen voor #is_municipality[gemeenten][openbare lichamen] waar een centrale stemopneming heeft
plaatsgevonden. De bijlagen worden separaat gepubliceerd bij het betreffende stembureau._

#pagebreak(weak: true)

#attachment_or_corrigendum_title([Stembureau #input.polling_station.number\ #input.polling_station.name])

== Over deze bijlage

Het #location_type heeft de telresultaten van dit stembureau onderzocht en is tot een ander resultaat gekomen. De nieuwe telresultaten van het stembureau zijn opgenomen in deze bijlage. Deze bijlage is bij het proces-verbaal van het stembureau gevoegd.

#show: doc => attachment_numbering(doc, "B1")

= Aanleiding en opdracht onderzoek

Geef aan *waarom* de resultaten van dit stembureau zijn onderzocht. Denk bijvoorbeeld
aan een onverklaard telverschil, een andere (vermoeden van een) fout of een bezwaar.
Als het onderzoek heeft plaatsgevonden in opdracht van het centraal stembureau, schrijf
dit dan op. Schrijf zo concreet mogelijk op wat de opdracht van het centraal stembureau
is. Bijvoorbeeld: hertel de stembiljetten van lijst 12.

==== Aanleiding van het onderzoek

#text_area_with_content(input.investigation.reason)

#block(below: 3em)

Schrijf op wat de *uitkomst* van het onderzoek door het #location_type was.

==== Bevindingen
#empty_lines(10)

#block(below: 1.5em)

#block(
  breakable: false,
  {
    [Heeft het onderzoek geleid tot een *gecorrigeerde uitslag*?]
    checkbox[Nee #sym.arrow.r *Neem de uitkomst van het onderzoek over in het proces-verbaal van het #location_type (nieuwe zitting). Deze bijlage hoeft verder niet ingevuld te worden.*]
    checkbox[Ja #sym.arrow.r *Ga verder met B1 - #ref(<corrected_results>)*]
  }
)

#pagebreak(weak: true)

= Gecorrigeerde telresultaten <corrected_results>

#emph_block[
  Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere
  telling. Getallen die niet zijn veranderd, hoeven niet ingevuld te worden in de
  kolom ‘gecorrigeerd’. Onder ‘oorspronkelijk’ staan de getallen die in een eerdere
  zitting door het #location_type zijn vastgesteld.
]

== Toegelaten kiezers

#if not is_local_election(true, false) and "voter_card_count" in input.previous_results.voters_counts [
  Het totaal van alle getelde geldige stempassen, volmachtbewijzen en kiezerspassen

  #sum(
    with_correction_title: true,
    empty_letterbox("A", cells: 4, original_value: input.previous_results.voters_counts.poll_card_count, bold_top_border: true)[Stempassen],
    empty_letterbox("B", cells: 4, original_value: input.previous_results.voters_counts.proxy_certificate_count)[Volmachtbewijzen (schriftelijk of via ingevulde achterkant stempas of kiezerspas)],
    empty_letterbox("C", cells: 4, original_value: input.previous_results.voters_counts.voter_card_count)[Kiezerspassen],
    empty_letterbox("D", cells: 4, original_value: input.previous_results.voters_counts.total_admitted_voters_count, light: false)[
      *Totaal toegelaten kiezers (A+B+C)*
    ]
  )
] else [
  Het totaal van alle getelde geldige stempassen en volmachtbewijzen

  #sum(
    with_correction_title: true,
    empty_letterbox("A", cells: 4, original_value: input.previous_results.voters_counts.poll_card_count, bold_top_border: true)[Stempassen],
    empty_letterbox("B", cells: 4, original_value: input.previous_results.voters_counts.proxy_certificate_count)[Volmachtbewijzen (schriftelijk of via ingevulde achterkant stempas)],
    no_entry_letterbox("C", cells: 4, with_original: true)[Kiezerspassen (niet van toepassing bij gemeente- en eilandraadsverkiezingen)],
    empty_letterbox("D", cells: 4, original_value: input.previous_results.voters_counts.total_admitted_voters_count, light: false)[
      *Totaal toegelaten kiezers (A+B)*
    ]
  )
]

#pagebreak(weak: true)

== Uitgebrachte stemmen <cast_votes>

Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere telling. Getallen die niet zijn veranderd, hoeven niet
ingevuld te worden in de kolom ‘gecorrigeerd’. Onder ‘oorspronkelijk’ staan de getallen die in een eerdere zitting door het #location_type zijn vastgesteld.

#if input.votes_tables.len() > 0 [
  #sum(
    with_correction_title: true,
    sum(
      ..input.votes_tables.enumerate().map(((idx, list)) => {
        let votes = input.previous_results.votes_counts.political_group_total_votes.find(v => v.number == list.number)
        if votes == none {
          return
        }
        empty_letterbox(cells: 4, original_value: votes.total, bold_top_border: idx == 0, [E.#list.number])[Totaal lijst #list.number - #list.name]
      }),
      empty_letterbox(
        cells: 4,
        original_value: input.previous_results.votes_counts.total_votes_candidates_count,
        "E",
        light: false,
      )[*Totaal stemmen op kandidaten* (tel E.1 t/m E.#input.votes_tables.last().number op)],
    ),
    empty_letterbox(cells: 4, original_value: input.previous_results.votes_counts.blank_votes_count, "F")[Blanco stemmen],
    empty_letterbox(cells: 4, original_value: input.previous_results.votes_counts.invalid_votes_count, "G")[Ongeldige stemmen],
    empty_letterbox(
      cells: 4,
      original_value: input.previous_results.votes_counts.total_votes_cast_count,
      "H",
      light: false,
    )[*Totaal uitgebrachte stemmen (E+F+G)*],
  )
]

#pagebreak(weak: true)

== Verschillen tussen aantal kiezers en uitgebrachte stemmen

Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere telling. Getallen die niet zijn veranderd, hoeven niet
ingevuld te worden in de kolom ‘gecorrigeerd’. Onder ‘oorspronkelijk’ staan de getallen die in een eerdere zitting door het #location_type zijn vastgesteld. Is het getal bij I én J gewijzigd? Vul dan
bij beiden het gecorrigeerde getal in. Vink alléén het selectievakje aan dat van toepassing is.

=== Vergelijk D (totaal toegelaten kiezers) en H (totaal uitgebrachte stemmen)

#checkbox[D en H zijn *gelijk* #sym.arrow.r *Ga door naar #ref(<per_list_and_candidate>)*]

#checkbox[H is *groter* dan D (meer uitgebrachte stemmen dan toegelaten kiezers)]
#box(width: 500pt, inset: (left: 3em, bottom: 1em))[
    #grid(
      correction_title_grid(correction_width: 6em, input_width: 6em),
      empty_letterbox(cells: 3, original_value: input.previous_results.differences_counts.more_ballots_count, light: false, "I")[Aantal méér getelde stemmen (bereken: H _min_ D)],
    )
]

#checkbox[H is *kleiner* dan D (minder uitgebrachte stemmen dan toegelaten kiezers)]
#box(width: 500pt, inset: (left: 3em, bottom: 1em))[
  #grid(
    correction_title_grid(correction_width: 6em, input_width: 6em),
    empty_letterbox(cells: 3, original_value: input.previous_results.differences_counts.fewer_ballots_count, light: false, "J")[Aantal minder getelde stemmen (bereken: D _min_ H)]
  )
]

=== Zijn er tijdens de stemming dingen opgeschreven die het bovenstaande verschil tussen D en H volledig verklaren?

(Gebruik het proces-verbaal van het stembureau #sym.arrow.r *Tijdens de stemming, vraag 1.2.2*)

#checkbox[Ja]
#checkbox[Nee, er is een onverklaard verschil]

#pagebreak(weak: true)

== Stemmen per lijst en per kandidaat <per_list_and_candidate>

Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere telling. Getallen die niet zijn veranderd, hoeven niet ingevuld te worden in de kolom ‘gecorrigeerd’. Onder ‘oorspronkelijk’ staan de getallen die in een eerdere zitting door het #location_type zijn vastgesteld.

#pagebreak(weak: true)

#for political_group in input.votes_tables {
  votes_table(
    title: [#political_group.number #political_group.name],
    headers: ("Kandidaat", "", "Oorspronkelijk", "Gecorrigeerd"),
    total: political_group.total,
    previous_total: political_group.previous_total,
    votes_columns: political_group.columns,
    continue_on_next_page: [#sym.arrow.r De lijst gaat verder op de volgende pagina],
    column_total: "Subtotaal kolom",
    sum_total: columns => [Totaal lijst (kolom #columns)],
    total_instruction: [Neem dit totaal over in rubriek #ref(<cast_votes>) van deze bijlage bij de juiste lijst.],
    explainer_text: [Vul alléén de getallen in die veranderd zijn ten opzichte van de oorspronkelijke telling.]
  )
}
