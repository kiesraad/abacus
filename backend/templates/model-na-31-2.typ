#import "common/style.typ": conf, title, mono
#import "common/scripts.typ": *
#let input = json("inputs/model-na-31-2.json")

#show: doc => conf(input, doc, footer: [
  #input.creation_date_time. Digitale vingerafdruk van EML-telbestand bij dit proces-verbaal (SHA-256): \
  #input.hash
])

#let is_municipality = (municipal, public_body) => if input.election.category == "Municipal" [#municipal] else [#public_body]

#title(
  [Model Na 31-2],
  [Proces-verbaal van een #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] (centrale stemopneming)],
  [
    De verkiezing van de leden van #is_municipality[de *gemeenteraad*][#TODO] \ op *#format_date(input.election.election_date)* \
    #is_municipality[Gemeente *#input.election.location*][*#input.election.location*]
  ],
)

#heading(level: 2, numbering: none)[
  Waarom dit proces-verbaal?
]

Dit document geeft een verslag van de werkzaamheden van #is_municipality[een gemeentelijk stembureau][het stembureau voor het openbaar lichaam].
Bij een centrale stemopneming telt het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] de
stemmen per lijst en per kandidaat voor alle stembureaus in #is_municipality[de gemeente][het openbaar lichaam]. Vervolgens worden deze
aantallen opgeteld tot een totaal voor #is_municipality[de gemeente][het openbaar lichaam].

#heading(level: 2, numbering: none)[
  Wie vult dit proces-verbaal in?
]

Het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] vult dit proces-verbaal in. Alle leden die aanwezig
zijn aan het einde van de zitting ondertekenen dit document.

#alertbox([
  #heading(level: 2, numbering: none)[
    Controles in opdracht van het centraal stembureau
  ]
  #text(weight: "bold")[
    Let op! Dit controlevak word ingevuld door het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam], indien
    van toepassing
  ]
  #block_with_checkbox(checked: false)[
    In opdracht van het centraal stembureau heeft het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] de in
    dit proces-verbaal opgenomen aantallen (opnieuw) onderzocht. Deze blijken niet allemaal juist te zijn. Het
    #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] heeft in een nieuwe zitting de juiste aantallen
    vastgesteld. Zie voor de correcties het corrigendum dat bij dit proces-verbaal is gevoegd.

    Het corrigendum is vastgesteld op:
    #stack(spacing: 20pt, dir: ltr,
      date_input(date: none, top_label: [dd-mm-jjjj]),
      time_input(time: none, top_label: [tijd]),
    )
  ]
  #block_with_checkbox(checked: false)[
    In opdracht van het centraal stembureau heeft het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] de in
    dit proces-verbaal opgenomen aantallen (opnieuw) onderzocht. Dit heeft niet geleid tot wijzigingen.
  ]
])

= Zitting en aantal kiesgerechtigden

Het betreft de openbare zitting van het #is_municipality[gemeentelijk stembureau in de gemeente *#input.election.location*][stembureau voor het openbaar lichaam #TODO].

#is_municipality[][
  Kieskring #TODO
]

Datum en tijdstip aanvang zitting: #date_input(date: none, top_label: ("Dag", "Maand", "Jaar")) #time_input(time: none, top_label: "Tijd")

Aantal kiesgerechtigden in #is_municipality[de gemeente][het openbaar lichaam] bedraagt *#input.election.number_of_voters*

#pagebreak(weak: true)

= Aanwezigheid leden #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#emph[Houd per lid van het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] de tijden bij waarop het lid aanwezig
was. Indien er meerdere zittingslocaties waren, vermeld dan per lid de locatie.]

