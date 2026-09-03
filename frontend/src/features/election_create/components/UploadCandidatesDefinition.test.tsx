import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import {
  csbElectionMockData,
  electionImportValidateMockResponse,
  electionMockData,
} from "@/testing/api-mocks/ElectionMockData";
import { overrideOnce } from "@/testing/server";
import { render, renderReturningRouter, screen, waitFor } from "@/testing/test-utils";
import type { CommitteeCategory, ElectionCategory, NewElection } from "@/types/generated/openapi";
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

const election = {
  name: "Naam",
  location: "Plek",
  election_date: "2022-03-16",
} as NewElection;

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
      error: "EML import error",
      fatal: false,
      reference: "EmlImportError",
    });

    await renderPage();
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldige kandidatenlijsten");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Het bestand foo.txt bevat geen geldige kandidatenlijsten. Kies een bestand met een geldige definitie.",
    );
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("Shows an error when uploading wrong candidates list file for district of GSB", async () => {
    const state = { election, numberOfVoters: 0, electionDefinitionData: "mocked" };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "EML import error: Invalid district",
      fatal: false,
      reference: "EmlImportError",
    });

    await renderPage();
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Verkeerde kandidatenlijsten");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Het bestand foo.txt bevat kandidatenlijsten voor een andere kieskring. Kies een bestand met de kandidatenlijsten voor de juiste kieskring.",
    );
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

  describe("Navigation after submitting the candidates hash", () => {
    const redactedHash = electionImportValidateMockResponse().hash;
    const hashInputs = ["zxcv", "gfsd"];
    const fullHash = redactedHash.chunks.map((chunk, index) =>
      redactedHash.redacted_indexes.includes(index) ? hashInputs[redactedHash.redacted_indexes.indexOf(index)] : chunk,
    );

    const hashState = {
      electionDefinitionData: "mocked",
      electionDefinitionHash: ["1234"],
      candidateDefinitionFileName: filename,
      candidateDefinitionData: "mocked",
      candidateDefinitionRedactedHash: redactedHash,
    };

    async function submitHash() {
      const user = userEvent.setup();
      expect(await screen.findByRole("heading", { level: 2, name: "Controleer kandidatenlijsten" })).toBeVisible();
      await user.type(screen.getByRole("textbox", { name: "Controle deel 1" }), "zxcv");
      await user.type(screen.getByRole("textbox", { name: "Controle deel 2" }), "gfsd");
      await user.click(screen.getByRole("button", { name: "Volgende" }));
    }

    test.each<[string, CommitteeCategory, ElectionCategory, string]>([
      ["CSB", "CSB", "Municipal", "/elections/create/check-and-save"],
      ["GSB for a municipal election", "GSB", "Municipal", "/elections/create/polling-stations"],
      ["GSB for a provincial election", "GSB", "Provincial", "/elections/create/polling-stations"],
      ["GSB for a water authority election", "GSB", "WaterAuthority", "/elections/create/polling-stations"],
    ])("%s", async (_, committeeCategory, electionCategory, expected) => {
      const state = {
        ...hashState,
        election: { ...election, category: electionCategory },
        committeeCategory,
      };

      const dispatch = vi.fn();
      vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
      overrideOnce(
        "post",
        "/api/elections/import/validate",
        200,
        electionImportValidateMockResponse({
          election: committeeCategory === "CSB" ? csbElectionMockData : electionMockData,
        }),
      );

      const router = renderReturningRouter(
        <ElectionCreateContextProvider>
          <UploadCandidatesDefinition />
        </ElectionCreateContextProvider>,
      );
      await submitHash();

      await waitFor(() => {
        expect(dispatch).toHaveBeenCalledWith({
          type: "SET_CANDIDATES_DEFINITION_HASH",
          candidateDefinitionHash: fullHash,
        });
      });
      expect(router.state.location.pathname).toEqual(expected);
    });

    test("Shows an error when the hash is invalid", async () => {
      const state = { ...hashState, election, committeeCategory: "GSB" as CommitteeCategory };
      const dispatch = vi.fn();
      vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
      overrideOnce("post", "/api/elections/import/validate", 400, {
        error: "Invalid hash",
        fatal: false,
        reference: "InvalidHash",
      });

      const router = renderReturningRouter(
        <ElectionCreateContextProvider>
          <UploadCandidatesDefinition />
        </ElectionCreateContextProvider>,
      );
      await submitHash();

      expect(await screen.findByRole("alert")).toHaveTextContent("Controle digitale vingerafdruk niet gelukt");
      expect(dispatch).not.toHaveBeenCalled();
      expect(router.state.location.pathname).toEqual("/");
    });
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
