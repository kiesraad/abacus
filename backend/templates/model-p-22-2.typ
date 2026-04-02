#import "common/style.typ": conf, default_header, document_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-p-22-2.json")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.location]
#let location_type = [centraal stembureau]
#let subcommittee_type = [gemeentelijk stembureau]
#let LARGE_COUNCIL_THRESHOLD = 19

#show: doc => conf(doc, header-right: [Centraal stembureau #input.election.location], footer: [
  Proces-verbaal van het #location_type\
  Model P 22-2
  
  Datum: #input.creation_date_time - SHA-256-Hashcode: \
  #input.hash
], margin-bottom: 3.2cm)

#set heading(numbering: none)

#title_page(
  is_municipality[#input.election.domain_id #input.election.location][#input.election.location],
  [Centraal Stembureau],
  [#input.election.name - #format_date(input.election.election_date)],
  [
    Verslag, uitslag en zetelverdeling – Model P 22-2
  ],
)

== Details van het #location_type

#input.committee_session.location #format_date_time(input.committee_session.start_date_time).

== Proces-verbaal

Het #location_type maakt bij een verkiezing een verslag van de controlewerkzaamheden, de uitslag en de zetelverdeling. Dit heet een proces-verbaal.

== Inhoudsopgave
- Deel 1 - *Verslag van de zitting*
- Deel 2 - *Uitslag en zetelverdeling*
- Deel 3 - *Ondertekening* door de leden van het #location_type

\

- Bijlage 1: Stemmen per lijst en per kandidaat
- Bijlage 2: Meldingen van belangstellenden
- Bijlage 3: Verslag van de controlewerkzaamheden
- Bijlage 4: Bezwaren van belangstellenden tijdens de zitting
- Bijlage 5: Bijzonderheden

#pagebreak(weak: true)

#show: doc => document_numbering(doc)

#show heading.where(level: 3): it => [#block(it.body)]

= Verslag van de zitting

== Presentielijst

=== Aanwezige leden van het #location_type

De volgende rollen zijn mogelijk: voorzitter, plaatsvervangend voorzitter of lid.

#empty_table(
  columns: (8em, 1fr, 1fr),
  headers: ("Voorletters", "Achternaam", "Rol"),
  values: ("", "", ""),
  rows: 24,
)

#pagebreak(weak: true)

== Verslag van controlewerkzaamheden

=== Zijn er controlewerkzaamheden uitgevoerd vanwege telverschillen of andere mogelijke fouten?

#checkbox()[Nee]

#checkbox()[Ja, *#sym.arrow.r Zie bijlage 2*]

== Bezwaren

=== Tijdens de zitting zijn:

#checkbox()[Geen bezwaren ingebracht]

#checkbox()[Bezwaren ingebracht. Deze staan in bijlage 3 bij dit proces-verbaal. De reactie van het #location_type staat daar ook bij.]

#pagebreak(weak: true)

= Uitslag en zetelverdeling

== Aantal kiesgerechtigden

#letterbox("Z", value: input.election.number_of_voters)[Kiesgerechtigden]

== Toegelaten kiezers

#if not "voter_card_count" in input.summary.voters_counts [
  Tel het aantal geldige stempassen en volmachtbewijzen

  #sum(
    letterbox("A", value: input.summary.voters_counts.poll_card_count)[Stempassen],
    letterbox(
      "B",
      value: input.summary.voters_counts.proxy_certificate_count,
    )[Volmachtbewijzen (schriftelijk of via ingevulde stempas)],
    letterbox(
      "D",
      light: false,
      value: input.summary.voters_counts.total_admitted_voters_count,
    )[*Totaal toegelaten kiezers (A+B)*],
  )
] else [
  Tel het aantal geldige stempassen, volmachtbewijzen en kiezerspassen

  #sum(
    letterbox("A", value: input.summary.voters_counts.poll_card_count)[Stempassen],
    letterbox(
      "B",
      value: input.summary.voters_counts.proxy_certificate_count,
    )[Volmachtbewijzen (schriftelijk of via ingevulde stempas)],
    letterbox("C", value: input.summary.voters_counts.voter_card_count)[Kiezerspassen],
    letterbox(
      "D",
      light: false,
      value: input.summary.voters_counts.total_admitted_voters_count,
    )[*Totaal toegelaten kiezers (A+B+C)*],
  )
]

