#import "common/style.typ": conf, document_numbering
#import "common/scripts.typ": *
#let input = json("inputs/model-na-31-2.json")
#set text(lang: "nl")

#let is_municipality = (municipal, public_body) => if (
  input.election.category == "Municipal"
) { municipal } else { public_body }

#let location_name = is_municipality[Gemeente #input.election.domain_id #input.election.location][Openbaar lichaam #input.election.location]
#let location_type = is_municipality[gemeentelijk stembureau][stembureau voor het openbaar lichaam]

#show: doc => conf(doc, header-right: location_name, footer: [
  Proces-verbaal van een #location_type\
  Model Na 31-2 centrale stemopneming
])

#set page(numbering: (_, _) => [Later ingevoegde pagina])
#set heading(numbering: none)

= Controles in opdracht van het centraal stembureau

#emph_block[
  Deze pagina is toegevoegd door de leden van het #location_type. In opdracht van het centraal stembureau heeft het #location_type de in dit proces-verbaal opgenomen aantallen (opnieuw) onderzocht. Voeg deze pagina toe na het voorblad van het oorspronkelijke proces-verbaal van het #location_type (Na 31-1 of Na 31-2).
]

=== Zijn er gecorrigeerde telresultaten?

#checkbox[Nee, de oorspronkelijke telresultaten waren correct]

#checkbox[Ja, er zijn gecorrigeerde telresultaten (zie voor de correcties het corrigendum dat bij dit proces-verbaal is gevoegd)]

=== Opgesteld door het gemeentelijk stembureau

#textbox[Datum en tijd:]
