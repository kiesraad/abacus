# Proces voor ontwikkeling en releases

Abacus wordt open source, in eigen huis en onder eigen regie ontwikkeld, voor meer flexibiliteit en controle.
We werken volgens de Agile-methode, die is gericht op samenwerking en flexibiliteit. De ontwikkeling van functionaliteit delen we op in kleine stukken, zodat we efficiënt kunnen opleveren en ons werk voortdurend kunnen verbeteren op basis van feedback.

Aan het begin van de releasecyclus bepalen we welke functionaliteit we willen implementeren. Dit doen we in overleg met het team tijdens een tweewekeijkse planningsmeeting. De prioriteit van de features bepalen we aan de hand van verschillende factoren.

## Stappen in het proces

### 1. Input: nieuwe feature of change

Het bouwen van een nieuwe feature begint bij het verzamelen van input. Vele soorten input spelen hierbij een rol:

- Procesanalyse: hoe werkt het verkiezingsproces, hoe werkt de uitvoering in de praktijk, waar zitten de knelpunten?
- Wet- en regelgeving in de vorm van de Kieswet, het Kiesbesluit en de Kiesregeling
- Input vanuit de community naar aanleiding van community meetings
- Suggesties vanuit de community die binnenkomen via GitHub issues of andere kanalen

### 2. Planning en ontwerp

De planning is de fase waarin we de verzamelde input vertalen naar epics en issues. We besluiten of we er iets mee gaan doen en zo ja, hoe we dit gaan uitvoeren. De issues zijn niet overdreven specifiek: er is veel ruimte voor eigen inbreng en refinement.
Als het nodig is overleggen we geplande features ook met het hogere management en/of de leden van de Kiesraad.

In de tweewekelijkse planningsmeeting wordt een duidelijk overzicht gemaakt van alle geplande taken. Alle taken en issues worden bijgehouden op ons centrale [bord](https://github.com/orgs/kiesraad/projects/1/views/2). De taken worden toegewezen aan de relevante personen en ingedeeld op prioriteit.

De designer maakt de ontwerpen voor de features die een ontwerp vereisen. Dit wordt ook in de context van het gehele design besproken met het team.

### 3. Ontwikkeling

Voor de ontwikkeling van issues op GitHub hanteren we de volgende werkwijze:

- Maak een Github-issue aan:
  - Voor een feature of change request in overleg met het team. Gezien onze zero bug policy kan een bug report ook leiden tot een feature request.
  - Tijdens de tweewekelijkse meeting. Hierbij gaat het voornamelijk om issues die al besproken zijn maar nog aangemaakt moeten worden.

- Maak een nieuwe branch aan op basis van de main branch:
  - `git checkout -b <branch name>`
  - Geef de branch een duidelijk beschrijvende naam.
  - Indien nodig voeg je het frontend-/backend-/issue-nummer toe.

- Schrijf de code:
  - Implementeer de functionaliteit die wordt beschreven in het issue.
  - Maak testen aan voor de functionaliteit en voer ze uit.

- Maak een pull request aan:
  - Voer (indien nodig) een rebase van je branch uit op main met `git rebase origin/main --interactive`
  - Verwijs naar het issue in een comment, bijv. `closes #42`
  - Wijs ten minste 2 reviewers toe.

- Sluit de pull request met *Merge*:
  - Zorg dat alle opmerkingen (conversations) opgelost zijn.
  - Sluit de pull request met *Squash and Merge*.

### 4. Release

Er is geen vaste releaseplanning, maar we doen wel regelmatig releases. Grotere releases en fundamentele stappen vragen om een grondige evaluatie. Kleine stappen en incrementele ontwikkeling kunnen snel worden gereleased.

Een release moet aan een aantal vereisten voldoen:

- Alle issues en epics in de release zijn klaar.
- Alle functionaliteit is voldoende getest, zie [Testen en valideren](#testen-en-valideren).
- De security checks zijn geslaagd, zie [Security checks](#security-checks).
- De release is voorzien van release notes.

### 5. Evaluatie

Na de release evalueren we hoe het is verlopen en hoe de release wordt ontvangen. Het verloop van het ontwikkelproces wordt besproken in onze planningsmeeting en met enige regelmaat in een retro. Ook feedback van buitenaf nemen we hierin mee.

## Security checks

- Pentest
- Dreigingsanalyse

<!-- 
Wordt later aangevuld
-->

## Testen en valideren

- Testrapportages
- Code reviews
- Zero bug policy

<!-- 
Wordt later aangevuld
-->
