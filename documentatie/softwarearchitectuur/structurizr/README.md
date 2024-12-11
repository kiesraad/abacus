# Structurizr workspace

Deze map bestaat uit de [Structurizr] workspace voor de
softwarearchitectuur-diagrammen van Abacus.

De diagrammen worden in `workspace.dsl` gedefinieerd en zijn met de [Structurizr
Lite] tool te visualiseren. Hiermee is ook de layout aan te passen (dit is
alleen bij het componentendiagram nodig). Nadat de layout is aangepast, kunnen
de diagrammen worden geëxporteerd naar verschillende formaten. De geëxporteerde
diagrammen zijn in SVG-formaat aan deze map toegevoegd.

Om Structurizr Lite te gebruiken, kan Docker worden gebruikt:

    docker run -it --rm -p 8080:8080 -v $PWD:/usr/local/structurizr structurizr/lite

Vervolgens kan de tool worden geopend in de browser op `http://localhost:8080`.

[Structurizr]: https://structurizr.com/
[Structurizr Lite]: https://docs.structurizr.com/lite/quickstart
