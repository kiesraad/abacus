# Proces voor ontwikkeling en releases

Abacus wordt open source, in eigen huis en onder eigen regie ontwikkeld, voor meer flexibiliteit en controle.
We werken volgens de Agile-methode, die is gericht op samenwerking en flexibiliteit. De ontwikkeling van functionaliteit
delen we op in kleine stukken, zodat we efficiënt kunnen opleveren en ons werk voortdurend kunnen verbeteren op basis
van feedback.

Aan het begin van de releasecyclus bepalen we welke functionaliteit we willen implementeren. Dit doen we in overleg met
het team tijdens een tweewekelijkse planningsmeeting. De prioriteit van de features bepalen we aan de hand van
verschillende factoren.

## Stappen in het proces

### 1. Input: nieuwe feature of change

Het bouwen van een nieuwe feature begint bij het verzamelen van input. Vele soorten input spelen hierbij een rol:

- Procesanalyse: hoe werkt het verkiezingsproces, hoe werkt de uitvoering in de praktijk, waar zitten de knelpunten?
- Wet- en regelgeving in de vorm van de Kieswet, het Kiesbesluit en de Kiesregeling
- Input vanuit de community naar aanleiding van community meetings
- Suggesties vanuit de community die binnenkomen via GitHub issues of andere kanalen
- Gebruikersonderzoek: observaties van doelgroep tijdens gebruik van de software

### 2. Planning en ontwerp

De planning is de fase waarin we de verzamelde input vertalen naar epics en issues. We besluiten of we er iets mee gaan
doen en zo ja, hoe we dit gaan uitvoeren. De issues zijn niet overdreven specifiek: er is veel ruimte voor eigen inbreng
en refinement.
Als het nodig is overleggen we geplande features ook met het hogere management en/of de leden van de Kiesraad.

In de tweewekelijkse planningsmeeting wordt een duidelijk overzicht gemaakt van alle geplande taken. Alle taken en
issues worden bijgehouden op het [GitHub Projects bord].
De taken worden aan een _epic_ gekoppeld en de epics worden gerangschikt op prioriteit.

Het [UX design in Figma] bevat ontwerpen voor alle features die een ontwerp vereisen.
Dit wordt ook in de context van het gehele design besproken met het team.

Het aanmaken van een nieuw GitHub-issue voor een feature of change request gebeurt in overleg met het team.
Gezien onze zero bug policy kan een bug report ook leiden tot een GitHub-issue.

[GitHub Projects bord]: https://github.com/orgs/kiesraad/projects/1/views/2
[UX design in Figma]: https://www.figma.com/design/zZlFr8tYiRyp4I26sh6eqp/Kiesraad---Abacus-optelsoftware

### 3. Ontwikkeling

Voor de ontwikkeling via GitHub hanteren we de volgende werkwijze:

- Pak een issue op uit de 'Current'-kolom van het bord:
    - Bekijk de bijbehorende epic voor context over dit issue.
    - Controleer of alle randvoorwaarden zijn voltooid. Als er een randvoorwaarde mist en er nog geen issue voor is,
      overleg dan met het team.
    - Bedenk of het issue duidelijk genoeg is om te implementeren.
      Zijn er architectuur-overwegingen die afgestemd moeten worden?
      Bij twijfel, betrek het team voordat je code gaat schrijven.

- Maak een nieuwe branch aan op basis van de main branch:
    - `git checkout -b <branch name>`
    - Geef de branch een duidelijk beschrijvende naam.
      Gebruik bij voorkeur de naam die door de 'Create a branch'
      link bij het GitHub-issue wordt voorgesteld.

- Schrijf de code:
    - Implementeer de functionaliteit die wordt beschreven in het issue.
    - Maak testen aan voor de functionaliteit en voer ze uit.

- Maak een pull request aan:
    - Als de branch commits bevat die al eerder gemerged zijn, kun je die verwijderen met een _interactive rebase_:
      `git fetch; git rebase origin/main --interactive` en verwijder de betreffende commits uit de lijst.
    - Verwijs naar het issue in een comment, bijv. `Closes #42`
    - Wijs ten minste 2 reviewers aan.

- Merge de pull request:
    - Zorg dat de branch up to date is met main
    - Zorg dat alle opmerkingen (conversations) opgelost zijn.
    - Zorg dat je 2 approvals hebt
    - Consolideer de merge message; behoud alleen de belangrijkste punten
    - Sluit de pull request met *Squash and Merge*.

Dit project gebruikt [Lefthook] om de Git pre-commit hook te beheren. Lefthook zal
automatisch geïnstalleerd worden wanneer `npm install` wordt uitgevoerd in de `frontend`
directory.

[Lefthook]: https://github.com/evilmartians/lefthook

### 4. Releases

Er vinden twee soorten releases plaats: 

- tussentijdse releases of builds
- releases voor verkiezingen

#### Tussentijds

Tijdens de bouwfase en tussen verkiezingen kunnen releases worden gedaan als onderdeel van het ontwikkelproces, bijvoorbeeld gericht op het testen of trainen met de software. Dit kan in principe een build van de `main` branch zijn.

Zo worden tussentijdse pentests en andere vormen van toetsing uitgevoerd om ervoor te zorgen dat de toets op de release voor de verkiezingen geen verrassingen oplevert.

#### Releases voor verkiezingen

De release voor een verkiezing waar Abacus gebruikt wordt moet voldoen aan wettelijke vereisten. Voordat
er een versie getoetst gaat worden maken we een release branch aan zodat het
aantal wijzigingen tussen de getoetste en de definitieve versie minimaal blijft.

Een release moet aan een aantal vereisten voldoen:

- Alle issues en epics in de milestone voor de release zijn klaar.
- Alle functionaliteit is voldoende getest, zie [Testen en valideren](#testen-en-valideren).
- De security checks zijn geslaagd, zie [Security checks](#security-checks).
- Alle documentatie is bijgewerkt voor de wijzigingen in deze release.
- De release is voorzien van release notes.

### 5. Evaluatie

Na de release evalueren we hoe het is verlopen en hoe de release wordt ontvangen. Het verloop van het ontwikkelproces
wordt besproken in onze planningsmeeting en met enige regelmaat in een retro. Ook feedback van buitenaf nemen we hierin
mee.

## Security checks

De formele checks zijn: 

- Pentest
- Toets wettelijke kaders

## Testen en valideren

- Testrapportages
- Code reviews
- time based pentests en andere onderzoeken
- Zero bug policy

<!-- 
Wordt later aangevuld
-->
