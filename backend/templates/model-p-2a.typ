#import "common/style.typ": conf, document_numbering, blank_page_before_signing
#import "common/scripts.typ": *
#let input = json("inputs/model-p-2a-variations/model-p-2a-GR.json")

#let is_municipality = (municipal, public_body) => is_municipality(input.election.authority_region, municipal, public_body)
#let is_local_election = (local, other) => is_local_election(input.election.category, local, other)
#let location_name = is_municipality[Gemeente #input.election.authority_id #input.election.authority_region][Openbaar lichaam #input.election.authority_region]
#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]
#let this_location = is_municipality[deze gemeente][dit openbaar lichaam]

#show: doc => conf(doc, header-right: location_name, footer: [
  Proces-verbaal van een #location_type (nieuwe zitting)\
  Model P 2a (versie 2027)
])

#set heading(numbering: none)

#title_page(
  is_municipality[#input.election.authority_id #input.election.authority_region][#input.election.authority_region],
  is_municipality[Gemeentelijk stembureau][Stembureau voor het openbaar lichaam],
  [#input.election.name - #format_date(input.election.election_date)],
  [
    Verslag en gecorrigeerde telresultaten per lijst en
    kandidaat – Model P 2a
  ],
)

== Details van het #location_type

#location_name

#input.committee_session.location #format_date_time(input.committee_session.start_date_time)

== Proces-verbaal

#is_municipality[Elke gemeente][Elk openbaar lichaam] maakt bij een verkiezing een verslag: het proces-verbaal. Hierin staat hoe het tellen van de stemmen is verlopen en wat de uitslag van de stemming was.

#emph_block[
  Het centraal stembureau vermoedt dat er één of meer fouten staan in het
  proces-verbaal van een eerdere zitting van het #location_type. Het centraal stembureau heeft daarom
  aan het #location_type gevraagd de vermeende fouten te onderzoeken in een nieuwe openbare zitting.
  Dit document geeft een verslag van deze nieuwe zitting. Als er inderdaad fouten
  staan in het proces-verbaal van de eerdere zitting, dan verbetert het #location_type deze fouten
  in een corrigendum. Dat corrigendum wordt bij het proces-verbaal van de eerdere zitting gevoegd.
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
  headers: ("Voorletters", "Achternaam", "Rol", "Aanwezig van - tot", "Locatie"),
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

#line(length: 100%)
#for (polling_station, investigation) in input.investigations [
  #block(breakable: false)[
    *Stembureau #polling_station.number (#polling_station.name)*
    - *Aanleiding en opdracht:* #investigation.reason
    - *Bevindingen van het onderzoek:* #investigation.findings
    - *#if investigation.corrected_results [
        Er is een gecorrigeerde uitslag
      ] else [
        De uitslag is ongewijzigd
      ]*
    #line(length: 100%, stroke: 0.25pt)
  ]
]

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

#blank_page_before_signing(location_name)

= Ondertekening

Het proces-verbaal moet worden ondertekend door alle aanwezige leden. Bij een #location_type zijn dit er minimaal #is_local_election[3][5].

#signing_form_label[Datum]

#textbox_only_bottom_stroke[Datum en tijd:][Plaats:]

== Voorzitter en #is_local_election[twee][vier] leden van het #location_type

#signing_form_label[Voorzitter van het #location_type:]

#textbox[Naam:][Handtekening:]

#signing_form_label[#is_local_election[2][4] leden van het #location_type:]

#stack(spacing: 0.5em, ..range(0, is_local_election(2, 4)).map(_ => textbox[Naam:][Handtekening:]))

== Ondertekening door andere aanwezige leden van het #location_type

#signing_form_label[Extra ondertekening:]

#stack(spacing: 0.5em, ..range(0, is_local_election(3, 1)).map(_ => textbox[Naam:][Handtekening:]))
