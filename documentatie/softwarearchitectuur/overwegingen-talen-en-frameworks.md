# Overwegingen ten aanzien van technische keuzes binnen dit project

Bij het maken van technische keuzes binnen dit project zijn er een aantal uitgangspunten.
De eisen aan de software zijn gesteld in de Kieswet, Kiesbesluit en normenkaders zoals de Baseline Informatiebeveiliging Overheid (BIO).
Hier zal zonder uitzondering aan voldaan moeten worden.

Een aantal van de eisen zijn zeer duidelijk en een aantal van de eisen is impliciet vanuit het beoogde gebruik.

## Afwegingskader zelfgeschreven software

### Stabiliteit en ondersteuning op de lange termijn

Bij het selecteren van een programmeertaal voor langdurig gebruik is stabiliteit een sleutelfactor. Een taal die bekend staat om zijn betrouwbaarheid en die regelmatige updates ontvangt ter verbetering van functies en beveiliging, is ideaal. Langdurige ondersteuning (LTS) is ook cruciaal; dit betekent dat de taal voor een langere periode actieve updates en ondersteuning zal ontvangen. Dit vermindert de kans op veroudering en incompatibiliteit met toekomstige systemen.

### Community en ecosysteem

Een sterke, levendige gemeenschap rond een programmeertaal kan de levensduur ervan aanzienlijk verlengen. Een groot ecosysteem met een rijke verzameling aan bibliotheken en frameworks maakt de taal flexibel en toepasbaar op diverse projecten. Bovendien zorgt een actieve gemeenschap voor voortdurende innovatie, snelle hulp bij problemen en een voor inhuur en dienstverlening beschikbare groep developers.

### Compatibiliteit en portabiliteit

De compatibiliteit van een programmeertaal met verschillende besturingssystemen en hardware is een belangrijke overweging voor software die langdurig gebruikt wordt. Portabiliteit zorgt ervoor dat de software gemakkelijk kan worden overgezet naar nieuwe platforms of systemen, wat essentieel is als de omgeving verandert of als de software op meerdere apparaten moet draaien.

### Eenvoud van onderhoud en leesbaarheid

Een programmeertaal die gemakkelijk te lezen en te onderhouden is, kan op de lange termijn tijd en middelen besparen. Talen met een heldere syntaxis en een hoge leesbaarheid zijn makkelijker over te dragen aan nieuwe ontwikkelaars en verminderen de kans op fouten tijdens het onderhoud.

### Beveiligingsfuncties

Voor software die niet regelmatig kan worden bijgewerkt, zijn ingebouwde beveiligingsfuncties in de programmeertaal essentieel. Talen die sterke beveiligingsmechanismen bieden, zoals geheugenbeheer en ondersteuning voor encryptie en digitale ondertekeningen inclusief sleutelbeheer, kunnen helpen om de software te beschermen tegen externe dreigingen, zelfs als updates niet haalbaar zijn.

### Prestaties en efficiëntie

Afhankelijk van de toepassing kan de efficiëntie van een programmeertaal belangrijk zijn. Talen die hoge prestaties leveren, vooral in omgevingen met beperkte hardwarebronnen, kunnen de voorkeur hebben. Dit is vooral relevant voor embedded systemen of toepassingen waarbij snelheid en efficiëntie kritisch zijn.

### Documentatie en ondersteuningsbronnen

Uitgebreide documentatie en toegang tot ondersteuningsbronnen zijn van onschatbare waarde, vooral wanneer men werkt met een taal voor de lange termijn. Goed gedocumenteerde talen vergemakkelijken het probleemoplossingsproces en zijn essentieel voor het opleiden en inwerken van nieuw personeel.

### Licentie en kosten

De licentievoorwaarden en eventuele kosten die verbonden zijn aan een programmeertaal kunnen een impact hebben op de keuze, vooral voor langlopende projecten. Open-source-talen bieden meestal de meeste flexibiliteit en verminderen zorgen over licentiekosten of beperkingen. Ook zorgt open-source ervoor dat voldoen kan worden aan de wettelijke eisen.

### Toekomstbestendigheid

Het is belangrijk om een taal te kiezen die waarschijnlijk relevant zal blijven. Dit betekent dat de taal zich moet kunnen aanpassen aan nieuwe technologieën en trends in de softwareontwikkeling. Talen die zichzelf voortdurend vernieuwen en uitbreiden met nieuwe functies hebben een grotere kans om op de lange termijn bruikbaar te blijven.

