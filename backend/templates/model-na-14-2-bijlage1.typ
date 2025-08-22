#import "common/style.typ": conf, document_numbering, attachement_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-na-14-2-bijlage1.json")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#show: doc => conf(doc, header: align(right, [
  Gemeente #input.election.domain_id #input.election.location \
  Stembureau #input.polling_station.number
]), footer: [
  Corrigendum van een #location_type \
  Model Na 14-2
])

= Bijlage 1

== Verslagen van tellingen van stembureaus die zijn herteld door het #location_type

#pagebreak(weak: true)

= Stembureau #input.polling_station.number \ #input.polling_station.name

#line(length: 100%)

== Over deze bijlage

Het #location_type heeft de telresultaten van dit stembureau onderzocht en is tot een ander resultaat gekomen. De nieuwe telresultaten van het stembureau zijn opgenomen in deze bijlage. Deze bijlage is bij het proces-verbaal van het stembureau gevoegd.

#show: doc => attachement_numbering(doc, "B1")

= Aanleiding en opdracht onderzoek

Geef aan *waarom* de resultaten van dit stembureau zijn onderzocht. Denk bijvoorbeeld aan een onverklaard telverschil, of een bezwaar. Schrijf ook op wat er in *opdracht* van het centraal stembureau is onderzocht. Bijvoorbeeld: hertel de stembiljetten van lijst 12.

==== Aanleiding en opdracht van het centraal stembureau
#empty_lines(5)

Schrijf op wat de *uitkomst* van het onderzoek door het #location_type was.

==== Bevindingen
#empty_lines(5)

Is er een *gecorrigeerde uitslag*?

#checkbox[Nee #sym.arrow.long.r *Neem de uitkomst van het onderzoek over in het proces-verbaal van het #location_type (nieuwe zitting). Deze bijlage hoeft verder niet ingevuld te worden.*]

#checkbox[Ja #sym.arrow.long.r *Ga verder met B1 - #ref(<corrected_results>)*]

#pagebreak(weak: true)

= Gecorrigeerde telresultaten <corrected_results>

#emph_block[
  Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere
  telling. Getallen die niet zijn veranderd, hoeven niet ingevuld te worden in de
  kolom ‘gecorrigeerd'. Onder ‘oorspronkelijk’ staan de getallen die in de eerste
  zitting door het #location_type zijn vastgesteld.
]

== Toegelaten kiezers

Het totaal van alle getelde geldige stempassen en volmachtbewijzen

#sum(
  with_correction_title: true,
  empty_letterbox("A", cells: 4, original: 10, bold_top_border: true)[Stempassen],
  empty_letterbox("B", cells: 4, original: 10)[Volmachtbewijzen],
  empty_letterbox("D", cells: 4, original: 10, light: false)[
    *Totaal toegelaten kiezers (A+B)*
  ]
)

#pagebreak(weak: true)

== Uitgebrachte stemmen <cast_votes>

Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere telling. Getallen die niet zijn veranderd, hoeven niet
ingevuld te worden in de kolom ‘gecorrigeerd'. Onder ‘oorspronkelijk’ staan de getallen die in de eerste zitting door het #location_type zijn vastgesteld.

#if input.election.political_groups.len() > 0 [
  #sum(
    with_correction_title: true,
    sum(
      ..input.election.political_groups.enumerate().map(((idx, list)) => {
        empty_letterbox(cells: 4, original: 10, bold_top_border: idx == 0, [E.#list.number])[Totaal lijst #list.number - #list.name]
      }),
      empty_letterbox(
        cells: 4,
        original: 10,
        "E",
        light: false,
      )[*Totaal stemmen op kandidaten* (tel E.1 t/m E.#input.election.political_groups.last().number op)],
    ),
    empty_letterbox(cells: 4, original: 10, "F")[Blanco stemmen],
    empty_letterbox(cells: 4, original: 10, "G")[Ongeldige stemmen],
    empty_letterbox(
      cells: 4,
      original: 10,
      "H",
      light: false,
    )[*Totaal uitgebrachte stemmen (E+F+G)*],
  )
]

#pagebreak(weak: true)

== Verschillen tussen aantal kiezers en uitgebrachte stemmen

Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere telling. Getallen die niet zijn veranderd, hoeven niet
ingevuld te worden in de kolom ‘gecorrigeerd'. Onder ‘oorspronkelijk’ staan de getallen die in de eerste zitting door het #location_type zijn vastgesteld.

=== Vergelijk D (totaal toegelaten kiezers) en H (totaal uitgebrachte stemmen)

#checkbox[D en H zijn gelijk #sym.arrow.long.r Ga door naar B1 - #ref(<per_list_and_candidate>)]

#checkbox[H is groter dan D (meer uitgebrachte stemmen dan toegelaten kiezers)]
#box(width: 500pt, inset: (left: 3em, bottom: 1em))[
    #grid(
      correction_title_grid(correction_width: 6em, input_width: 6em),
      empty_letterbox(cells: 3, original: 10, light: false, "I")[Aantal méér getelde stemmen (bereken: H _min_ D)],
    )
]

#checkbox[H is kleiner dan D (minder uitgebrachte stemmen dan toegelaten kiezers)]
#box(width: 500pt, inset: (left: 3em, bottom: 1em))[
  #grid(
    correction_title_grid(correction_width: 6em, input_width: 6em),
    empty_letterbox(cells: 3, original: 10, light: false, "J")[Aantal minder getelde stemmen (bereken: D _min_ H)]
  )
]

=== Zijn er tijdens de stemming dingen opgeschreven die het verschil tussen D en H volledig verklaren?

(Gebruik het proces-verbaal van het stembureau #sym.arrow.long.r *Tijdens de stemming, vraag 1.2.2*)

#checkbox[Ja]
#checkbox[Nee, er is een onverklaard verschil]

#pagebreak(weak: true)

== Stemmen per lijst en per kandidaat <per_list_and_candidate>

#for political_group in input.election.political_groups {
  votes_table(
    with_originals: true,
    title: [#political_group.number #political_group.name],
    headers: ("Kandidaat", "", "Oorspronkelijk", "Gecorrigeerd"),
    total: none,
    values: political_group.candidates.map(candidate => (
      name: candidate_name(candidate),
      number: candidate.number,
      votes: none,
    )),
    continue_on_next_page: [#sym.arrow.r De lijst gaat verder op de volgende pagina],
    column_total: "Subtotaal kolom",
    sum_total: columns => [Totaal lijst (kolom #columns)],
    total_instruction: [Neem dit totaal over in rubriek #ref(<cast_votes>) van deze bijlage bij de juiste lijst.],
    explainer_text: [
      Vul alléén de getallen in die veranderd zijn ten opzichte van een eerdere telling. Getallen die niet zijn veranderd, hoeven niet ingevuld te worden in de kolom ‘gecorrigeerd'. Onder ‘oorspronkelijk’ staan de getallen die in de eerste zitting door het #location_type zijn vastgesteld.
    ],
    break_count: (20, 20, 20, 20)
  )
}
