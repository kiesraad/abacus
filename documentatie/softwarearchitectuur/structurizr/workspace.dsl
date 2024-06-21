workspace "Abacus" "Software Architecture for Abacus" {
    model {
        c = person "Coördinator"
        b = person "Beheerder"
        i = person "Invoerder"

        t = element "Tellingen" "Tellingen" "Papiren tellingen van de stembureau's." "Papier"
        pv = element "Proces-verbaal" "Proces-verbaal" "Geprint proces-verbaal van de uitslagziting." "Papier"
        plt = softwareSystem "Platform Teluitslagen" "Bewaart resultaten voor uitwisseling met HSB en CSB." "Existing System"
        plu = softwareSystem "Uitwisselingsplatform" "Installatiebestand, verkiezingsdefinitie en kandidatenlijst in EML_NL formaat." "Existing System"

        abc = softwareSystem "Abacus" {
            frontend = container "Frontend" "Biedt alle Abacus functionaliteit via een webbrowser"  "Single-Page Application - TypeScript, React"  "Web Browser"
            backend = container "Backend" "Biedt Abacus API" "Rust" {
                importeren = component "Importeren" "Importeren van bestanden."
                gebruikers = component "Gebruikers" "Gebruikers en rollen."
                verkiezingen = component "Verkiezingsgegevens" "Verkiezingsgegevens incl. politieke groeperingen, kandidatenlijsten en stembureau's."
                invoeren = component "Invoer" "Invoeren en validatie van telresultaten."
                telresultaten = component "Telresultaten" "Gecontroleerde telresultaten van stembureau's."
                exporteren = component "Exporteren" "Exporteren van resultaten."
                eml_nl = component "EML_NL generator" "EML_NL-bestandenexport."
                pdf = component "PDF generator" "PDF-bestandenexport via Typst."
                zetelverdeling = component "Zetelverdeling" "Zetelverdeling na invoer van alle telresultaten."
            }
            database = container "Database" "SQLite" "Bewaart ingevoerde gegevens" "Database"
        }

        # relaties tussen personen en systemen
        t -> i "Gebruikt door"
        c -> plt "Uploadt resultaten"
        c -> pv "Print proces-verbaal"
        plu -> b "Downloadt bestanden"

        # relaties tussen containers
        c -> frontend "Coördineert zitting en invoerproces" "HTTPS"
        i -> frontend "Voert tellingen in" "HTTPS"
        b -> frontend "Beheert verkiezing en gebruikers" "HTTPS"

        frontend -> backend "Gebruikt" "JSON REST"
        backend -> database "Leest van en schrijft naar" "SQL"

        # relaties tussen componenten
        frontend -> gebruikers "Roept API aan voor inloggen en beheer van" "JSON REST"
        frontend -> invoeren "Roept API aan voor" "JSON REST"
        frontend -> importeren "Roept API aan voor" "JSON REST"
        frontend -> exporteren "Roept API aan voor" "JSON REST"

        invoeren -> telresultaten "Wordt telresultaat na dubbele invoer"
        invoeren -> verkiezingen "Gebruikt gegevens van"

        exporteren -> zetelverdeling "Gebruikt zetelverdeling en telresultaten"
        exporteren -> eml_nl "Gebruikt"
        exporteren -> pdf "Gebruikt"

        zetelverdeling -> telresultaten "Gebruikt"

        importeren -> verkiezingen "Maakt"

        telresultaten -> verkiezingen "Gebruikt"
    }

    views {
        systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }
        systemContext abc "SystemContext" {
            include *
            autoLayout
        }
        container abc "Container" {
            include *
            autoLayout
        }
        component backend "Components" {
            include *
        }

        styles {
            element "Person" {
                background #dddddd
                fontSize 22
                shape Person
            }
            element "Papier" {
                background #ffffe3
                shape Folder
            }
            element "Software System" {
                background #1168bd
                color #ffffff
            }
            element "Existing System" {
                background #999999
                color #ffffff
            }
            element "Container" {
                background #438dd5
                color #ffffff
            }
            element "Web Browser" {
                shape WebBrowser
            }
            element "Database" {
                shape Cylinder
            }
            element "Component" {
                background #85bbf0
                color #000000
            }
        }

        branding {
            font "'DM Sans', DMSans, sans-serif"
        }
    }
}
