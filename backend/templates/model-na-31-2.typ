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
  #input.creation_date_time. Digitale vingerafdruk van EML-telbestand bij dit proces-verbaal (SHA-256): \
  #input.hash
])

#set heading(numbering: none)

#title_page(
  is_municipality[#input.election.domain_id #input.election.location][#input.election.location],
  is_municipality[Gemeentelijk stembureau][Stembureau voor het openbaar lichaam],
  [#input.election.name #format_date(input.election.election_date)],
  [
    Verslag en telresultaten per lijst en kandidaat \
    Model Na 31-2
  ],
)

== Details van het #location_type

#location_name

#input.election.location #format_date(input.election.election_date)

== Proces-verbaal

Elke #is_municipality[gemeente][openbaar lichaam] maakt bij een verkiezing een verslag: het proces-verbaal. Hierin staat hoe het tellen van de stemmen is verlopen en wat de uitslag van de stemming was.

#emph_block[
  In #this_location is gekozen voor *centrale stemopneming*.
  Ieder stembureau heeft direct na het stemmen geteld hoeveel stemmen elke lijst
  kreeg. Het *#location_type* telt de stemmen per kandidaat en telt daarna de resultaten van alle stembureaus bij elkaar op.
]

== Inhoudsopgave

- Deel 1 - *Verslag van de zitting* (het verloop van het tellen en optellen)
- Deel 2 - *Telresultaten* van de/het hele gemeente/openbaar lichaam
- Deel 3 - *Ondertekening* door de leden van het #location_type

\

- Bijlage 1: Telresultaten van alle stembureaus in de/het gemeente/openbaar lichaam
- Bijlage 2: Overzicht van alle bezwaren die op de stembureaus zijn gemaakt

#pagebreak(weak: true)

#show: doc => document_numbering(doc)

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

== Getelde stembureaus

=== De resultaten van onderstaande stembureaus zijn door het #location_type gecontroleerd en opgeteld tot het totaal van #is_municipality[de gemeente][het openbaar lichaam]. Als er extra onderzoeken hebben plaatsgevonden, dan kan dat in de laatste drie kolommen worden aangegeven.

#light_table(
  columns: (5em, 1fr, 1fr, 6em, 6em, 6em),
  headers: (
    [Nr.],
    [Naam locatie],
    [Postcode + Adres],
    [Toegelaten kiezers opnieuw vastgesteld?],
    [Onderzocht vanwege andere reden dan onverklaard verschil?],
    [Stembiljetten (deels) herteld?],
  ),
  values: input
    .polling_stations
    .map(polling_station => {
      (
        [#polling_station.number],
        [#polling_station.name],
        [
          #if "polling_station_type" in polling_station and polling_station.polling_station_type == "Mobile" [
            _(Mobiel stembureau)_
          ] else [
            #polling_station.address \
            #polling_station.postal_code #polling_station.locality
          ]
        ],
        align(center, checkbox(large: false)[]),
        align(center, checkbox(large: false)[]),
        align(center, checkbox(large: false)[]),
      )
    })
    .flatten(),
)

=== Voor de stembureaus waar onderzoek naar is gedaan kan hieronder een toelichting worden gegeven. Het geven van een toelichting is niet verplicht.

#empty_table(
  columns: (7em, 1fr),
  headers: ("Nummer stembureau", "Toelichting"),
  values: ("", ""),
  rows: 16,
)

#pagebreak(weak: true)

== Tijdens de zitting

=== Schrijf alle *bezwaren* van aanwezigen op.

Bijvoorbeeld over het ongeldig verklaren van een stembiljet. Schrijf geen namen of andere persoonsgegevens op. Schrijf alle bezwaren op, ook als u het er niet mee eens bent. Geef aan hoe het bezwaar door het #location_type is behandeld.

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
  rows: 5,
)

#pagebreak(weak: true)

= Telresultaten van #is_municipality[de gemeente][het openbaar lichaam]

== Aantal kiesgerechtigden

#letterbox("Z", value: input.election.number_of_voters)[Kiesgerechtigden]

== Toegelaten kiezers

