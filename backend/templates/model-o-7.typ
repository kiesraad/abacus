#import "common/style.typ": conf, document_numbering, blank_page_before_signing
#import "common/scripts.typ": *
#let input = json("inputs/model-o-7.json")

#let is_local_election = (local, other) => is_local_election(input.election.category, local, other)
#let district_number = get_district_number(input.election.district)
#let location_name = [Kieskring #district_number]
#let location_type = [hoofdstembureau]

#show: doc => conf(
  doc,
  header-right: location_name,
  footer: [
    Datum: #input.creation_date_time. Digitale vingerafdruk van EML-telbestand bij dit PV: \
    #input.hash

    Proces-verbaal van een #location_type \
    Model O 7 (versie 2027)
  ], margin-bottom: 2.9cm
)

#set heading(numbering: none)

#title_page(
  [#location_name],
  [Hoofdstembureau],
  [#get_election_title(input.election), #format_date(input.election.election_date)],
  [
    Verslag en telresultaten per lijst en kandidaat \
    Model O 7
  ],
)

== Details van het #location_type

#input.committee_session.location #format_date_time(input.committee_session.start_date_time)

== Proces-verbaal

Het #location_type stelt de resultaten van de kieskring vast in een verslag: het proces-verbaal. Hierin staat hoe het tellen van de stemmen is verlopen.

== Inhoudsopgave

- Deel 1 - *Verslag van de zitting* (het verloop van het optellen)
- Deel 2 - *Telresultaten* van de hele kieskring
- Deel 3 - *Ondertekening* door de leden van het #location_type

#pagebreak(weak: true)

#show: doc => document_numbering(doc)
// Max numbering level is 2
#show heading.where(level: 3): it => [#block(it.body)]

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

#show: doc => document_numbering(doc)

== Fouten of vermoedens van fouten

=== Heeft het #location_type een fout gezien in de processen-verbaal van één of meer gemeentelijk stembureaus? Of vermoedt het hoofdstembureau dat er een fout is gemaakt?

Bijvoorbeeld: de aantallen in het proces-verbaal van het gemeentelijk stembureau komen niet overeen met de aantallen zoals weergegeven in het digitale telbestand.

#checkbox(checked: false)[Nee #sym.arrow.r *Ga verder naar #ref(<results>)*]

#checkbox(checked: false)[Ja. Vermeld hieronder welke (vermoedens van) fouten het #location_type bij welke gemeentelijk stembureaus heeft gezien. Zitten er verschillen tussen de aantallen in het digitale telbestand en het proces-verbaal van het gemeentelijk stembureau? Gebruik dan bij het vaststellen van de resultaten door het #location_type de aantallen zoals vermeld in het papieren proces-verbaal.]

#empty_table(
  columns: (16em, 1fr),
  headers: ("Gemeentelijk stembureau", "(Vermoede) fout en aanwijzing voor het centraal stembureau"),
  values: ("", ""),
  rows: 21,
)

#pagebreak(weak: true)

= Telresultaten van de Kieskring <results>

== Aantal kiesgerechtigden

#letterbox("Z", value: input.election.number_of_voters)[Kiesgerechtigden]

== Toegelaten kiezers

Tel het aantal geldige stempassen en volmachtbewijzen

#sum(
  letterbox("A", value: input.summary.voters_counts.poll_card_count)[Stempassen],
  letterbox(
    "B",
    value: input.summary.voters_counts.proxy_certificate_count,
  )[Volmachtbewijzen (schriftelijk of via ingevulde achterkant stempas of kiezerspas)],
  letterbox("C", value: input.summary.voters_counts.voter_card_count)[Kiezerspassen],
  letterbox(
    "D",
    light: false,
    value: input.summary.voters_counts.total_admitted_voters_count,
  )[*Totaal toegelaten kiezers (A+B+C)*],
)

#pagebreak(weak: true)

== Uitgebrachte stemmen

