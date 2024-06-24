workspace "Abacus" "Software Architecture for Abacus" {
    model {
        c = person "Coördinator"
        b = person "Beheerder"
        i = person "Invoerder"

        afz = softwareSystem "Abacus Afzender-verificatie" "[Work In Progress] Verifieert de afzender van de uitslag door middel van een digitale handtekening." "Mobile App"

        abc = softwareSystem "Abacus" "Verkiezingsuitslagenverwerking" "Software System" {
            frontend = container "Frontend" "Biedt alle Abacus functionaliteit via een webbrowser."  "Single-Page Application - TypeScript, React"  "Web Browser"
            backend = container "Backend" "Biedt Abacus API" "Rust" {
                beheer = component "Beheer" "Beheer van verkiezingen, verkiezingsgegevens en de zitting."
                gebruikers = component "Gebruikers" "Gebruikers en rollen: beheer, authenticatie, autorisatie."
                verkiezingen = component "Verkiezingsgegevens" "Verkiezingsgegevens incl. politieke groeperingen, kandidatenlijsten en stembureau's."
                invoeren = component "Invoer" "Invoeren en validatie van telresultaten."
                telresultaten = component "Telresultaten" "Gecontroleerde telresultaten van stembureau's."
                exporteren = component "Exporteren" "Exporteren van resultaten."
                eml_nl = component "EML_NL generator" "EML_NL-bestandenexport."
                pdf = component "PDF generator" "PDF-bestandenexport via Typst."
                zetelverdeling = component "Zetelverdeling" "Zetelverdeling na invoer van alle telresultaten."
                statistieken = component "Statistieken" "Statistieken van het uitslagvaststellingsproces."
            }
            database = container "Database" "SQLite" "Bewaart ingevoerde gegevens" "Database"
        }

        plt = softwareSystem "Platform Teluitslagen" "Bewaart teluitslagen voor uitwisseling met HSB en CSB." "Existing System"
        plu = softwareSystem "Uitwisselingsplatform" "Installatiebestand, verkiezingsdefinitie en kandidatenlijst in EML_NL formaat." "Existing System"
        t = element "Tellingen" "Tellingen" "Papieren tellingen van de stembureau's." "Papier"
        pv = element "Proces-verbaal" "Proces-verbaal" "Geprint proces-verbaal van de uitslagziting." "Papier"

        # relaties tussen systemen
        afz -> abc "Scan van hash van uitslag" "QR-code"

        # relaties tussen personen en systemen
        t -> i "Gebruikt door"
        c -> plt "Uploadt resultaten"
        c -> pv "Print proces-verbaal"
        c -> afz "Plaatst digitale handtekening onder uitslag via"
        plu -> b "Downloadt bestanden"

        # relaties tussen containers
        c -> frontend "Coördineert zitting en invoerproces" "HTTPS"
        i -> frontend "Voert tellingen in" "HTTPS"
        b -> frontend "Beheert verkiezing en gebruikers" "HTTPS"

        frontend -> backend "Communiceert met" "JSON REST"
        backend -> database "Leest van en schrijft naar" "SQL"

        # relaties tussen componenten
        frontend -> gebruikers "Communiceert via API met" "JSON REST"
        frontend -> invoeren "Communiceert via API met" "JSON REST"
        frontend -> beheer "Communiceert via API met" "JSON REST"
        frontend -> exporteren "Communiceert via API met" "JSON REST"
        frontend -> zetelverdeling "Communiceert via API met" "JSON REST"
        frontend -> statistieken "Communiceert via API met" "JSON REST"

        invoeren -> telresultaten "Wordt na dubbele invoer"
        invoeren -> verkiezingen "Maakt gebruik van"

        exporteren -> zetelverdeling "Maakt gebruik van zetelverdeling en telresultaten"
        exporteren -> eml_nl "Maakt gebruik van"
        exporteren -> pdf "Maakt gebruik van"
        exporteren -> telresultaten "Maakt gebruik van"

        zetelverdeling -> telresultaten "Maakt gebruik van"

        beheer -> verkiezingen "Beheer van"

        telresultaten -> verkiezingen "Maakt gebruik van"
    }

    views {
        systemlandscape "SystemLandscape" {
            include *
            autoLayout
        }
        systemContext abc "SystemContextAbacusMain" {
            include *
            autoLayout
        }
        systemContext afz "SystemContextAbacusAfzenderverificatie" {
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
                fontSize 30
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
            element "Mobile App" {
                shape MobileDevicePortrait
                # work in progress styling
                background #5496d8
                strokeWidth 10
                border dashed
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
