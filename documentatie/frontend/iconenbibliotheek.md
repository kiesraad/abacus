# Iconenbibliotheek

De iconenbibliotheek is te vinden in `frontend/src/components/generated/icons.tsx`.
De bronbestanden (SVG) zijn te vinden in `frontend/src/assets/icons/`.
Het bevat alle iconen die in de applicatie worden gebruikt.

## Richtlijnen

Sommige iconen kunnen zich anders gedragen, maar hier zijn enkele richtlijnen voor het toevoegen/maken van iconen

### Verplicht

- Geen inline stijlen
- Geen ID-attribuut
- Geen class-attribuut
- Voeg `role="img"` toe

### Richtlijnen

- Monokleur (zwart)
- Alleen gevulde paden
  - Converteer lijnpaden met Adobe Illustrator (Object > Path > Outline Stroke) of Inkscape (Path > Stroke to Path)
- Grenzen van `0 0 24 24`

## Bouwen

Voer vanuit `frontend/` uit:

```sh
pnpm gen:icons
```

Dit zal `frontend/src/components/generated/icons.tsx` maken met alle iconen.
