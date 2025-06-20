# Validatieregels en plausibiliteitschecks voor invoer tellingen

## Validatieregels geven fouten

Validatieregels vragen de gebruiker de invoer extra te controleren. Ze resulteren in een niet-blokkerende foutmelding. De foutmelding wordt getoond als de regel evalueert naar `FALSE`.

De foutmelding die wordt getoond bestaat uit vier onderdelen:

- titel
- nummer
- toelichting
- handelingsperspectief

Titel, nummer en toelichting zijn uniek voor iedere foutmelding. Het handelingsperspectief is voor alle foutmeldingen gelijk, en is als volgt:

> - Heb je iets niet goed overgenomen? Herstel de fout en ga verder.
> - Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.

### Regels voor alle numerieke invoervelden (reeks F.0xx)

Er zijn geen regels omdat het niet mogelijk is om foute aantallen in te vullen in de frontend, dus er wordt een error vanuit de backend gegeven als er toch met de aantallen geknoeid is en ze niet toegestaan zijn.

### Regels voor hertelling GSB (reeks F.1xx)

#### CSO | F.101: 'Extra onderzoek': beide leeg, of beide ingevuld

> **Controleer je antwoorden** (F.101)  

Velden markeren: geen (laat alleen foutmelding zien op de pagina)

#### CSO | F.102: 'Extra onderzoek': één antwoord per vraag

> **Controleer je antwoorden** (F.101)  

Velden markeren: geen (laat alleen foutmelding zien op de pagina)

#### CSO | F.111: 'Verschillen met telresultaten van het stembureau': beide vragen verplicht

> **Controleer je antwoorden** (F.101)  

Velden markeren: geen (laat alleen foutmelding zien op de pagina)

#### CSO | F.112: 'Verschillen met telresultaten van het stembureau': één antwoord per vraag

> **Controleer je antwoorden** (F.101)  

Velden markeren: geen (laat alleen foutmelding zien op de pagina)

#### DSO | F.151: Over het proces-verbaal: Vragen bij 'Over het proces verbaal' moeten beantwoord worden

> **Controleer je antwoorden** (F.151)  
> Beantwoord de vragen over het papieren proces-verbaal. Overleg met de coördinator als je twijfelt.

Velden markeren: geen (laat alleen foutmelding zien op de pagina)
Het standaard handelingsperspectief wordt bij deze foutmelding niet getoond.

#### DSO | F.152: Over het proces-verbaal: Ongeldige combinatie van antwoorden: `wel corrigendum, geen inlegvel`

> **Het inlegvel ontbreekt, maar hoort wel aanwezig te zijn** (F.152)  
> Overleg met de coördinator over het ontbrekende inlegvel.

Velden markeren: geen (laat alleen foutmelding zien op de pagina)
Het standaard handelingsperspectief wordt bij deze foutmelding niet getoond.

#### DSO | F.153: 'Controles en correcties': vragen moeten beantwoord worden (geen vinkjes bij de eerste twee vragen)

> **Controleer je antwoorden** (F.153)  

Velden markeren: geen (laat alleen foutmelding zien op de pagina)

#### DSO | F.154: Controles en correcties: Ongeldige set documenten (vraag 'gecorrigeerde telresultaten' = 'nee')

> **Controleer je antwoorden** (F.154)  
> Er is een corrigendum, maar er zijn volgens de antwoorden op het inlegvel 'controles en correcties' geen gecorrigeerde telresulten.
> Overleg met de coördinator.

Velden markeren: geen (laat alleen foutmelding zien op de pagina)

#### DSO | F.155: Controles en correcties: Ongeldig antwoord in eerste zitting (vraag 'op verzoek van het CSB' = 'ja')

> **Controleer je antwoorden** (F.154)  
> Tijdens de eerste zitting kan er nog geen verzoek van het Centraal Stembureau zijn.
> Overleg met de coördinator.

Velden markeren: geen (laat alleen foutmelding zien op de pagina)

#### DSO | F.156: Controles en correcties: meer dan 1 antwoord op vraag 'zijn er gecorrigeerde telresultaten'

> **Controleer je antwoorden** (F.154)

Velden markeren: geen (laat alleen foutmelding zien op de pagina)

### Regels voor totalen (reeks F.2xx)

#### F.201: `stempassen + volmachten = totaal toegelaten kiezers`

> **Controleer toegelaten kiezers** (F.201)  
> De invoer bij A, B of D klopt niet.  

Velden markeren: A, B en D

#### F.202: `E.1 t/m E.n tellen niet op naar E`

> **Controleer de stemmen op lijsten en totaal stemmen op kandidaten** (F.202)  

Velden markeren: E.1 t/m E.n en E

#### F.203: `stemmen op kandidaten + blanco stemmen + ongeldige stemmen = totaal uitgebrachte stemmen`

> **Controleer uitgebrachte stemmen** (F.202)  
> De invoer bij E, F, G of H klopt niet.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: E, F, G en H


### Regels voor verschillen (reeks F.3xx)

