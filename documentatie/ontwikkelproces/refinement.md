# Refinement

We doen "Just-In-Time Refinement", dus refinement op het "last responsible moment". Dit doen we om te voorkomen dat we tijd en energie steken in refinement, maar dat het resultaat ervan later herzien moet worden, of zelfs helemaal niet nodig blijkt te zijn.

## Epics

Voor de meeste epics betekent dit dat we ze pas verder uitwerken, op het moment dat we eraan beginnen te werken. Hiervoor doen we een epic kick-off.

De epic kick-off wordt tijdens onze twee-wekelijkse meeting ingepland door de twee epic owners. Deelnemers aan de epic kick-off zijn de epic owners, mensen die worden uitgenodigd vanwege hun expertise (UX, security, juridisch, testen, ...), en mensen die er uit interesse bij willen zijn.

In de kick-off worden o.a. de volgende vragen behandeld:

- Is de context van de epic duidelijk? Waar past het in het verkiezingsproces? Hoe past het in de rest van de applicatie?
- Is de scope duidelijk? Wat is wel in scope van de epic, wat niet?
- Past de epic in de huidige architectuur of zijn er wijzigingen nodig?
- Is de epic duidelijk genoeg om mee te starten? Kun je je de demo van de epic inbeelden?
- Heb je alles wat je nodig hebt om te starten? Bijvoorbeeld voldoende UI-designs? (voldoende, niet per se volledige)
- Is de epic klein genoeg?

Beslis of er naast code en tests ook (interne en/of externe) documentatie bijgewerkt of geschreven moet worden.

Tijdens de kick-off worden de issues binnen de epic aangemaakt. Net zoals epics is het belangrijk om issues zo klein mogelijk te houden. De issues hoeven nog niet in volledig detail beschreven te worden. Het kan ook gebeuren dat je tijdens je werk aan de epic, nieuw werk (en dus issues) identificeert.

Als sommige zaken nog onvoldoende duidelijk zijn, of als er implementatiebeslissingen genomen moeten worden, overweeg het gebruik van een [spike solution](http://www.extremeprogramming.org/rules/spike.html) (bouwen om te leren, daarna weggooien), een prototype, en/of diagrammen (bijv. een flow chart).

Zodra een epic is afgerond, houden de epic owners een kennisdelingssessie. Als je dat handig vindt, kun je hier ook een issue voor aanmaken binnen de epic.


## Issues

De details van een issue kunnen vaak wachten totdat je aan het issue zelf begint. De vragen en overwegingen zijn vrijwel hetzelfde als bij een epic. De scope is alleen kleiner en het detailniveau hoger.

Houd er rekening mee dat het verder uitschrijven van een issue niet alleen handig voor jezelf is, maar ook voor de reviewers van je PR. (In dat opzicht kan een gedeelte van de beschrijving ook in de PR i.p.v. het issue.)

Alle stappen voor het werken aan issue staan beschreven in onze [GitHub-werkwijze](/documentatie/ontwikkelproces/GitHub-werkwijze.md).
