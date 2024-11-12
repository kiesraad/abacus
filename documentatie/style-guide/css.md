# CSS
Deze pagina beschrijft een aantal CSS guidelines waar we ons aan willen houden.

We hebben op dit moment twee soorten CSS-bestanden: globale CSS-bestanden en CSS Module bestanden.

## Globale CSS
De globale CSS-bestanden zijn te vinden in `frontend/lib/ui/style`. Deze bestanden zijn bedoeld voor CSS reset, generieke variabelen, typografie en styling en utility klassen.

## CSS Modules
Voor component specifieke CSS-regels, gebruiken wij CSS Modules. Dit is standaard geconfigureerd in Vite, en er is ingesteld dat CSS-klassen in _kebab-case_ geïmporteerd kunnen worden als _camelCase_.

## Guidelines
- Specifieke styling voor componenten zoveel mogelijk in CSS Modules, hergebruik middels UI-componenten.
- CSS-klassen in _kebab-case_, gebruik in TypeScript met _camelCase_ en _dot-notation_.
- Beperk het aantal utility klassen, maar liever dat dan nieuwe CSS-klassen met maar één regel.
