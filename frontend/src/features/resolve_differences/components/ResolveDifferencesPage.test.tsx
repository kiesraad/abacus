import { within } from "@testing-library/dom";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import cls from "@/features/resolve_differences/components/ResolveDifferences.module.css";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryResolveDifferencesHandler,
  PollingStationDataEntryStatusHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { screen, spyOnHandler } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";

import { ResolveDifferencesPage } from "./ResolveDifferencesPage";

const navigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => navigate,
  useParams: () => ({ pollingStationId: "3" }),
  useLocation: () => ({ pathname: "/" }),
}));

const renderPage = async () => {
  render(
    <TestUserProvider userRole="coordinator">
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <ResolveDifferencesPage />
        </ElectionStatusProvider>
      </ElectionProvider>
    </TestUserProvider>,
  );
  expect(await screen.findByRole("table")).toBeInTheDocument();
};

describe("ResolveDifferencesPage", () => {
  beforeEach(() => {
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryResolveDifferencesHandler,
      PollingStationDataEntryStatusHandler,
      UserListRequestHandler,
    );
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

    await user.click(await screen.findByLabelText(/De eerste invoer/));
    await user.click(submit);
    expect(resolve).toHaveBeenCalledWith("keep_first_entry");
  });

  test("should refresh election status and navigate to election status page after submit", async () => {
    const user = userEvent.setup();
    const getElectionStatus = spyOnHandler(ElectionStatusRequestHandler);

    await renderPage();
    expect(getElectionStatus).toHaveBeenCalledTimes(1);

    await user.click(await screen.findByLabelText(/De eerste invoer/));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(getElectionStatus).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith("/elections/1/status");
  });
});
