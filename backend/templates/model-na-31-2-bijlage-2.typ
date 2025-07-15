#import "common/style.typ": conf, attachement_numbering
#import "common/scripts.typ": *

#show: doc => conf(doc, header: [Stembureau \<nummer>], footer: [
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