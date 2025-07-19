import { within } from "@testing-library/dom";
import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import cls from "@/features/resolve_differences/components/ResolveDifferences.module.css";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { UsersProvider } from "@/hooks/user/UsersProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryGetDifferencesHandler,
  PollingStationDataEntryResolveDifferencesHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { expectErrorPage, render, screen, setupTestRouter, spyOnHandler } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { DataEntryStatusName } from "@/types/generated/openapi";

import { resolveDifferencesRoutes } from "../routes";
import { ResolveDifferencesPage } from "./ResolveDifferencesPage";

const navigate = vi.fn();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
  useParams: () => ({ pollingStationId: "3" }),
}));

const renderPage = async () => {
  render(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <UsersProvider>
            <ResolveDifferencesPage />
          </UsersProvider>
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
  expect(await screen.findByRole("table")).toBeInTheDocument();
};

function overrideResponseStatus(status: DataEntryStatusName) {
  overrideOnce("post", "/api/polling_stations/3/data_entries/resolve_differences", 200, { status });
}

describe("ResolveDifferencesPage", () => {
  beforeEach(() => {
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryGetDifferencesHandler,
      PollingStationDataEntryResolveDifferencesHandler,
      UserListRequestHandler,
    );
  });

  test("Error when committee session is not in the correct state", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const router = setupTestRouter([
      {
        Component: null,
        errorElement: <ErrorBoundary />,
        children: [
          {
            path: "elections/:electionId/status/resolve-differences",
            children: resolveDifferencesRoutes,
          },
        ],
      },
    ]);

    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    await router.navigate("/elections/1/status/resolve-differences");

    rtlRender(<Providers router={router} />);

    await expectErrorPage();
  });

  test("should render the overview list and table with differences", async () => {
    await renderPage();

    const overview = await screen.findByRole("list");
    const overviewContent = within(overview)
      .queryAllByRole("listitem")
      .map((item) => item.textContent);
    expect(overviewContent).toEqual([
      "Is er herteld?",
      "Aantal kiezers en stemmen",
      "Verschillen",
      "Lijst 1 - Vurige Vleugels Partij",
      "Lijst 2 - Wijzen van Water en Wind",
    ]);

    const mdash = "—";
    expect(await screen.findByRole("table")).toHaveTableContent([
      ["Nummer", "Eerste invoer", "Tweede invoer", "Kandidaat"],
      ["1", "2", mdash, "Foo, A. (Alice)"],
      ["2", mdash, "2", "Doe, C. (Charlie)"],
    ]);

    expect(await screen.findByRole("heading", { level: 3, name: "Welke invoer moet bewaard blijven?" })).toBeVisible();
    expect(await screen.findByLabelText(/De eerste invoer/)).toBeVisible();
    expect(await screen.findByLabelText(/De tweede invoer/)).toBeVisible();
    expect(await screen.findByLabelText(/Geen van beide/)).toBeVisible();
  });

  test("should show the selection in the table", async () => {
    await renderPage();
    const user = userEvent.setup();

    const firstEntry = (await screen.findAllByRole("cell"))[0];
    expect(firstEntry).not.toHaveClass(cls.keep!);
    expect(firstEntry).not.toHaveClass(cls.discard!);

    await user.click(await screen.findByLabelText(/De eerste invoer/));
    expect(firstEntry).toHaveClass(cls.keep!);

    await user.click(await screen.findByLabelText(/De tweede invoer/));
    expect(firstEntry).toHaveClass(cls.discard!);

    await user.click(await screen.findByLabelText(/Geen van beide/));
    expect(firstEntry).toHaveClass(cls.discard!);
  });

  test("should only submit after making a selection", async () => {
    const user = userEvent.setup();
    const resolve = spyOnHandler(PollingStationDataEntryResolveDifferencesHandler);

    await renderPage();
    const submit = await screen.findByRole("button", { name: "Opslaan" });

    await user.click(submit);
    expect(resolve).not.toHaveBeenCalled();

    overrideResponseStatus("second_entry_not_started");
    await user.click(await screen.findByLabelText(/De eerste invoer/));
    await user.click(submit);
    expect(resolve).toHaveBeenCalledWith("keep_first_entry");
    expect(navigate).toHaveBeenCalledWith("/elections/1/status#data-entry-kept-3");
  });

  test("should refresh election status and navigate to election status page after submit", async () => {
    const user = userEvent.setup();
    const getElectionStatus = spyOnHandler(ElectionStatusRequestHandler);

    await renderPage();
    expect(getElectionStatus).toHaveBeenCalledTimes(1);

    overrideResponseStatus("second_entry_not_started");
    await user.click(await screen.findByLabelText(/De tweede invoer/));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(getElectionStatus).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith("/elections/1/status#data-entry-kept-3");
  });

  test("should navigate to election status page after submit with correct hash", async () => {
    const user = userEvent.setup();

    await renderPage();

    overrideResponseStatus("first_entry_not_started");
    await user.click(await screen.findByLabelText(/Geen van beide/));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(navigate).toHaveBeenCalledWith("/elections/1/status#data-entries-discarded-3");
  });

  test("should navigate to resolve errors page after keeping second entry which has errors", async () => {
    const user = userEvent.setup();

    await renderPage();

    overrideResponseStatus("first_entry_has_errors");
    await user.click(await screen.findByLabelText(/De tweede invoer/));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(navigate).toHaveBeenCalledWith("/elections/1/status/3/resolve-errors");
  });
});
