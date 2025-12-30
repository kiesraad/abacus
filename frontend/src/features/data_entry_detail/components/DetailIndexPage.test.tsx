import { waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import { UsersProvider } from "@/hooks/user/UsersProvider";
import {
  dataEntryHasWarningsGetMockResponse,
  dataEntryValidGetMockResponse,
  emptyPollingStationResults,
} from "@/testing/api-mocks/DataEntryMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryGetHandler,
  PollingStationDataEntryResolveErrorsHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { renderReturningRouter, screen, spyOnHandler } from "@/testing/test-utils";
import type { DataEntryGetResponse } from "@/types/generated/openapi";

import { DetailIndexPage } from "./DetailIndexPage";

const navigate = vi.fn();

const renderPage = () => {
  return renderReturningRouter(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <UsersProvider>
            <DetailIndexPage />
          </UsersProvider>
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
};

describe("DetailIndexPage", () => {
  const pushMessage = vi.fn();
  const hasMessages = vi.fn();

  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "5" });
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage, popMessages: vi.fn(() => []), hasMessages });
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryGetHandler,
      PollingStationDataEntryResolveErrorsHandler,
      UserListRequestHandler,
    );
  });

  test("should render the page", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Alle fouten en waarschuwingen" })).toBeVisible();

    const voters_votes_counts = screen.queryByRole("region", { name: "Aantal kiezers en stemmen B1-3.1 en 3.2" });
    expect(voters_votes_counts).toBeInTheDocument();

    const differences_counts = screen.queryByRole("region", { name: "Verschillen D & H B1-3.3" });
    expect(differences_counts).not.toBeInTheDocument();

    const political_group_votes_1 = screen.queryByRole("region", { name: "Lijst 1 - Vurige Vleugels Partij" });
    expect(political_group_votes_1).not.toBeInTheDocument();

    const political_group_votes_2 = screen.queryByRole("region", { name: "Lijst 2 - Wijzen van Water en Wind" });
    expect(political_group_votes_2).not.toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { level: 3, name: "Wat wil je doen met de invoer in Abacus?" }),
    ).toBeVisible();
    expect(
      await screen.findByRole("radio", { name: /Invoer bewaren en correcties laten invoeren door Gebruiker01/ }),
    ).toBeVisible();
    expect(await screen.findByRole("radio", { name: /Stembureau opnieuw laten invoeren/ })).toBeVisible();
  });

  test("should only submit after making a selection", async () => {
    const user = userEvent.setup();
    const resolve = spyOnHandler(PollingStationDataEntryResolveErrorsHandler);

    renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Alle fouten en waarschuwingen" })).toBeVisible();

    const submit = await screen.findByRole("button", { name: "Opslaan" });

    await user.click(submit);
    expect(resolve).not.toHaveBeenCalled();

    await user.click(
      await screen.findByRole("radio", { name: /Invoer bewaren en correcties laten invoeren door Gebruiker01/ }),
    );
    await user.click(submit);

    expect(resolve).toHaveBeenCalledWith("resume_first_entry");

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Stembureau 37 teruggegeven aan Gebruiker01",
      text: "De invoerder kan verder met invoeren",
    });
    expect(navigate).toHaveBeenCalledWith("/elections/1/status");
  });

  test("should refresh election status and navigate to election status page after submit", async () => {
    const user = userEvent.setup();
    const getElectionStatus = spyOnHandler(ElectionStatusRequestHandler);

    renderPage();
    expect(await screen.findByRole("heading", { level: 2, name: "Alle fouten en waarschuwingen" })).toBeVisible();

    expect(getElectionStatus).toHaveBeenCalledTimes(1);

    await user.click(await screen.findByRole("radio", { name: /Stembureau opnieuw laten invoeren/ }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(getElectionStatus).toHaveBeenCalledTimes(2);

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Invoer stembureau 37 verwijderd",
      text: "Het stembureau kan opnieuw ingevoerd worden",
    });
    expect(navigate).toHaveBeenCalledWith("/elections/1/status");
  });

  test("should redirect to extra_investigation when there are no errors or warnings", async () => {
    overrideOnce("get", "/api/polling_stations/5/data_entries/get", 200, dataEntryValidGetMockResponse);

    const router = renderPage();

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual("/elections/1/status/5/detail/extra_investigation");
    });
  });

  test("should redirect to voters_votes_counts for next committee sessions when there are no errors or warnings", async () => {
    const secondCommitteeSessionGetMockResponse: DataEntryGetResponse = {
      ...dataEntryValidGetMockResponse,
      data: emptyPollingStationResults("CSONextSession"),
    };
    overrideOnce("get", "/api/polling_stations/5/data_entries/get", 200, secondCommitteeSessionGetMockResponse);

    const router = renderPage();

    await waitFor(() => {
      expect(router.state.location.pathname).toEqual("/elections/1/status/5/detail/voters_votes_counts");
    });
  });

  test("should render errors and warnings overview on detail index page", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Alle fouten en waarschuwingen" })).toBeVisible();

    const voters_votes_counts = screen.queryByRole("region", { name: "Aantal kiezers en stemmen B1-3.1 en 3.2" });
    expect(voters_votes_counts).toBeInTheDocument();

    const form = screen.getByRole("heading", { level: 3, name: "Wat wil je doen met de invoer in Abacus?" });
    expect(form).toBeVisible();
  });

  test("should render only warnings overview on detail index page", async () => {
    overrideOnce("get", "/api/polling_stations/5/data_entries/get", 200, dataEntryHasWarningsGetMockResponse);

    renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Alle waarschuwingen" })).toBeVisible();

    const voters_votes_counts = screen.queryByRole("region", { name: "Aantal kiezers en stemmen B1-3.1 en 3.2" });
    expect(voters_votes_counts).toBeInTheDocument();

    const form = screen.queryByRole("heading", { level: 3, name: "Wat wil je doen met de invoer in Abacus?" });
    expect(form).not.toBeInTheDocument();
  });
});
