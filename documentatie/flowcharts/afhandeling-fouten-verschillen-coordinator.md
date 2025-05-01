# Afhandeling fouten en verschillen door coördinator

Deze flowchart beschrijft hoe de coördinator invoer met fouten of verschillen afhandelt.

Als de eerste invoer fouten bevat, moeten die opgelost worden. Dit betekent dat de tweede invoer alleen kan starten, nadat alle fouten die gedetecteerd zijn tijdens de eerste invoer, zijn opgelost.

Als de tweede invoer fouten bevat, heeft die dus per definitie verschillen met de eerste invoer. In dat geval moet de coördinator eerst de verschillen oplossen. Als de coördinator besluit de tweede invoer te behouden, dan moet als volgende stap de fouten opgelost worden.


```mermaid
flowchart TD
    %% elements
    klaar-voor-eerste-invoer((klaar voor 1ste invoer))
    eerste-invoer-bezig(1ste invoer bezig)
    fouten{fouten?}
    invoer-met-fouten-en-waarschuwingen-1(invoer met fouten en waarschuwingen)
    fout-oplossen{fout oplossen}

    klaar-voor-tweede-invoer(klaar voor 2de invoer)
    tweede-invoer-bezig(2de invoer bezig)
    verschil-oplossen{verschil oplossen}
    verschil-met-eerste-invoer{verschil met 1ste invoer}
    invoer-met-fouten-en-waarschuwingen-2(invoer met fouten en waarschuwingen)

    invoer-definitief((invoer definitief))

    %% flow
    klaar-voor-eerste-invoer --invoerder 1 pakt op --> eerste-invoer-bezig

    fouten -- nee --> klaar-voor-tweede-invoer
    
    subgraph sg-eerste-invoer[eerste invoer]
    eerste-invoer-bezig -- invoer afgerond --> fouten
    fouten -- ja --> invoer-met-fouten-en-waarschuwingen-1
    end

    invoer-met-fouten-en-waarschuwingen-1 --> fout-oplossen
    fout-oplossen -- terug naar de teltafel of corrigendum maken (en invoer opnieuw down) --> klaar-voor-eerste-invoer

    fout-oplossen -- lid GSB corrigeert PV, terug naar oorspronkelijke invoerder --> eerste-invoer-bezig

    
    klaar-voor-tweede-invoer -- invoerder 2 pakt op --> tweede-invoer-bezig

    subgraph sg-tweede-invoer[tweede-invoer]
    tweede-invoer-bezig -- invoer afgerond --> verschil-met-eerste-invoer
    verschil-met-eerste-invoer -- ja --> invoer-met-fouten-en-waarschuwingen-2
    end

    invoer-met-fouten-en-waarschuwingen-2 --> verschil-oplossen
    verschil-oplossen -- bewaar 1ste invoer --> klaar-voor-tweede-invoer
    verschil-oplossen -- bewaarde 2de invoer, 2de invoer wordt 1ste invoer --> fouten
    verschil-oplossen -- verwijder 1ste en 2de invoer --> klaar-voor-eerste-invoer

    verschil-met-eerste-invoer -- nee --> invoer-definitief

    %% styling
    classDef greyFill fill:#eee,stroke:#bbb;
    class sg-eerste-invoer,sg-tweede-invoer greyFill;
    classDef yellowFill fill:#ffc943,stroke:#e8a302;
    class klaar-voor-eerste-invoer,invoer-definitief yellowFill;
