import { within } from "@testing-library/dom";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import cls from "@/features/resolve_differences/components/ResolveDifferences.module.css";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import { UsersProvider } from "@/hooks/user/UsersProvider";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  PollingStationDataEntryGetDifferencesHandler,
  PollingStationDataEntryResolveDifferencesHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { screen, spyOnHandler } from "@/testing/test-utils";
import type { DataEntryStatusName } from "@/types/generated/openapi";

import { ResolveDifferencesPage } from "./ResolveDifferencesPage";

const navigate = vi.fn();

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
  const pushMessage = vi.fn();
  const hasMessages = vi.fn();

  beforeEach(() => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage, popMessages: vi.fn(() => []), hasMessages });
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ pollingStationId: "3" });
    vi.spyOn(ReactRouter, "useLocation").mockReturnValue({
      pathname: "/",
    } as Partial<ReactRouter.Location> as ReactRouter.Location);
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      PollingStationDataEntryGetDifferencesHandler,
      PollingStationDataEntryResolveDifferencesHandler,
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
      "Extra onderzoek",
      "Verschillen met stembureau",
      "Aantal kiezers en stemmen",
      "Verschillen D & H",
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
    expect(await screen.findByRole("radio", { name: "De eerste invoer (Gebruiker01)" })).toBeVisible();
    expect(await screen.findByRole("radio", { name: "De tweede invoer (Gebruiker02)" })).toBeVisible();
    expect(await screen.findByRole("radio", { name: "Geen van beide: alles opnieuw invoeren" })).toBeVisible();
  });

  test("should show the selection in the table", async () => {
    await renderPage();
    const user = userEvent.setup();

    const firstEntry = (await screen.findAllByRole("cell"))[0];
    expect(firstEntry).not.toHaveClass(cls.keep!);
    expect(firstEntry).not.toHaveClass(cls.discard!);

    await user.click(await screen.findByRole("radio", { name: "De eerste invoer (Gebruiker01)" }));
    expect(firstEntry).toHaveClass(cls.keep!);

    await user.click(await screen.findByRole("radio", { name: "De tweede invoer (Gebruiker02)" }));
    expect(firstEntry).toHaveClass(cls.discard!);

    await user.click(await screen.findByRole("radio", { name: "Geen van beide: alles opnieuw invoeren" }));
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
    await user.click(await screen.findByRole("radio", { name: "De eerste invoer (Gebruiker01)" }));
    await user.click(submit);
    expect(resolve).toHaveBeenCalledWith("keep_first_entry");
    expect(navigate).toHaveBeenCalledWith("/elections/1/status");
  });

  test("should refresh election status and navigate to election status page after submit", async () => {
    const user = userEvent.setup();
    const getElectionStatus = spyOnHandler(ElectionStatusRequestHandler);

    await renderPage();
    expect(getElectionStatus).toHaveBeenCalledTimes(1);

    overrideResponseStatus("second_entry_not_started");
    await user.click(await screen.findByRole("radio", { name: "De tweede invoer (Gebruiker02)" }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(getElectionStatus).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith("/elections/1/status");
  });

  test("should show the first data entry user in the message after keeping the first entry", async () => {
    const user = userEvent.setup();

    await renderPage();
    overrideResponseStatus("second_entry_not_started");
    await user.click(await screen.findByRole("radio", { name: "De eerste invoer (Gebruiker01)" }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Verschil opgelost voor stembureau 35",
      text: [
        "Omdat er nog maar één invoer over is, moet er een nieuwe tweede invoer gedaan worden.",
        "Kies hiervoor een andere invoerder dan Gebruiker01.",
      ].join(" "),
    });
  });

  test("should show the second data entry user in the message after keeping the second entry", async () => {
    const user = userEvent.setup();

    await renderPage();
    overrideResponseStatus("second_entry_not_started");
    await user.click(await screen.findByRole("radio", { name: "De tweede invoer (Gebruiker02)" }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Verschil opgelost voor stembureau 35",
      text: [
        "Omdat er nog maar één invoer over is, moet er een nieuwe tweede invoer gedaan worden.",
        "Kies hiervoor een andere invoerder dan Gebruiker02.",
      ].join(" "),
    });
  });

  test("should navigate to election status page after submit and push message", async () => {
    const user = userEvent.setup();

    await renderPage();

    overrideResponseStatus("first_entry_not_started");
    await user.click(await screen.findByRole("radio", { name: "Geen van beide: alles opnieuw invoeren" }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Verschil opgelost voor stembureau 35",
      text: "Omdat beide invoeren zijn verwijderd, moet stembureau 35 twee keer opnieuw ingevoerd worden.",
    });
    expect(navigate).toHaveBeenCalledWith("/elections/1/status");
  });

  test("should navigate to detail/resolve errors page after keeping second entry which has errors", async () => {
    const user = userEvent.setup();

    await renderPage();

    overrideResponseStatus("first_entry_has_errors");
    await user.click(await screen.findByRole("radio", { name: "De tweede invoer (Gebruiker02)" }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Verschil opgelost voor stembureau 35",
      text: "Let op: het proces-verbaal bevat fouten die moeten worden opgelost",
    });
    expect(navigate).toHaveBeenCalledWith("/elections/1/status/3/detail");
  });
});
