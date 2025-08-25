#import "common/style.typ": conf, document_numbering, attachement_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-na-14-2-bijlage1.json")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.location]
#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]


#show: doc => conf(doc, header: align(right, [
  Gemeente #input.election.domain_id #input.election.location \
  Stembureau #input.polling_station.number
]), footer: [
  Corrigendum van een #location_type \
  Model Na 14-2
])

#set heading(numbering: none)

#title_page(
  is_municipality[#input.election.domain_id #input.election.location][#input.election.location],
  is_municipality[Gemeentelijk stembureau][Stembureau voor het openbaar lichaam],
  [Gemeenteraad - #format_date(input.election.election_date)],
  [
    Gecorrigeerde telresultaten per lijst en kandidaat –
    Model Na 14-2
  ],
)

== Details van het #location_type

#location_name

#input.election.location #format_date(input.election.election_date)

== Corrigendum

Elke #is_municipality[gemeente][openbaar lichaam] maakt bij een verkiezing een verslag: het proces-verbaal. Hierin staat hoe het tellen van de stemmen is verlopen en wat de uitslag van de stemming was. In dat proces-verbaal kunnen fouten staan. Het corrigendum
corrigeert de fouten in het proces-verbaal. De aantallen in het corrigendum vervangen
de aantallen in het proces-verbaal.

#emph_block[
  Dit corrigendum gaat over onderzoeken en eventuele hertellingen. Ook staan hierin
  correcties op (tel)fouten die in eerdere verslagen zijn gevonden. Het gemeentelijk
  stembureau/stembureau voor het openbaar lichaam heeft dit onderzoek gedaan op
  verzoek van het centraal stembureau. Het corrigendum wordt ingevuld door het
  gemeentelijk stembureau/stembureau voor het openbaar lichaam.
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
die in de eerste zitting door het gemeentelijke stembureau/stembureau voor het openbaar lichaam zijn
vastgesteld.

== Aantal kiesgerechtigden
== Toegelaten kiezers
== Uitgebrachte stemmen
== Verschillen tussen aantal kiezers en uitgebrachte stemmen
== Stemmen per lijst en per kandidaat

#pagebreak(weak: true)
#emph_block[Deze pagina is expres leeg]

Zo komt het handtekeningen-blad altijd op een losse pagina, ook als het verslag dubbelzijdig is geprint.

#pagebreak(weak: true)

= Ondertekening

=== Datum

#textbox[Datum en tijd:][Plaats:]

== Verplicht: voorzitter en #is_municipality[twee][vier] leden van het stembureau

=== Voorzitter van het gemeentelijk stembureau:

#textbox[Naam:][Handtekening:]

=== #is_municipality[Twee][Vier] eden van het #location_type

#stack(spacing: 0.5em, ..range(0, is_municipality(2, 4)).map(_ => textbox[Naam:][Handtekening:]))

== Ondertekening door andere aanwezige leden van het stembureau

=== Extra ondertekening: (niet verplicht)

#stack(spacing: 0.5em, ..range(0, 4).map(_ => textbox[Naam:][Handtekening:]))