#pagebreak(weak: true)

== Uitgebrachte stemmen

#table(
  columns: (1fr, 10em),
  stroke: (x, y) => (
    left: if x > 0 { 0.5pt + gray },
    top: if y > 0 { 0.5pt + gray },
  ),
  inset: (x: 4pt, y: 8pt),
  fill: (_, y) => if y > 1 and y <= input.seat_assignment.final_standing.len() and calc.even(y) { luma(245) },
  table.header(
    ..([Lijst], [Stemmen]).enumerate().map(((idx, h)) => {
      table.cell(
        align: bottom + if idx == 0 { left } else { right }, header_text(h)
      )
    })
  ),
  table.hline(stroke: 1pt + black),
  ..for standing in input.seat_assignment.final_standing.sorted(key: standing => standing.total_seats, by: (l, r) => l >= r) {
    (
      table.cell(political_group_name(input.election.political_groups.find(pg => pg.number == standing.list_number), with_prefix: "only_list_number")),
      table.cell(align: right, [#standing.votes_cast])
    )
  }.flatten(),
  table.hline(stroke: 1pt + black),
  table.cell(header_text([Stemmen op kandidaten])),
  table.cell(align: right, header_text([#input.summary.votes_counts.total_votes_candidates_count])),
  table.cell(fill: luma(245), [Blanco stemmen]),
  table.cell(fill: luma(245), align: right, [#input.summary.votes_counts.blank_votes_count]),
  table.cell([Ongeldige stemmen]),
  table.cell(align: right, [#input.summary.votes_counts.invalid_votes_count]),
  table.hline(stroke: 1pt + black),
  table.cell(header_text([Totaal uitgebrachte stemmen])),
  table.cell(align: right, header_text([#input.summary.votes_counts.total_votes_cast_count])),
)

#pagebreak(weak: true)

#show heading.where(level: 3): it => [
  #text(weight: "bold", counter(heading).display(it.numbering))
  #it.body
]

== Verschillen tussen aantal kiezers en uitgebrachte stemmen

=== Is het aantal uitgebrachte stemmen en het aantal toegelaten kiezers gelijk?

#let differences = input.summary.differences_counts.more_ballots_count.count > 0 or input.summary.differences_counts.fewer_ballots_count.count > 0

#checkbox(checked: not differences)[Ja]

#checkbox(checked: differences)[Nee, er zijn verschillen]

=== In de stembureaus zijn in totaal *méér* uitgebrachte stemmen dan toegelaten kiezers geteld.

#letterbox(
  "I",
  value: input.summary.differences_counts.more_ballots_count.count,
)[Totaal aantal méér getelde stemmen]

=== In de stembureaus zijn in totaal *minder* uitgebrachte stemmen dan toegelaten kiezers geteld.

#letterbox(
  "J",
  value: input.summary.differences_counts.fewer_ballots_count.count,
)[Totaal aantal minder getelde stemmen]

== Kiesdeler

Met de kiesdeler wordt de zetelverdeling bepaald. De kiesdeler is het aantal stemmen dat nodig is voor een zetel. De kiesdeler is het totaal aantal uitgebrachte stemmen op een kandidaat gedeeld door het aantal te verdelen zetels.

#table(
  columns: 5,
  stroke: none,
  inset: (x: 4pt, y: 8pt),
  table.header(
    table.cell(header_text([Geldige stemmen op kandidaten])),
    table.cell([]),
    table.cell(align: center, header_text([Aantal zetels])),
    table.cell([]),
    table.cell(header_text([Kiesdeler])),
  ),
  table.hline(stroke: 1pt + black),
  table.cell(align: right, [#input.summary.votes_counts.total_votes_candidates_count]),
  table.cell(align: center, [÷]),
  table.cell(align: center, [#input.seat_assignment.seats]),
  table.cell(align: center, [=]),
  table.cell(format_fraction(input.seat_assignment.quota)),
)

#pagebreak(weak: true)

== Aantal volle zetels per lijst

Hieronder is berekend hoe vaak elke lijst qua stemmenaantal de kiesdeler heeft gehaald. Het resultaat van deze deling geeft het aantal volle zetels dat per lijst is behaald.

#table(
  columns: (1fr, 10em, 9em, 9em),
  stroke: (x, y) => (
    left: if x > 0 { 0.5pt + gray },
    top: if y > 0 { 0.5pt + gray },
  ),
  inset: (x: 4pt, y: 8pt),
  fill: (_, y) => if y > 1 and y <= input.seat_assignment.final_standing.len() and calc.even(y) { luma(245) },
  table.header(
    table.cell(header_text([Lijst])),
    table.cell(align: right, header_text([Aantal stemmen])),
    table.cell(stroke: none, align: center, header_text([÷ Kiesdeler])),
    table.cell(stroke: none, align: right, header_text([Volle zetels])),
  ),
  table.hline(stroke: 1pt + black),
  ..for standing in input.seat_assignment.final_standing.sorted(key: standing => standing.total_seats, by: (l, r) => l >= r) {
    let list_result_changes = input.result_changes_full_seats.filter((change) => change.list_number == standing.list_number)
    (
      table.cell(political_group_name(input.election.political_groups.find(pg => pg.number == standing.list_number), with_prefix: "only_list_number")),
      table.cell(align: right, [#standing.votes_cast]),
      table.cell(align: center, [÷ #format_fraction(input.seat_assignment.quota) =]),
      table.cell(align: right, [#str(standing.full_seats + list_result_changes.len())])
    )
  }.flatten(),
  table.hline(stroke: 1pt + black),
  table.cell(header_text([Totaal])),
  table.cell(align: right, header_text([#input.summary.votes_counts.total_votes_candidates_count])),
  table.cell(stroke: none, []),
  table.cell(stroke: none, align: right, header_text([#str(input.seat_assignment.full_seats + input.result_changes_full_seats.len())])),
)

#pagebreak(weak: true)

== Restzetels

=== Berekening aantal restzetels

Na toewijzing van de volle zetels blijft een aantal te verdelen zetels over. Dit zijn de restzetels.

#sum(
  operator_label: "- Verschil",
  number_box(
    value: input.seat_assignment.seats,
  )[Totaal aantal te verdelen zetels],
  number_box(
    value: str(input.seat_assignment.full_seats + input.result_changes_full_seats.len()),
  )[Toegewezen volle zetels],
  number_box(
    value: str(input.seat_assignment.residual_seats - input.result_changes_full_seats.len()),
  )[*Aantal restzetels*],
)

=== Verdeling van de restzetels

#let highest_averages_steps = input.seat_assignment.steps.filter(step => step.change.changed_by == "HighestAverageAssignment")
#if input.seat_assignment.residual_seats > 0 [
  #if input.election.number_of_seats < LARGE_COUNCIL_THRESHOLD [
    - Het #location_type berekent hoeveel stemmen elke lijst overhoudt na toekenning van de volle zetels. Dat is het 'overschot' aan stemmen voor die lijst.
    - Het #location_type verdeelt de restzetels, in volgorde van de grootste overschotten. Elke lijst kan maar één restzetel krijgen. Alleen lijsten die ten minste 75% van de kiesdeler hebben behaald kunnen een restzetel krijgen.
    - Als er daarna nog restzetels over zijn, verdeelt het #location_type die volgens het systeem van de grootste gemiddelden. Ook bij deze verdeling mag iedere lijst maar één restzetel krijgen.
    - Als lijsten precies evenveel stemmen behalen en er niet voldoende restzetels zijn voor die lijsten, dan wordt geloot welke lijst de restzetel krijgt.

    #pagebreak(weak: true)

    #let final_standing_pgs_meeting_threshold = input.seat_assignment.final_standing.filter(
    (list_seat_assignment) => list_seat_assignment.meets_remainder_threshold);
    #table(
      columns: (1fr, 10em, 8em, 10em),
      stroke: (x, y) => (
        left: if x > 0 { 0.5pt + gray },
        top: if y > 0 { 0.5pt + gray },
      ),
      inset: (x: 4pt, y: 8pt),
      fill: (_, y) => if y > 1 and calc.even(y) { luma(245) },
      table.header(
        table.cell(stroke: none, header_text([Lijst])),
        table.cell(header_text([Aantal volle zetels])),
        table.cell(align: right, stroke: none, header_text([Overschot])),
        table.cell(align: right, header_text([Aantal restzetels])),
      ),
      table.hline(stroke: 1pt + black),
      ..final_standing_pgs_meeting_threshold.map((list_seat_assignment) => {
        let residual_seats = input.seat_assignment.steps.filter(step => step.change.changed_by == "LargestRemainderAssignment").filter(step => {
          step.change.selected_list_number == list_seat_assignment.list_number
        }).len()
        let list_result_changes_full_seats = input.result_changes_full_seats.filter((change) => change.list_number == list_seat_assignment.list_number)
        let list_result_changes_residual_seats = input.result_changes_residual_seats.filter((change) => change.list_number == list_seat_assignment.list_number)
        for list_result_change in list_result_changes_residual_seats {
          residual_seats = residual_seats + list_result_change.increase
        }
        (
          table.cell(political_group_name(input.election.political_groups.find(pg => pg.number == list_seat_assignment.list_number), with_prefix: "only_list_number")),
          table.cell(align: right, str(list_seat_assignment.full_seats + list_result_changes_full_seats.len())),
          table.cell(align: right, format_fraction(list_seat_assignment.remainder_votes)),
          table.cell(align: right, [#if residual_seats > 1 { [1] } else { residual_seats }])
        )
      }).flatten(),
      table.hline(stroke: 1pt + black),
    )
  ] else [
    - Eerst wordt voor alle lijsten berekend hoeveel stemmen per zetel op een bepaalde lijst zouden zijn uitgebracht als die lijst één zetel extra zou krijgen: de op de lijst uitgebrachte stemmen worden gedeeld door het aantal volle zetels plus 1.
    - De uitkomsten van deze berekening zijn gemiddelden per zetel; zij worden naar grootte gerangschikt.
    - De eerste restzetel gaat naar de lijst met het grootste gemiddelde per zetel. Voor deze lijst wordt opnieuw berekend wat het gemiddelde nu is, uitgaande van het aantal volle zetels, de toegewezen restzetel en weer één extra zetel.
    - Als er nog een restzetel te verdelen is, wordt deze toegewezen aan de lijst met nu het grootste gemiddelde.
    - Het #location_type herhaalt de procedure totdat alle restzetels verdeeld zijn.
  
    Als meerdere lijsten gelijke gemiddelden hebben en er niet voldoende restzetels zijn voor toekenning ervan aan die lijsten, wordt geloot welke lijst de restzetel krijgt.

    #pagebreak(weak: true)

    #TODO[marking of selected average does not work yet]
  
    #highest_averages_table(highest_averages_steps, input.seat_assignment.final_standing, input.election.political_groups, input.result_changes_residual_seats)
  ]

  #v(15pt)
  #let absolute_majority_reassignment = input.seat_assignment.steps.filter(step => step.change.changed_by == "AbsoluteMajorityReassignment")
  #let list_exhaustion_removal_steps = input.seat_assignment.steps.filter(step => step.change.changed_by == "ListExhaustionRemoval")
  #let unique_exhausted_list_numbers = ()
  #for step in list_exhaustion_removal_steps {
    if not unique_exhausted_list_numbers.contains(step.change.list_retracted_seat) {
      unique_exhausted_list_numbers.push(step.change.list_retracted_seat)
    }
  }
  #set enum(spacing: 12pt, numbering: numbering("I", 1))
  #if absolute_majority_reassignment.len() == 1 {
    let pg = input.election.political_groups.find(pg => pg.number == absolute_majority_reassignment.first().change.list_assigned_seat)
    [+ #political_group_name(pg, with_prefix: "with_list_prefix") heeft meer dan de helft van de stemmen behaald en heeft daardoor een volstrekte meerderheid. Omdat de lijst op basis van de zetelverdeling niet meer dan de helft van de zetels heeft gekregen, heeft de lijst via de restzetelverdeling een extra (rest)zetel gekregen.]
  }
  #for list_number in unique_exhausted_list_numbers {
    let pg = input.election.political_groups.find(pg => pg.number == list_number)
    [+ #political_group_name(pg, with_prefix: "with_list_prefix") heeft niet voldoende kandidaten beschikbaar om de haar toegewezen zetels te bezetten. De 'overtollige' zetels gaan over op andere lijsten door toepassing van het systeem van de grootste #if input.election.number_of_seats < LARGE_COUNCIL_THRESHOLD { [overschotten] } else { [gemiddelden] }.]
  }
  
  #let unique_highest_averages_steps = input.seat_assignment.steps.filter(step => step.change.changed_by == "UniqueHighestAverageAssignment")
  #if input.election.number_of_seats < LARGE_COUNCIL_THRESHOLD and unique_highest_averages_steps.len() > 0 [
    #pagebreak(weak: true)
    
    === Verdeling van de restzetels 
    
    De resterende restzetels zijn verdeeld via het systeem van de grootste gemiddelden. De lijst die na toewijzing van een restzetel het hoogste gemiddeld aantal stemmen per zetel zou hebben, krijgt een restzetel. Ook bij deze verdeling mag iedere lijst maar één restzetel krijgen.
    
    #table(
      columns: (1fr, 9em, 13em, 8em),
      stroke: (x, y) => (
        left: if x > 0 { 0.5pt + gray },
        top: if y > 0 { 0.5pt + gray },
      ),
      inset: (x: 4pt, y: 8pt),
      table.header(
        table.cell(stroke: none, header_text([Lijst])),
        table.cell(align: right, header_text([Reeds toegewezen zetels])),
        table.cell(align: right, stroke: none, header_text([Gemiddeld aantal stemmen per zetel bij toewijzing restzetels])),
        table.cell(align: right, header_text([Toegekende restzetels])),
      ),
      table.hline(stroke: 1pt + black),
      ..input.seat_assignment.final_standing.map((list_seat_assignment) => {
        if unique_highest_averages_steps.first().change.list_exhausted.contains(list_seat_assignment.list_number) {
          ()
        } else {
          let residual_seats_already_assigned = input.seat_assignment.steps.filter(step => step.change.changed_by == "LargestRemainderAssignment").filter(step => {
          step.change.selected_list_number == list_seat_assignment.list_number
        }).len()
          let average = unique_highest_averages_steps.first().standings.find((standing) => standing.list_number == list_seat_assignment.list_number).next_votes_per_seat
          let list_seat_assignment_steps = unique_highest_averages_steps.filter((step) => {step.change.selected_list_number == list_seat_assignment.list_number})
          (
            table.cell(political_group_name(input.election.political_groups.find(pg => pg.number == list_seat_assignment.list_number), with_prefix: "only_list_number")),
            table.cell(align: right, str(list_seat_assignment.full_seats + residual_seats_already_assigned)),
            table.cell(align: right, format_fraction(list_seat_assignment.remainder_votes)),
            table.cell(align: right, str(list_seat_assignment_steps.len()))
          )
        }
      }).flatten(),
      table.hline(stroke: 1pt + black),
    )
    
    #if highest_averages_steps.len() > 0 [
      #v(8pt)
      #if highest_averages_steps.len() == 1 {
        [Hierna was er nog #highest_averages_steps.len() restzetel te verdelen. Deze zetel is toegewezen aan de lijst die met een zetel erbij het grootste gemiddelde aantal stemmen per zetel zou hebben.]
      } else {
        [Hierna waren er nog #highest_averages_steps.len() restzetels te verdelen. Deze zetels zijn toegewezen aan de lijsten die met een zetel erbij het grootste gemiddelde aantal stemmen per zetel zouden hebben.]
      }
      #highest_averages_table(highest_averages_steps, input.seat_assignment.final_standing, input.election.political_groups, ())
    ]
  ]
] else [
  Er zijn geen restzetels te verdelen.
]

#pagebreak(weak: true)

== Verdeling van de zetels

De aan de lijsten toegewezen volle zetels en restzetels zijn bij elkaar opgeteld. De verdeling van alle zetels ziet er als volgt uit:

#table(
  columns: (1fr, 11em),
  stroke: (x, y) => (
    left: if x > 0 { 0.5pt + gray },
    top: if y > 0 { 0.5pt + gray },
  ),
  inset: (x: 4pt, y: 8pt),
  fill: (_, y) => if y > 1 and calc.even(y) { luma(245) },
  table.hline(stroke: none),
  table.header(
    ..([Lijst], [Toegewezen zetels]).enumerate().map(((idx, h)) => table.cell(stroke: none, align: bottom + if idx == 0 { left } else { right }, header_text(h))),
  ),
  table.hline(stroke: 1pt + black),
  
  ..for standing in input.seat_assignment.final_standing.sorted(key: standing => standing.total_seats, by: (l, r) => l >= r) {
    (
      table.cell(political_group_name(input.election.political_groups.find(pg => pg.number == standing.list_number), with_prefix: "only_list_number")),
      table.cell(align: right, [#standing.total_seats])
    )
  }.flatten(),
  table.hline(stroke: 1pt + black),
)

#pagebreak(weak: true)

== Toewijzing van zetels aan kandidaten

#for list_candidate_nomination in input.candidate_nomination.list_candidate_nomination.filter((lcn) => lcn.list_seats > 0) {
  let pg = input.election.political_groups.find(pg => pg.number == list_candidate_nomination.list_number)
  list_heading_text(political_group_name(pg, with_prefix: "with_list_prefix"))
  v(4pt)
  [Aantal zetels: #list_candidate_nomination.list_seats]
  
  emph_block[*Met voorkeursstemmen gekozen kandidaten*]

  if list_candidate_nomination.preferential_candidate_nomination.len() > 0 {
    [
      Het overzicht met de stemmen per kandidaat is te vinden in bijlage 1 bij dit proces-verbaal. 
      Deze kandidaten hebben als gevolg van het aantal voorkeursstemmen direct een zetel gekregen.
    ]
    v(4pt)
    [Deze kandidaten hebben meer dan #if input.election.number_of_seats < LARGE_COUNCIL_THRESHOLD [50%] else [25%] van de kiesdeler gehaald.]
  
    candidates_with_seat_table(1, false, true, pg.candidates, list_candidate_nomination.preferential_candidate_nomination)
  } else {
    [Er is geen enkele kandidaat met voorkeursstemmen gekozen.]
  }

  emph_block[*Kandidaten die gekozen zijn vanwege hun positie op de lijst*]
  if list_candidate_nomination.other_candidate_nomination.len() > 0 {
    [Deze kandidaten hebben zelfstandig niet voldoende stemmen gehaald voor een zetel, maar hebben een zetel toegewezen vanwege hun positie op de lijst.]

    candidates_with_seat_table(list_candidate_nomination.preferential_candidate_nomination.len() + 1, true, false, pg.candidates, list_candidate_nomination.other_candidate_nomination)
  } else {
    [Geen enkele kandidaat is zonder voorkeursstemmen gekozen.]
  }

  emph_block[*Rangschikking van kandidaten voor opvolging*]
  let unelected_candidates_ranking = if (list_candidate_nomination.updated_candidate_ranking.len() > 0) {
    list_candidate_nomination.updated_candidate_ranking.slice(list_candidate_nomination.list_seats)
  } else {
    pg.candidates.slice(list_candidate_nomination.list_seats)
  }

  if unelected_candidates_ranking.len() > 0 {
    [De volgende kandidaten hebben geen zetel toegewezen gekregen. Als een zetel vrijkomt wordt deze via de onderstaande volgorde aan opvolgers toegewezen.]

    table(
      columns: (4em, 1.5fr, 1fr, 10em),
      stroke: (x, y) => (
        left: if x > 0 { 0.5pt + gray },
        top: if y > 0 { 0.5pt + gray },
      ),
      inset: (x: 4pt, y: 8pt),
      table.header(
        table.cell(stroke: none, header_text([Rang])),
        table.cell(stroke: none, header_text([Naam])),
        table.cell(stroke: none, header_text([Woonplaats])),
        table.cell(stroke: none, align: right, header_text([Positie op lijst]))
      ),
      table.hline(stroke: 1pt + black),
      ..unelected_candidates_ranking.enumerate().map(((idx, unelected_candidate)) => {
        (
          table.cell(align: right, str(idx + 1)),
          table.cell([#candidate_name(unelected_candidate)]),
          table.cell([#candidate_location(unelected_candidate)]),
          table.cell(align: right, [#unelected_candidate.number]),
        )
      }).flatten(),
      table.hline(stroke: 0.5pt + gray),
    )
  } else {
    [Geen enkele kandidaat is niet gekozen.]
  }
  
  pagebreak(weak: true)
}

== Gekozen kandidaten in alfabetische volgorde

#table(
  columns: (1.5fr, 1fr, 1.5fr),
  stroke: (x, y) => (
    left: if x > 0 { 0.5pt + gray },
    top: if y > 0 { 0.5pt + gray },
  ),
  inset: (x: 4pt, y: 8pt),
  table.header(
    table.cell(stroke: none, header_text([Naam])),
    table.cell(stroke: none, header_text([Woonplaats])),
    table.cell(stroke: none, header_text([Lijst]))
  ),
  table.hline(stroke: 1pt + black),
  ..input.candidate_nomination.chosen_candidates.map(((chosen_candidate)) => {
    (
      table.cell([#candidate_name(chosen_candidate)]),
      table.cell([#candidate_location(chosen_candidate)]),
      table.cell([#political_group_name(input.election.political_groups.find(pg => pg.number == chosen_candidate.list_number), with_prefix: "only_list_number")]),
    )
  }).flatten(),
  table.hline(stroke: 0.5pt + gray),
)

#pagebreak(weak: true)

== Uitkomst controleprotocol

=== Voer de controle uit volgens de stappen in het controleprotocol. Kruis aan wat van toepassing is:

#checkbox()[Er zijn geen verschillen geconstateerd.]
#checkbox()[Er zijn verschillen geconstateerd. Er is contact opgenomen met de Kiesraad. Noteer hieronder wat daarvan de uitkomst is:]

#empty_lines(5)

=== Is voor de invoer gebruik gemaakt van de bestanden die zijn uitgewisseld via het platform 'Teluitslagen'?

#checkbox()[Ja]
#checkbox()[Nee, de resultaten van de papieren processen-verbaal twee keer handmatig ingevoerd in de uitslagensoftware]

=== Heeft het #subcommittee_type verschillen geconstateerd bij de uitvoering van het controleprotocol?

#checkbox()[Nee]
#checkbox()[Ja, noteer hieronder wat het #subcommittee_type daarover heeft opgeschreven.]

#empty_lines(6)

#pagebreak(weak: true)

#set page(header: "")

#show heading.where(level: 3): it => [#block(it.body)]

=== Deze pagina is expres leeg
Zo komt het handtekeningen-blad altijd op een losse pagina, ook als het verslag dubbelzijdig is geprint.

#pagebreak(weak: true)

#set page(header: default_header(none, [Centraal stembureau #input.election.location]))

= Ondertekening

=== Datum

#textbox_only_bottom_stroke[Datum en tijd:][Plaats:]

=== Voorzitter van het #location_type:

#textbox[Naam:][Handtekening:]

=== Plaatsvervangend voorzitter van het #location_type:

#textbox[Naam:][Handtekening:]

=== De andere leden van het #location_type:

#stack(spacing: 0.5em, ..range(0, 5).map(_ => textbox[Naam:][Handtekening:]))
