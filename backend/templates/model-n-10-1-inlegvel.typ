#import "common/style.typ": conf
#import "common/scripts.typ": *
#let input = json("inputs/model-n-10-1-inlegvel.json")

#let is_municipality = (municipal, public_body) => is_municipality(input.election.location, municipal, public_body)
#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.domain_id #input.election.location]
#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#let header-right = [Stembureau #input.polling_station.number]

#show: doc => conf(
  doc,
  header-left: [
    Controles en correcties
  ],
  header-right: header-right,
  footer: [
    Proces-verbaal van een stembureau\
    Model N 10-1 decentrale stemopneming (versie 2027)
  ]
)

#set page(numbering: (_, _) => [Later ingevoegde pagina])
#set heading(numbering: none)

= Controles en correcties

#emph_block[
  Deze pagina is toegevoegd door de leden van het #location_type, *nadat er extra controles op de telresultaten van dit stembureau zijn uitgevoerd*. Voeg deze pagina toe na het voorblad van het oorspronkelijke proces-verbaal van het stembureau (N 10-1).
]

== Op eigen initiatief van het #location_type

=== Waarom heeft het #location_type de telresultaten onderzocht?

#checkbox[Vanwege een onverklaard verschil]
#checkbox[Vanwege (het vermoeden van) een andere fout]

=== Zijn er gecorrigeerde telresultaten?

#checkbox[Nee, de oorspronkelijke telresultaten waren correct]
#checkbox[Ja, er zijn gecorrigeerde telresultaten (de gecorrigeerde telresultaten zijn bij dit proces-verbaal gevoegd)]

=== Opgesteld door het #location_type

#textbox[Datum en tijd:]

== Op verzoek van het centraal stembureau

=== Zijn er gecorrigeerde telresultaten?

#checkbox[Nee, de oorspronkelijke telresultaten waren correct]
#checkbox[Ja, er zijn gecorrigeerde telresultaten (de gecorrigeerde telresultaten zijn bij dit proces-verbaal gevoegd)]

=== Opgesteld door het #location_type

#textbox[Datum en tijd:]
