# Uitwerking zero bug policy

Dit document beschrijft de praktische uitwerking van de [zero bug policy](/documentatie/ontwikkelproces/testen-en-kwaliteit.md#zero-bug-policy) vermeld in "Testen en kwaliteit".

Een bug is iets wat de waarde van onze applicatie in gevaar brengt. Dit is dus een brede definitie, over alle relevante [kwaliteitsattributen](/documentatie/ontwikkelproces/testen-en-kwaliteit.md#kwaliteitsattributen) heen. De ernst van een bug kan variëren van "nu gelijk fixen" tot "nooit fixen, nergens bijhouden".

Het doel van de zero bug policy is vermijden dat we een backlog verzamelen met dingen die we nog moeten verbeteren, aan werk dat eigenlijk af is.

Het gevaar van de zero bug policy is dat pull requests (PRs) heel lang open blijven, omdat we pas mergen als alle puntjes op alle i's staan. Dan optimaliseer je voor kwaliteit in de PR-branch ten koste van meer risico bij code-integratie (mergen naar main). Da's niet verstandig.

De truc is dus om de balans te bewaren tussen PRs binnen 1-3 dagen te kunnen mergen, zonder dat we bochten af gaan snijden qua kwaliteit.

Hiervoor passen we zero bug policy trapsgewijs toe:

- We leven op per epic, dus hier is de zero bug policy volledig van toepassing. Als een epic af is, dan is het ok dat we die voor altijd zo laten, rekening houdend met de scope van de epic en onze iteratieve/incrementele manier van werken.
- Een epic wordt gesplitst in meerdere issues, een issue kan gebouwd worden over meerdere PRs.
- Of een bug gefixt moet worden binnen de PR, het issue, of de epic, is dus een 'judgment call' op basis van de ernst de bug.
- Als je een bug niet binnen de PR zelf oplost, neem die beslissing dan in samenspraak. Te vaak horen "dat lossen we later op", zelfs als dat binnen de epic is, kan ontmoedigend werken.