## Afwegingskader te gebruiken software

Niet alle software zal zelf ontwikkeld kunnen worden en het is ook niet altijd nuttig om dit zelf te doen.
Als er voor de gebruikersinterface gebruik gemaakt wordt van een webbrowser, kan er veel worden bespaard omdat het niet nodig is om zelf interfacing te ontwikkelen en compatibel te houden in de toekomst. De eis is wel dat de software gebruik maakt van stabiele standaarden.

Het zelf ontwikkelen van een GUI is voor het beoogde doel vermoedelijk niet productief en levert geen toegevoegde waarde, omdat alle specifieke interfacing met OS en netwerk al wordt opgelost en bijgehouden door browsers op een niveau dat niet te halen is met een klein team.

## Gemaakte keuzes frontend

Voor de frontend wordt de keuze beperkt door de browser. Daarom maken we gebruik van HTML, CSS en JavaScript.
Hierbinnen zijn vele frameworks te kiezen, en daarbij tellen de afwegingen wat betreft zelfgeschreven software mee. Het is belangrijk dat een framework met minder afhankelijkheden gekozen wordt.

### TypeScript

We maken gebruik van TypeScript, een uitgebreidere versie van JavaScript. Dit heeft bij de programmeurs de voorkeur omdat het zorgt dat je minder fouten maakt en betere code kunt schrijven.

### Library: React

React is een van de meest gebruikte libraries voor het maken van gebruikersinterfaces. Deze library heeft een groot bereik onder developers en wordt goed onderhouden. Een andere overweging was Angular, maar React is stabieler. Ook hebben onze programmeurs hier ervaring mee.


### Playwright

Playwright is uitermate geschikt als testframework voor de browser. Selenium is een automatiseringslibrary die een alternatief zou kunnen zijn voor Playwright, maar Playwright heeft meer functionaliteit. Bovendien zou je voor Selenium ook een test runner en een assertion library nodig hebben. Ook zou je convenience functions/methods moeten bouwen omdat Selenium best low-level control op de browser biedt. Playwright heeft deze vereisten niet, en daarom hebben we hiervoor gekozen.

## Gemaakte keuze backend: Rust

Qua programmeertaal voor de backend is elke courante taal een redelijke, waarbij enkele overwegingen moeten worden meegenomen. Ten eerste valt C af omdat deze taal te lage abstractie en dus minder efficiëntie biedt in het programmeren. Bovendien zijn er ook risico's op bugs vanwege de methoden voor geheugengebruik. Door deze overwegingen vallen ook veel andere standaard talen met zwakke en/of dynamische typesystemen af, zoals PHP en Python.

De taal moet open-source zijn en we hebben liever een taal die niet afhankelijk is van één partij, maar ondersteund wordt door een community. Deze overwegingen maken de keuze voor C#, Java en soortgelijke talen minder goed.

Daarnaast moeten we ook rekening houden met de beschikbaarheid van bereidwillige programmeurs.

Na een inventarisatie van beschikbare programmeurs, mogelijke talen en de voor- en nadelen van elke taal is de keuze op Rust gevallen.

### Voordelen van Rust

#### Geheugenveiligheid zonder *garbage collector*

Rust is ontworpen met een focus op geheugenveiligheid. Het unieke eigendomssysteem van Rust zorgt ervoor dat geheugenfouten zoals *dangling pointers* of *data races* worden voorkomen zonder gebruik te maken van een *garbage collector*. Dit verhoogt de prestaties en betrouwbaarheid, vooral in systemen waar geheugenbeheer cruciaal is.

#### Concurrentie zonder *data races*

Rust maakt gelijktijdige programmering veel veiliger en eenvoudiger door te garanderen dat programma's vrij zijn van *data races*. Dit wordt bereikt door middel van strikte eigendoms- en levensduurregels, wat betekent dat je veiligere multithreaded code kunt schrijven zonder je zorgen te maken over complexe bugs die vaak in andere talen voorkomen.

#### Modern *type system* en *type inference*

Rust heeft een modern *type system* dat helpt bij het vangen van fouten tijdens de compilatiefase. *Type inference* maakt de code bovendien beknopt en leesbaar, terwijl het toch de strikte typecontroles behoudt die nodig zijn voor betrouwbaarheid.

#### Prestaties vergelijkbaar met C/C++

