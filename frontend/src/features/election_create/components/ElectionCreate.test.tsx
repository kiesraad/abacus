import { ReactNode } from "react";
import { RouterProvider } from "react-router";

import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { newElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { ElectionListRequestHandler, ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ElectionDefinitionValidateResponse, NewElection, PollingStationRequest } from "@/types/generated/openapi";

import { electionCreateRoutes } from "../routes";

const Providers = ({
  children,
  router = getRouter(children),
  fetchInitialUser = false,
}: {
  children?: ReactNode;
  router?: Router;
  fetchInitialUser?: boolean;
}) => {
  return (
    <ApiProvider fetchInitialUser={fetchInitialUser}>
      <TestUserProvider userRole="administrator">
        <RouterProvider router={router} />
      </TestUserProvider>
    </ApiProvider>
  );
};

function renderWithRouter() {
  const router = setupTestRouter([
    {
      path: "/",
      Component: null,
      children: [
        {
          path: "elections",
          children: [
            {
              path: "create",
              children: electionCreateRoutes,
            },
          ],
        },
      ],
    },
  ]);
  rtlRender(<Providers router={router} />);
  return router;
}

function electionValidateResponse(
  election: NewElection,
  polling_stations: PollingStationRequest[] | undefined = undefined,
  matching_election: boolean | undefined = undefined,
): ElectionDefinitionValidateResponse {
  return {
    hash: {
      // NOTE: In actual data, the redacted version of the hash
      // will have empty strings at the `redacted_indexes` positions.
      // We leave them in here so we can test their absence
      chunks: [
        "asdf",
        "qwer",
        "zxcv",
        "tyui",
        "ghjk",
        "bnml",
        "1234",
        "5678",
        "8765",
        "gfsd",
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

/**
 * Helper function; navigate to /elections/create
 * and upload an election definition.
 */
async function uploadElectionDefinition(router: Router, file: File) {
  const user = userEvent.setup();
  overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));
  await router.navigate("/elections/create");

  // Wait for the page to be loaded
  expect(await screen.findByRole("heading", { level: 1, name: "Verkiezing toevoegen" })).toBeVisible();
  expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
  const input = await screen.findByLabelText("Bestand kiezen");
  expect(input).toBeVisible();
  expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

  await user.upload(input, file);
}

/**
 * Helper function; assuming we are at the check election hash stage,
 * check and input the hash and continue.
 */
async function inputElectionHash() {
  const user = userEvent.setup();
  overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

  // Wait for the page to be loaded and expect the election name to be present
  expect(await screen.findByText(newElectionMockData.name)).toBeInTheDocument();

  // Expect parts of the hash to be shown
  expect(screen.getByText("asdf")).toBeInTheDocument();
  // Expect redacted chunks to be stubs
  expect(screen.queryByText("zxcv")).not.toBeInTheDocument();

  // Expect stub to be highlighted
  expect(screen.getByText("1")).toHaveRole("mark");
  expect(screen.getByText("2")).not.toHaveRole("mark");
  const inputPart1 = screen.getByLabelText("Controle deel 1");
  await user.type(inputPart1, "zxcv");

  const inputPart2 = screen.getByLabelText("Controle deel 2");
  await user.click(inputPart2);
  expect(screen.getByText("1")).not.toHaveRole("mark");
  expect(screen.getByText("2")).toHaveRole("mark");

  // Click somewhere arbitrary and expect no highlights
  await user.click(screen.getByText("Controleer verkiezingsdefinitie"));
  expect(screen.getByText("1")).not.toHaveRole("mark");
  expect(screen.getByText("2")).not.toHaveRole("mark");
  await user.type(inputPart2, "gfsd");
  await user.click(screen.getByText("Volgende"));
}

/**
 * Helper function; assuming we are on the upload candidate page,
 * upload a valid candidate file.
 */
async function uploadCandidateDefinition(file: File) {
  const user = userEvent.setup();
  overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

  // Wait for the candidate page to be loaded
  expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
  const input = await screen.findByLabelText("Bestand kiezen");
  expect(input).toBeVisible();
  expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

  await user.upload(input, file);
}

/**
 * Helper function: assuming we are on the polling station role page, continue.
 */
async function setPollingStationRole() {
  const user = userEvent.setup();
  expect(await screen.findByRole("heading", { level: 2, name: "Rol van het stembureau" })).toBeVisible();
  await user.click(screen.getByText("Volgende"));
}

async function inputCandidateHash() {
  const user = userEvent.setup();
  overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

  // Expect parts of the hash to be shown
  expect(screen.getByText("asdf")).toBeInTheDocument();
  // Expect redacted chunks to be stubs
  expect(screen.queryByText("zxcv")).not.toBeInTheDocument();

  // Expect stub to be highlighted
  expect(screen.getByText("1")).toHaveRole("mark");
  expect(screen.getByText("2")).not.toHaveRole("mark");

  // Override again
  overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

  const inputPart1 = screen.getByLabelText("Controle deel 1");
  await user.type(inputPart1, "zxcv");

  const inputPart2 = screen.getByLabelText("Controle deel 2");
  await user.click(inputPart2);
  expect(screen.getByText("1")).not.toHaveRole("mark");
  expect(screen.getByText("2")).toHaveRole("mark");

  // Click somewhere arbitrary and expect no highlights
  await user.click(screen.getByText("Controleer kandidatenlijst"));
  expect(screen.getByText("1")).not.toHaveRole("mark");
  expect(screen.getByText("2")).not.toHaveRole("mark");
  await user.type(inputPart2, "gfsd");
  await user.click(screen.getByText("Volgende"));
}

describe("Election create pages", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler);
    server.use(ElectionRequestHandler);
  });

  test("It shows an error when uploading invalid file", async () => {
    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    const router = renderWithRouter();
    const user = userEvent.setup();

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    await router.navigate("/elections/create");

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezing toevoegen" })).toBeVisible();
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);

    // Expect error message, file name should be shown
    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByText("Ongeldige verkiezingsdefinitie")).toBeInTheDocument();
  });

  test("It shows an error when uploading too large file", async () => {
    overrideOnce("post", "/api/elections/import/validate", 413, {
      error: "12",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create");

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    const message = screen.getByText(/Kies een bestand van maximaal 12 Megabyte./i);
    expect(message).toBeVisible();
  });

  test("It shows and validates hash when uploading valid file", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // update election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();

    // Expect to see the next page
    expect(await screen.findByRole("heading", { level: 2, name: "Rol van het stembureau" })).toBeVisible();
  });

  test("It shows an error on invalid input", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create");

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    await user.upload(input, file);

    // Wait for the page to be loaded and expect the election name to be present
    expect(await screen.findByText(newElectionMockData.name)).toBeInTheDocument();
    const inputPart1 = screen.getByLabelText("Controle deel 1");
    await user.type(inputPart1, "zxcv");
    const inputPart2 = screen.getByLabelText("Controle deel 2");
    await user.type(inputPart2, "123");

    await user.click(screen.getByText("Volgende"));

    // Expect error to be shown
    expect(await screen.findByText("Controle digitale vingerafdruk niet gelukt")).toBeInTheDocument();
  });

  test("It shows an error when uploading an invalid candidate list", async () => {
    const router = renderWithRouter();
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // update election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // Expect to see the next page
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
    const candidateInput = await screen.findByLabelText("Bestand kiezen");
    expect(candidateInput).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    // Give invalid XML error
    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    await user.upload(candidateInput, file);

    // Expect error message, file name should be shown
    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByText("Ongeldige kandidatenlijst")).toBeInTheDocument();
  });

  test("It shows an error when uploading too large candidate list file", async () => {
    const router = renderWithRouter();
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // update election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();

    overrideOnce("post", "/api/elections/import/validate", 413, {
      error: "12",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    const message = screen.getByText(/Kies een bestand van maximaal 12 Megabyte./i);
    expect(message).toBeVisible();
  });

  test("It shows and validates hash when uploading valid candidate list file", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // update election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // Wait for the candidate page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    // upload candidate file, set hash and continue
    await uploadCandidateDefinition(file);
    await inputCandidateHash();

    expect(
      await screen.findByRole("heading", { level: 2, name: "Importeer stembureaus gemeente Heemdamseburg" }),
    ).toBeVisible();
  });

  test("It shows the confirmation modal when the abort button is clicked", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // update election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);

    // Click the Afbreken button
    const button = screen.getByText("Afbreken");
    expect(button).toBeVisible();
    await user.click(button);
    expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();
  });

  test("It shows the confirmation modal when attempting to navigate away", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // update election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);

    // Click the 'Verkiezingen' nav item
    const button = screen.getByText("Verkiezingen");
    expect(button).toBeVisible();
    await user.click(button);

    // The modal should have triggered
    expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();
  });

  test("It does not show the confirmation modal when attempting to navigate away if nothing was done", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();
    await router.navigate("/elections/create");

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();

    // Click the Afbreken button
    const button = screen.getByText("Afbreken");
    expect(button).toBeVisible();
    await user.click(button);

    // No modal should have triggered
    expect(screen.queryAllByText("Niet opgeslagen wijzigingen").length).toBe(0);
  });

  test("That the confirmation modal cancel button closes the modal", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();

    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // update election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);
    expect(await screen.findByRole("heading", { level: 2, name: "Controleer kandidatenlijst" })).toBeVisible();

    // Click the 'Verkiezingen' nav item
    const button = screen.getByText("Verkiezingen");
    expect(button).toBeVisible();
    await user.click(button);

    // The modal should have triggered
    expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();

    // Close button should keep us at the import page
    const closeButton = screen.getByText("Annuleren");
    expect(closeButton).toBeVisible();
    await user.click(closeButton);
    expect(await screen.findByRole("heading", { level: 2, name: "Controleer kandidatenlijst" })).toBeVisible();
  });

  test("That the confirmation modal delete button closes the modal", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // update election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);
    expect(await screen.findByRole("heading", { level: 2, name: "Controleer kandidatenlijst" })).toBeVisible();

    // Click the 'Verkiezingen' nav item
    const button = screen.getByText("Verkiezingen");
    expect(button).toBeVisible();
    await user.click(button);

    // The modal should have triggered
    expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();
    vi.spyOn(console, "warn").mockImplementation(() => {});

    // Delete button should move away from the import page
    const deleteButton = screen.getByText("Verkiezing niet opslaan");
    expect(deleteButton).toBeVisible();
    await user.click(deleteButton);
    expect(screen.queryAllByText("Controleer kandidatenlijst").length).toBe(0);
  });

  test("That the confirmation modal close button closes the modal", async () => {
    overrideOnce("post", "/api/elections/import/validate", 200, electionValidateResponse(newElectionMockData));

    const router = renderWithRouter();
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // update election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijst" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);
    expect(await screen.findByRole("heading", { level: 2, name: "Controleer kandidatenlijst" })).toBeVisible();

    // Click the 'Verkiezingen' nav item
    const button = screen.getByText("Verkiezingen");
    expect(button).toBeVisible();
    await user.click(button);

    // The modal should have triggered
    expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();

    // Delete button should move away from the import page
    const closeButton = screen.getByTitle("Annuleren");
    expect(closeButton).toBeVisible();
    await user.click(closeButton);
    expect(await screen.findByRole("heading", { level: 2, name: "Controleer kandidatenlijst" })).toBeVisible();
  });

  test("Shows an error when uploading an invalid polling station list", async () => {
    const router = renderWithRouter();
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // upload election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // upload candidate file, set hash and continue
    await uploadCandidateDefinition(file);
    await inputCandidateHash();

    // Make sure we are on the correct page
    expect(
      await screen.findByRole("heading", { level: 2, name: "Importeer stembureaus gemeente Heemdamseburg" }),
    ).toBeVisible();

    // Give invalid XML error
    overrideOnce("post", "/api/elections/import/validate", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    // Upload polling station file
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    const message = screen.getByText(/Ongeldig stembureaubestand/i);
    expect(message).toBeVisible();
  });

  test("Shows error when uploading too large polling station file", async () => {
    const router = renderWithRouter();
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // upload election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // upload candidate file, set hash and continue
    await uploadCandidateDefinition(file);
    await inputCandidateHash();

    // Make sure we are on the correct page
    expect(
      await screen.findByRole("heading", { level: 2, name: "Importeer stembureaus gemeente Heemdamseburg" }),
    ).toBeVisible();

    overrideOnce("post", "/api/elections/import/validate", 413, {
      error: "12",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    // Upload polling station file
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    const message = screen.getByText(/Kies een bestand van maximaal 12 Megabyte./i);
    expect(message).toBeVisible();
  });

  test("Skip button on polling station upload page should skip to next page", async () => {
    const router = renderWithRouter();
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // upload election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // upload candidate file, set hash and continue
    await uploadCandidateDefinition(file);
    await inputCandidateHash();

    // Make sure we are on the correct page
    expect(
      await screen.findByRole("heading", { level: 2, name: "Importeer stembureaus gemeente Heemdamseburg" }),
    ).toBeVisible();
    await user.click(screen.getByText("Stap overslaan en stembureaus later toevoegen"));
    expect(await screen.findByRole("heading", { level: 2, name: "Type stemopneming in Heemdamseburg" })).toBeVisible();
  });

  test("Shows warning when uploading a polling stations file with not matching election id", async () => {
    const router = renderWithRouter();
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // upload election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // upload candidate file, set hash and continue
    await uploadCandidateDefinition(file);
    await inputCandidateHash();

    overrideOnce(
      "post",
      "/api/elections/import/validate",
      200,
      electionValidateResponse(newElectionMockData, pollingStationMockData, false),
    );

    // Make sure we are on the correct page
    expect(
      await screen.findByRole("heading", { level: 2, name: "Importeer stembureaus gemeente Heemdamseburg" }),
    ).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);

    // We should be at the check polling stations page
    expect(await screen.findByRole("heading", { level: 2, name: "Controleer stembureaus" })).toBeVisible();

    // Check the overview table
    expect(await screen.findByRole("table")).toBeVisible();
    expect(await screen.findAllByRole("row")).toHaveLength(8);

    // Make sure the warning is not shown
    expect(await screen.findByText(/Afwijkende verkiezing/i)).toBeVisible();

    // click next
    await user.click(screen.getByText("Volgende"));

    // Expect to see the next page
    expect(await screen.findByRole("heading", { level: 2, name: "Type stemopneming in Heemdamseburg" })).toBeVisible();
  });

  test("Shows overview when uploading valid polling station file", async () => {
    const router = renderWithRouter();
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    // upload election and set hash, and continue
    await uploadElectionDefinition(router, file);
    await inputElectionHash();
    await setPollingStationRole();

    // upload candidate file, set hash and continue
    await uploadCandidateDefinition(file);
    await inputCandidateHash();

    overrideOnce(
      "post",
      "/api/elections/import/validate",
      200,
      electionValidateResponse(newElectionMockData, pollingStationMockData, true),
    );

    // Make sure we are on the correct page
    expect(
      await screen.findByRole("heading", { level: 2, name: "Importeer stembureaus gemeente Heemdamseburg" }),
    ).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
    await user.upload(input, file);

    // We should be at the check polling stations page
    expect(await screen.findByRole("heading", { level: 2, name: "Controleer stembureaus" })).toBeVisible();

    // Check the overview table
    expect(await screen.findByRole("table")).toBeVisible();
    expect(await screen.findAllByRole("row")).toHaveLength(8);

    // Make sure the warning is not shown
    expect(screen.queryByText(/Afwijkende verkiezing/i)).toBeNull();

    // click next
    await user.click(screen.getByText("Volgende"));

    // Expect to see the next page
    expect(await screen.findByRole("heading", { level: 2, name: "Type stemopneming in Heemdamseburg" })).toBeVisible();
  });
});
