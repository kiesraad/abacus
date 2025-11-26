#import "common/style.typ": conf, default_header, document_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-na-14-2.json")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.location]
#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#show: doc => conf(doc, header-right: location_name, footer: [
  #input.creation_date_time. Digitale vingerafdruk van EML-telbestand bij dit proces-verbaal (SHA-256): \
  #input.hash
])

#set heading(numbering: none)

#title_page(
  is_municipality[#input.election.domain_id #input.election.location][#input.election.location],
  is_municipality[Gemeentelijk stembureau][Stembureau voor het openbaar lichaam],
  [#input.election.name #format_date(input.election.election_date)],
  [
    Gecorrigeerde telresultaten per lijst en kandidaat –
    Model Na 14-2
  ],
)

== Details van het #location_type

#location_name

#input.committee_session.location #format_date_time(input.committee_session.start_date_time)

== Corrigendum

#is_municipality[Elke gemeente][Elk openbaar lichaam] maakt bij een verkiezing een verslag: het proces-verbaal. Hierin staat hoe het tellen van de stemmen is verlopen en wat de uitslag van de stemming was. In dat proces-verbaal kunnen fouten staan. Het corrigendum
corrigeert de fouten in het proces-verbaal. De aantallen in het corrigendum vervangen
de aantallen in het proces-verbaal.

#emph_block[
  Dit corrigendum gaat over onderzoeken en eventuele hertellingen. Ook staan hierin
  correcties op (tel)fouten die in eerdere verslagen zijn gevonden. Het #location_type heeft dit onderzoek gedaan op
  verzoek van het centraal stembureau. Het corrigendum wordt ingevuld door het #location_type.
]

== Inhoudsopgave

- Deel 1 - *Gecorrigeerde telresultaten* van #is_municipality[de hele gemeente][het hele openbaar lichaam]
- Deel 2 - *Ondertekening* door de leden van het #location_type

\

- Bijlage 1: Gecorrigeerde telresultaten van losse stembureaus (centrale stemopneming)

#pagebreak(weak: true)

#show: doc => document_numbering(doc)

= Gecorrigeerde telresultaten van #is_municipality[de gemeente][het openbaar lichaam]

Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere telling. Getallen die niet zijn
veranderd, hoeven niet ingevuld te worden in de kolom ‘gecorrigeerd'. Onder ‘oorspronkelijk’ staan de getallen
die in de eerste zitting door het #location_type zijn
vastgesteld.

== Aantal kiesgerechtigden

#letterbox("Z", value: input.committee_session.number_of_voters)[Kiesgerechtigden]

== Toegelaten kiezers
Het totaal van alle getelde geldige stempassen en volmachtbewijzen.
#sum(
  with_correction_title: true,
  letterbox("A", original_value: input.previous_summary.voters_counts.poll_card_count, value: input.summary.voters_counts.poll_card_count, bold_top_border: true, wide_cells: true)[Stempassen],
  letterbox("B", original_value: input.previous_summary.voters_counts.proxy_certificate_count, value: input.summary.voters_counts.proxy_certificate_count, wide_cells: true)[Volmachtbewijzen],
  letterbox("D", original_value: input.previous_summary.voters_counts.total_admitted_voters_count, value: input.summary.voters_counts.total_admitted_voters_count, wide_cells: true, light: false)[
    *Totaal toegelaten kiezers (A+B)*
  ]
)

#pagebreak(weak: true)

== Uitgebrachte stemmen <cast_votes>
Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere telling. Getallen die niet zijn veranderd, hoeven niet
ingevuld te worden in de kolom ‘gecorrigeerd'. Onder ‘oorspronkelijk’ staan de getallen die in de eerste zitting door het #location_type zijn vastgesteld.

