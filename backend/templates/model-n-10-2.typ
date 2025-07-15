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
    Model N 10-2
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
  In #this_location is gekozen voor centrale stemopneming. Het stembureau telt na het stemmen het aantal kiezers, en hoeveel stemmen elke lijst heeft gekregen. Het gemeentelijk stembureau/stembureau voor het openbaar lichaam telt 1 of 2 dagen later de stemmen per kandidaat op een centrale tellocatie. Die telresultaten staan in het verslag van het gemeentelijk stembureau/stembureau voor het openbaar lichaam.
]

== Inhoudsopgave

- Deel 1 - *Verslag van de zitting* (het verloop van het stemmen en tellen)
- Deel 2 - *Telresultaten* van dit stembureau
- Deel 3 - *Ondertekening* door de leden van het stembureau

#pagebreak(weak: true)

#show: doc => document_numbering(doc)

= Verslag van de zitting

== Presentielijst

=== Aanwezige leden van het stembureau

De volgende rollen zijn mogelijk: voorzitter, plaatsvervangend voorzitter, lid of teller. Vink aan of iemand bij het stemmen en/of tellen aanwezig was.

#empty_table(
  columns: (8em, 1fr, 1fr, 1fr, 7em, 7em),
  headers: ("Voorletters", "Achternaam", "Rol", "Aanwezig (van - tot)", "Aanwezig bij stemmen", "Aanwezig bij tellen"),
  values: ("", "", "", "-", checkbox(large: false)[], checkbox(large: false)[]),
  rows: 22,
)

== Tijdens het stemmen

=== Schrijf *alle bezwaren van aanwezigen tijdens het stemmen* op.

Bijvoorbeeld over toegankelijkheid, niet toegelaten worden of het stemgeheim.

Schrijf geen namen of andere persoonsgegevens op. Schrijf alle bezwaren op, ook als u het er niet mee eens bent. Geef aan hoe het bezwaar door het stembureau is afgehandeld.

#empty_table(
  columns: (7em, 1fr, 1fr),
  headers: ("Tijdstip", "Bezwaar", "Reactie stembureau"),
  values: ("", "", ""),
  rows: 24,
)

#pagebreak(weak: true)

=== Schrijf gedurende de dag alles op wat tijdens het tellen van de stemmen *verschillen tussen het aantal toegelaten kiezers en de uitgebrachte stemmen* kan verklaren.

Denk aan kiezers die het stembiljet niet in de stembusstoppen maar meenemen. Of kiezers die één stempas inleverden en twee stembiljetten kregen.

#empty_table(
  columns: (7em, 1fr),
  headers: ("Tijdstip", "Gebeurtenis"),
  values: ("", ""),
  rows: 14,
)

=== Andere *bijzonderheden* die mogelijk invloed hebben op het stemproces of de resultaten van dit stembureau.

Denk aan stembureauleden die te laat waren, niet werkende techniek of stembussen die vol waren. Of een stembureaulid dat met een stempas uit een andere gemeente/openbaar lichaam in dit stembureau heeft gestemd.

#empty_table(
  columns: (7em, 1fr),
  headers: ("Tijdstip", "Bijzonderheid"),
  values: ("", ""),
  rows: 8,
)

#pagebreak(weak: true)

== Tijdens het tellen

=== Wanneer en waar zijn de stemmen geteld?

#empty_table(
  columns: (8em, 10em, 1fr),
  headers: ("Datum", "Tijd (van - tot)", "Locatie (als anders dan stembureau)"),
  values: ("", "", ""),
  rows: 1,
)

=== Schrijf alle *bezwaren van aanwezigen tijdens het tellen* op

Bijvoorbeeld als iemand het niet eens is met het ongeldig verklaren van een stembiljet. Schrijf geen namen of andere persoonsgegevens op. Schrijf alle bezwaren op, ook als u het er niet mee eens bent. Geef aan hoe het bezwaar door het stembureau is behandeld.

#empty_table(
  columns: (7em, 1fr, 1fr),
  headers: ("Tijdstip", "Bezwaar", "Reactie stembureau"),
  values: ("", "", ""),
  rows: 12,
)

=== Andere *bijzonderheden* die mogelijk invloed hebben op het telproces of de resultaten van dit stembureau.

