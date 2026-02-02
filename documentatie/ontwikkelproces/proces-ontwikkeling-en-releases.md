# Proces voor ontwikkeling en releases

Abacus wordt open source, in eigen huis en onder eigen regie ontwikkeld, voor meer flexibiliteit en controle.
We werken Agile, gericht op samenwerking en flexibiliteit. De ontwikkeling van functionaliteit delen we op in
kleine stukken, zodat we efficiënt kunnen opleveren en ons werk voortdurend kunnen verbeteren op basis
van feedback.

Aan het begin van de releasecyclus bepalen we welke functionaliteit we willen implementeren. Dit doen we in overleg met
het team tijdens een tweewekelijkse planningsmeeting. De prioriteit van de features bepalen we aan de hand van
verschillende factoren. Wil je als externe contributor een bijdrage leveren aan de software, neem dan contact op via abacus[@]kiesraad.nl.

## Stappen in het proces

### Input: nieuwe feature of change

Het bouwen van een nieuwe feature begint bij het verzamelen van input. Vele soorten input spelen hierbij een rol:

- Procesanalyse: hoe werkt het verkiezingsproces, hoe werkt de uitvoering in de praktijk, waar zitten de knelpunten?
- Wet- en regelgeving in de vorm van de Kieswet, het Kiesbesluit en de Kiesregeling
- Input vanuit de community naar aanleiding van community meetings
- Suggesties vanuit de community die binnenkomen via GitHub issues of andere kanalen
- Gebruikersonderzoek: observaties van doelgroep tijdens gebruik van de software

### Planning en ontwerp

De planning is de fase waarin we de verzamelde input vertalen naar epics en issues. We besluiten of we er iets mee gaan
doen en zo ja, hoe we dit gaan uitvoeren. De issues zijn niet overdreven specifiek: er is veel ruimte voor eigen inbreng
en refinement. Voor een beschrijving van hoe we epics en issues uitwerken, zie ons [refinement-document](/documentatie/ontwikkelproces/refinement.md).  
Als het nodig is overleggen we geplande features ook met het hogere management en/of de leden van de Kiesraad.

In de tweewekelijkse planningsmeeting wordt een duidelijk overzicht gemaakt van alle geplande taken. Alle taken en
issues worden bijgehouden op het [Abacus projectbord](https://github.com/orgs/kiesraad/projects/1).
De taken worden aan een _epic_ gekoppeld en de epics worden gerangschikt op prioriteit.

Het [ontwerp van de gebruikersinterface (in Figma)](https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware?node-id=3190-11434) bevat ontwerpen voor alle features die een ontwerp vereisen.
Dit wordt ook in de context van het gehele design besproken met het team.

Het aanmaken van een nieuw GitHub-issue voor een feature of change request gebeurt in overleg met het team.

### Ontwikkeling

Voor de ontwikkeling via GitHub werken we met issues die zijn opgenomen in epics. Aan issues in de 'Current' kolom van het bord kan worden gewerkt. Maak een nieuwe branch aan op basis van de main branch en schrijf de code die je wilt maken. Test je functionaliteit door zover zinvol tests te schrijven. Denk hierbij aan unittests, integration tests enzovoorts. Als je code en de tests klaar zijn en geschikt zijn voor review, maak dan een pull request aan. Wijs reviewers aan. Na review en approval kan de code worden gemerged. Een uitgebreidere beschrijving is te vinden in het document over [de werkwijze op GitHub](</documentatie/ontwikkelproces/GitHub-werkwijze.md>).

### Releases

Er vinden twee soorten releases plaats:

- Tussentijdse releases of builds
- Releases voor verkiezingen

#### Tussentijds

Tijdens de bouwfase en tussen verkiezingen kunnen releases worden gedaan als onderdeel van het ontwikkelproces, bijvoorbeeld gericht op het testen met gebruikers en stakeholders of het trainen met de software. Dit kan in principe een build van de `main` branch zijn.

Voordat we een release doen is het team zelf klaar met testen. Daarnaast worden tussentijdse pentests en andere vormen van toetsing uitgevoerd om ervoor te zorgen dat de toets op de release voor de verkiezingen geen verrassingen oplevert.

#### Releases voor verkiezingen

De release voor een verkiezing waar Abacus gebruikt wordt moet voldoen aan wettelijke vereisten. Voordat
er een versie getoetst gaat worden maken we een release branch aan zodat het
aantal wijzigingen tussen de getoetste en de definitieve versie minimaal blijft.

Een release moet aan een aantal vereisten voldoen:

- Alle issues en epics in de milestone voor de release zijn klaar.
- Alle functionaliteit is voldoende getest, zie [Testen en kwaliteit](</documentatie/ontwikkelproces/testen-en-kwaliteit.md>).
- De formele checks zijn geslaagd (pentest en [toets op de wettelijke kaders](https://zoek.officielebekendmakingen.nl/stb-2025-172.html))
- Alle documentatie is bijgewerkt voor de wijzigingen in deze release.
- De release is voorzien van release notes.

### Evaluatie

Na de release evalueren we hoe het is verlopen en hoe de release wordt ontvangen. Het verloop van het ontwikkelproces
wordt besproken in onze planningsmeeting en met enige regelmaat in een retro. Ook feedback van buitenaf nemen we hierin
mee.