#if input.votes_tables.len() > 0 [
  #sum(
    sum(
      ..input.votes_tables.map(list => {
        let votes = input.summary.votes_counts.political_group_total_votes.find(v => v.number == list.number)

        if votes == none {
          return
        }

        letterbox([E.#list.number], value: votes.total)[Totaal lijst #list.number - #list.name]
      }),
      letterbox(
        "E",
        light: false,
        value: input.summary.votes_counts.total_votes_candidates_count,
      )[*Totaal stemmen op kandidaten* (tel E.1 t/m E.#input.votes_tables.last().number op)],
    ),
    letterbox("F", value: input.summary.votes_counts.blank_votes_count)[Blanco stemmen],
    letterbox("G", value: input.summary.votes_counts.invalid_votes_count)[Ongeldige stemmen],
    letterbox(
      "H",
      light: false,
      value: input.summary.votes_counts.total_votes_cast_count,
    )[*Totaal uitgebrachte stemmen (E+F+G)*],
  )
]

#pagebreak(weak: true)

== Verschillen tussen aantal kiezers en uitgebrachte stemmen

=== Is het aantal uitgebrachte stemmen en het aantal toegelaten kiezers gelijk?

#let differences = input.summary.differences_counts.more_ballots_count.count > 0 or input.summary.differences_counts.fewer_ballots_count.count > 0

#checkbox(checked: not differences)[Ja]

#checkbox(checked: differences)[Nee, er zijn verschillen]

=== In de stembureaus zijn in totaal *méér* uitgebrachte stemmen dan toegelaten kiezers geteld.

#letterbox(
  "I",
  value: input.summary.differences_counts.more_ballots_count.count,
)[Totaal aantal méér getelde stemmen]

=== In de stembureaus zijn in totaal *minder* uitgebrachte stemmen dan toegelaten kiezers geteld.

#letterbox(
  "J",
  value: input.summary.differences_counts.fewer_ballots_count.count,
)[Totaal aantal minder getelde stemmen]

#pagebreak(weak: true)

== Uitkomst controleprotocol

Voer de controle uit volgens de stappen in het controleprotocol.

=== Kruis aan wat van toepassing is:

#checkbox(checked: false)[Er zijn geen verschillen geconstateerd.]

#checkbox(
  checked: false,
)[#block(width: 125%, [Er zijn verschillen geconstateerd. Er is contact opgenomen met de Kiesraad. Noteer hieronder de uitkomst:])]

#empty_lines(5)

#block(width: 130%, above: 2em, below: 1.5em, [=== Is voor de invoer gebruik gemaakt van bestanden die zijn uitgewisseld via het platform ‘Teluitslagen’?])

#checkbox(checked: false)[Ja]

#checkbox(
  checked: false,
)[Nee, voor de volgende gemeenten zijn de resultaten van de papieren processen-verbaal twee keer handmatig
ingevoerd in de uitslagensoftware:]

#empty_lines(6)

#block(width: 130%, above: 2em, below: 1.5em, [=== Hebben de gemeentelijk stembureaus verschillen geconstateerd bij de uitvoering van het controleprotocol? Zo ja, noteer dan ook wat het gemeentelijk stembureau daarover heeft opgeschreven.])

#checkbox(checked: false)[Nee]

#checkbox(
  checked: false,
)[Ja, in de volgende gemeenten is een verschil geconstateerd:]

#empty_lines(6)

#pagebreak(weak: true)

== Stemmen per lijst en per kandidaat

#pagebreak(weak: true)

#for political_group in input.votes_tables {
  votes_table(
    title: [#political_group.number #political_group.name],
    headers: ("Kandidaat", "", "Stemmen"),
    total: political_group.total,
    votes_columns: political_group.columns,
    continue_on_next_page: [#sym.arrow.r De lijst gaat verder op de volgende pagina],
    column_total: "Subtotaal kolom",
    column_total_with_border: false,
    sum_total: columns => [Totaal lijst (kolom #columns)],
  )
}

#blank_page_before_signing(location_name)

= Ondertekening

Het proces-verbaal moet worden ondertekend door alle aanwezige leden. Bij het #location_type zijn dit er 5.

#signing_form_label[Datum]

#textbox_only_bottom_stroke[Datum en tijd:][Plaats:]

== Voorzitter, plaatsvervangend voorzitter en de leden van het #location_type

#signing_form_label[Voorzitter van het #location_type:]

#textbox[Naam:][Handtekening:]

#signing_form_label[Plaatsvervangend voorzitter van het #location_type:]

#textbox[Naam:][Handtekening:]

#signing_form_label[De andere leden van het #location_type:]

#stack(spacing: 0.5em, ..range(0, 3).map(_ => textbox[Naam:][Handtekening:]))
