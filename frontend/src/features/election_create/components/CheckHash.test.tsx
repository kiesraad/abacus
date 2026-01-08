import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@/testing/test-utils";
import { CheckHash } from "./CheckHash";

const onSubmit = vi.fn();

function renderPage(error = false) {
  render(
    <CheckHash
      date={"2022-03-16"}
      title={"Gemeenteraad Test 2022"}
      header={"Controleer bestand"}
      description={"Het bestand <naam bestand> is geïmporteerd etc etc"}
      redactedHash={{
        chunks: [
          "asdf",
          "qwer",
          "zxcv",
          "tyui",
          "",
          "bnml",
          "1234",
          "5678",
          "8765",
          "gfsd",
          "a345",
          "qwer",
          "lgmg",
          "",
          "nytf",
          "sdfr",
        ],
        redacted_indexes: [4, 11],
      }} // redact these?
      error={error}
      onSubmit={onSubmit}
    />,
  );
}

describe("CheckHash component", () => {
  test("It submits for a valid hash input", async () => {
    renderPage();

    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { level: 2, name: "Controleer bestand" })).toBeVisible();
    expect(screen.getByText("Gemeenteraad Test 2022")).toBeVisible();
    expect(screen.getByText("woensdag 16 maart 2022")).toBeVisible();

    const inputPart1 = screen.getByRole("textbox", { name: "Controle deel 1" });
    await user.type(inputPart1, "1234");
    const inputPart2 = screen.getByRole("textbox", { name: "Controle deel 2" });
    await user.type(inputPart2, "5678");
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(inputPart1).not.toBeInvalid();
    expect(inputPart2).not.toBeInvalid();
    expect(onSubmit).toHaveBeenCalled();
  });

  test("It shows an error for an invalid hash input", async () => {
    renderPage();

    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { level: 2, name: "Controleer bestand" })).toBeVisible();

    const inputPart1 = screen.getByRole("textbox", { name: "Controle deel 1" });
    await user.type(inputPart1, "zxcv");
    const inputPart2 = screen.getByRole("textbox", { name: "Controle deel 2" });
    await user.type(inputPart2, "123");
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Controle digitale vingerafdruk niet gelukt");
    expect(inputPart1).not.toBeInvalid();
    expect(inputPart2).toBeInvalid();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("It shows an error when provided by caller", async () => {
    renderPage(true);

    expect(await screen.findByRole("heading", { level: 2, name: "Controleer bestand" })).toBeVisible();

    expect(await screen.findByRole("alert")).toHaveTextContent("Controle digitale vingerafdruk niet gelukt");

    const inputPart1 = screen.getByRole("textbox", { name: "Controle deel 1" });
    expect(inputPart1).not.toBeInvalid();
    const inputPart2 = screen.getByRole("textbox", { name: "Controle deel 2" });
    expect(inputPart2).not.toBeInvalid();
  });
});
