import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { useMessages } from "@/hooks/messages/useMessages";
import { UsersProvider } from "@/hooks/user/UsersProvider";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryGetErrorsHandler,
  PollingStationDataEntryResolveErrorsHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { ResolveErrorsIndexPage } from "./ResolveErrorsIndexPage";

const navigate = vi.fn();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => ({ pollingStationId: "5" }),
}));

vi.mock("@/hooks/messages/useMessages");

const renderPage = async () => {
  render(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <UsersProvider>
            <ResolveErrorsIndexPage />
          </UsersProvider>
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
  expect(await screen.findByRole("heading", { level: 2, name: "Alle fouten en waarschuwingen" })).toBeVisible();
};

describe("ResolveErrorsPage", () => {
  const pushMessage = vi.fn();

  beforeEach(() => {
    vi.mocked(useMessages).mockReturnValue({ pushMessage, popMessages: vi.fn(() => []) });
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryGetErrorsHandler,
      PollingStationDataEntryResolveErrorsHandler,
      UserListRequestHandler,
    );
  });

  test("should render the page", async () => {
    await renderPage();

    expect(await screen.findByRole("heading", { level: 2, name: "Alle fouten en waarschuwingen" })).toBeVisible();

    const voters_votes_counts = screen.queryByRole("region", { name: "Toegelaten kiezers en uitgebrachte stemmen" });
    expect(voters_votes_counts).toBeInTheDocument();

    const differences_counts = screen.queryByRole("region", {
      name: "Verschillen tussen aantal kiezers en uitgebrachte stemmen",
    });
    expect(differences_counts).toBeInTheDocument();

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
