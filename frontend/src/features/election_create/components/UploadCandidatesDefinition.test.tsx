import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { overrideOnce } from "@/testing/server";
import { render, renderReturningRouter, screen } from "@/testing/test-utils";
import type { NewElection } from "@/types/generated/openapi";
import * as uploadFileSize from "@/utils/uploadFileSize";
import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { UploadCandidatesDefinition } from "./UploadCandidatesDefinition";

async function renderPage() {
  render(
    <ElectionCreateContextProvider>
      <UploadCandidatesDefinition />
    </ElectionCreateContextProvider>,
  );

  expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijsten" })).toBeInTheDocument();
}

async function uploadFile(file: File) {
  const user = userEvent.setup();

  const input = await screen.findByLabelText("Bestand kiezen");
  expect(input).toBeVisible();
  expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
  await user.upload(input, file);
}

const election = { name: "Naam", location: "Plek" } as NewElection;

const filename = "foo.txt";
const file = new File(["foo"], filename, { type: "text/plain" });

describe("UploadCandidatesDefinition component", () => {
  test("Navigates to election create page when no electionDefinitionData", () => {
    const state = { election, numberOfVoters: 0 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(<UploadCandidatesDefinition />);

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test("Shows an error when uploading invalid candidates list file", async () => {
    const state = { election, numberOfVoters: 0, electionDefinitionData: "mocked" };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    await renderPage();
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldige kandidatenlijsten");
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("Shows error when frontend determines candidates list file is too large", async () => {
    const state = { election, numberOfVoters: 0, electionDefinitionData: "mocked" };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    vi.spyOn(uploadFileSize, "isFileTooLarge").mockResolvedValueOnce(true);

    await renderPage();
    await uploadFile(file);

    expect(screen.getByLabelText("Geen bestand gekozen")).toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldige kandidatenlijsten");
    expect(screen.getByRole("alert")).toHaveTextContent(
      `Het bestand ${filename} is te groot. Kies een bestand van maximaal 5 Megabyte`,
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("Shows error when backend determines candidates list file is too large", async () => {
    const state = { election, numberOfVoters: 0, electionDefinitionData: "mocked" };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce("post", "/api/elections/import/validate", 413, {
      error: "15",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    await renderPage();
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldige kandidatenlijsten");
    expect(screen.getByRole("alert")).toHaveTextContent(
      `Het bestand ${filename} is te groot. Kies een bestand van maximaal 5 Megabyte`,
    );
    expect(dispatch).not.toHaveBeenCalled();
  });
});
