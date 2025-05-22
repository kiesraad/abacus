# CSS
Deze pagina beschrijft een aantal CSS guidelines waar we ons aan willen houden.

We hebben op dit moment twee soorten CSS-bestanden: globale CSS-bestanden en CSS Module bestanden.

## Globale CSS
De globale CSS-bestanden zijn te vinden in `frontend/src/styles`. Deze bestanden zijn bedoeld voor CSS reset, generieke variabelen, typografie en styling en utility klassen.

## CSS Modules
Voor component- of feature-specifieke CSS-regels gebruiken wij CSS Modules. 

## Guidelines
- Specifieke styling voor componenten of features zoveel mogelijk in CSS Modules, hergebruik middels UI-componenten.
- CSS-klassen in _camelCase_, voor het eenvoudig gebruiken in TypeScript met _dot-notation_. Op dit moment ondersteunt [Lightning CSS](https://lightningcss.dev/) geen vertaling van CSS _kebab-case_ naar _camelCase_ bij het importeren in TypeScript. 
- Beperk het aantal utility klassen, maar liever dat dan nieuwe CSS-klassen met maar één regel.
