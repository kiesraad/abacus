# Abacus testen, installeren en starten

Het testen, installeren en starten van Abacus kan op verschillende manieren, met elk verschillende doeleinden.
Hieronder vind je instructies voor de verschillende methodes.

## Testen

Als je snel wilt testen met Abacus, kun je dit doen op <https://abacus-test.nl/>. Je kunt testen met de volgende opties:

- Maak een nieuwe testomgeving door bovenaan op `Create new` te klikken.
- Als je wilt testen hoe de omgeving werkt na de implementatie van een specifieke pull request, klik dan op `Create new` bij de relevante regel onder **Pull requests**.
- Zoek je naar een bepaalde pull request maar staat die er niet bij, klik dan op `Sync pull requests`. De lijst wordt dan vernieuwd.
- Bestaande testomgevingen staan onder **Running services**. Kies hier een testomgeving die al is aangemaakt. Als het nodig is kun je hier een zelf aangemaakte testomgeving stoppen.

<!-- 

**Dit stukje herschrijven**

## Installeren: Linux en macOS

De onderstaande methodes werken waarschijnlijk op alle gangbare (recente) Linux-distributies en zijn getest op Ubuntu (22.04 en hoger) en Debian (12/bookworm). Methode 1 werkt niet op macOS omdat we geen macOS-specifieke builds maken, maar de andere methodes werken wel.

## Installeren: Windows

De methodes 4 en 5 werken ook in Windows, maar op dit moment is dit meer bedoeld voor developers. Via methode 4 kun je Abacus in Windows zelf gebruiken, en met methode 5 (Docker Desktop) draait Abacus op een virtual machine met Linux. Je kunt nu nog geen installatiebestand voor Windows downloaden, maar we zijn hiermee bezig. Zodra deze optie er is, vind je hier meer info.

-->

## Installeren en starten

### Methode 1: installatiebestand downloaden en starten (Linux, macOS, Windows)

Ga in de Abacus-repository naar [Tags](https://github.com/kiesraad/abacus/tags).

![Installatiebestand downloaden 1](/documentatie/gebruikersdocumentatie/img/binary-download-1.png)

Klik op [Releases](https://github.com/kiesraad/abacus/releases). Onder de bovenste release klik je op *Assets*. Klik op het installatiebestand om het te downloaden.

![Installatiebestand downloaden 2](/documentatie/gebruikersdocumentatie/img/binary-download-2.png)

#### Linux en macOS

**meer uitleg**

Installeren met `./abacus-dinges`

Misschien chmod?

#### Windows

uitvoeren in cmd of powershell, dat proces uitleggen

### Methode 2: build artifact downloaden en starten

Deze methode lijkt het meest op het draaien van een productiebuild en is ook het meest eenvoudig. Voer de volgende stappen uit:

1. Ga in de Abacus-repository naar [Actions](https://github.com/kiesraad/abacus/actions).
2. Klik aan de linkerkant op [Build, lint & test](https://github.com/kiesraad/abacus/actions/workflows/build-lint-test.yml).
3. Klik op de eerste workflow waarbij de tweede kolom leeg is.
4. Download het bestand *backend-build*. Let op: de download is alleen zichtbaar als je bent ingelogd in GitHub.

![instructies1](/documentatie/gebruikersdocumentatie/img/build-artifact-1.png)
![instructies2](/documentatie/gebruikersdocumentatie/img/build-artifact-2.png)

De download bevat een ZIP-bestand met de binary. Deze binary bevat ook alle frontend-assets. Pak deze binary uit en start hem als volgt:

```sh
./path/to/binary/api --reset-database --seed-data
```

De argumenten zorgen ervoor dat de database wordt gereset en wordt geladen met fixtures. De kortere versie van deze opdracht is:

```sh
./path/to/binary/api -rs
```

Zie ook de help:

```sh
./path/to/binary/api --help
```

Het is natuurlijk ook mogelijk om Abacus zonder argumenten te starten, maar als je dat doet bevat de app geen data en zie je op de pagina het bericht *'Verkiezingen niet gevonden'*.

Wanneer de API draait, klik je op de link van de API-server (<http://0.0.0.0:8080>) om naar de browser te gaan en Abacus te gebruiken.

### Methode 3: script `pull-and-run` uitvoeren

*Let op: voor deze methode moet je de repository klonen of downloaden.*

Dit is een Bash-script dat is bedoeld om snel een productiebuild te bouwen en starten. Het staat in de hoofdmap van de repository. Het script maakt geen gebruik van Docker, waardoor het wel nodig is om `npm` en `cargo` geïnstalleerd te hebben.

- `npm` is onderdeel van Node.js en dit kun je installeren door de instructies te volgen op de [website van Node.js](https://nodejs.org/en/download/package-manager).
- `cargo` is onderdeel van Rust en installatie-instructies hiervoor vind je op de [website van Rust](https://www.rust-lang.org/learn/get-started).

Je kunt een git-branch als argument meegeven, zodat je snel de productiebuild van een bepaalde branch kunt starten. Als je het argument weglaat, wordt de huidige branch gebouwd.

Zo start je de huidige branch:

```sh
./pull-and-run
```

En zo start je een specifieke branch:

```sh
./pull-and-run name-of-branch
```

Wanneer Abacus draait, klik je op de link (<http://0.0.0.0:8080>) om naar de browser te gaan en Abacus te gebruiken.

Let op: mogelijk zie je een foutmelding die aangeeft dat de package `sqlx` ontbreekt. Installeer deze package dan eerst en probeer het vervolgens opnieuw:

```sh
cargo install sqlx-cli
./pull-and-run
```

### Methode 4: handmatig starten

*Let op: voor deze methode moet je de repository klonen of downloaden.*

In plaats van het script kun je ook handmatig `cargo run` vanuit de backend-map en `npm run dev` vanuit de frontend-map in twee verschillende terminals starten. Hiervoor gelden dezelfde vereisten als bij methode 2.

### Methode 5: Docker compose

Deze optie is bedoeld voor development, je start de backend in watch mode. Assets worden geserveerd door de build tool `vite` en maken dus gebruik van Hot Module Reloading:

```sh
docker compose up
```
