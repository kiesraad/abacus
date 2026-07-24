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
  DataEntryGetDifferencesHandler,
  DataEntryResolveDifferencesHandler,
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { screen, spyOnHandler } from "@/testing/test-utils";
import type { DataEntryStatusName } from "@/types/generated/openapi";

import { ResolveDifferencesPage } from "./ResolveDifferencesPage";

const navigate = vi.fn();

const requiredError = "Dit is een verplichte vraag. Maak een keuze uit de opties hieronder.";

const firstEntryLabel = "Eerste invoer (Gebruiker01)";
const secondEntryLabel = "Tweede invoer (Gebruiker02)";
const neitherLabel = "Geen van beide: alles opnieuw invoeren";
const correctWrongEntryLabel = "Laten herstellen door oorspronkelijke invoerder";
const reenterWrongEntryLabel = "Opnieuw laten invoeren";

const renderPage = async () => {
  render(
    <TestUserProvider userRole="coordinator_gsb">
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
  overrideOnce("post", "/api/data_entries/3/resolve_differences", 200, { status });
}

describe("ResolveDifferencesPage", () => {
  const pushMessage = vi.fn();
  const hasMessages = vi.fn();

  beforeEach(() => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({ pushMessage, popMessages: vi.fn(() => []), hasMessages });
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
    vi.spyOn(ReactRouter, "useParams").mockReturnValue({ dataEntryId: "3" });
    vi.spyOn(ReactRouter, "useLocation").mockReturnValue({
      pathname: "/",
    } as Partial<ReactRouter.Location> as ReactRouter.Location);
    server.use(
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      ElectionListRequestHandler,
      DataEntryGetDifferencesHandler,
      DataEntryResolveDifferencesHandler,
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
      "Lijst 1 – Vurige Vleugels Partij",
      "Lijst 2 – Wijzen van Water en Wind",
    ]);

    const mdash = "—";
    expect(await screen.findByRole("table")).toHaveTableContent([
      ["Nummer", "Eerste invoer", "Tweede invoer", "Kandidaat"],
      ["1", "2", mdash, "Foo, A. (Alice)"],
      ["2", mdash, "2", "Doe, C. (Charlie)"],
    ]);

    // First question
    expect(await screen.findByRole("heading", { level: 3, name: "Welke invoer klopt?" })).toBeVisible();
    expect(await screen.findByRole("radio", { name: firstEntryLabel })).toBeVisible();
    expect(await screen.findByRole("radio", { name: secondEntryLabel })).toBeVisible();
    expect(await screen.findByRole("radio", { name: neitherLabel })).toBeVisible();

    // Second question is visible but disabled until an entry is kept
    expect(await screen.findByRole("heading", { level: 3, name: /Wat wil je doen/ })).toBeVisible();
    expect(await screen.findByRole("radio", { name: correctWrongEntryLabel })).toBeDisabled();
    expect(await screen.findByRole("radio", { name: reenterWrongEntryLabel })).toBeDisabled();
  });

  test("should show the selection in the table", async () => {
    await renderPage();
    const user = userEvent.setup();

    const firstEntry = (await screen.findAllByRole("cell"))[0];
    expect(firstEntry).not.toHaveClass(cls.keep!);
    expect(firstEntry).not.toHaveClass(cls.discard!);

    await user.click(await screen.findByRole("radio", { name: firstEntryLabel }));
    expect(firstEntry).toHaveClass(cls.keep!);

    await user.click(await screen.findByRole("radio", { name: secondEntryLabel }));
    expect(firstEntry).toHaveClass(cls.discard!);

    await user.click(await screen.findByRole("radio", { name: neitherLabel }));
    expect(firstEntry).toHaveClass(cls.discard!);
  });

  test("should enable the second question only after choosing to keep an entry", async () => {
    const user = userEvent.setup();
    await renderPage();

    const correctWrongEntry = await screen.findByRole("radio", { name: correctWrongEntryLabel });
    const reenterWrongEntry = await screen.findByRole("radio", { name: reenterWrongEntryLabel });

    expect(correctWrongEntry).toBeDisabled();
    expect(reenterWrongEntry).toBeDisabled();

    await user.click(await screen.findByRole("radio", { name: firstEntryLabel }));
    expect(correctWrongEntry).toBeEnabled();
    expect(reenterWrongEntry).toBeEnabled();

    await user.click(await screen.findByRole("radio", { name: secondEntryLabel }));
    expect(correctWrongEntry).toBeEnabled();
    expect(reenterWrongEntry).toBeEnabled();

    await user.click(await screen.findByRole("radio", { name: neitherLabel }));
    expect(correctWrongEntry).toBeDisabled();
    expect(reenterWrongEntry).toBeDisabled();
  });

  test("should validate both questions before submitting", async () => {
    const user = userEvent.setup();
    const resolve = spyOnHandler(DataEntryResolveDifferencesHandler);

    await renderPage();
    const submit = await screen.findByRole("button", { name: "Opslaan" });

    // Nothing answered -> first question error, no request
    await user.click(submit);
    const firstError = await screen.findByText(requiredError);
    expect(firstError).toHaveAttribute("id", "resolve-differences-correct-entry-error");
    expect(resolve).not.toHaveBeenCalled();

    // First question answered, second still missing -> second question error, no request
    await user.click(await screen.findByRole("radio", { name: firstEntryLabel }));
    await user.click(submit);
    const secondError = await screen.findByText(requiredError);
    expect(secondError).toHaveAttribute("id", "resolve-differences-wrong-entry-error");
    expect(resolve).not.toHaveBeenCalled();
  });

  test.each([
    {
      q1: firstEntryLabel,
      q2: reenterWrongEntryLabel,
      status: "first_entry_finalised",
      action: "keep_first_and_discard_second",
    },
    {
      q1: firstEntryLabel,
      q2: correctWrongEntryLabel,
      status: "first_entry_finalised",
      action: "keep_first_and_correct_second",
    },
    {
      q1: secondEntryLabel,
      q2: reenterWrongEntryLabel,
      status: "first_entry_finalised",
      action: "keep_second_and_discard_first",
    },
    {
      q1: secondEntryLabel,
      q2: correctWrongEntryLabel,
      status: "first_entry_finalised",
      action: "keep_second_and_correct_first",
    },
    { q1: neitherLabel, q2: undefined, status: "empty", action: "discard_both" },
  ] as const)("should submit $action", async ({ q1, q2, status, action }) => {
    const user = userEvent.setup();
    const resolve = spyOnHandler(DataEntryResolveDifferencesHandler);

    await renderPage();
    overrideResponseStatus(status);

    await user.click(await screen.findByRole("radio", { name: q1 }));
    if (q2 !== undefined) {
      await user.click(await screen.findByRole("radio", { name: q2 }));
    }
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(resolve).toHaveBeenCalledWith(action);
  });

  test("should refresh election status and navigate to election status page after submit", async () => {
    const user = userEvent.setup();
    const getElectionStatus = spyOnHandler(ElectionStatusRequestHandler);

    await renderPage();
    expect(getElectionStatus).toHaveBeenCalledTimes(1);

    overrideResponseStatus("first_entry_finalised");
    await user.click(await screen.findByRole("radio", { name: secondEntryLabel }));
    await user.click(await screen.findByRole("radio", { name: reenterWrongEntryLabel }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(getElectionStatus).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith("/elections/1/status");
  });

  test("should show the first data entry user in the message after keeping the first entry", async () => {
    const user = userEvent.setup();

    await renderPage();
    overrideResponseStatus("first_entry_finalised");
    await user.click(await screen.findByRole("radio", { name: firstEntryLabel }));
    await user.click(await screen.findByRole("radio", { name: reenterWrongEntryLabel }));
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
    overrideResponseStatus("first_entry_finalised");
    await user.click(await screen.findByRole("radio", { name: secondEntryLabel }));
    await user.click(await screen.findByRole("radio", { name: reenterWrongEntryLabel }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Verschil opgelost voor stembureau 35",
      text: [
        "Omdat er nog maar één invoer over is, moet er een nieuwe tweede invoer gedaan worden.",
        "Kies hiervoor een andere invoerder dan Gebruiker02.",
      ].join(" "),
    });
  });

  test("should name the correcting typist when the first entry is kept and the second is corrected", async () => {
    const user = userEvent.setup();

    await renderPage();
    overrideResponseStatus("first_entry_finalised");
    await user.click(await screen.findByRole("radio", { name: firstEntryLabel }));
    await user.click(await screen.findByRole("radio", { name: correctWrongEntryLabel }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Verschil opgelost voor stembureau 35",
      text: "De invoer die niet klopt moet worden hersteld door Gebruiker02.",
    });
  });

  test("should name the correcting typist when the second entry is kept and the first is corrected", async () => {
    const user = userEvent.setup();

    await renderPage();
    overrideResponseStatus("first_entry_finalised");
    await user.click(await screen.findByRole("radio", { name: secondEntryLabel }));
    await user.click(await screen.findByRole("radio", { name: correctWrongEntryLabel }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Verschil opgelost voor stembureau 35",
      text: "De invoer die niet klopt moet worden hersteld door Gebruiker01.",
    });
  });

  test("should navigate to election status page after submit and push message", async () => {
    const user = userEvent.setup();

    await renderPage();

    overrideResponseStatus("empty");
    await user.click(await screen.findByRole("radio", { name: neitherLabel }));
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
    await user.click(await screen.findByRole("radio", { name: secondEntryLabel }));
    await user.click(await screen.findByRole("radio", { name: reenterWrongEntryLabel }));
    await user.click(await screen.findByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      title: "Verschil opgelost voor stembureau 35",
      text: "Let op: het proces-verbaal bevat fouten die moeten worden opgelost",
    });
    expect(navigate).toHaveBeenCalledWith("/elections/1/status/3/detail");
  });
});