Bijvoorbeeld als er meerdere verkiezingen tegelijk werden georganiseerd, en een stembiljet in de verkeerde stembus zat. Of een schorsing van de telling.

#empty_table(
  columns: (7em, 1fr),
  headers: ("Tijdstip", "Bijzonderheid"),
  values: ("", ""),
  rows: 6,
)

#pagebreak(weak: true)

= Telresultaten

== Toegelaten kiezers

#is_municipality[
  Tel het aantal geldige stempassen en volmachtbewijzen

  #sum(
    empty_letterbox("A")[Stempassen],
    empty_letterbox("B")[Volmachtbewijzen (schriftelijk of via ingevulde stempas)],
    empty_letterbox(
      "D",
      light: false,
    )[Totaal toegelaten kiezers (A+B)],
  )
][
  Tel het aantal geldige stempassen, volmachtbewijzen en kiezerspassen

  #sum(
    empty_letterbox("A")[Stempassen],
    empty_letterbox(
      "B",
    )[Volmachtbewijzen (schriftelijk of via ingevulde stempas of kiezerspas)],
    empty_letterbox("C")[Kiezerspassen],
    empty_letterbox(
      "D",
      light: false,
    )[Totaal toegelaten kiezers (A+B+C)],
  )
]

#pagebreak(weak: true)

== Uitgebrachte stemmen <cast_votes>

=== Beoordeel de stembiljetten en tel het aantal stembiljetten per kandidaat. Bereken het aantal stemmen per lijst. Tel de blanco en ongeldige stembiljetten.

#if input.election.political_groups.len() > 0 [
  #sum(
    sum(
      ..input.election.political_groups.map(list => {
        empty_letterbox([E.#list.number])[Totaal lijst #list.number - #list.name]
      }),
      empty_letterbox(
        "E",
        light: false,
      )[*Totaal stemmen op kandidaten* (tel E.1 t/m E.#input.election.political_groups.last().number op)],
    ),
    empty_letterbox("F")[Blanco stemmen],
    empty_letterbox("G")[Ongeldige stemmen],
    empty_letterbox(
      "H",
      light: false,
    )[*Totaal uitgebrachte stemmen (E+F+G)*],
  )
]

#pagebreak(weak: true)

== Verschillen tussen aantal kiezers en uitgebrachte stemmen

=== Vergelijk D (totaal toegelaten kiezers) en H (totaal uitgebrachte stemmen)

#checkbox[D en H zijn gelijk #sym.arrow.r *Ga door naar #ref(<signing>)*]

#checkbox[H is groter is dan D (meer uitgebrachte stemmen dan toegelaten kiezers)]

#box(inset: (left: 3em, bottom: 1em), empty_letterbox(
  "I",
  cells: 3,
  light: false,
)[Aantal méér getelde stemmen (bereken: H _min_ D)])

#checkbox[H is kleiner dan D (minder uitgebrachte stemmen dan toegelaten kiezers)]

#box(inset: (left: 3em, bottom: 1em), empty_letterbox(
  "J",
  cells: 3,
  light: false,
)[Aantal minder getelde stemmen (bereken: D _min_ H)])

=== Zijn er tijdens de stemming (rubriek 1.2.2) dingen opgeschreven die het verschil tussen D en H volledig verklaren?

#checkbox[Ja]
#checkbox[Nee, er is een onverklaard verschil]

#pagebreak(weak: true)

#emph_block[Deze pagina is expres leeg]

Zo komt het handtekeningen-blad altijd op een losse pagina, ook als het verslag dubbelzijdig is geprint.

#pagebreak(weak: true)

= Ondertekening <signing>

=== Datum

#textbox[Datum en tijd:][Plaats:]

== Verplicht: voorzitter en twee leden van het stembureau

=== Voorzitter van het stembureau:

#textbox[Naam:][Handtekening:]

=== #is_municipality[Twee][Vier] leden van het #location_type

#stack(spacing: 0.5em, ..range(0, 2).map(_ => textbox[Naam:][Handtekening:]))

== Ondertekening door andere aanwezige leden van het stembureau

=== Extra ondertekening: (niet verplicht)

#stack(spacing: 0.5em, ..range(0, 4).map(_ => textbox[Naam:][Handtekening:]))
