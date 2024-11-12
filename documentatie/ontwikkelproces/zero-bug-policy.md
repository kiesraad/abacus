# Uitwerking zero bug policy

Dit document beschrijft de praktische uitwerking van de [zero bug policy](/documentatie/ontwikkelproces/testen-en-kwaliteit.md#zero-bug-policy) vermeld in "Testen en kwaliteit".



- doel: vermijden dat we een backlog verzamelen met dingen die we nog moeten verbeteren aan werk dat eigenlijk af is
- we leveren op per epic, dus een epic is af als het ok is dat we die voor altijd zo laten, waarbij we rekening houden met de scope van de epic en met iteratief/incrementeel werken
- een epic wordt gesplitst in meerdere issues, een issue kan gebouwd worden in meerdere PRs
- een bug is iets wat de waarde van ons product in gevaar brengt, gaat dus over alle kwaliteitsattributen heen
- of een bug opgelost moet worden binnen de PR, het issue, of de epic is dus een judgement call: hoe ernstig is de bug op een schaal van "nu gelijk fixen" tot "nooit fixen, nergens bijhouden"
- de truc is om de balans te bewaren tussen PRs binnen 1-3 dagen te kunnen mergen, zonder dat we bochten af gaan snijden qua kwaliteit
- let hierbij op dat je review commentaar niet devalueert met "wordt een andere issue", omdat het commentaar over een ander kwaliteitsaspect gaat dan "werkende code"