#table(
  columns: (auto, 1fr, auto),
  rows: 13,
  gutter: 10pt,
  stroke: 0.5pt + black,
  table.header(
    table.cell(stroke: none, text(size: 8pt, style: "italic", [Voorletters])),
    table.cell(stroke: none, text(size: 8pt, style: "italic", [Achternaam leden #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]])),
    table.cell(stroke: none, text(size: 8pt, style: "italic", [Aanwezig (van - tot)])),
  ),
  ..range(0, 12).map(_ => {(
    table.cell()[],
    table.cell(inset: 0pt, grid(rows: 2, columns: 2, inset: 6pt, grid.vline(x: 1, stroke: 0.5pt + black),
      grid.cell(text(size: 8pt, [Achternaam])),
      grid.cell()[],
      grid.cell(text(size: 8pt, [Locatie])),
      grid.cell()[]
    )),
    table.cell(align: horizon, stack(dir: ltr, spacing: 3pt, time_input(time: ""), align(top, [-]), time_input(time: ""))),
  )}).flatten(),
)

#pagebreak(weak: true)

= Stembureaus binnen #is_municipality[de gemeente][het openbaar lichaam]

#emph[Overzicht van de nummers en locaties van alle stembureaus binnen #is_municipality[de gemeente][het openbaar lichaam]:]
#columns(2, gutter: 10pt)[
  #table(
    columns: (auto, 1fr),
    inset: 8pt,
    stroke: 0.5pt + black,
    table.header(
      [_Nummer_], [_Locatie stembureau_]
    ),
    ..input.polling_stations.map(polling_station => {(
      [#polling_station.number],
      [
        #if polling_station.polling_station_type == "Mobile" [
          _(Mobiel stembureau)_
        ] else [
          #polling_station.address \
          #polling_station.postal_code #polling_station.locality
        ]
      ]
    )}).flatten(),
  )
]

#pagebreak(weak: true)

= Aantal toegelaten kiezers zoals vastgesteld door het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#emph[Som van de aantallen toegelaten kiezers van alle stembureaus in #is_municipality[de gemeente][het openbaar lichaam]. Dit is de som van de
aantallen opgenomen in bijlage 2, rubriek 1 of, indien van toepassing, rubriek 3.]