#### F.301 "Vergelijk D&H": (checkbox D=H is aangevinkt, maar D<>H)

> **Controleer je antwoorden** (F.301)

Veld markeren: foutmelding op checkboxgroup Vergelijk D en H

#### F.302 "Vergelijk D&H": (checkbox D>H is aangevinkt, maar D<=H)

> **Controleer je antwoorden** (F.302)

Veld markeren: foutmelding op checkboxgroup Vergelijk D en H

#### F.303 "Vergelijk D&H": (checkbox D<H is aangevinkt, maar D>=H)

> **Controleer je antwoorden** (F.303)

Veld markeren: foutmelding op checkboxgroup Vergelijk D en H

#### F.304 "Vergelijk D&H": Meerdere aangevinkt of geen enkele aangevinkt

> **Controleer je antwoorden** (F.304)

Veld markeren: foutmelding op checkboxgroup Vergelijk D en H




#### F.305 (Als D < H) `I = H - D`

> **Controleer I (stembiljetten meer geteld)** (F.305)

Veld markeren: I

#### F.306 (Als D < H en J is ingevuld) `I = H - D`

> **Controleer I en J** (F.306)  

Veld markeren: I, J

#### F.307 (Als D > H) `J = D - H`

> **Controleer J** (F.307)  
Veld markeren: J

#### F.308 (Als D > H en I is ingevuld) `J = D - H`

> **Controleer I en J** (F.308)  

Veld markeren: I, J


### Regels voor kandidaten en lijsttotalen (reeks F.4xx)

#### F.401 `Totaal aantal stemmen op een lijst = som van aantal stemmen op de kandidaten van die lijst`

> **Controleer ingevoerde aantallen** (F.401)  
> De opgetelde stemmen op de kandidaten en het ingevoerde totaal zijn niet gelijk.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: geen (laat alleen foutmelding zien op de pagina)

[Voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=1635-58277&t=zTY4ajWtsFkiTOYP-4)


#### F.401 `Er zijn stemmen op kandidaten, en het totaal aantal stemmen op een lijst = leeg of 0`

> **Controleer het totaal van de lijst. Is dit veld op het papieren proces-verbaal ook leeg?  Dan kan je verdergaan.** (F.402)

Velden markeren: totaal van de lijst 
N.b. anders dan de andere foutmeldingen, tonen we deze foutmelding onderaan de pagina, onder het totaal-veld.
[Voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=6128-28260&t=R2mG7PyAWfHk3c8S-11)


## Plausibiliteitschecks geven waarschuwingen

Plausibiliteitschecks vragen de gebruiker de invoer extra te controleren. Ze resulteren in een niet-blokkerende waarschuwing. De waarschuwing wordt getoond als de check evalueert naar `FALSE`.

De foutmelding die wordt getoond bestaat uit dezelfde onderdelen als bij de validatieregels. Het handelingsperspectief voor alle plausibiliteitschecks is als volgt:

> - Heb je iets niet goed overgenomen? Herstel de fout en ga verder.
> - Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.

### Checks voor alle velden (reeks W.0xx)

#### W.001 (Bij tweede invoer) Alle ingevoerde waardes van de tweede invoer zijn gelijk aan die van de eerste invoer

> **Verschil met eerste invoer. Extra controle nodig** (W.001)  
> Check of je de gemarkeerde velden goed hebt overgenomen van het papieren proces-verbaal.

Velden markeren: alle velden met een verschil

[Voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=130-10813&t=zTY4ajWtsFkiTOYP-11)

### Checks voor hertelling GSB (reeks W.1xx)

Geen checks.

### Checks voor totalen (reeks W.2xx)

#### W.201 aantal blanco stemmen is minder dan 3% van het totaal uitgebrachte stemmen

> **Controleer aantal blanco stemmen** (W.201)  
> Het aantal blanco stemmen is erg hoog.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Veld markeren: F

[Voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=137-3939&t=zTY4ajWtsFkiTOYP-4)

#### W.202: Aantal ongeldige stemmen is minder dan 3% van het totaal uitgebrachte stemmen

> **Controleer aantal ongeldige stemmen** (W.202)  
> Het aantal ongeldige stemmen is erg hoog.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Veld markeren: G

#### W.203: Verschil tussen totaal aantal toegelaten kiezers en totaal aantal uitgebrachte stemmen is minder dan 2% en minder dan 15

- 2% of meer: abs(toegelaten kiezers - getelde stembiljetten) / getelde stembiljetten \>= 0.02
- 15 of meer: abs(toegelaten kiezers - getelde stembiljetten) \>= 15

> **Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen** (W.203)  
> Er is een onverwacht verschil tussen het aantal toegelaten kiezers (A t/m D) en het aantal uitgebrachte stemmen (E t/m H).  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: D en H

#### W.204: Verschil tussen herteld totaal aantal toegelaten kiezers en totaal aantal uitgebrachte stemmen is minder dan 2% en minder dan 15

