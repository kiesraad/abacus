# Abacus installeren en starten

Het installeren en starten van Abacus kan op verschillende manieren, met elk verschillende doeleinden.
Hieronder vind je instructies voor de verschillende methodes.

## Linux en macOS

De onderstaande methodes werken waarschijnlijk op alle gangbare (recente) Linux-distributies en macOS, en zijn getest op Ubuntu (22.04 en hoger) en Debian (12/bookworm). 

## Windows

Methode 3 en 4 werken ook in Windows. Op dit moment kun je nog geen installatiebestand voor Windows downloaden, maar we zijn hiermee bezig. Zodra deze optie er is vind je hier meer info.

### Methode 1: build artifact downloaden en starten

Deze methode lijkt het meest op het draaien van een productiebuild en is ook het meest eenvoudig. Voer de volgende stappen uit:

1. Ga in de Abacus-repository naar [Actions](https://github.com/kiesraad/abacus/actions)
2. Klik aan de linkerkant op [Build, lint & test](https://github.com/kiesraad/abacus/actions/workflows/build-lint-test.yml)
3. Klik aan de rechterkant op *Branch* om op een branch te filteren
4. Selecteer de meest recente action
5. Download het bestand *backend-build*. Let op: de download is alleen zichtbaar als je bent ingelogd in GitHub.

![instructions1](/documentatie/gebruikersdocumentatie/img/build-artifact-1.png)
![instructions2](/documentatie/gebruikersdocumentatie/img/build-artifact-2.png)

De download bevat een ZIP-bestand met de binary. Deze binary bevat ook alle frontend-assets. Pak deze binary uit en start hem als volgt:

```sh
./path/to/binary/api
```

Je kunt ook eerst de database resetten en laden met fixtures. Gebruik hiervoor de volgende argumenten:

```sh
./path/to/binary/api --reset-database --seed-data
```

De kortere versie hiervan is:

```sh
./path/to/binary/api -rs
```

Zie ook de help:

```sh
./path/to/binary/api --help
```

Wanneer de API draait, klik je op de link van de API-server (<http://0.0.0.0:8080>) om naar de browser te gaan en Abacus te gebruiken.

### Methode 2: script `pull-and-run` uitvoeren

Dit is een Bash-script dat is bedoeld om snel een productiebuild te bouwen en starten. Het staat in de hoofdmap van de repository. Dit script maakt geen gebruik van Docker, waardoor het wel nodig is om `npm` en `cargo` geïnstalleerd te hebben.
Instructies voor de installatie van `npm` vind je op [npm Docs](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) en instructies voor de installatie van Rust en `cargo` vind je op de [website van Rust](https://doc.rust-lang.org/cargo/getting-started/installation.html).

Je kunt een git-branch als argument meegeven, zodat je snel de productiebuild van een bepaalde branch kunt starten. Als je het argument weglaat, wordt de huidige branch gebouwd.

Zo start je de huidige branch:

```sh
./pull-and-run
```

En zo start je een specifieke branch:

```sh
./pull-and-run name-of-branch
```

Wanneer de API draait, klik je op de link van de API-server (<http://0.0.0.0:8080>) om naar de browser te gaan en Abacus te gebruiken.

Let op: mogelijk zie je een foutmelding die aangeeft dat de package `sqlx` ontbreekt. Installeer deze package dan eerst en probeer het vervolgens opnieuw:

```sh
cargo install sqlx-cli
./pull-and-run
```

### Methode 3: handmatig starten

Je kunt natuurlijk altijd handmatig `cargo run` vanuit de backend-map en `npm run dev` vanuit de frontend-map in twee verschillende terminals starten. Hiervoor gelden dezelfde vereisten als bij methode 2.

### Methode 4: Docker compose

Deze optie is bedoeld voor development, je start de backend in watch mode. Assets worden geserveerd door de build tool `vite` en maken dus gebruik van Hot Module Reloading:

```sh
docker compose up
```
