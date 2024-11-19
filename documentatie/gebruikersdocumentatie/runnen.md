Het bouwen en runnen van het project kan op verschillende manieren met elk verschillende doeleinden.

## Docker compose

Bedoeld voor development, start de backend in watch mode, assets worden geserved door `vite` en maken dus gebruik van Hot Module Reloading:

```sh
docker compose up
```

## `pull-and-run`
Bash script, bedoeld om snel een productiebuild te bouwen en runnen. Maakt geen gebruik van Docker, waardoor het wel nodig is om `npm` en `cargo` geïnstalleerd te hebben. Je kan een git-branch als argument mee geven, zodat je snel de productiebuild kan een bepaalde branch kan runnen. Als je het argument weg laat, wordt de huidige branch gebouwd.
```sh
# Huidige branch runnen
./pull-and-run

# Specifieke branch runnen
./pull-and-run name-of-branch
```
  
## 'Handmatig'

Je kan natuurlijk altijd handmatig `cargo run` en `npm run dev` in twee verschillende terminals draaien.

## Build artifact

Deze methode lijkt het meest op het draaien van een productiebuild.

![instructions1](https://github.com/user-attachments/assets/9efb524e-9256-43eb-9d98-141e049c8ba9)
![instructions2](https://github.com/user-attachments/assets/b8389384-98fa-42c1-905f-81db7e301942)

De download bevat een ZIP file met de binary. Deze binary bevat ook al alle frontend assets. Pak deze binary uit en run:
```sh
# het draaien van de binary
path/to/binary/api

# draaien, maar eerst de database resetten en laden met fixtures
path/to/binary/api --reset-database --seed-data

# of korter
path/to/binary/api -rs

# zie ook de help
path/to/binary/api --help
```
