import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { overrideOnce } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import type { NewElection } from "@/types/generated/openapi";
import * as uploadFileSize from "@/utils/uploadFileSize";
import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { UploadElectionDefinition } from "./UploadElectionDefinition";

async function renderPage() {
  render(<UploadElectionDefinition />);

  expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeInTheDocument();
}

const election = { name: "Naam", location: "Plek" } as NewElection;

const filename = "foo.txt";
const file = new File(["foo"], filename, { type: "text/plain" });

describe("UploadElectionDefinition component", () => {
  test("It shows an error when uploading invalid file", async () => {
    const state = { election, numberOfVoters: 0 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    await renderPage();

    const user = userEvent.setup();

    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldige verkiezingsdefinitie");
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("It shows error when frontend determines election file is too large", async () => {
    const state = { election, numberOfVoters: 0 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    await renderPage();

    vi.spyOn(uploadFileSize, "isFileTooLarge").mockResolvedValueOnce(true);

    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    expect(screen.getByLabelText("Geen bestand gekozen")).toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldige verkiezingsdefinitie");
    expect(screen.getByRole("alert")).toHaveTextContent(
      `Het bestand ${filename} is te groot. Kies een bestand van maximaal 5 Megabyte`,
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("It shows error when backend determines election file is too large", async () => {
    const state = { election, numberOfVoters: 0 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    await renderPage();

    const user = userEvent.setup();

    overrideOnce("post", "/api/elections/import/validate", 413, {
      error: "15",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldige verkiezingsdefinitie");
    expect(screen.getByRole("alert")).toHaveTextContent(
      `Het bestand ${filename} is te groot. Kies een bestand van maximaal 5 Megabyte`,
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});
