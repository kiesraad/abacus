import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { describe, expect, test, vi } from "vitest";
import { newElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { overrideOnce } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import type { ElectionDefinitionValidateResponse, NewElection, PollingStationRequest } from "@/types/generated/openapi";
import * as uploadFileSize from "@/utils/uploadFileSize";
import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { UploadElectionDefinition } from "./UploadElectionDefinition";

async function renderPage() {
  render(<UploadElectionDefinition />);

  expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeInTheDocument();
}

const election = { name: "Naam", location: "Plek" } as NewElection;

const filename = "foo.txt";
const file = new File(["foo"], filename, { type: "text/plain" });

const navigate = vi.fn();

function electionValidateResponse(
  election: NewElection,
  polling_stations: PollingStationRequest[] | undefined = undefined,
  matching_election: boolean | undefined = undefined,
): ElectionDefinitionValidateResponse {
  return {
    hash: {
      chunks: [
        "asdf",
        "qwer",
        "",
        "tyui",
        "ghjk",
        "bnml",
        "1234",
        "5678",
        "8765",
        "",
        "a345",
        "qwer",
        "lgmg",
        "thnr",
        "nytf",
        "sdfr",
      ],
      redacted_indexes: [2, 9],
    },
    election,
    polling_stations,
    number_of_voters: 0,
    polling_station_definition_matches_election: matching_election,
  };
}

describe("UploadElectionDefinition component", () => {
  test("It navigates to the next page when providing correct hash", async () => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext");

    render(
      <ElectionCreateContextProvider>
        <UploadElectionDefinition />
      </ElectionCreateContextProvider>,
    );

    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));
    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(1);

    const inputPart1 = screen.getByRole("textbox", { name: "Controle deel 1" });
    await user.type(inputPart1, "zxcv");

    const inputPart2 = screen.getByRole("textbox", { name: "Controle deel 2" });
    await user.type(inputPart2, "gfsd");

    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(navigate).toHaveBeenCalledWith("/elections/create/polling-station-role");
  });

  test("It shows error when providing incorrect hash", async () => {
    render(
      <ElectionCreateContextProvider>
        <UploadElectionDefinition />
      </ElectionCreateContextProvider>,
    );

    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));
    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(1);

    const inputPart1 = screen.getByRole("textbox", { name: "Controle deel 1" });
    await user.type(inputPart1, "zxcv");

    const inputPart2 = screen.getByRole("textbox", { name: "Controle deel 2" });
    await user.type(inputPart2, "gfsd");

    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "Invalid hash",
      fatal: false,
      reference: "InvalidHash",
    });
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Controle digitale vingerafdruk niet gelukt");
  });

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
