Backend structuur geïnspireerd door clean code en hexagonal architecture, waarbij elke schil alleen de schil eronder mag gebruiken.

- infra: applicatie infrastructuur
- api: routes en handlers
- repository: data persistentie
- domain: domein entiteiten en logica

Regels:
- Schil mag alleen onderliggende schillen gebruiken (en eigen schil), niet bovenliggende
- Transaction begin en commit/rollback in de handlers (api)
- SQL queries alleen in repository, geen logica in de repository
- Alle business logica in domain
- Traits en impl bij elkaar houden, bijvoorbeeld data entry struct en de Compare en Validate 

- Als methodes of functies uit het domain, data uit de repository nodig heeft, `Inversion of Control` gebruiken om dit op te halen:
  - Specifieke trait in domein met methode(s) om de data op te halen en gebruiken als argument
  - Eenvoudige struct implementeren ("adapter") in de api die data ophaalt uit de repository
  - Domain functie of method aanroepen met adapter
  - Dit heeft als extra voordeel dat de domain logica goed te testen is met een mock struct

## tbd
- Infrastructuur voelt nog als een samenraapsel van dingen:
  - Axum setup
  - SQLx setup
  - airgap middleware
  - authenticatie middleware
  - audit log
  - PDF generatie met Typst
  - ZIP file support
- In hoeverre mogen de structs hergebruikt worden van API t/m repository
- Consequent handlers wel/niet per endpoint?
- Genereer code waar? Losse folder

## todo
- Error handling
- Audit logging
- Specifieke Request/Response structs uit domain naar api verplaatsen
- `User` struct uit `user_repo`
