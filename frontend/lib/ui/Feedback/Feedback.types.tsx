import { ReactNode } from "react";
import { Link } from "react-router-dom";

import { ValidationResultCode } from "@kiesraad/api";

export type ClientValidationResultCode = "F101" | ValidationResultCode;

export interface FeedbackItem {
  title: string;
  code?: string;
  content: ReactNode;
}

export const feedbackTypes: { [feedbackCode in ClientValidationResultCode]: FeedbackItem } = {
  F101: {
    title: "Controleer het papieren proces-verbaal",
    code: "F.101",
    content: (
      <span>
        Is op pagina 1 aangegeven dat er in opdracht van het Gemeentelijk Stembureau is herteld?
      </span>
    ),
  },
  F201: {
    title: "Controleer toegelaten kiezers",
    code: "F.201",
    content: (
      <div>
        De invoer bij A, B, C of D klopt niet.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  F202: {
    title: "Controleer uitgebrachte stemmen",
    code: "F.202",
    content: (
      <div>
        De invoer bij E, F, G of H klopt niet.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  F203: {
    title: "Controleer hertelde toegelaten kiezers",
    code: "F.203",
    content: (
      <div>
        De invoer bij A.2, B.2, C.2 of D.2 klopt niet.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  F204: {
    title: "Controleer (totaal) aantal stemmen op kandidaten",
    code: "F.204",
    content: (
      <div>
        De optelling van alle lijsten is niet gelijk aan de invoer bij E.
        <br />
        Check of je invoer bij E gelijk is aan het papieren proces-verbaal. En check of je alle
        lijsten hebt ingevoerd.
      </div>
    ),
  },
  F301: {
    title: "Controleer I (stembiljetten meer geteld)",
    code: "F.301",
    content: (
      <div>
        Je hebt bij <Link to={`../numbers`}>Aantal kiezers en stemmers</Link> ingevuld dat er meer
        stemmen dan kiezers waren. Het aantal dat je bij I hebt ingevuld is niet gelijk aan het
        aantal meer getelde stembiljetten.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  F302: {
    title: "Controleer J (stembiljetten minder geteld)",
    code: "F.302",
    content: (
      <div>
        Je hebt bij <Link to={`../numbers`}>Aantal kiezers en stemmers</Link> ingevuld dat er meer
        stemmen dan kiezers waren. Daarom mag J niet ingevuld zijn.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  F303: {
    title: "Controleer J (stembiljetten minder geteld)",
    code: "F.303",
    content: (
      <div>
        Je hebt bij <Link to={`../numbers`}>Aantal kiezers en stemmers</Link> ingevuld dat er minder
        stemmen dan kiezers waren. Het aantal dat je bij J hebt ingevuld is niet gelijk aan het
        aantal minder getelde stembiljetten.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  F304: {
    title: "Controleer I (stembiljetten meer geteld)",
    code: "F.304",
    content: (
      <div>
        Je hebt bij <Link to={`../numbers`}>Aantal kiezers en stemmers</Link> ingevuld dat er minder
        stemmen dan kiezers waren. Daarom mag I niet ingevuld zijn.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  F305: {
    title: "Controleer ingevulde verschillen",
    code: "F.305",
    content: (
      <div>
        Je hebt bij <Link to={`../numbers`}>Aantal kiezers en stemmers</Link> ingevuld dat er
        evenveel stemmen als kiezers waren. Maar je hebt wel verschillen ingevuld.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  F401: {
    title: "Controleer ingevoerde aantallen",
    code: "F.401",
    content: (
      <div>
        De opgetelde stemmen op de kandidaten en het ingevoerde totaal zijn niet gelijk.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W201: {
    title: "Controleer aantal blanco stemmen",
    code: "W.201",
    content: (
      <div>
        Het aantal blanco stemmen is erg hoog.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W202: {
    title: "Controleer aantal ongeldige stemmen",
    code: "W.202",
    content: (
      <div>
        Het aantal ongeldige stemmen is erg hoog.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W203: {
    title: "Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen",
    code: "W.203",
    content: (
      <div>
        Er is een onverwacht verschil tussen het aantal kiezers (A t/m D) en het aantal getelde
        stemmen (E t/m H).
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W204: {
    title: "Controleer herteld aantal toegelaten kiezers en aantal uitgebrachte stemmen",
    code: "W.204",
    content: (
      <div>
        Er is een onverwacht verschil tussen het herteld aantal kiezers (A.2 t/m D.2) en het aantal
        getelde stemmen (E t/m H).
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W205: {
    title: "Controleer aantal uitgebrachte stemmen",
    code: "W.205",
    content: (
      <div>
        Het totaal aantal uitgebrachte stemmen (H) is nul.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W206: {
    title: "Controleer aantal uitgebrachte stemmen",
    code: "W.206",
    content: (
      <div>
        Het totaal aantal uitgebrachte stemmen (H) is onverwacht hoog.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W207: {
    title: "Controleer aantal toegelaten kiezers",
    code: "W.207",
    content: (
      <div>
        Het totaal aantal toegelaten kiezers (D) is onverwacht hoog.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W208: {
    title: "Controleer herteld aantal toegelaten kiezers",
    code: "W.208",
    content: (
      <div>
        Het herteld totaal aantal toegelaten kiezers (D.2) is onverwacht hoog.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W209: {
    title: "Controleer E t/m H en A t/m D",
    code: "W.209",
    content: (
      <div>
        De getallen bij E t/m H zijn precies hetzelfde als A t/m D.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W210: {
    title: "Controleer E t/m H en A.2 t/m D.2",
    code: "W.210",
    content: (
      <div>
        De getallen bij E t/m H zijn precies hetzelfde als A.2 t/m D.2.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W301: {
    title: "Controleer ingevulde verschillen",
    code: "W.301",
    content: (
      <div>
        De invoer bij I, K, L, M, N of O klopt niet.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
  W302: {
    title: "Controleer ingevulde verschillen",
    code: "W.302",
    content: (
      <div>
        De invoer bij J, K, L, M, N of O klopt niet.
        <br />
        Check of je het papieren proces-verbaal goed hebt overgenomen.
      </div>
    ),
  },
};
