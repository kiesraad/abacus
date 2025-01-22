# Abacus uitproberen, installeren en starten

Het uitproberen, installeren en starten van Abacus kan op verschillende manieren, met elk verschillende doeleinden.
Hieronder vind je instructies voor de verschillende methodes.

## Uitproberen

Als je Abacus wilt uitproberen of testen zonder het te installeren, kun je dit doen op <https://abacus-test.nl/>. Hier heb je de volgende opties:

- Maak een nieuwe omgeving aan door bovenaan op `Create new` te klikken.
- Als je wilt testen hoe de omgeving werkt na de implementatie van een specifieke pull request, klik dan op `Create new` bij de relevante regel onder **Pull requests**.
- Zoek je naar een bepaalde pull request maar staat die er niet bij, klik dan op `Sync pull requests`. De lijst wordt dan vernieuwd.
- Bestaande omgevingen staan onder **Running services**. Kies hier een omgeving die al is aangemaakt. Als het nodig is kun je hier een zelf aangemaakte omgeving stoppen.

## Installeren en starten

Bij de onderstaande installatiemethodes is aangegeven op welke besturingssystemen ze werken. De methoden voor Linux werken op alle gangbare (recente) Linux-distributies en zijn getest op Ubuntu (22.04 en hoger) en Debian (12/bookworm). De Windows-methoden zijn getest op Windows 11.

### Methode 1: installatiebestand downloaden en starten (Linux, macOS, Windows)

Deze methode is de snelste manier om Abacus te gebruiken. Voer hiervoor de volgende stappen uit:

Op de hoofdpagina van de Abacus-repository klik je aan de rechterkant op [Releases](https://github.com/kiesraad/abacus/releases). Klik onder de bovenste release op `Assets` en klik vervolgens op het installatiebestand om het te downloaden.

![Installatiebestand downloaden 2](/documentatie/gebruikersdocumentatie/img/binary-download.jpg)

#### Linux en macOS

Open een terminal en maak het bestand uitvoerbaar:

```sh
chmod +x /path/to/binary/abacus-OS-version
```

Voer Abacus uit:

```sh
./path/to/binary/abacus-OS-version --reset-database --seed-data
```

De argumenten zorgen ervoor dat de database wordt gereset en wordt geladen met fixtures. De kortere versie van deze opdracht is:

```sh
./path/to/binary/abacus-OS-version -rs
```

Zie ook de [help](#help).

#### Windows

Open een Command Prompt of Powershell en voer Abacus uit:

```sh
start path\to\binary\abacus-windows-version.exe --reset-database --seed-data
```

Of gebruik de kortere versie van deze opdracht:

```sh
start path\to\binary\abacus-windows-version.exe -rs

```

Zie ook de [help](#help).

Na het starten zie je een popup van Windows Security over de Windows Firewall. Het maakt niet uit wat je hier selecteert, de omgeving werkt altijd. Klik dus gerust op **Cancel (Annuleren)**.

**Let op:** Het is natuurlijk ook mogelijk om Abacus zonder argumenten te starten, maar als je dat doet bevat de app geen data en zie je op de pagina het bericht *'Verkiezingen niet gevonden'*.

Wanneer Abacus draait, ga je in je browser naar <http://127.0.0.1:8080> om de omgeving te gebruiken.

### Methode 2: build artifact downloaden en starten (Linux, macOS, Windows)

Je kunt ook zelf een bepaalde build downloaden en starten. Voer hiervoor de volgende stappen uit:

1. Ga in de Abacus-repository naar [Actions](https://github.com/kiesraad/abacus/actions).
2. Klik aan de linkerkant op [Build, lint & test](https://github.com/kiesraad/abacus/actions/workflows/build-lint-test.yml).
3. Klik op de eerste workflow waarbij de tweede kolom leeg is.
4. Download de **latest** build voor jouw besturingssysteem. Let op: de download is alleen zichtbaar als je bent ingelogd in GitHub.

![instructies1](/documentatie/gebruikersdocumentatie/img/build-artifact-1.jpg)
![instructies2](/documentatie/gebruikersdocumentatie/img/build-artifact-2.jpg)

De download bevat een ZIP-bestand met de binary. Deze binary bevat ook alle frontend-assets. Pak deze binary uit en start hem als volgt:

#### Linux en macOS

```sh
./path/to/binary/abacus --reset-database --seed-data
```

De argumenten zorgen ervoor dat de database wordt gereset en wordt geladen met fixtures. De kortere versie van deze opdracht is:

```sh
./path/to/binary/abacus -rs
```

Zie ook de [help](#help).

#### Windows

```sh
start path\to\binary\abacus.exe --reset-database --seed-data
```

Of gebruik de kortere versie:

```sh
start path\to\binary\abacus.exe -rs
```
Zie ook de [help](#help).

Na het starten zie je een popup van Windows Security over de Windows Firewall. Het maakt niet uit wat je hier selecteert, de omgeving werkt altijd. Klik dus gerust op **Cancel (Annuleren)**.

Het is natuurlijk ook mogelijk om Abacus zonder argumenten te starten, maar als je dat doet bevat de app geen data en zie je op de pagina het bericht *'Verkiezingen niet gevonden'*.

Wanneer Abacus draait, ga je in je browser naar <http://127.0.0.1:8080> om de omgeving te gebruiken.

### Methode 3: script `pull-and-run` uitvoeren (Linux, macOS)

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

Wanneer Abacus draait, ga je in je browser naar (<http://127.0.0.1:8080>) om de omgeving te gebruiken.

Let op: mogelijk zie je een foutmelding die aangeeft dat de package `sqlx` ontbreekt. Installeer deze package dan eerst en probeer het vervolgens opnieuw:

```sh
cargo install sqlx-cli
./pull-and-run
```

### Methode 4: handmatig starten (Linux, macOS, Windows)

*Let op: voor deze methode moet je de repository klonen of downloaden.*

In plaats van het script kun je ook handmatig `cargo run` vanuit de backend-map en `npm run dev` vanuit de frontend-map in twee verschillende terminals starten. Hiervoor gelden dezelfde vereisten als bij het uitvoeren van het pull-and-run-script. Deze optie is bedoeld voor development.

### Methode 5: Docker compose (Linux, macOS, Windows)

Hiermee start je de backend in watch mode. Assets worden geserveerd door de build tool `vite` en maken dus gebruik van Hot Module Reloading:

```sh
docker compose up
```

Ook deze optie is bedoeld voor development.

### Help

Voor meer informatie over de argumenten bekijk je de help. Op macOS en Linux gebruik je de volgende opdracht:

```sh
./path/to/binary/abacus(-OS-version) --help
```

En op Windows:

```sh
start path\to\binary\abacus(-windows-version).exe --help
```