#import "common/style.typ": conf, current_chapter_title, default_header, document_numbering, blank_page_before_signing
#import "common/scripts.typ": *
#let input = json("inputs/model-na-14-1-versie-1-variations/model-na-14-1-versie-1-GR.json")

#let is_municipality = (municipal, public_body) => is_municipality(input.election.location, municipal, public_body)
#let is_local_election = (local, other) => is_local_election(input.election.category, local, other)

#let is_mobile = "polling_station_type" in input.polling_station and input.polling_station.polling_station_type == "Mobile"

#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.location]
#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]
#let this_location = is_municipality[deze gemeente][dit openbaar lichaam]
#let location = is_municipality[gemeente][openbaar lichaam]

#let header-right = [#location_name\ Stembureau #input.polling_station.number]

#show: doc => conf(
  doc, 
  header-right: header-right, 
  footer: [
    Corrigendum van een proces-verbaal van een stembureau \
    Model Na 14-1 decentrale stemopneming (versie 2027)
  ]
)

#set heading(numbering: none)

#title_page(
  is_municipality[#input.election.domain_id #input.election.location][#input.election.location],
  is_municipality[Gemeentelijk stembureau][Stembureau voor het openbaar lichaam],
  [#input.election.name - #format_date(input.election.election_date)],
  [
    Verslag van telling van een door het #location_type herteld stembureau -
    Model Na 14-1 (eerste zitting)
  ],
)

== Details van het #location_type

#location_name

#input.committee_session.location #format_date_time(input.committee_session.start_date_time)

== Corrigendum van het proces-verbaal van een stembureau

Het #location_type heeft de telresultaten van dit stembureau onderzocht en is tot een ander resultaat gekomen. De nieuwe telresultaten zijn opgenomen in dit corrigendum.

== Inhoudsopgave

- Deel 1 – *Verschillen* met telresultaten stembureau
- Deel 2 - *Telresultaten* van het stembureau
- Deel 3 - *Ondertekening* door de leden van het #location_type

#pagebreak(weak: true)

#show: doc => document_numbering(doc)

#set page(
  header: context default_header(
    current_chapter_title(),
    header-right
  )
)

#attachment_or_corrigendum_title([Stembureau #input.polling_station.number\ #input.polling_station.name])

= Onderzoek naar telresultaten

== Aantallen kiezers en stemmen

#emph_block[
  Is in de telresultaten van het #underline[*stembureau*] (rubriek 2.3 van het proces-verbaal van het stembureau) het verschil tussen het totaal aantal getelde stembiljetten en het aantal toegelaten kiezers volledig verklaard? Controleer daarbij ook of rubriek 2.3 van het proces-verbaal van het stembureau correct is ingevuld en de verklaringen het verschil daadwerkelijk verklaren.
]

#checkbox[Ja]

#checkbox[Nee #sym.arrow.r *Hertel het aantal toegelaten kiezers en de stembiljetten. Tot het verschil is opgelost of beide één keer
zijn herteld.*]

== Hertelling door #location_type

#emph_block[
  Is het stembureau herteld vanwege (het vermoeden van) een andere fout?
]

#checkbox[Ja]

#checkbox[Nee]

#pagebreak(weak: true)

== Lijsten met verschillen

#emph_block[
  Noteer alle lijsten waar de telling door het #underline[*stembureau*] afwijkt van de telling door het #underline[*#location_type*].
]

#empty_table(
  columns: (auto, auto, 9em, auto, 29em),
  headers: (
    [Lijstnummer met verschil],
    [Lijsttotaal vastgesteld door het stembureau],
    [Lijsttotaal vastgesteld door het #location_type],
    [Aantal stemmen verschil],
    [
      Toelichting op het telverschil, bijvoorbeeld:
      #[
        #show list: content => block(width: 125%, content)
        #set text(weight: "regular", size: 7pt)
        #set list(spacing: 0.75em)
        - Stembiljet was toch blanco, ongeldig of andersom
        - Stembiljet meegeteld bij verkeerde lijst
        - Meer of minder stembiljetten geteld dan stembureau
      ]
    ],
  ),
  values: ("", "", "", "", ""),
  rows: 25,
)

#pagebreak(weak: true)