Rust is ontworpen om prestaties te leveren die vergelijkbaar zijn met C en C++. Dit maakt het een uitstekende keuze voor prestatiegevoelige toepassingen zoals besturingssystemen en embedded systemen.

#### Uitstekend tooling-ecosysteem

Rust wordt geleverd met Cargo, een uitstekend pakketbeheersysteem en een build-tool. Cargo vereenvoudigt veel aspecten van de Rust-programmeerervaring, inclusief afhankelijkheidsbeheer, het compileren van code, het uitvoeren van tests en het genereren van documentatie.

#### Immutability en functioneel programmeren

Rust moedigt onveranderlijke data aan en biedt ondersteuning voor functionele programmeerpatronen. Dit kan leiden tot een duidelijkere codestructuur, eenvoudiger debuggen en onderhoud, en minder bugs.

#### Uitgebreide community en groeiende populariteit

De Rust-gemeenschap is actief en groeiend, met een sterke nadruk op inclusiviteit en toegankelijkheid. Dit betekent dat er veel middelen beschikbaar zijn voor nieuwe Rust-programmeurs, en de taal blijft zich ontwikkelen in reactie op de behoeften van haar gebruikers.

#### Cross-platform ondersteuning

Rust ondersteunt diverse platforms, van krachtige serveromgevingen tot embedded systemen. Dit maakt het een veelzijdige keuze voor projecten die op verschillende soorten hardware moeten draaien. Dit is ook een vereiste gezien de pluriformiteit in systemen van verschillende gemeenten.

#### *Zero-cost abstractions*

Rust’s ontwerp maakt het mogelijk om abstracties te maken zonder prestatiekosten. Dit betekent dat je code kunt schrijven die een hoog niveau heeft en efficiënt is, zodat je niet hoeft over te schakelen op talen met een lager niveau om de prestaties te verbeteren.

### Relevante nadelen van Rust

#### Minder automatisch geheugenbeheer

Terwijl het eigendomssysteem van Rust helpt bij het voorkomen van veelvoorkomende geheugenfouten, vereist het ook dat programmeurs meer handmatig nadenken over geheugenbeheer. Dit staat in contrast met talen zoals Java of Python, waar *garbage collection* veel van dit werk automatisch doet.

#### Asynchrone programmering kan complex zijn

Asynchroon programmeren in Rust kan complex en lastig zijn. Dit is overigens geen specifiek probleem bij Rust. De taal heeft wel asynchrone functies en *await*-syntax, maar deze kunnen lastig te begrijpen en te gebruiken zijn in vergelijking met andere talen.

#### Jonge taal

Rust is relatief jong in vergelijking met talen zoals C, C++, of Java. Dit betekent dat het nog steeds in ontwikkeling is en soms veranderingen ondergaat die invloed kunnen hebben op de stabiliteit en voorspelbaarheid voor lange-termijnprojecten.

### Conclusie keuze backend-taal

De voordelen van Rust overstijgen de nadelen ruimschoots naar inzicht van het team.

Daarmee is de keuze voor Rust op basis van alle redelijke inschattingen en overwegingen de juiste.

## Andere keuzes backend

### Libraries

We hebben gekozen voor de volgende libraries:

- De library [SQLite](https://www.sqlite.org/) die een SQL database engine implementeert. Dit is zeer populair, lichtgewicht en makkelijk in gebruik. Je hoeft bovendien niets te installeren. Het is handiger dan PostgreSQL, dat je zou moeten installeren op de computer of zou moeten meeleveren in de installer.
- De web library [axum](https://github.com/tokio-rs/axum). Deze library wordt veel gebruikt en goed ondersteund.
- De database library [sqlx](https://github.com/launchbadge/sqlx) voor SQL.
- De specificatie [OpenAPI](https://www.openapis.org/what-is-openapi), die wordt gebruikt voor interne technische documentatie.

## Tools voor softwareontwikkeling

### GitHub

GitHub is een platform waar ontwikkelaars code kunnen schrijven, beheren en delen. Dit is de meest gebruikte tool om open source-software te ontwikkelen, en dit sluit aan bij het beleid van de Kiesraad op het gebied van open source. Ook faciliteert GitHub het complete softwareontwikkelings- en reviewproces, automatisch testen en quality gates.

### Figma

Figma is een veelgebruikte tool voor het ontwerpen van gebruikersinterfaces voor digitale producten. Het bevat veel functionaliteit, goede opties voor samenwerking en is zeer populair onder designers.
