# Validatieregels en plausibiliteitschecks voor invoer tellingen

## Validatieregels geven fouten

Aan validatieregels moet voldaan worden. Als de fout optreedt, kan de gebruiker niet verder naar de volgende stap. De invoer wordt wel opgeslagen, maar is nog niet afgerond. De foutmelding wordt getoond als de regel evalueert naar `FALSE`.

De foutmelding die wordt getoond bestaat uit vier onderdelen:

- titel
- nummer
- toelichting
- handelingsperspectief

Titel, nummer en toelichting zijn uniek voor iedere foutmelding. Het handelingsperspectief is voor alle foutmeldingen gelijk, en is als volgt:

> - Heb je iets niet goed overgenomen? Herstel de fout en ga verder.
> - Heb je alles goed overgenomen en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.

### Regels voor alle numerieke invoervelden (reeks F.0xx)

Er zijn geen regels omdat het niet mogelijk is om foute aantallen in te vullen in de frontend, dus er wordt een error vanuit de backend gegeven als er toch met de aantallen geknoeid is en ze niet toegestaan zijn.

### Regels voor hertelling GSB (reeks F.1xx)

#### F.101: Vraag 'Is er herteld?' moet beantwoord worden

> **Controleer het papieren proces-verbaal** (F.101)  
> Is op pagina 1 aangegeven dat er in opdracht van het Gemeentelijk Stembureau is herteld?
>
> - Controleer of rubriek 3 is ingevuld. Is dat zo? Kies hieronder 'ja'.
> - Wel een vinkje, maar rubriek 3 niet ingevuld? Overleg met de coördinator.
> - Geen vinkje? Kies dan 'nee'.

Velden markeren: geen (laat alleen error zien op de pagina)

Bij deze foutmelding wordt het standaard handelingsperspectief niet getoond.

### Regels voor totalen (reeks F.2xx)

#### F.201: (Als niet herteld) `stempassen + volmachten + kiezerspassen = totaal toegelaten kiezers`

> **Controleer toegelaten kiezers** (F.201)  
> De invoer bij A, B, C of D klopt niet.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: A, B, C en D

#### F.202: `stemmen op kandidaten + blanco stemmen + ongeldige stemmen = totaal uitgebrachte stemmen`

> **Controleer uitgebrachte stemmen** (F.202)  
> De invoer bij E, F, G of H klopt niet.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: E, F, G en H

[Voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=126-5677&t=zTY4ajWtsFkiTOYP-4)

#### F.203: (Als herteld) `hertelde stempassen + hertelde volmachten + hertelde kiezerspassen = herteld totaal toegelaten kiezers`

> **Controleer hertelde toegelaten kiezers** (F.203)  
> De invoer bij A.2, B.2, C.2 of D.2 klopt niet.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: A.2, B.2, C.2 en D.2

#### F.204: `stemmen op kandidaten = som van uitgebrachte stemmen op de lijsten`

> **Controleer (totaal) aantal stemmen op kandidaten** (F.204)  
> De optelling van alle lijsten is niet gelijk aan de invoer bij E.  
> Check of je invoer bij E gelijk is aan het papieren proces-verbaal. En check of je alle lijsten hebt ingevoerd.

Veld markeren: E (dit gebeurt pas zodra alle lijsten zijn ingevuld, en er is dan een redirect naar _Aantal kiezers en stemmers_ om de error te laten zien)

### Regels voor verschillen (reeks F.3xx)

#### F.301 (Als (herteld) totaal aantal kiezers < totaal aantal uitgebrachte stemmen) `meer stembiljetten geteld = totaal aantal uitgebrachte stemmen - (herteld) aantal toegelaten kiezers`

> **Controleer I (stembiljetten meer geteld)** (F.301)  
> Je hebt bij _Aantal kiezers en stemmers_ ingevuld dat er meer stemmen dan kiezers waren. Het aantal dat je bij I hebt ingevuld is niet gelijk aan het aantal meer getelde stembiljetten.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Veld markeren: I

#### F.302 (Als (herteld) totaal aantal kiezers < totaal aantal uitgebrachte stemmen en J is ingevuld) `meer stembiljetten geteld = totaal aantal uitgebrachte stemmen - (herteld) aantal toegelaten kiezers`

> **Controleer J (stembiljetten minder geteld)** (F.302)  
> Je hebt bij _Aantal kiezers en stemmers_ ingevuld dat er meer stemmen dan kiezers waren. Daarom mag J niet ingevuld zijn.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Veld markeren: J

#### F.303 (Als (herteld) totaal aantal kiezers > totaal aantal uitgebrachte stemmen) `minder stembiljetten geteld = aantal toegelaten kiezers - totaal aantal uitgebrachte stemmen`

