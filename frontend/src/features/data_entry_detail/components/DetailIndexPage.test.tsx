import * as ReactRouter from "react-router";

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { UsersProvider } from "@/hooks/user/UsersProvider";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryHasErrorsGetHandler,
  PollingStationDataEntryHasWarningsGetHandler,
  PollingStationDataEntryResolveErrorsHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { DetailIndexPage } from "./DetailIndexPage";

const navigate = vi.fn();

const renderPage = async () => {
  render(
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
  expect(await screen.findByRole("heading", { level: 2, name: "Alle fouten en waarschuwingen" })).toBeVisible();
};

describe("DetailPage", () => {
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
      PollingStationDataEntryHasErrorsGetHandler,
      PollingStationDataEntryHasWarningsGetHandler,
      PollingStationDataEntryResolveErrorsHandler,
      UserListRequestHandler,
    );
  });

  test("should render the page", async () => {
    await renderPage();

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
    expect(await screen.findByLabelText(/Invoer bewaren en correcties laten invoeren door Gebruiker01/)).toBeVisible();
    expect(await screen.findByLabelText(/Stembureau opnieuw laten invoeren/)).toBeVisible();
  });

  test("should only submit after making a selection", async () => {
    const user = userEvent.setup();
    const resolve = spyOnHandler(PollingStationDataEntryResolveErrorsHandler);

    await renderPage();
    const submit = await screen.findByRole("button", { name: "Opslaan" });

    await user.click(submit);
    expect(resolve).not.toHaveBeenCalled();

    await user.click(await screen.findByLabelText(/Invoer bewaren/));
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

    await renderPage();
    expect(getElectionStatus).toHaveBeenCalledTimes(1);

    await user.click(await screen.findByLabelText(/Stembureau opnieuw laten invoeren/));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(getElectionStatus).toHaveBeenCalledTimes(2);

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Invoer stembureau 37 verwijderd",
      text: "Het stembureau kan opnieuw ingevoerd worden",
    });
    expect(navigate).toHaveBeenCalledWith("/elections/1/status");
  });
});
