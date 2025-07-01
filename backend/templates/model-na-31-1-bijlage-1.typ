#import "common/style.typ": conf, document_numbering
#import "common/scripts.typ": *

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

= Lijsten met verschillen

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

== Toegelaten kiezers

=== Heeft het gemeentelijk stembureau/stembureau voor het openbaar lichaam het aantal toegelaten kiezers opnieuw geteld? Schrijf dan die aantallen op. Neem anders de aantallen over die het stembureau heeft opgeschreven in het proces-verbaal.

#sum(
  letterbox("A", value: 6)[Stempassen],
  letterbox("B")[Volmachtbewijzen],
  letterbox("D", light: false)[Totaal toegelaten kiezers (A+B)]
)
