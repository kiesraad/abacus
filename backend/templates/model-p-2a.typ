#import "common/style.typ": conf, document_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-na-31-2.json")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.location]
#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]
#let this_location = is_municipality[deze gemeente][dit openbaar lichaam]

#show: doc => conf(doc, header: location_name, footer: [
  Proces-verbaal van een #location_type (nieuwe zitting)\
  Model P 2a
])

#set heading(numbering: none)

#title_page(
  is_municipality[#input.election.domain_id #input.election.location][#input.election.location],
  is_municipality[Gemeentelijk stembureau][Stembureau voor het openbaar lichaam],
  [#input.election.name #format_date(input.election.election_date)],
  [
    Verslag en gecorrigeerde telresultaten per lijst en
    kandidaat – Model P 2a
  ],
)

== Details van het #location_type

#location_name

#input.election.location #format_date(input.election.election_date)

== Proces-verbaal

Elke #is_municipality[gemeente][openbaar lichaam] maakt bij een verkiezing een verslag: het proces-verbaal. Hierin staat hoe het tellen van de stemmen is verlopen en wat de uitslag van de stemming was.

#emph_block[
  Het centraal stembureau vermoedt dat er één of meer fouten staan in het
  proces-verbaal van een eerdere zitting van het #location_type. Het centraal stembureau heeft daarom
  aan het #location_type voor het openbaar lichaam
  gevraagd de vermeende fouten te onderzoeken in een nieuwe openbare zitting.
  Dit document geeft een verslag van deze nieuwe zitting. Als er inderdaad fouten
  staan in het proces-verbaal van de eerdere zitting, dan verbetert het
  #location_type voor het openbaar lichaam deze fouten
  in een corrigendum. Dat corrigendum wordt bij het proces-verbaal van de
  eerdere zitting gevoegd.
]

== Inhoudsopgave
- Deel 1 - *Verslag van de zitting* (het verloop van het onderzoek)
- Deel 2 - *Ondertekening* door de leden van het #location_type

#pagebreak(weak: true)

#show: doc => document_numbering(doc)
// Max numbering level is 2
#show heading.where(level: 3): it =>[
    #block(it.body)
]

= Verslag van de zitting

== Presentielijst

=== Aanwezige leden van het #location_type

De volgende rollen zijn mogelijk: voorzitter, plaatsvervangend voorzitter of lid.

#empty_table(
  columns: (8em, 1fr, 1fr, 1fr, 8em),
  headers: ("Voorletters", "Achternaam", "Rol", "Aanwezig (van - tot)", "Locatie"),
  values: ("", "", "", "-", ""),
  rows: 24,
)

#pagebreak(weak: true)

== Onderzochte stembureaus

=== De resultaten van onderstaande stembureaus zijn door het #location_type gecontroleerd.

Noteer per onderzocht stembureau: \
\
- Nummer van het stembureau en de naam van de locatie
- Aanleiding van het onderzoek (wat was er opvallend aan de telresultaten?)
- Opdracht van het centraal stembureau (wat is er onderzocht?)
- Bevindingen van het onderzoek
- Of er als gevolg van het onderzoek een nieuw telresultaat is
\
#empty_lines(22)

#pagebreak(weak: true)

#show: doc => document_numbering(doc)

== Tijdens de zitting

=== Noteer alle *bezwaren* van aanwezigen

Schrijf geen namen of andere persoonsgegevens op. Schrijf alle bezwaren op, ook als u
het er niet mee eens bent. Geef aan hoe het bezwaar door het #location_type is afgehandeld.

#empty_table(
  columns: (7em, 1fr, 1fr),
  headers: ("Tijdstip", "Bezwaar", [Reactie #location_type]),
  values: ("", "", ""),
  rows: 10,
)


=== Andere *bijzonderheden* die mogelijk invloed hebben op het telproces of de resultaten van het #location_type.

Bijvoorbeeld een schorsing of als er meerdere verkiezingen tegelijk werden georganiseerd en een stembiljet in de verkeerde stembus zat.

#empty_table(
  columns: (7em, 1fr),
  headers: ("Tijdstip", "Bijzonderheid"),
  values: ("", ""),
  rows: 12,
)

#pagebreak(weak: true)

#show heading.where(level: 3): it =>[
    #block(it.body)
]

=== Deze pagina is expres leeg
Zo komt het handtekeningen-blad altijd op een losse pagina, ook als het verslag dubbelzijdig is geprint.

#pagebreak(weak: true)

= Ondertekening

=== Datum

#textbox[Datum en tijd:][Plaats:]

== Verplicht: voorzitter en #is_municipality[twee][vier] leden van het stembureau

=== Voorzitter van het gemeentelijk stembureau:

#textbox[Naam:][Handtekening:]

=== #is_municipality[Twee][Vier] leden van het #location_type

#stack(spacing: 0.5em, ..range(0, is_municipality(2, 4)).map(_ => textbox[Naam:][Handtekening:]))

== Ondertekening door andere aanwezige leden van het stembureau

=== Extra ondertekening: (niet verplicht)

#stack(spacing: 0.5em, ..range(0, 4).map(_ => textbox[Naam:][Handtekening:]))
