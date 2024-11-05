export const nl = {
  test: "test",

  election: "Verkiezing",
  elections: "Verkiezingen",
  list: "Lijst",
  number: "Nummer",
  vote_count: "Aantal stemmen",
  candidate: "Kandidaat",
  manage_elections: "Beheer verkiezingen",
  role: "Rol",
  status: "Status",
  progress: "Voortgang",
  shortcuts: "Snelkoppelingen",
  all_together: "Alles samen",
  server: "Server",
  version: "Versie",
  totals_list: "Totaal lijst {group_number}",
  next: "Volgende",

  error: "Fout",
  history_back: "Terug naar de vorige pagina",
  stack_trace: "Fout details",
  something_went_wrong: "Er is iets misgegaan",
  error_code: "Foutcode",
  close_message: "Melding sluiten",

  "candidates_votes.check_totals":
    "Controleer het totaal van deze lijst. Overleg met coördinator als het papier niet is ingevuld.",
  "candidates_votes.check_paper_report":
    "Je kan alleen verder als je het het papieren proces-verbaal hebt gecontroleerd.",
  "candidates_votes.confirm_counts": "Ik heb de aantallen gecontroleerd met het papier en correct overgenomen.",
  "candidates_votes.goto_totals": "Snel naar totaal van de lijst",

  "status.unfinished": "Niet afgeronde invoer",
  "status.in_progress": "Invoer bezig",
  "status.definitive": "Eerste invoer klaar",
  "status.not_started": "Werkvoorraad",

  "election_status.title": "Status verkiezing - Abacus",
  "election_status.first_session": "Eerste zitting",
  "election_status.definitive.title": "Alle stembureaus zijn twee keer ingevoerd",
  "election_status.definitive.message":
    "De resultaten van alle stembureaus in jouw gemeente zijn correct ingevoerd. Je kunt de uitslag nu definitief maken en het proces verbaal opmaken. Doe dit alleen als er vandaag niks meer herteld hoeft te worden.",
  "election_status.definitive.finish_button": "Invoerfase afronden",

  "account.configured": "Je account is ingesteld",
  "feedback.F101.title": "Controleer het papieren proces-verbaal",
  "feedback.F101.content": "Is op pagina 1 aangegeven dat er in opdracht van het Gemeentelijk Stembureau is herteld?",
  "feedback.F101.action":
    "<ul><li>Controleer of rubriek 3 is ingevuld. Is dat zo? Kies hieronder 'ja'</li><li>Wel een vinkje, maar rubriek 3 niet ingevuld? Overleg met de coördinator</li><li>Geen vinkje? Kies dan 'nee'.</li></ul>",
  "feedback.F201.title": "Controleer toegelaten kiezers",
  "feedback.F201.content":
    "De invoer bij A, B, C of D klopt niet.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.F202.title": "Controleer uitgebrachte stemmen",
  "feedback.F202.content":
    "De invoer bij E, F, G of H klopt niet.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.F203.title": "Controleer hertelde toegelaten kiezers",
  "feedback.F203.content":
    "De invoer bij A.2, B.2, C.2 of D.2 klopt niet.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.F204.title": "Controleer (totaal) aantal stemmen op kandidaten",
  "feedback.F204.content":
    "De optelling van alle lijsten is niet gelijk aan de invoer bij E.\nCheck of je invoer bij E gelijk is aan het papieren proces-verbaal. En check of je alle lijsten hebt ingevoerd.",
  "feedback.F301.title": "Controleer I (stembiljetten meer geteld)",
  "feedback.F301.content":
    "Je hebt bij <link>Aantal kiezers en stemmers</link> ingevuld dat er meer stemmen dan kiezers waren. Het aantal dat je bij I hebt ingevuld is niet gelijk aan het aantal meer getelde stembiljetten.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.F302.title": "Controleer J (stembiljetten minder geteld)",
  "feedback.F302.content":
    "Je hebt bij <link>Aantal kiezers en stemmers</link> ingevuld dat er meer stemmen dan kiezers waren. Daarom mag J niet ingevuld zijn.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.F303.title": "Controleer J (stembiljetten minder geteld)",
  "feedback.F303.content":
    "Je hebt bij <link>Aantal kiezers en stemmers</link> ingevuld dat er minder stemmen dan kiezers waren. Het aantal dat je bij J hebt ingevuld is niet gelijk aan het aantal minder getelde stembiljetten.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.F304.title": "Controleer I (stembiljetten meer geteld)",
  "feedback.F304.content":
    "Je hebt bij <link>Aantal kiezers en stemmers</link> ingevuld dat er minder stemmen dan kiezers waren. Daarom mag I niet ingevuld zijn.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.F305.title": "Controleer ingevulde verschillen",
  "feedback.F305.content":
    "Je hebt bij <link>Aantal kiezers en stemmers</link> ingevuld dat er evenveel stemmen als kiezers waren. Maar je hebt wel verschillen ingevuld.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.F401.title": "Controleer ingevoerde aantallen",
  "feedback.F401.content":
    "De opgetelde stemmen op de kandidaten en het ingevoerde totaal zijn niet gelijk.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W201.title": "Controleer aantal blanco stemmen",
  "feedback.W201.content":
    "Het aantal blanco stemmen is erg hoog.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W202.title": "Controleer aantal ongeldige stemmen",
  "feedback.W202.content":
    "Het aantal ongeldige stemmen is erg hoog.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W203.title": "Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen",
  "feedback.W203.content":
    "Er is een onverwacht verschil tussen het aantal toegelaten kiezers (A t/m D) en het aantal uitgebrachte stemmen (E t/m H).\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W204.title": "Controleer aantal uitgebrachte stemmen en herteld aantal toegelaten kiezers",
  "feedback.W204.content":
    "Er is een onverwacht verschil tussen het aantal uitgebrachte stemmen (E t/m H) en het herteld aantal toegelaten kiezers (A.2 t/m D.2).\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W205.title": "Controleer aantal uitgebrachte stemmen",
  "feedback.W205.content":
    "Het totaal aantal uitgebrachte stemmen (H) is nul.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W206.title": "Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen",
  "feedback.W206.content":
    "Het totaal aantal toegelaten kiezers (D) en/of het totaal aantal uitgebrachte stemmen (H) is hoger dan het aantal kiesgerechtigden voor dit stembureau.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W207.title": "Controleer aantal uitgebrachte stemmen en herteld aantal toegelaten kiezers",
  "feedback.W207.content":
    "Het totaal aantal uitgebrachte stemmen (H) en/of het herteld totaal aantal toegelaten kiezers (D.2) is hoger dan het aantal kiesgerechtigden voor dit stembureau.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W208.title": "Controleer A t/m D en E t/m H",
  "feedback.W208.content":
    "De getallen bij A t/m D zijn precies hetzelfde als E t/m H.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W209.title": "Controleer E t/m H en A.2 t/m D.2",
  "feedback.W209.content":
    "De getallen bij E t/m H zijn precies hetzelfde als A.2 t/m D.2.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W301.title": "Controleer ingevulde verschillen",
  "feedback.W301.content":
    "De invoer bij I, K, L, M, N of O klopt niet.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
  "feedback.W302.title": "Controleer ingevulde verschillen",
  "feedback.W302.content":
    "De invoer bij J, K, L, M, N of O klopt niet.\nCheck of je het papieren proces-verbaal goed hebt overgenomen.",
};
