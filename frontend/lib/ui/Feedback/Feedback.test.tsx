import { describe, expect, test } from "vitest";

import { render } from "app/test/unit";

import {
  MultipleErrors,
  MultipleWarnings,
  SingleError,
  SingleErrorWithCustomAction,
  SingleServerError,
  SingleWarning,
} from "./Feedback.stories";

describe("UI component: Feedback", () => {
  test("Single Error has expected children", () => {
    const { getByText } = render(<SingleError />);

    expect(getByText("Controleer uitgebrachte stemmen")).toBeInTheDocument();
    expect(getByText("F.202")).toBeInTheDocument();
    expect(
      getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder."),
    ).toBeInTheDocument();
    expect(
      getByText(
        "Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
      ),
    ).toBeInTheDocument();
  });

  test("Single Error With Custom Action has expected children", () => {
    const { getByText } = render(<SingleErrorWithCustomAction />);

    expect(getByText("Controleer het papieren proces-verbaal")).toBeInTheDocument();
    expect(getByText("F.101")).toBeInTheDocument();
    expect(
      getByText("Controleer of rubriek 3 is ingevuld. Is dat zo? Kies hieronder 'ja'"),
    ).toBeInTheDocument();
    expect(
      getByText("Wel een vinkje, maar rubriek 3 niet ingevuld? Overleg met de coördinator"),
    ).toBeInTheDocument();
    expect(getByText("Geen vinkje? Kies dan 'nee'.")).toBeInTheDocument();
  });

  test("Multiple errors has expected children", () => {
    const { getByText } = render(<MultipleErrors />);

    expect(getByText("Controleer toegelaten kiezers")).toBeInTheDocument();
    expect(getByText("F.201")).toBeInTheDocument();
    expect(getByText("Controleer uitgebrachte stemmen")).toBeInTheDocument();
    expect(getByText("F.202")).toBeInTheDocument();
    expect(getByText("Voor alle foutmeldingen geldt het volgende:")).toBeInTheDocument();
    expect(
      getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder."),
    ).toBeInTheDocument();
    expect(
      getByText(
        "Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
      ),
    ).toBeInTheDocument();
  });

  test("Single Warning has expected children", () => {
    const { getByText } = render(<SingleWarning />);

    expect(
      getByText("Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen"),
    ).toBeInTheDocument();
    expect(getByText("W.203")).toBeInTheDocument();
    expect(
      getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder."),
    ).toBeInTheDocument();
    expect(
      getByText(
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ),
    ).toBeInTheDocument();
  });

  test("Multiple warnings has expected children", () => {
    const { getByText } = render(<MultipleWarnings />);

    expect(getByText("Controleer aantal blanco stemmen")).toBeInTheDocument();
    expect(getByText("W.201")).toBeInTheDocument();
    expect(getByText("Controleer aantal ongeldige stemmen")).toBeInTheDocument();
    expect(getByText("W.202")).toBeInTheDocument();
    expect(getByText("Voor alle waarschuwingen geldt het volgende:")).toBeInTheDocument();
    expect(
      getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder."),
    ).toBeInTheDocument();
    expect(
      getByText(
        "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
      ),
    ).toBeInTheDocument();
  });

  test("Server error has expected children", () => {
    const { getByText } = render(<SingleServerError />);

    expect(getByText("Server error")).toBeInTheDocument();
    expect(getByText("500: Internal Server Error")).toBeInTheDocument();
  });
});
