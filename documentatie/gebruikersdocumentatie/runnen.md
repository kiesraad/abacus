Het bouwen en runnen van het project kan op verschillende manieren met elk verschillende doeleinden.

## Docker compose

Bedoeld voor development, start de backend in watch mode, assets worden geserved door `vite` en maakt dus gebruik van Hot Module Reloading:

```sh
docker compose up
```

## `pull-and-run`
Bash script, bedoeld om snel een productie build te bouwen en runnen. Maakt geen gebruik van Docker, waardoor het wel nodig is om `npm` en `cargo` geïnstalleerd te hebben. Je kan een git branch als argument mee geven, zodat je snel de productie build kan een bepaalde branch kan runnen. Als je het argument weg laat, wordt de huidige branch gebouwd.
```sh
# Huidige branch runnen
./pull-and-run

# Specifieke branch runnen
./pull-and-run name-of-branch
```
  
## 'Handmatig'

Je kan natuurlijk altijd handmatig `cargo run` en `npm run dev` in twee verschillende terminals draaien.


## Build artifact

Deze methode lijkt het meest op het draaien van een productie build.
