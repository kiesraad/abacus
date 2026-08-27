import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HttpHandler } from "msw";
import type { ReactNode } from "react";
import { RouterProvider } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ApiProvider } from "@/api/ApiProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import {
  csbElectionMockData,
  csbWaterAuthorityElectionMockData,
  type ElectionImportValidateMockOptions,
  electionImportValidateMockResponse,
  electionMockData,
  gsbListMockData,
  provincialElectionMockData,
  waterAuthorityElectionMockData,
} from "@/testing/api-mocks/ElectionMockData";
import {
  CSBABElectionImportRequestHandler,
  CSBGRElectionImportRequestHandler,
  ElectionListRequestHandler,
  ElectionRequestHandler,
  GSBABElectionImportRequestHandler,
  GSBGRElectionImportRequestHandler,
  GSBPSElectionImportRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { getRouter, type Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { screen, setupTestRouter, waitFor } from "@/testing/test-utils";
import type { CommitteeCategory, Election, RegionDetails, VoteCountingMethod } from "@/types/generated/openapi";
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
    <MessagesProvider>
      <ApiProvider fetchInitialUser={fetchInitialUser}>
        <TestUserProvider userRole="administrator">
          <RouterProvider router={router} />
        </TestUserProvider>
      </ApiProvider>
    </MessagesProvider>
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

function mockValidateResponse(options: ElectionImportValidateMockOptions) {
  overrideOnce("post", "/api/elections/import/validate", 200, electionImportValidateMockResponse(options));
}

async function uploadFile(file: File) {
  const user = userEvent.setup();
  const input = await screen.findByLabelText("Bestand kiezen");
  expect(input).toBeVisible();
  expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
  await user.upload(input, file);
}

async function inputHash() {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: "Controle deel 1" }), "zxcv");
  await user.type(screen.getByRole("textbox", { name: "Controle deel 2" }), "gfsd");
  await user.click(screen.getByRole("button", { name: "Volgende" }));
}

async function uploadElectionDefinition(router: Router, file: File, election: Election = electionMockData) {
  mockValidateResponse({ election });
  await router.navigate("/elections/create");

  // Wait for the page to be loaded
  expect(await screen.findByRole("heading", { level: 1, name: "Verkiezing toevoegen" })).toBeVisible();
  expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();
  await uploadFile(file);
}

async function inputElectionHash(election: Election = electionMockData) {
  mockValidateResponse({ election });

  // Wait for the page to be loaded and expect the election name to be present
  expect(await screen.findByText(election.name)).toBeInTheDocument();
  await inputHash();
}

async function setCommitteeCategory(election: Election = electionMockData) {
  const committeeCategoryLabels: Record<CommitteeCategory, string> = {
    GSB: "Gemeentelijk stembureau (GSB)",
    CSB: "Centraal stembureau (CSB)",
  };

  const user = userEvent.setup();
  mockValidateResponse({ election });

  expect(await screen.findByRole("heading", { level: 2, name: "Type stembureau" })).toBeInTheDocument();
  const radio = screen.getByRole("radio", { name: committeeCategoryLabels[election.committee_category] });
  await waitFor(() => {
    radio.click();
  });
  expect(radio).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Volgende" }));
}

async function uploadCandidateDefinition(file: File, election: Election = electionMockData) {
  mockValidateResponse({ election });

  // Wait for the candidate page to be loaded
  expect(await screen.findByRole("heading", { level: 2, name: "Importeer kandidatenlijsten" })).toBeVisible();
  await uploadFile(file);
  expect(await screen.findByRole("heading", { level: 2, name: "Controleer kandidatenlijsten" })).toBeVisible();
}

async function inputCandidateHash(election: Election = electionMockData) {
  mockValidateResponse({ election });
  await inputHash();
}

async function importDefinitions(router: Router, file: File, election: Election = electionMockData) {
  await uploadElectionDefinition(router, file, election);
  await inputElectionHash(election);
  await setCommitteeCategory(election);
  await uploadCandidateDefinition(file, election);
  await inputCandidateHash(election);
}

async function selectGSB(election: Election, gsb: RegionDetails) {
  const user = userEvent.setup();
  mockValidateResponse({ election, gsbSelected: gsb.key });

  expect(await screen.findByRole("heading", { level: 2, name: "Selecteer het gemeentelijk stembureau" })).toBeVisible();
  await user.click(screen.getByRole("cell", { name: gsb.name }));
}

