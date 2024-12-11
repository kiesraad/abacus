# Pull Requests (PRs)

Het belangrijkste aan een goed PR-proces is dat het gebaseerd is op samenwerking en wederzijds vertrouwen. Hier moeten we alert op blijven, want asynchrone reviews in een tool zoals GitHub, dragen hier niet altijd aan bij.


## Schrijven van een PR

- Wat is de scope van de wijzigingen?
- Wat heb je getest? Met welke edge cases heb je expliciet rekening gehouden?
- Zijn er specifieke punten waarvan je wil dat de reviewers er zeker naar kijken?
- Zijn er specifieke mensen van wie je een review wil vanwege hun specialisatie?
- Heb je tips over hoe te testen? (bijvoorbeeld voor het inladen van specifieke data, hoe je bepaalde errors in de backend triggert, etc.)


## Reviewen van een PR

In een review nemen we alle [kwaliteitsattributen](/documentatie/ontwikkelproces/testen-en-kwaliteit.md#kwaliteitsattributen) uit "Testen en kwaliteit" mee:
- betrouwbaarheid
- bruikbaarheid
- beveiliging
- testbaarheid
- onderhoudbaarheid
- IT-bility (installatie, onderhoud, ondersteuning)

Let minstens op:
- scope van de wijzigingen
- kwaliteit van de code
- consistentie met omliggende code
- edge cases
- test coverage
- documentatie (README, diagrammen, use cases)

Exploratief testen met frontend en backend is onderdeel van de review (tenzij wijzigingen puur FE of BE zijn).


## Comments en approvals op een PR

Als je alleen een gedeelte van de PR reviewt (bijv. alleen frontend), geef dat duidelijk aan in je commentaar.

Resolven van comments gebeurt door de persoon die de comment geplaatst heeft, tenzij de comment overduidelijk opgelost is of de commenter langere tijd afwezig is.

Als je wijzigingen wil zien, gebruik je de "Request changes" optie. We vertrouwen elkaar in het oppakken of negeren van wijzigingsverzoeken van reviewers.

De eigenaar van de PR beslist wanneer te mergen. Dit om te voorkomen dat er gemerged wordt wanneer er twee approvals zijn, maar de eigenaar van de PR nog wacht op een review van een specifiek persoon.
