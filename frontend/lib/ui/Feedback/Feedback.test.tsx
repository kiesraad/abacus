import { describe, expect, test } from "vitest";

import { render } from "app/test/unit";

import {
  MultipleErrors,
  MultipleWarnings,
  SingleError,
  SingleErrorCustomAction,
  SingleWarning,
} from "./Feedback.stories";

describe("UI component: Feedback", () => {
  test("Single Error has expected children", () => {
    const { getByText } = render(<SingleError />);

    expect(getByText("Controleer uitgebrachte stemmen")).toBeInTheDocument();
    expect(getByText("F.202")).toBeInTheDocument();
    expect(getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder.")).toBeInTheDocument();
    expect(
      getByText(
        "Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
      ),
    ).toBeInTheDocument();
  });

  test("Single error with custom action does not have default action text", () => {
    const { getByText, queryByText } = render(<SingleErrorCustomAction />);

    expect(getByText("Controleer het papieren proces-verbaal")).toBeInTheDocument();
    expect(getByText("F.101")).toBeInTheDocument();
    expect(queryByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder.")).not.toBeInTheDocument();
  });

  test("Multiple errors has expected children", () => {
    const { getByText } = render(<MultipleErrors />);

    expect(getByText("Controleer toegelaten kiezers")).toBeInTheDocument();
    expect(getByText("F.201")).toBeInTheDocument();
    expect(getByText("Controleer uitgebrachte stemmen")).toBeInTheDocument();
    expect(getByText("F.202")).toBeInTheDocument();
    expect(getByText("Voor alle foutmeldingen geldt het volgende:")).toBeInTheDocument();
    expect(getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder.")).toBeInTheDocument();
    expect(
      getByText(
        "Heb je alles goed overgenomen, en blijft de fout? Dan mag je niet verder. Overleg met de coördinator.",
      ),
    ).toBeInTheDocument();
  });

  test("Single Warning has expected children", () => {
    const { getByText } = render(<SingleWarning />);

    expect(getByText("Controleer aantal toegelaten kiezers en aantal uitgebrachte stemmen")).toBeInTheDocument();
    expect(getByText("W.203")).toBeInTheDocument();
    expect(getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder.")).toBeInTheDocument();
    expect(
      getByText("Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder."),
    ).toBeInTheDocument();
  });

  test("Multiple warnings has expected children", () => {
    const { getByText } = render(<MultipleWarnings />);

    expect(getByText("Controleer aantal blanco stemmen")).toBeInTheDocument();
    expect(getByText("W.201")).toBeInTheDocument();
    expect(getByText("Controleer aantal ongeldige stemmen")).toBeInTheDocument();
    expect(getByText("W.202")).toBeInTheDocument();
    expect(getByText("Voor alle waarschuwingen geldt het volgende:")).toBeInTheDocument();
    expect(getByText("Heb je iets niet goed overgenomen? Herstel de fout en ga verder.")).toBeInTheDocument();
    expect(
      getByText("Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder."),
    ).toBeInTheDocument();
  });
});