= Telresultaten

Vul alleen de gegevens in die anders zijn dan het oorspronkelijke proces-verbaal.

== Toegelaten kiezers

#is_local_election[
  Tel het aantal geldige stempassen en volmachtbewijzen

  #sum(
    empty_letterbox("A")[Stempassen],
    empty_letterbox("B")[Volmachtbewijzen (schriftelijk of via ingevulde achterkant stempas)],
    no_entry_letterbox("C")[Kiezerspassen (niet van toepassing bij gemeente- en eilandraadsverkiezingen)],
    empty_letterbox("D", light: false)[*Totaal toegelaten kiezers (A+B)*],
  )
][
  Tel het aantal geldige stempassen, volmachtbewijzen en kiezerspassen

  #sum(
    empty_letterbox("A")[Stempassen],
    empty_letterbox("B")[Volmachtbewijzen (schriftelijk of via ingevulde achterkant stempas of kiezerspas)],
    empty_letterbox("C")[Kiezerspassen],
    empty_letterbox("D", light: false)[*Totaal toegelaten kiezers (A+B+C)*],
  )
]

#pagebreak(weak: true)

== Uitgebrachte stemmen <cast_votes>

Vul alleen de gegevens in die anders zijn dan het oorspronkelijke proces-verbaal.

#if input.candidates_tables.len() > 0 [
  #sum(
    sum(
      ..input.candidates_tables.map(list => {
        empty_letterbox([E.#list.number])[Totaal lijst #list.number - #list.name]
      }),
      empty_letterbox(
        "E",
        light: false,
      )[*Totaal stemmen op kandidaten* (tel E.1 t/m E.#input.candidates_tables.last().number op)],
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

Vul alleen de gegevens in die anders zijn dan het oorspronkelijke proces-verbaal.

=== Vergelijk D (totaal toegelaten kiezers) en H (totaal uitgebrachte stemmen)

#checkbox[D en H zijn *gelijk* #sym.arrow.r *Ga door naar #ref(<candidate_votes>)*]

#checkbox[H is *groter* dan D (meer uitgebrachte stemmen dan toegelaten kiezers)]

#box(inset: (left: 3em, bottom: 1em), empty_letterbox(
  "I",
  cells: 3,
  light: false,
)[Aantal méér getelde stemmen (bereken: H _min_ D)])

#checkbox[H is *kleiner* dan D (minder uitgebrachte stemmen dan toegelaten kiezers)]

#box(inset: (left: 3em, bottom: 1em), empty_letterbox(
  "J",
  cells: 3,
  light: false,
)[Aantal minder getelde stemmen (bereken: D _min_ H)])

=== Zijn er tijdens de stemming dingen opgeschreven die het bovenstaande verschil tussen D en H volledig verklaren?

(Gebruik het proces-verbaal van het stembureau #sym.arrow.r *Tijdens de stemming, vraag 1.2.2*)

#checkbox[Ja #sym.arrow.r *Ga door naar #ref(<candidate_votes>)*]
#checkbox[Nee, er is een onverklaard verschil]

=== Geef als dat mogelijk is, een toelichting op het nog niet verklaarde verschil tussen het aantal toegelaten kiezers en het aantal uitgebrachte stemmen:

#empty_lines(10)

#pagebreak(weak: true)

== Stemmen per lijst en per kandidaat <candidate_votes>

#for political_group in input.candidates_tables {
  votes_table(
    title: [#political_group.number #political_group.name],
    headers: ("Kandidaat", "", "Stemmen"),
    total: political_group.total,
    votes_columns: political_group.columns,
    continue_on_next_page: [#sym.arrow.r De lijst gaat verder op de volgende pagina],
    column_total: "Subtotaal kolom",
    sum_total: columns => [Totaal lijst (kolom #columns)],
    total_instruction: [Neem dit totaal over in rubriek #ref(<cast_votes>) bij de juiste lijst.],
    explainer_text: [Vul alleen de gegevens in die anders zijn dan het oorspronkelijke proces-verbaal.]
  )
}

#blank_page_before_signing(header-right)

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

#pagebreak(weak: true)

#stack(spacing: 0.5em, ..range(0, 12).map(_ => textbox[Naam:][Handtekening:]))
