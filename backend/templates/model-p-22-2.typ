#import "common/style.typ": conf, default_header, document_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-p-22-2.json")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.location]
#let location_type = [centraal stembureau]

#show: doc => conf(doc, header-right: location_name, footer: [
  Proces-verbaal van een #location_type (nieuwe zitting)\
  Model P 2a
])

#set heading(numbering: none)

#title_page(
  is_municipality[#input.election.domain_id #input.election.location][#input.election.location],
  [Centraal Stembureau],
  [#input.election.name #format_date(input.election.election_date)],
  [
    Verslag, uitslag en zetelverdeling – Model P 22-2
  ],
)

== Details van het #location_type

#input.committee_session.location #format_date_time(input.committee_session.start_date_time)

== Proces-verbaal

Het centraal stembureau maakt bij een verkiezing een verslag van de controlewerkzaamheden, de uitslag en de zetelverdeling. Dit heet een proces-verbaal.

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

=== Zijn er controlewerkzaamheden uitgevoerd vanwege telverschillen of andere mogelijke fouten

#checkbox()[Nee]

#checkbox()[Ja, #sym.arrow.r Zie bijlage 2 #TODO[ref naar bijlage 2]]

== Bezwaren

=== Tijdens de zitting zijn:

#checkbox()[Geen bezwaren ingebracht]

#checkbox()[Bezwaren ingebracht. Deze staan in bijlage 3 bij dit proces-verbaal. De reactie van het centraal stembureau staat daar ook bij.]

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
    )[Totaal toegelaten kiezers (A+B)],
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
    )[Totaal toegelaten kiezers (A+B+C)],
  )
]

#pagebreak(weak: true)

== Uitgebrachte stemmen

#TODO[Votes table]

#pagebreak(weak: true)

== Verschillen tussen aantal kiezers en uitgebrachte stemmen

=== Is het aantal uitgebrachte stemmen en het aantal toegelaten kiezers gelijk?

#let differences = input.summary.differences_counts.more_ballots_count.count > 0 or input.summary.differences_counts.fewer_ballots_count.count > 0

#checkbox(checked: not differences)[Ja, #sym.arrow.r Ga door naar 2.5 #TODO[ref?]]

#checkbox(checked: differences)[Nee, er zijn stembureaus met een verschil]

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

#TODO[Kiesdeler tabel]\

6790 ÷ 13 = 522 #math.frac([4], [13])

#pagebreak(weak: true)

== Aantal volle zetels per lijst
Hieronder is berekend hoe vaak elke lijst qua stemmenaantal de kiesdeler heeft gehaald. Het resultaat van deze deling geeft het aantal volle zetels dat per lijst is behaald.

#TODO[Volle zetels tabel]\

#pagebreak(weak: true)

== Restzetels

=== Na toewijzing van de volle zetels blijft een aantal te verdelen zetels over. Dit zijn de restzetels.

#TODO[Apply values]\
#sum(
  operator_label: "- verschil",
  number_box(
    value: 99,
  )[Totaal aantal te verdelen zetels],
  number_box(
    value: 99,
  )[Toegewezen volle zetels],
  number_box(
    value: 99,
  )[*Aantal restzetels*],
)

#pagebreak(weak: true)

=== Verdeling van de restzetels

- Het centraal berekent hoeveel stemmen elke lijst overhoudt na toekenning van de volle zetels. Dat is het ‘overschot’ aan stemmen voor die lijst.
- Het centraal stembureau verdeelt de restzetels, in volgorde van de grootste overschotten. Elke lijst kan maar één restzetel krijgen. Alleen lijsten die ten minste 75% van de kiesdeler hebben behaald kunnen een restzetel krijgen.
- Als er daarna nog restzetels over zijn, verdeelt het centraal stembureau die volgens het systeem van de grootste gemiddelden. Ook bij deze verdeling mag iedere lijst maar één restzetel krijgen
- Als lijsten precies evenveel stemmen behalen en er niet voldoende restzetels zijn voor die lijsten, dan wordt geloot welke lijst de restzetel krijgt.

#pagebreak(weak: true)
