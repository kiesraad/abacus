#import "common/style.typ": conf, attachment_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-na-31-2-bijlage1.json")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#show: doc => conf(doc, header-left: [Bijlage 2 - bezwaren van kiezers], footer: [
    Proces-verbaal van een #location_type\
    Model Na 31-2 centrale stemopneming
  ])

#set heading(numbering: none)

= Bijlage 2

== Bezwaren van aanwezigen op stembureaus

#line(length: 100%)

=== Neem alle *bezwaren* van aanwezigen van de processen-verbaal van de stembureaus over (rubrieken 1.2.1 en 1.3.2). Neem geen namen of andere persoonsgegevens over.

#empty_table(
  columns: (7em, 1fr, 1fr),
  headers: ("Nummer stembureau", "Bezwaar", "Reactie stembureau"),
  values: ("", "", ""),
  rows: 24
)