#if input.votes_tables.len() > 0 [
  #sum(
    with_correction_title: true,
    sum(
      ..input.votes_tables.enumerate().map(((idx, list)) => {
        letterbox(original_value: list.previous_total, value: list.total, bold_top_border: idx == 0, [E.#list.number], wide_cells: true)[Totaal lijst #list.number - #list.name]
      }),
      letterbox(
        original_value: input.previous_summary.votes_counts.total_votes_candidates_count,
        value: input.summary.votes_counts.total_votes_candidates_count,
        "E",
        light: false,
        wide_cells: true
      )[*Totaal stemmen op kandidaten* (tel E.1 t/m E.#input.votes_tables.last().number op)],
    ),
    letterbox(original_value: input.previous_summary.votes_counts.blank_votes_count, value: input.summary.votes_counts.blank_votes_count, "F", wide_cells: true)[Blanco stemmen],
    letterbox(original_value: input.previous_summary.votes_counts.invalid_votes_count, value: input.summary.votes_counts.invalid_votes_count, "G", wide_cells: true)[Ongeldige stemmen],
    letterbox(
      original_value: input.previous_summary.votes_counts.total_votes_cast_count,
      value: input.summary.votes_counts.total_votes_cast_count,
      "H",
      light: false,
      wide_cells: true
    )[*Totaal uitgebrachte stemmen (E+F+G)*],
  )
]

#pagebreak(weak: true)

== Verschillen tussen aantal kiezers en uitgebrachte stemmen

=== Is bij *alle afzonderlijke stembureaus* in #is_municipality[deze gemeente][dit openbaar lichaam] het aantal uitgebrachte stemmen en het aantal toegelaten kiezers gelijk?

#let differences = input.summary.differences_counts.more_ballots_count.count > 0 or input.summary.differences_counts.fewer_ballots_count.count > 0

#checkbox(checked: not differences)[Ja, #sym.arrow.r Ga door naar #ref(<per_list_and_candidate>)]

#checkbox(checked: differences)[Nee, er zijn stembureaus met een verschil]

=== #if input.summary.differences_counts.more_ballots_count.count > 0 [Voor de stembureaus met de nummers #comma_list(input.summary.differences_counts.more_ballots_count.polling_stations)] else [In geen van de stembureaus] zijn er *méér* uitgebrachte stemmen dan toegelaten kiezers geteld. Noteer onder ‘gecorrigeerd' het nieuwe verschil.

#grid(
  rows: auto,
  correction_title_grid(),
  letterbox("I", original_value: input.previous_summary.differences_counts.more_ballots_count.count, value: input.summary.differences_counts.more_ballots_count.count, bold_top_border: true, wide_cells: true)[Totaal aantal méér getelde stemmen]
)

=== #if input.summary.differences_counts.fewer_ballots_count.count > 0 [Voor de stembureaus met de nummers #comma_list(input.summary.differences_counts.fewer_ballots_count.polling_stations)] else [In geen van de stembureaus] zijn er *minder* uitgebrachte stemmen dan toegelaten kiezers geteld. Noteer onder ‘gecorrigeerd' het nieuwe verschil.

#grid(
  rows: auto,
  correction_title_grid(),
  letterbox("J", original_value: input.previous_summary.differences_counts.fewer_ballots_count.count, value: input.summary.differences_counts.fewer_ballots_count.count, bold_top_border: true, wide_cells: true)[Totaal aantal minder getelde stemmen]
)

#pagebreak(weak: true)

== Stemmen per lijst en per kandidaat <per_list_and_candidate>

#for political_group in input.votes_tables {
  votes_table(
    title: [#political_group.number #political_group.name],
    headers: ("Kandidaat", "", "Oorspronkelijk", "Gecorrigeerd"),
    corrected_cells: 1,
    total: political_group.total,
    previous_total: political_group.previous_total,
    votes_columns: political_group.columns,
    continue_on_next_page: [#sym.arrow.r De lijst gaat verder op de volgende pagina],
    column_total: "Subtotaal kolom",
    sum_total: columns => [Totaal lijst (kolom #columns)],
    total_instruction: [Neem dit totaal over in rubriek #ref(<cast_votes>) van deze bijlage bij de juiste lijst.],
    explainer_text: [
      Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere telling. Getallen die niet zijn veranderd, hoeven niet ingevuld te worden in de kolom ‘gecorrigeerd'. Onder ‘oorspronkelijk’ staan de getallen die in de eerste zitting door het #location_type zijn vastgesteld.
    ],
  )
}

#show heading.where(level: 3): it =>[
    #block(it.body)
]

#pagebreak(weak: true)

#set page(header: "")

#emph_block[Deze pagina is expres leeg]

Zo komt het handtekeningen-blad altijd op een losse pagina, ook als het verslag dubbelzijdig is geprint.

#pagebreak(weak: true)

#set page(header: default_header(none, location_name))

= Ondertekening

=== Datum

#textbox[Datum en tijd:][Plaats:]

== Verplicht: voorzitter en #is_municipality[twee][vier] leden van het #location_type

=== Voorzitter van het #location_type:

#textbox[Naam:][Handtekening:]

=== #is_municipality[Twee][Vier] leden van het #location_type:

#stack(spacing: 0.5em, ..range(0, is_municipality(2, 4)).map(_ => textbox[Naam:][Handtekening:]))

== Ondertekening door andere aanwezige leden van het #location_type

=== Extra ondertekening: (niet verplicht)

#stack(spacing: 0.5em, ..range(0, is_municipality(3, 1)).map(_ => textbox[Naam:][Handtekening:]))

#pagebreak(weak: true)

#stack(spacing: 0.5em, ..range(0, 12).map(_ => textbox[Naam:][Handtekening:]))