- 2% of meer: abs(herteld toegelaten kiezers - getelde stembiljetten) / getelde stembiljetten \>= 0.02
- 15 of meer: abs(herteld toegelaten kiezers - getelde stembiljetten) \>= 15

> **Controleer aantal uitgebrachte stemmen en herteld aantal toegelaten kiezers** (W.204)  
> Er is een onverwacht verschil tussen het aantal uitgebrachte stemmen (E t/m H) en het herteld aantal toegelaten kiezers (A.2 t/m D.2).  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: H en D.2

#### W.205 Totaal aantal uitgebrachte stemmen niet leeg en groter dan 0

> **Controleer aantal uitgebrachte stemmen** (W.205)  
> Het totaal aantal uitgebrachte stemmen (H) is nul.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Veld markeren: H

#### W.206 (Als niet herteld en alleen als aantal kiesgerechtigden is ingevuld) Totaal aantal toegelaten kiezers en totaal aantal uitgebrachte stemmen zijn niet groter dan het aantal kiesgerechtigden

> **Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen** (W.206)  
> Het totaal aantal toegelaten kiezers (D) en/of het totaal aantal uitgebrachte stemmen (H) is hoger dan het aantal kiesgerechtigden voor dit stembureau.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Veld markeren: D en H

#### W.207 (Als herteld en alleen als aantal kiesgerechtigden is ingevuld) Totaal aantal uitgebrachte stemmen en totaal herteld aantal toegelaten kiezers is niet groter dan het aantal kiesgerechtigden

> **Controleer aantal uitgebrachte stemmen en herteld aantal toegelaten kiezers** (W.207)  
> Het totaal aantal uitgebrachte stemmen (H) en/of het herteld totaal aantal toegelaten kiezers (D.2) is hoger dan het aantal kiesgerechtigden voor dit stembureau.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Veld markeren: H en D.2

#### W.208 Getallen in blok toegelaten kiezers (A t/m D) zijn niet allemaal gelijk aan getallen in blok uitgebrachte stemmen (E t/m H)

> **Controleer A t/m D en E t/m H** (W.208)  
> De getallen bij A t/m D zijn precies hetzelfde als E t/m H.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: geen (laat alleen waarschuwing zien op de pagina)

#### W.209 Getallen in blok uitgebrachte stemmen (E t/m H) zijn niet allemaal gelijk aan getallen in blok hertelde toegelaten kiezers (A.2 t/m D.2)

> **Controleer E t/m H en A.2 t/m D.2** (W.209)  
> De getallen bij E t/m H zijn precies hetzelfde als A.2 t/m D.2.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: E, F, G, H, A.2, B.2, C.2, D.2

### Checks voor verschillen (reeks W.3xx)

#### W.301: (Alleen als (herteld) totaal aantal kiezers < totaal aantal uitgebrachte stemmen) `te veel uitgereikte stembiljetten + andere verklaring + geen verklaring - niet ingeleverde stembiljetten - te weinig uitgereikte stembiljetten = meer stembiljetten geteld`

> **Controleer ingevulde verschillen** (W.301)  
> De invoer bij I, K, L, M, N of O klopt niet.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: I, K, L, M, N en O

#### W.302: (Alleen als (herteld) totaal aantal kiezers > totaal aantal uitgebrachte stemmen) `niet ingeleverde stembiljetten + te weinig uitgereikte stembiljetten + andere verklaring + geen verklaring - te veel uitgereikte stembiljetten = minder stembiljetten geteld`

> **Controleer ingevulde verschillen** (W.302)  
> De invoer bij J, K, L, M, N of O klopt niet.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: J, K, L, M, N en O

### Checks voor kandidaten en lijsttotalen (reeks W.4xx)

Geen checks.

## Meerdere fouten en waarschuwingen in 1 response

Een request naar de backend kan meerdere fouten en waarschuwingen teruggeven.

In de user interface behandelen we die als volgt:

- Voor de stappen **vóór** de hoogste stap waar de gebruiker invoer voor heeft gedaan: als er fouten zijn dan tonen we bij die stap in de navigatiebalk een fout-icoon, als er alleen waarschuwingen zijn dan tonen we bij die stap in de navigatiebalk een waarschuwings-icoon ([voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=137-4359&t=6BRGJQMHbKwihTCh-4)).
- Fouten of waarschuwingen **voorbij** de hoogste stap waar de gebruiker invoer voor heeft gedaan, tonen we niet.
- Zijn er fouten of waarschuwingen in de huidige stap, dan tonen we alle waarschuwingen of fouten ([voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=2871-9169&t=FtsIfhKtOeDxlo9v-4)).
  - We tonen van elke melding de titel, het nummer en de toelichting.
  - Omdat het handelingsperspectief voor alle meldingen hetzelfde is, tonen we deze maar één keer.
  - We markeren alle invoervelden waar een foutmelding of waarschuwing op is. Gaat melding 1 over veld A, B en C, en melding 2 over veld C en D, dan markeren we dus A, B, C en D. Mocht er voor een invoerveld zowel een foutmelding als een waarschuwing zijn, dan wordt alleen de foutmelding markering getoond. 