> **Controleer J (stembiljetten minder geteld)** (F.303)  
> Je hebt bij _Aantal kiezers en stemmers_ ingevuld dat er minder stemmen dan kiezers waren. Het aantal dat je bij J hebt ingevuld is niet gelijk aan het aantal minder getelde stembiljetten.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Veld markeren: J

#### F.304 (Als (herteld) totaal aantal kiezers > totaal aantal uitgebrachte stemmen en I is ingevuld) `minder stembiljetten geteld = herteld aantal toegelaten kiezers - totaal aantal uitgebrachte stemmen`

> **Controleer I (stembiljetten meer geteld)** (F.304)  
> Je hebt bij _Aantal kiezers en stemmers_ ingevuld dat er minder stemmen dan kiezers waren. Daarom mag I niet ingevuld zijn.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Veld markeren: I

#### F.305 (Als (herteld) totaal aantal kiezers == totaal aantal uitgebrachte stemmen) `minder stembiljetten geteld = 0 EN meer stembiljetten geteld = 0 EN niet ingeleverde stembiljetten EN te weinig uitgereikte stembiljetten EN te veel uitgereikte stembiljetten EN andere verklaring EN geen verklaring = 0`

> **Controleer ingevulde verschillen** (F.305)  
>
> Je hebt bij _Aantal kiezers en stemmers_ ingevuld dat er evenveel stemmen als kiezers waren. Maar je hebt wel verschillen ingevuld.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: velden uit set (I, J, K, L, M, N, O) die zijn ingevuld

### Regels voor kandidaten en lijsttotalen (reeks F.4xx)

#### F.401 `Totaal aantal stemmen op een lijst = som van aantal stemmen op de kandidaten van die lijst`

> **Controleer ingevoerde aantallen** (F.401)  
> De opgetelde stemmen op de kandidaten en het ingevoerde totaal zijn niet gelijk.  
> Check of je het papieren proces-verbaal goed hebt overgenomen.

Velden markeren: geen (laat alleen error zien op de pagina)

[Voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=1635-58277&t=zTY4ajWtsFkiTOYP-4)

## Plausibiliteitschecks geven waarschuwingen

Plausibiliteitschecks vragen de gebruiker de invoer extra te controleren. Ze resulteren in een niet-blokkerende waarschuwing. De waarschuwing wordt getoond als de check evalueert naar `FALSE`.

De foutmelding die wordt getoond bestaat uit dezelfde onderdelen als bij de validatieregels. Het handelingsperspectief voor alle plausibiliteitschecks is als volgt:

> - Heb je iets niet goed overgenomen? Herstel de fout en ga verder.
> - Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.

### (Bij tweede invoer) Alle ingevoerde waardes van de tweede invoer zijn gelijk aan die van de eerste invoer

> **Verschil met eerste invoer. Extra controle nodig**  
> Check of je de gemarkeerde velden goed hebt overgenomen van het papieren proces-verbaal.

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

Velden markeren: geen (laat alleen error zien op de pagina)

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

- Als er waarschuwingen zijn in stappen **vóór** de hoogste stap waar de gebruiker invoer voor heeft gedaan, dan tonen we bij die stap in de navigatiebalk een waarschuwings-icoon ([voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=137-4359&t=6BRGJQMHbKwihTCh-4)).
- **Fouten** in stappen vóór de hoogste stap waar de gebruiker invoer voor heeft gedaan kunnen in principe niet voorkomen (want een fout is blokkerend, je kan niet verder). Is dit toch het geval, dan redirecten we naar de eerste stap met een fout.
- Fouten of waarschuwingen **voorbij** de hoogste stap waar de gebruiker invoer voor heeft gedaan, tonen we niet.
- Zijn er fouten in de stap waar de gebruiker is, dan tonen we alleen de fouten en negeren we eventuele waarschuwingen in die stap.
- Zijn er geen fouten in de huidige stap, dan tonen we de waarschuwingen.
- Zijn er meerdere fouten of waarschuwingen in de huidige stap, dan tonen we alle waarschuwingen of fouten ([voorbeeld in Figma](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=2871-9169&t=FtsIfhKtOeDxlo9v-4)).
  - We tonen van elke melding de titel, het nummer en de toelichting.
  - Omdat het handelingsperspectief voor alle meldingen hetzelfde is, tonen we deze maar één keer.
  - We markeren alle invoervelden waar een foutmelding of waarschuwing op is. Gaat melding 1 over veld A, B en C, en melding 2 over veld C en D, dan markeren we dus A, B, C en D.
