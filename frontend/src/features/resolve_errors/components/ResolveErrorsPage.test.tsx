import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryResolveErrorsHandler,
  PollingStationDataEntryStatusFirstEntryHasErrorsHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { screen, spyOnHandler } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { ResolveErrorsPage } from "./ResolveErrorsPage";

const navigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
  useParams: () => ({ pollingStationId: "5" }),
  useLocation: () => ({ pathname: "/" }),
}));

const renderPage = async () => {
  render(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <ResolveErrorsPage />
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
  expect(await screen.findByRole("heading", { level: 2, name: "Alle fouten en waarschuwingen" })).toBeVisible();
};

describe("ResolveErrorsPage", () => {
  beforeEach(() => {
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryResolveErrorsHandler,
      PollingStationDataEntryStatusFirstEntryHasErrorsHandler,
      UserListRequestHandler,
    );
  });

  test("should render the page", async () => {
    await renderPage();

    // TODO: Issue #1512 Add checks for rendering errors and warnings

    expect(
      await screen.findByRole("heading", { level: 3, name: "Wat wil je doen met de invoer in Abacus?" }),
    ).toBeVisible();
    expect(
      await screen.findByLabelText(/Invoer bewaren en correcties laten invoeren door Sanne Molenaar/),
    ).toBeVisible();
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
    expect(navigate).toHaveBeenCalledWith("/elections/1/status#data-entry-resumed-5");
  });

  test("should refresh election status and navigate to election status page after submit", async () => {
    const user = userEvent.setup();
    const getElectionStatus = spyOnHandler(ElectionStatusRequestHandler);

    await renderPage();
    expect(getElectionStatus).toHaveBeenCalledTimes(1);

    await user.click(await screen.findByLabelText(/Stembureau opnieuw laten invoeren/));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(getElectionStatus).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith("/elections/1/status#data-entry-discarded-5");
  });
});
