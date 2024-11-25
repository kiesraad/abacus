# Uitwerking zero bug policy

Dit document beschrijft de praktische uitwerking van de [zero bug policy](/documentatie/ontwikkelproces/testen-en-kwaliteit.md#zero-bug-policy) vermeld in "Testen en kwaliteit".

Een bug is iets wat de waarde van onze applicatie in gevaar brengt. Dit is dus een brede definitie, over alle relevante [kwaliteitsattributen](/documentatie/ontwikkelproces/testen-en-kwaliteit.md#kwaliteitsattributen) heen. De ernst van een bug kan variëren van "nu gelijk fixen" tot "nooit fixen, nergens bijhouden".

We hanteren een *zero bug policy* om te vermijden dat we een lijst van toekomstige verbeteringen bij gaan houden voor werk dat eigenlijk al af is.

Als we dat heel streng toepassen op elk pull request (PR), dan blijven onze PRs openstaan tot alle puntjes op alle i's staan. We optimaliseren dan voor kwaliteit in de PR-branch ten koste van meer risico bij code-integratie (mergen naar main). De truc is dus om de balans te bewaren tussen PRs binnen 1-3 dagen mergen en geen bochten afsnijden qua kwaliteit.

Daarom passen we de zero bug policy trapsgewijs toe over epics, issues en PRs heen:

- We leveren op per epic, dus hier is de zero bug policy volledig van toepassing. Als een epic af is, dan is het ok dat we die voor altijd zo laten, rekening houdend met de scope van de epic en onze iteratieve/incrementele manier van werken.
- Een epic wordt gesplitst in meerdere issues, een issue kan gebouwd worden over meerdere PRs.
- Of een bug gefixt moet worden binnen de PR, het issue, of de epic, is dus een 'judgment call' op basis van de ernst van de bug.
- Als je een bug niet binnen de PR zelf oplost, neem die beslissing dan in samenspraak met degene die de bug gevonden heeft. Te vaak horen "dat lossen we later op", zelfs als dat binnen de epic is, kan ontmoedigend werken.
