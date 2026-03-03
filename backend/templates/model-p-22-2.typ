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