#is_municipality[
  Tel het aantal geldige stempassen en volmachtbewijzen

  #sum(
    letterbox("A", value: input.summary.voters_counts.poll_card_count)[Stempassen],
    letterbox(
      "B",
      value: input.summary.voters_counts.proxy_certificate_count,
    )[Volmachtbewijzen (schriftelijk of via ingevulde stempas],
    letterbox(
      "D",
      light: false,
      value: input.summary.voters_counts.total_admitted_voters_count,
    )[Totaal toegelaten kiezers (A+B)],
  )
][
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

#if input.election.political_groups.len() > 0 [
  #sum(
    sum(
      ..input.election.political_groups.map(list => {
        let votes = input.summary.political_group_votes.find(v => v.number == list.number)

        if votes == none {
          return
        }

        letterbox([E.#list.number], value: votes.total)[Totaal lijst #list.number - #list.name]
      }),
      letterbox(
        "E",
        light: false,
        value: input.summary.votes_counts.votes_candidates_count,
      )[*Totaal stemmen op kandidaten* (tel E.1 t/m E.#input.election.political_groups.last().number op)],
    ),
    letterbox("F", value: input.summary.votes_counts.blank_votes_count)[Blanco stemmen],
    letterbox("G", value: input.summary.votes_counts.invalid_votes_count)[Ongeldige stemmen],
    letterbox(
      "H",
      light: false,
      value: input.summary.votes_counts.invalid_votes_count,
    )[*Totaal uitgebrachte stemmen (E+F+G)*],
  )
]

#pagebreak(weak: true)

== Verschillen tussen aantal kiezers en uitgebrachte stemmen

=== Is bij *alle afzonderlijke stembureaus* in #this_location het aantal uitgebrachte stemmen en het aantal toegelaten kiezers gelijk?

#checkbox[Ja #sym.arrow.r *Ga door naar #ref(<monitoring_protocol>)*]

#checkbox[Nee, er zijn stembureaus met een verschil]

=== Voor de stembureaus met de nummers #input.summary.differences_counts.more_ballots_count.polling_stations.map(str).join(", ") zijn *méér* uitgebrachte stemmen dan toegelaten kiezers geteld.

#letterbox(
  "I",
  value: input.summary.differences_counts.more_ballots_count.count,
)[Totaal aantal méér getelde stemmen in deze stembureaus]

=== Voor de stembureaus met de nummers #input.summary.differences_counts.fewer_ballots_count.polling_stations.map(str).join(", ") zijn *minder* uitgebrachte stemmen dan toegelaten kiezers geteld.

#letterbox(
  "J",
  value: input.summary.differences_counts.fewer_ballots_count.count,
)[Totaal aantal minder getelde stemmen in deze stembureaus]

== Uitkomst controleprotocol <monitoring_protocol>

Voer de controle uit volgens de stappen in het controleprotocol.

=== Kruis aan wat van toepassing is:

#checkbox[Er zijn geen verschillen geconstateerd.]

#checkbox[Er zijn verschillen geconstateerd. Er is contact opgenomen met de Kiesraad. Noteer hieronder wat daarvan de uitkomst is:]

#empty_lines(5)

#pagebreak(weak: true)

== Stemmen per lijst en per kandidaat

#for political_group in input.summary.political_group_votes {
  let election_political_group = input.election.political_groups.find(pg => pg.number == political_group.number)

  if election_political_group == none {
    continue
  }

  votes_table(
    title: [#political_group.number #election_political_group.name],
    headers: ("Kandidaat", "", "Stemmen"),
    total: political_group.total,
    values: political_group.candidate_votes.map(candidate => (
      name: candidate_name(election_political_group.candidates.find(c => c.number == candidate.number)),
      number: candidate.number,
      votes: candidate.votes,
    )),
    continue_on_next_page: [#sym.arrow.r De lijst gaat verder op de volgende pagina],
    column_total: (c, v) => [Subtotaal kolom #c: #fmt-number(v, zero: "0")],
    sum_total: columns => [Totaal lijst (kolom #columns)],
  )
}

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

#stack(spacing: 0.5em, ..range(0, 5).map(_ => textbox[Naam:][Handtekening:]))
