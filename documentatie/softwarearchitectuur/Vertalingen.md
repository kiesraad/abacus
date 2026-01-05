# Vertalingen in Abacus

In de Abacus React frontend wordt geen library gebruikt voor vertalingen.
De code voor vertalingen is te vinden in `frontend/src/i18n`

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
// signature van de vertaalfunctie
function t(
    k: TranslationPath,
    vars?: Record<string, string | number>
): string;

// in het vertaalbestand staat de key "test" met waarde: "Hello {item}!
expect(t("test", { item: "World" })).toEqual("Hello World!");
````

### Tekst met opmaak

Vertalingen kunnen ook basis-HTML opmaak bevatten en zelfs React elementen interpoleren. Gebruik hiervoor
de functie `tx()`.

Voorbeeld:


```tsx
// signature van de vertaalfunctie
function tx(
  k: TranslationPath,
  elements?: Record<string, RenderFunction>,
  vars?: Record<string, string | number>,
): ReactElement

// in het vertaalbestand staat de key "test" met waarde: Visit my homepage <link>here</link>
tx("test", {
    link: (title) => <a href="https://www.kiesraad.nl/">{title}</a>
});
// resultaat: Visit my homepage <a href="https://www.kiesraad.nl/">here</a>
````

Toegestane HTML tags in vertalingen zijn: "ul", "li", "p", "strong", "em", "code", "h2", "h3", "h4".
Daarnaast zijn React Router "Link" tags toegestaan, handig voor interne routering. Voorbeeld: `<Link to="../page">Link title</Link>`.
Newlines worden door de `tx()` functie automatisch omgezet naar `<br>`.

### Vertalingen toevoegen

Vertalingen (van key naar vertaling) zijn te vinden in `/frontend/src/i18n/locales/<locale>/*.json`.

Het kiezen van een goede vertaal-key en structuur is een kunst.

Ze volgende zaken kunnen helpen bij het kiezen van een goede key structuur:

- Hele algemene of korte vertalingen kunnen in `generic.json` worden geplaatst.
- Probeer met de structuur van de key op een beknopte manier de structuur van de frontend code te volgen, zoals keys groeperen op component of directory.
- Zorg dat de individuele bestanden niet de groot worden, waardoor je het overzicht kunt verliezen, probeer niet meer dan 100 keys in een bestand te zetten.
- De huidige structuur mag aangepast worden! Als er veranderingen of andere inzichten zijn, neem dan de moeite om de structuur aan te passen.
- Probeer keys niet te diep te nesten, niet meer dan 4 segmenten.
- Zorg dat keys kort maar uniek zijn.

Merk op dat een segment van een key niet als losse key gebruikt kan worden. Als bijvoorbeeld "differences.more_ballots_count"
bestaat mag "differences" niet als losse key worden gedefinieerd. Een oplossing hiervoor is om de prefix "title" te gebruiken.
Bijvoorbeeld `differences.title`: `Verschillen`.

Zie ook [deze link](https://lokalise.com/blog/translation-keys-naming-and-organizing/) voor tips.

## Conversie

Vertalingen kunnen van ons eigen geneste JSON formaat geconverteerd worden naar `.po` formaat.

De volgende scripts moeten worden aangeroepen vanuit de "frontend/" map.

### JSON naar PO

Gebruik dit script om `.po`-bestanden te maken (één voor elke gedefinieerde locale) die gebruikt kunnen worden in vertaalsoftware.
Dit script genereert `.po`-vertaalbestanden van de huidige JSON-vertalingen in `/frontend/src/i18n/locales/<locale>/*.json`:

```sh
pnpm gen:po
```

Dit resulteert in `/frontend/translations/<locale>.po`. Deze kunnen geïmporteerd worden in vertaalsoftware.

### PO naar JSON

Gebruik dit script om aangepaste `.po`-bestanden terug te converteren naar onze applicatie-JSON-vertaalbestanden.
Dit script genereert JSON-vertaalbestanden van `.po`-vertaalbestanden in `/frontend/translations/<locale>.po`:

```sh
pnpm gen:translation-json
```

Dit resulteert in `/frontend/src/i18n/locales/<locale>/*.json`. Deze bevatten de teksten die door de applicatie worden gebruikt.
