#import "common/style.typ": conf, attachement_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-na-31-2.json")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#show: doc => conf(doc, header: [Stembureau \<nummer>], footer: [
  Model Na 31-2 centrale stemopneming
])

#set heading(numbering: none)

= Bijlage 1

== Verslagen van tellingen van stembureau

#pagebreak(weak: true)

= Stembureau \<nummer> \  \<naam stembureau>

#line(length: 100%)

== Over deze bijlage

Het stembureau heeft op de dag van de verkiezingen de stemmen per lijst geteld. Het gemeentelijk stembureau/stembureau voor het openbaar lichaam heeft later op een centrale tellocatie geteld hoeveel stemmen elke kandidaat heeft gekregen. De telresultaten van het gemeentelijk stembureau/stembureau voor het openbaar lichaam zijn vergeleken met de eerdere tellingen door het stembureau. Alle telresultaten staan in deze bijlage.

#show: doc => attachement_numbering(doc, "B1")

= Alleen bij extra onderzoek: opmerkingen gemeentelijk stembureau/stembureau voor het openbaar lichaam

=== Heeft het gemeentelijk stembureau/stembureau voor het openbaar lichaam extra onderzoek gedaan vanwege een andere reden dan een onverklaard verschil?

#checkbox[Ja]
#checkbox[Nee]

=== Zijn de stembiljetten naar aanleiding van het extra onderzoek (gedeeltelijk) herteld?

#checkbox[Ja]
#checkbox[Nee]

Licht hieronder toe wat de reden van het extra onderzoek was

#empty_lines(3)

= Verschillen met telresultaten stembureau

== Aantallen kiezers en stemmen

=== Was er in de telresultaten van het *stembureau* (rubriek 2.3 van het proces-verbaal van het stembureau) een onverklaard verschil tussen het totaal aantal getelde stemmen en het aantal toegelaten kiezers?

#checkbox[Ja #sym.arrow.r *Hertel het aantal toegelaten kiezers (stempassen, kiezerspassen en volmachten)*, en noteer de uitkomsten bij rubriek 3.1]
#checkbox[Nee]

== Tel de stembiljetten

#emph_block[
  Tel nu de stembiljetten per kandidaat en noteer de uitkomsten bij rubrieken 3.2 en 3.5 van deze bijlage.
]

== Tellingen op lijstniveau

=== Is er een verschil tussen het totaal aantal getelde stemmen (vak H van rubriek 2.2) zoals eerder vastgesteld door het *stembureau* en zoals door u geteld op het *gemeentelijk stembureau/stembureau voor het openbaar lichaam*?

#checkbox[Ja #sym.arrow.r *Hertel het aantal toegelaten kiezers (tenzij dat bij de vorige vraag al gedaan is)*, en noteer de uitkomsten bij rubriek 3.1]
#checkbox[Nee]

#pagebreak(weak: true)

== Lijsten met verschillen

=== Noteer alle lijsten waar de telling door het *stembureau* afwijkt van de telling van vandaag door het *gemeentelijk stembureau/stembureau voor het openbaar lichaam*.

#empty_table(
  columns: (auto, auto, auto, auto, 26em),
  headers: (
    [Lijstnummer met verschil],
    [Lijsttotaal vastgesteld door het stembureau],
    [Lijsttotaal vastgesteld door het gemeentelijk stembureau],
    [Aantal stemmen verschil],
    [
      Toelichting op het telverschil, bijvoorbeeld:
      #set text(weight: "regular", size: 8pt)
      #set list(spacing: 0.75em)
      - Stembiljet was toch blanco, ongeldig of andersom
      - Stembiljet meegeteld bij verkeerde lijst
      - Meer of minder stembiljetten geteld dan stembureau
    ],
  ),
  values: ("", "", "", "", ""),
  rows: 25
)

#pagebreak(weak: true)

= Telresultaten

== Toegelaten kiezers <admitted_voters>

=== Heeft het gemeentelijk stembureau/stembureau voor het openbaar lichaam het aantal toegelaten kiezers opnieuw geteld? Schrijf dan die aantallen op. Neem anders de aantallen over die het stembureau heeft opgeschreven in het proces-verbaal.

#is_municipality[
  #sum(
    empty_letterbox("A")[Stempassen],
    empty_letterbox("B")[Volmachtbewijzen],
    empty_letterbox("D", light: false)[Totaal toegelaten kiezers (A+B)]
  )
][
  #sum(
    empty_letterbox("A")[Stempassen],
    empty_letterbox("B")[Volmachtbewijzen],
    empty_letterbox("C")[Kiezerspassen],
    empty_letterbox("D", light: false)[Totaal toegelaten kiezers (A+B+C)]
  )
]

#pagebreak(weak: true)

== Uitgebranchte stemmen

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

#checkbox[D en H zijn gelijk #sym.arrow.r Ga door naar #ref(<polling_station_declaration>)]

#checkbox[H is groter is dan D (meer uitgebrachte stemmen dan toegelaten kiezers)]

#box(
  inset: (left: 3em, bottom: 1em),
  empty_letterbox("I", cells: 3, light: false)[Aantal méér getelde stemmen (bereken: H min D)]
)

#checkbox[H is kleiner dan D (minder uitgebrachte stemmen dan toegelaten kiezers)]

#box(
  inset: (left: 3em, bottom: 1em),
  empty_letterbox("J", cells: 3, light: false)[Aantal minder getelde stemmen (bereken: D min H)]
)

=== Zijn er tijdens de stemming dingen opgeschreven die het verschil tussen D en H *volledig* verklaren? 

_(Gebruik het proces-verbaal van het stembureau #sym.arrow.r Tijdens de stemming, vraag 1.2.2)_

#checkbox[Ja]
#checkbox[Nee, er is een onverklaard verschil #sym.arrow.r → Hertel het aantal toegelaten kiezers(tenzij dat bij rubriek 2 al gedaan is) en noteer dit bij #ref(<admitted_voters>)]

== Verklaringen vanuit het stembureau <polling_station_declaration>

=== Neem de verklaringen over die in het *proces-verbaal van het stembureau bij vraag 1.2.2* staan. Ook als er nu geen telverschil meer is of als het telverschil kleiner is.

#empty_lines(12)

#pagebreak(weak: true)

== Stemmen per lijst en per kantidaat

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
      votes: none,
    )),
    continue_on_next_page: [#sym.arrow.r De lijst gaat verder op de volgende pagina],
    column_total: (c, v) => [Subtotaal kolom #c: ||||],
    sum_total: columns => [Totaal lijst (kolom #columns)],
  )
}