#summary_table(
  (
    ([Aantal geldige stempassen], [A], mono[#input.summary.voters_counts.poll_card_count]),
    ([Aantal geldige volmachtbewijzen (schriftelijk of via ingevulde stem- of kiezerspas)], [B], mono[#input.summary.voters_counts.proxy_certificate_count]),
    ([Aantal geldige kiezerspassen], [C], mono[#input.summary.voters_counts.voter_card_count]),
  ),
  added_together: [Tel op +],
  total: ([Het aantal tot de stemming toegelaten kiezers ( A + B + C = D )], [D], mono[#input.summary.voters_counts.total_admitted_voters_count])
)

= Aantal uitgebrachte stemmen zoals vastgesteld door het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#emph[Som van de aantallen uitgebrachte stemmen in alle stembureaus in #is_municipality[de gemeente][het openbaar lichaam]. Dit is de som van
de aantallen opgenomen in bijlage 2, rubriek 2.]

#summary_table(
  (
    ([Aantal geldige stemmen op kandidaten], [E], mono[#input.summary.votes_counts.votes_candidates_count]),
    ([Aantal blanco stemmen], [F], mono[#input.summary.votes_counts.blank_votes_count]),
    ([Aantal ongeldige stemmen], [G], mono[#input.summary.votes_counts.invalid_votes_count]),
  ),
  added_together: [Tel op +],
  total: ([Totaal aantal uitgebrachte stemmen ( E + F + G = H )], [H], mono[#input.summary.votes_counts.total_votes_cast_count])
)

#pagebreak(weak: true)

= Verschil tussen het aantal toegelaten kiezers en het aantal uitgebrachte stemmen zoals vastgesteld door het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

Is bij alle afzonderlijke stembureaus het aantal uitgebrachte stemmen en het aantal toegelaten kiezers gelijk?

#block_with_checkbox(checked: input.summary.differences_counts.more_ballots_count.count == 0 and input.summary.differences_counts.fewer_ballots_count.count == 0)[
  Ja. Ga verder met rubriek 7.
]

#let print_not_zero(value) = if value == 0 [] else [#value]

#block_with_checkbox(checked: input.summary.differences_counts.more_ballots_count.count > 0)[
  Nee, voor de stembureaus met de nummers #text_input(value: input.summary.differences_counts.more_ballots_count.polling_stations.map(str).join(", "), empty_width: 120pt) zijn #underline[*meer*] stembiljetten geteld dan er kiezers zijn toegelaten tot de stemming.
  #table(columns: (1fr, 80pt), stroke: 0.5pt + black, inset: 9pt, gutter: 10pt,
    [Het aantal #underline[*meer*] getelde stembiljetten bedraagt:],
    mono[#print_not_zero(input.summary.differences_counts.more_ballots_count.count)]
  )
]

#block_with_checkbox(checked: input.summary.differences_counts.fewer_ballots_count.count > 0)[
  Nee, voor de stembureaus met de nummers #text_input(value: input.summary.differences_counts.fewer_ballots_count.polling_stations.map(str).join(", "), empty_width: 120pt) zijn #underline[*minder*] stembiljetten geteld dan er kiezers zijn toegelaten tot de stemming.
  #table(columns: (1fr, 80pt), stroke: 0.5pt + black, inset: 9pt, gutter: 10pt,
    [Het aantal #underline[*minder*] getelde stembiljetten bedraagt:],
    mono[#print_not_zero(input.summary.differences_counts.fewer_ballots_count.count)]
  )
]

#heading(level: 2, numbering: none)[
  Hoe worden deze verschillen in de processen-verbaal van de stembureaus verklaard?
]

#emph[
  Verklaar het verschil tussen het aantal getelde stembiljetten en het aantal toegelaten kiezers. Vermeld hoe vaak hier
  sprake van was. Er kan meer dan één verklaring zijn.
]

#emph[
  Hieronder staan mogelijke verklaringen voor het verschil. Vermeld hoe vaak de volgende situaties zich hebben voorgedaan.
  Zie hiervoor ook de gegevens per stembureau die zijn opgenomen in bijlage 2, rubriek 3.
]

#table(
  gutter: 5pt,
  stroke: 0.5pt + black,
  columns: (1fr, 80pt),
  inset: 10pt,
  [Hoe vaak heeft een kiezer het stembiljet niet ingeleverd?], mono(print_not_zero(input.summary.differences_counts.unreturned_ballots_count.count)),
  [Hoe vaak is er een stembiljet te weinig uitgereikt?], mono(print_not_zero(input.summary.differences_counts.too_few_ballots_handed_out_count.count)),
  [Hoe vaak is er een stembiljet te veel uitgereikt?], mono(print_not_zero(input.summary.differences_counts.too_many_ballots_handed_out_count.count)),
  [
    Hoe vaak is er een andere verklaring voor het verschil? \
    #text(size: 7pt, style: "italic")[(vermeld hieronder de andere verklaringen en hoe vaak er sprake van was)]
  ], mono(print_not_zero(input.summary.differences_counts.other_explanation_count.count)),
  [], [],
  [], [],
  [], [],
  [], [],
  [], [],
  [Hoe vaak is er geen verklaring voor het verschil?], mono(print_not_zero(input.summary.differences_counts.no_explanation_count.count)),
)

#pagebreak(weak: true)

= Nieuwe telling aantal toegelaten kiezers bij onverklaarde verschillen

Voor de stembureaus met de nummers #text_input(value: input.summary.recounted_polling_stations.map(str).join(", "), empty_width: 300pt) heeft het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]
een nieuwe telling uitgevoerd van het aantal toegelaten kiezers, omdat er sprake was van een onverklaard verschil tussen
enerzijds het aantal toegelaten kiezers zoals vastgesteld door het stembureau en anderzijds het aantal uitgebrachte
stemmen zoals vastgesteld door het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] (zie rubriek 3 van
bijlage(n) 2 bij dit proces-verbaal).

= Bij gecombineerde stemmingen

Zijn de verzegelde pakken van een andere verkiezing geopend omdat er een gegrond vermoeden bestond dat stembiljetten,
stempassen, volmachtbewijzen of kiezerspassen van de eigen verkiezing zich in deze pakken bevonden?

#block_with_checkbox(checked: false)[
  Nee
]

#block_with_checkbox(checked: false)[
  Ja, er zijn verzegelde pakken van de verkiezing van #text_input(value: none, empty_width: 120pt) geopend.
  Hierin zijn aangetroffen en bij de stemopneming van de eigen verkiezing betrokken:

  #emph[Noteer hier het nummer van het betreffende stembureau en het aantal stembiljetten, dan wel stempassen, volmachtbewijzen of kiezerspassen dat is aangetroffen.]

  #alertbox(height: 200pt)[]
]

#pagebreak(weak: true)

= Bezwaren van kiezers tijdens de zitting van het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

Bezwaren zijn klachten of aanmerkingen van kiezers. Voorbeelden van bezwaren van kiezers: een stem op een stembiljet
wordt onterecht geldig, ongeldig of blanco verklaard, het resultaat van de telling wordt niet bekend gemaakt, het resultaat van
de telling is onjuist.

#emph[
  Leg alle bezwaren van kiezers die zijn ingebracht tijdens de zitting van het
  #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] vast in dit proces-verbaal. Ook als het
  #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] het er niet mee eens is. Heeft het
  #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] een reactie op het bezwaar? Noteer die dan ook. #underline[*Let op:*] noteer geen persoonsgegevens van kiezers.
]

#alertbox(height: 200pt)[]

= Onregelmatigheden of bijzonderheden

#emph[
  Omschrijf de onregelmatigheden of bijzonderheden tijdens de zitting en vermeld hoe vaak hier sprake van was.
  Denk onder andere ook aan de situatie dat er onverhoopt iets is misgegaan tijdens het vervoer en/of de opslag
  van de stembescheiden. #underline[*Let op:*] noteer geen persoonsgegevens van kiezers.
]

#alertbox(height: 200pt)[]

#pagebreak(weak: true)

= Aantal stemmen per lijst en per kandidaat in #is_municipality[de gemeente][het openbaar lichaam]

#for political_group in input.summary.political_group_votes [
  #let election_pg = input.election.political_groups.find(pg => pg.number == political_group.number)

  #table(
    columns: (80pt, 1fr, auto),
    inset: 8pt,
    stroke: 0.5pt + black,
    fill: (_, y) => if y > 2 and calc.even(y) { rgb("EAF2F5") },
    table.header(
      table.cell(colspan: 3, grid(
        columns: (auto, auto),
        gutter: 12pt,
        [*Lijstnaam*],   [#election_pg.name],
        [*Lijstnummer*], [#political_group.number],
      )),
      [*Nummer op de lijst*], [*Naam kandidaat*], [*Aantal stemmen*],
    ),
    ..for candidate in political_group.candidate_votes {
      let election_candidate = election_pg.candidates.find(c => c.number == candidate.number)
      (
        align(right)[#candidate.number],
        [#election_candidate.initials #election_candidate.last_name (#election_candidate.first_name)],
        align(right, mono[#candidate.votes]),
      )
    },
    table.cell(colspan: 2, align(right)[*Totaal* (stemcijfer)]),
    [
      #align(right, mono[#political_group.total])
    ]
  )
  #pagebreak(weak: true)
]

= Leden van het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#emph[
  Alle leden van het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] die aanwezig zijn aan
  het einde van de zitting, noteren hieronder hun naam. Ga vervolgens naar rubriek 13 voor de ondertekening.
]

#block(width: 100%, align(right + horizon, stack(dir: ltr, spacing: 15pt, [Datum: ], date_input(date: none, top_label: ([Dag], [Maand], [Jaar])))))

Naam voorzitter
#letterbox_main([1], [])

Naam leden
#for idx in range(2, 11) {
  letterbox_main(idx, [])
}

#pagebreak(weak: true)

= Ondertekening leden van het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#emph[
  Alle leden van het #is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam] die in rubriek 12 hun
  naam hebben genoteerd, ondertekenen het proces-verbaal. Houd hierbij de volgorde aan van rubriek 12.
]

#block(width: 100%, align(right + horizon, stack(dir: ltr, spacing: 15pt,
  [Datum: ],
  date_input(date: none, top_label: ([Dag], [Maand], [Jaar])),
  time_input(time: none, top_label: "Tijd")
)))

Handtekening voorzitter
#letterbox_main([1], [], height: 45pt)

Handtekening leden
#for idx in range(2, 11) {
  letterbox_main(idx, [], height: 45pt)
}

#pagebreak(weak: true)