async function uploadPollingStationList(file: File, location: string, options: ElectionImportValidateMockOptions) {
  mockValidateResponse(options);

  // Wait for the polling station list page to be loaded
  expect(
    await screen.findByRole("heading", { level: 2, name: `Importeer stembureaus gemeente ${location}` }),
  ).toBeVisible();
  await uploadFile(file);
}

async function setCountingMethod(location: string, countingMethod: VoteCountingMethod) {
  const countingMethodLabels: Record<VoteCountingMethod, RegExp> = {
    CSO: /Centrale stemopneming \(CSO\)/,
    DSO: /Decentrale stemopneming \(DSO\)/,
  };

  const user = userEvent.setup();

  expect(await screen.findByRole("heading", { level: 2, name: `Type stemopneming in ${location}` })).toBeVisible();
  const radio = screen.getByRole("radio", { name: countingMethodLabels[countingMethod] });
  expect(radio).not.toBeChecked();
  await waitFor(() => {
    radio.click();
  });
  expect(radio).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Volgende" }));
}

describe("Election create pages", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler);
    server.use(ElectionRequestHandler);
  });

  describe("Confirmation modal", () => {
    test("Shown when the abort button is clicked", async () => {
      overrideOnce(
        "post",
        "/api/elections/import/validate",
        200,
        electionImportValidateMockResponse({ matchingElection: false, numberOfVoters: 2000 }),
      );

      const router = renderWithRouter();
      const user = userEvent.setup();

      const file = new File(["foo"], "foo.txt", { type: "text/plain" });

      // update election and set hash, and continue
      await uploadElectionDefinition(router, file);
      await inputElectionHash();

      await setCommitteeCategory();

      // upload candidate file
      await uploadCandidateDefinition(file);

      // Click the Afbreken button
      const button = screen.getByRole("button", { name: "Afbreken" });
      expect(button).toBeVisible();
      await user.click(button);
      expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();
    });

    test("Shown when attempting to navigate away", async () => {
      overrideOnce(
        "post",
        "/api/elections/import/validate",
        200,
        electionImportValidateMockResponse({ numberOfVoters: 2000 }),
      );

      const router = renderWithRouter();
      const user = userEvent.setup();

      const file = new File(["foo"], "foo.txt", { type: "text/plain" });

      // update election and set hash, and continue
      await uploadElectionDefinition(router, file);
      await inputElectionHash();

      await setCommitteeCategory();

      // upload candidate file
      await uploadCandidateDefinition(file);

      // Click the 'Verkiezingen' nav item
      const nav_item = screen.getByRole("link", { name: "Verkiezingen" });
      expect(nav_item).toBeVisible();
      await user.click(nav_item);

      // The modal should have triggered
      expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();
    });

    test("Not shown when attempting to navigate away if nothing was done", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      overrideOnce(
        "post",
        "/api/elections/import/validate",
        200,
        electionImportValidateMockResponse({ numberOfVoters: 2000 }),
      );

      const router = renderWithRouter();
      const user = userEvent.setup();
      await router.navigate("/elections/create");

      // Wait for the page to be loaded
      expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" })).toBeVisible();

      // Click the Afbreken button
      const button = screen.getByRole("button", { name: "Afbreken" });
      expect(button).toBeVisible();
      await user.click(button);

      // No modal should have triggered
      expect(screen.queryAllByText("Niet opgeslagen wijzigingen").length).toBe(0);
    });

    test("Cancel button closes the modal", async () => {
      overrideOnce(
        "post",
        "/api/elections/import/validate",
        200,
        electionImportValidateMockResponse({ numberOfVoters: 2000 }),
      );

      const router = renderWithRouter();
      const user = userEvent.setup();
      const file = new File(["foo"], "foo.txt", { type: "text/plain" });

      // update election and set hash, and continue
      await uploadElectionDefinition(router, file);
      await inputElectionHash();

      await setCommitteeCategory();

      // upload candidate file
      await uploadCandidateDefinition(file);

      // Click the 'Verkiezingen' nav item
      const nav_item = screen.getByRole("link", { name: "Verkiezingen" });
      expect(nav_item).toBeVisible();
      await user.click(nav_item);

      // The modal should have triggered
      expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();

      // Clicking close button should keep user on the import page
      const closeButton = screen.getByRole("button", { name: "Venster sluiten" });
      expect(closeButton).toBeVisible();
      await user.click(closeButton);
      expect(await screen.findByRole("heading", { level: 2, name: "Controleer kandidatenlijsten" })).toBeVisible();
    });

    test("Delete button closes the modal", async () => {
      overrideOnce(
        "post",
        "/api/elections/import/validate",
        200,
        electionImportValidateMockResponse({ numberOfVoters: 2000 }),
      );

      const router = renderWithRouter();
      const user = userEvent.setup();
      const file = new File(["foo"], "foo.txt", { type: "text/plain" });

      // update election and set hash, and continue
      await uploadElectionDefinition(router, file);
      await inputElectionHash();

      await setCommitteeCategory();

      // upload candidate file
      await uploadCandidateDefinition(file);

      // Click the 'Verkiezingen' nav item
      const nav_item = screen.getByRole("link", { name: "Verkiezingen" });
      expect(nav_item).toBeVisible();
      await user.click(nav_item);

      // The modal should have triggered
      expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();
      vi.spyOn(console, "warn").mockImplementation(() => {});

      // Clicking delete button should move user away from the import page
      const deleteButton = screen.getByRole("button", { name: "Verkiezing niet opslaan" });
      expect(deleteButton).toBeVisible();
      await user.click(deleteButton);
      expect(screen.queryAllByText("Controleer kandidatenlijsten").length).toBe(0);
    });

    test("Close button closes the modal", async () => {
      overrideOnce(
        "post",
        "/api/elections/import/validate",
        200,
        electionImportValidateMockResponse({ numberOfVoters: 2000 }),
      );

      const router = renderWithRouter();
      const user = userEvent.setup();
      const file = new File(["foo"], "foo.txt", { type: "text/plain" });

      // update election and set hash, and continue
      await uploadElectionDefinition(router, file);
      await inputElectionHash();

      await setCommitteeCategory();

      // upload candidate file
      await uploadCandidateDefinition(file);

      // Click the 'Verkiezingen' nav item
      const nav_item = screen.getByRole("link", { name: "Verkiezingen" });
      expect(nav_item).toBeVisible();
      await user.click(nav_item);

      // The modal should have triggered
      expect(await screen.findByRole("heading", { level: 3, name: "Niet opgeslagen wijzigingen" })).toBeVisible();

      // Clicking cancel button should keep user on the import page
      const cancelButton = screen.getByRole("button", { name: "Annuleren" });
      expect(cancelButton).toBeVisible();
      await user.click(cancelButton);
      expect(await screen.findByRole("heading", { level: 2, name: "Controleer kandidatenlijsten" })).toBeVisible();
    });
  });

  describe("Polling station list", () => {
    test("Skip button on polling station upload page should skip to next page", async () => {
      const router = renderWithRouter();
      const user = userEvent.setup();
      const file = new File(["foo"], "foo.txt", { type: "text/plain" });

      // upload election and candidate files, set hashes and continue
      await importDefinitions(router, file);

      // Make sure we are on the correct page
      expect(
        await screen.findByRole("heading", { level: 2, name: "Importeer stembureaus gemeente Heemdamseburg" }),
      ).toBeVisible();
      await user.click(screen.getByText("Stap overslaan en stembureaus later toevoegen"));
      expect(
        await screen.findByRole("heading", { level: 2, name: "Type stemopneming in Heemdamseburg" }),
      ).toBeVisible();
      expect(router.state.location.pathname).toEqual("/elections/create/counting-method-type");
    });

    test("Shows warning when uploading a polling stations file with not matching election id", async () => {
      const router = renderWithRouter();
      const user = userEvent.setup();
      const file = new File(["foo"], "foo.txt", { type: "text/plain" });

      // upload election and candidate files, set hashes and continue
      await importDefinitions(router, file);

      // upload polling station list file
      await uploadPollingStationList(file, "Heemdamseburg", { matchingElection: false });

      // We should be at the check polling stations page
      expect(await screen.findByRole("heading", { level: 2, name: "Controleer stembureaus" })).toBeVisible();

      // Check the overview table
      expect(await screen.findByRole("table")).toBeVisible();
      expect(await screen.findAllByRole("row")).toHaveLength(8);

      // Make sure the warning is shown
      expect(await screen.findByRole("alert")).toHaveTextContent("Afwijkende verkiezing");

      // click next
      await user.click(screen.getByRole("button", { name: "Volgende" }));

      // Expect to see the next page
      expect(
        await screen.findByRole("heading", { level: 2, name: "Type stemopneming in Heemdamseburg" }),
      ).toBeVisible();
    });
  });

  describe("Full flow", () => {
    const pushMessage = vi.fn();
    const file = new File(["foo"], "foo.txt", { type: "text/plain" });
    const eligibleVoters = 1234;

    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(useMessages, "useMessages").mockReturnValue({
        pushMessage,
        popMessages: vi.fn(() => []),
        hasMessages: vi.fn(() => false),
      });
    });

    async function saveElection(election: Election) {
      const user = userEvent.setup();
      expect(await screen.findByRole("heading", { name: "Controleren en opslaan" })).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Opslaan" }));

      await waitFor(() => {
        expect(pushMessage).toHaveBeenCalledWith({
          title: `Verkiezing ${election.committee_category} ${election.name} toegevoegd`,
        });
      });
    }

    type GSBFlow = {
      name: string;
      election: Election;
      countingMethod: VoteCountingMethod;
      gsbSelected?: RegionDetails;
      importHandler: HttpHandler;
    };

    const gsbFlows: GSBFlow[] = [
      {
        name: "GSB AB CSO",
        election: waterAuthorityElectionMockData,
        gsbSelected: gsbListMockData[0]!,
        countingMethod: "CSO",
        importHandler: GSBABElectionImportRequestHandler,
      },
      {
        name: "GSB AB DSO",
        election: waterAuthorityElectionMockData,
        gsbSelected: gsbListMockData[0]!,
        countingMethod: "DSO",
        importHandler: GSBABElectionImportRequestHandler,
      },
      {
        name: "GSB GR CSO",
        election: electionMockData,
        countingMethod: "CSO",
        importHandler: GSBGRElectionImportRequestHandler,
      },
      {
        name: "GSB GR DSO",
        election: electionMockData,
        countingMethod: "DSO",
        importHandler: GSBGRElectionImportRequestHandler,
      },
      {
        name: "GSB PS CSO",
        election: provincialElectionMockData,
        gsbSelected: gsbListMockData[0]!,
        countingMethod: "CSO",
        importHandler: GSBPSElectionImportRequestHandler,
      },
      {
        name: "GSB PS DSO",
        election: provincialElectionMockData,
        gsbSelected: gsbListMockData[0]!,
        countingMethod: "DSO",
        importHandler: GSBPSElectionImportRequestHandler,
      },
    ];

    test.each(gsbFlows)("$name", async ({ election, countingMethod, gsbSelected, importHandler }) => {
      server.use(importHandler);
      const router = renderWithRouter();
      const user = userEvent.setup();
      await importDefinitions(router, file, election);

      if (gsbSelected) {
        await selectGSB(election, gsbSelected);
      }
      const location = gsbSelected?.name ?? election.location;

      // polling stations
      await uploadPollingStationList(file, location, {
        election,
        matchingElection: true,
        numberOfVoters: eligibleVoters,
      });
      expect(await screen.findByRole("heading", { level: 2, name: "Controleer stembureaus" })).toBeVisible();
      expect(await screen.findByRole("table")).toBeVisible();
      expect(await screen.findAllByRole("row")).toHaveLength(8);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Volgende" }));

      // vote counting
      await setCountingMethod(location, countingMethod);

      // eligible voters
      expect(await screen.findByRole("heading", { name: "Hoeveel kiesgerechtigden telt het GSB?" })).toBeVisible();
      expect(screen.getByRole("textbox", { name: "Aantal kiesgerechtigden" })).toHaveValue(eligibleVoters.toString());
      await user.click(screen.getByRole("button", { name: "Volgende" }));

      // check and save
      await saveElection(election);
    });

    test("CSB for municipal election", async () => {
      server.use(CSBGRElectionImportRequestHandler);
      const router = renderWithRouter();
      await importDefinitions(router, file, csbElectionMockData);
      await saveElection(csbElectionMockData);
    });

    test("CSB for water authority election", async () => {
      server.use(CSBABElectionImportRequestHandler);
      const router = renderWithRouter();
      await importDefinitions(router, file, csbWaterAuthorityElectionMockData);
      await saveElection(csbWaterAuthorityElectionMockData);
    });
  });
});
