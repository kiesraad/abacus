# Vertalingen in Abacus

In de Abacus React frontend wordt geen library gebruikt voor vertalingen.
De code voor vertalingen is te vinden in `frontend/lib/i18n`

## Ontwerp

Abacus heeft dus een eigen vertaaloplossing. Vertalingen zijn ingericht op een manier die
het makkelijk maakt om in te toekomst een library te gebruiken zoals `react-i18n`. De aanroep
naar de vertaalfunctie heeft namelijk dezelfde naam en parameters.

De volgende ontwerpkeuzes zijn gemaakt:

- Vertalen op basis van globale functies (`t()` en `tx()`)
- Input van de functies is een "translation key" eventueel genest in een namespace (gescheiden door een `.`)
- Vertalingen zijn opgesplitst in meerdere geneste JSON bestanden
- We kunnen de geneste JSON converteren naar `PO` formaat en weer terug

## Gebruik

Gebruik de functie `t()` om een enkele key te vertalen. Zowel de input als het resultaat van deze functie is een `string`.
Er kunnen dynamische elementen in de vertaling zitten die je met dezelfde functie kunt interpoleren.

Zie het volgende voorbeeld:

```typescript
function t(
    k: TranslationPath,
    vars?: Record<string, string | number>
): string;

// test: "Hello {item}!
expect(t("test", { item: "World" })).toEqual("Hello World!");
````

### Tekst met opmaak

Vertalingen kunnen ook basis-HTML opmaak bevatten en zelfs React elementen interpoleren. Gebruik hiervoor
de functie `tx()`.

Voorbeeld:


```typescript
function tx(
  k: TranslationPath,
  elements?: Record<string, RenderCallback>,
  vars?: Record<string, string | number>,
): ReactElement

// test: Visit my homepage <link>here</link>
tx("test", {
    link: (title) => <a href="https://www.kiesraad.nl/">{title}</a>
});
// result: Visit my homepage <a href="https://www.kiesraad.nl/">here</a>
````

Toegestande HTML tags in vertalingen zijn: "ul", "li", "p", "strong", "code".
Newlines worden door de `tx()` functie automatisch omgezet naar `<br>`.

### Vertalingen toevoegen

Vertalingen (van key naar vertaling) zijn te vinden in `/frontend/lib/i18n/loclales/<locale>/*.json`.

Het kiezen van een goede vertaal-key en structuur is een kunst.
Zie bijvoorbeeld [deze link](https://lokalise.com/blog/translation-keys-naming-and-organizing/) voor tips.

## Conversie

Vertalingen kunnen van ons eigen geneste JSON formaat geconverteerd worden naar `.po` formaat.

### JSON naar PO

Gebruik dit script om `.po`-bestanden te maken (één voor elke gedefinieerde locale) die gebruikt kunnen worden in vertaalsoftware.
Dit script genereert `.po`-vertaalbestanden van de huidige JSON-vertalingen in `/frontend/lib/i18n/loclales/<locale>/*.json`:

```sh
npm run gen:po
```

Dit resulteert in `/frontend/translations/<locale>.po`. Deze kunnen geïmporteerd worden in vertaalsoftware.

#### PO naar JSON

Gebruik dit script om aangepaste `.po`-bestanden terug te converteren naar onze applicatie-JSON-vertaalbestanden.
Dit script genereert JSON-vertaalbestanden van `.po`-vertaalbestanden in `/frontend/translations/<locale>.po`:

```sh
npm run gen:translation-json
```

Dit resulteert in `/frontend/lib/i18n/loclales/<locale>/*.json`. Deze bevatten de teksten die door de applicatie worden gebruikt.
