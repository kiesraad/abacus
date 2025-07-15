#import "common/style.typ": conf, document_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-na-31-2.json")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#let polling_station_number = 404
#let polling_station_name = "Stembureau De Regenboog"
#let is_mobile = false

#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.location]
#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]
#let this_location = is_municipality[deze gemeente][dit openbaar lichaam]

#show: doc => conf(doc, header: [Stembureau #polling_station_number], footer: [Proces-verbaal van een stembureau \ 
Model N 10-1 decentrale stemopneming])

#set heading(numbering: none)

#title_page(
  [#input.election.location Stembureau #polling_station_number #polling_station_name],
  "",
  [#input.election.name #format_date(input.election.election_date)],
  [
    Verslag en telresultaten per lijst en kandidaat \
    Model N 10-1
  ],
)

== Details van het #if is_mobile { "mobiel stembureau" } else { "stembureau" }

Kieskring \<nummer> #sym.arrow.r #location_name #sym.arrow.r Stembureau #polling_station_number

\<Plaats> \<tijdstip aanvang zitting> \
\<tijd:van> - \<tot> \<naam stembureau> \ 
\<Adresregel 1> \ 
\<Adresregel 2>  \ 

#input.election.location #format_date(input.election.election_date)

// *Op deze locatie waren meerdere stembureaus>*

== Process-verbaal

Elk stembureau maakt bij een verkiezing een verslag: het proces-verbaal. Hierin staat hoe het stemmen en het tellen van de stemmen is verlopen

#emph_block[
  In #this_location is gekozen voor decentrale stemopneming. Het stembureau telt na het stemmen het aantal kiezers, en hoeveel stemmen elke lijst en elke kandidaat hebben gekregen.
]

== Inhoudsopgave

- Deel 1 - *Verslag van de zitting* (het verloop van het stemmen en tellen)
- Deel 2 - *Telresultaten* van dit stembureau
- Deel 3 - *Ondertekening* door de leden van het stembureau

#pagebreak(weak: true)

== Controles en correcties

#emph_block[
  Deze pagina is toegevoegd door de leden van het #location_type, *nadat er extra controles op de telresultaten van dit stembureau zijn uitgevoerd*. Voeg deze pagina toe na het voorblad van het oorspronkelijke proces-verbaal van het stembureau (N 10-1).
]

= Op eigen initiatief van het #location_type

=== Waarom heeft het gemeentelijk stembureau/stembureau voor het openbaar lichaam de telresultaten onderzocht?
