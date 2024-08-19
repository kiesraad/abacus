#import "common/style.typ": conf, title
#import "common/scripts.typ": input_date, input_digit
#let input = json("inputs/model-na-31-2.json")

#show: doc => conf(
  input,
  doc
)

#title(
  [Model Na 31-2],
  [Proces-verbaal van een gemeentelijk stembureau/ stembureau voor het openbaar lichaam (centrale stemopneming)],
  [
    De verkiezing van de leden van *#input.aanduiding_verkiezing* \ op *#input.datum* \
    #input.plek,
  ],
)
