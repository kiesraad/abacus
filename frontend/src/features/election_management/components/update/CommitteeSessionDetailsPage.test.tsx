import { RouterProvider } from "react-router";

import { render as rtlRender } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { within } from "storybook/test";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ApiProvider } from "@/api/ApiProvider";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { CommitteeSessionUpdateHandler, ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { getRouter, Router } from "@/testing/router";
import { overrideOnce, server } from "@/testing/server";
import { expectNotFound, renderReturningRouter, screen, setupTestRouter, spyOnHandler } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { ErrorResponse } from "@/types/generated/openapi";

import { electionManagementRoutes } from "../../routes";
import { CommitteeSessionDetailsPage } from "./CommitteeSessionDetailsPage";

const navigate = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

function renderPage() {
  return renderReturningRouter(
    <ElectionProvider electionId={1}>
      <CommitteeSessionDetailsPage />
    </ElectionProvider>,
  );
}

describe("CommitteeSessionDetailsPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, CommitteeSessionUpdateHandler);
  });

  test("Shows empty form, save and navigate on submit", async () => {
    const user = userEvent.setup();
    const updateDetails = spyOnHandler(CommitteeSessionUpdateHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "created" }));

    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Details van de eerste zitting" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Waar vindt de eerste zitting plaats?" }),
    ).toBeInTheDocument();
    const location = screen.getByRole("textbox", { name: "Plaats van de zitting" });
    expect(location).toHaveValue("");

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Wanneer begint de eerste zitting van het gemeentelijk stembureau?",
      }),
    ).toBeInTheDocument();
    const date = screen.getByRole("textbox", { name: "Datum" });
    expect(date).toHaveValue("");
    const time = screen.getByRole("textbox", { name: "Tijd" });
    expect(time).toHaveValue("");
    const saveButton = screen.getByRole("button", { name: "Wijzigingen opslaan" });

    // Submit without entering data
    await user.click(saveButton);

    expect(location).toBeInvalid();
    expect(location).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
    expect(date).toBeInvalid();
    expect(date).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");
    expect(time).toBeInvalid();
    expect(time).toHaveAccessibleErrorMessage("Dit veld mag niet leeg zijn");

    await user.type(location, "Amsterdam");
    await user.type(date, "2025-12-31");
    await user.type(time, "9:15");

    // Submit with invalid date and time
    await user.click(saveButton);

    expect(location).toBeValid();
    expect(date).toBeInvalid();
    expect(date).toHaveAccessibleErrorMessage("Vul de datum in als: dd-mm-jjjj");
    expect(time).toBeInvalid();
    expect(time).toHaveAccessibleErrorMessage("Vul de tijd in als: uu:mm");

    await user.clear(date);
    await user.type(date, "31-12-2025");
    await user.clear(time);
    await user.type(time, "09:15");

    // Submit with valid data
    await user.click(saveButton);

    expect(location).toBeValid();
    expect(date).toBeValid();
    expect(time).toBeValid();

    expect(updateDetails).toHaveBeenCalledExactlyOnceWith({
      location: "Amsterdam",
      start_date: "2025-12-31",
      start_time: "09:15",
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("..");
  });

  test("Shows form with pre-filled data, save and navigate on submit", async () => {
    const user = userEvent.setup();
    const updateDetails = spyOnHandler(CommitteeSessionUpdateHandler);
    overrideOnce(
      "get",
      "/api/elections/1",
      200,
      getElectionMockData(
        {},
        {
          number: 2,
          status: "data_entry_not_started",
          location: "Den Haag",
          start_date: "2026-03-18",
          start_time: "21:36",
        },
      ),
    );

    renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Details van de tweede zitting" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Waar vindt de tweede zitting plaats?" }),
    ).toBeInTheDocument();
    const location = screen.getByRole("textbox", { name: "Plaats van de zitting" });
    expect(location).toHaveValue("Den Haag");

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Wanneer begint de tweede zitting van het gemeentelijk stembureau?",
      }),
    ).toBeInTheDocument();
    const date = screen.getByRole("textbox", { name: "Datum" });
    expect(date).toHaveValue("18-03-2026");
    const time = screen.getByRole("textbox", { name: "Tijd" });
    expect(time).toHaveValue("21:36");

    await user.clear(time);
    await user.type(time, "22:36");

    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(location).toBeValid();
    expect(date).toBeValid();
    expect(time).toBeValid();

    expect(updateDetails).toHaveBeenCalledExactlyOnceWith({
      location: "Den Haag",
      start_date: "2026-03-18",
      start_time: "22:36",
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("..");
  });

  test("Shows form with pre-filled data, cancel and navigate", async () => {
    const user = userEvent.setup();
    const updateDetails = spyOnHandler(CommitteeSessionUpdateHandler);
    overrideOnce(
      "get",
      "/api/elections/1",
      200,
      getElectionMockData(
        {},
        {
          number: 6,
          status: "data_entry_in_progress",
          location: "Den Haag",
          start_date: "2026-03-18",
          start_time: "21:36",
        },
      ),
    );

    const router = renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Details van zitting 6" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "Waar vindt zitting 6 plaats?" })).toBeInTheDocument();
    const location = screen.getByRole("textbox", { name: "Plaats van de zitting" });
    expect(location).toHaveValue("Den Haag");

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Wanneer begon zitting 6 van het gemeentelijk stembureau?",
      }),
    ).toBeInTheDocument();
    const date = screen.getByRole("textbox", { name: "Datum" });
    expect(date).toHaveValue("18-03-2026");
    const time = screen.getByRole("textbox", { name: "Tijd" });
    expect(time).toHaveValue("21:36");

    await user.type(time, "22:26");

    await user.click(screen.getByRole("link", { name: "Annuleren" }));

    expect(updateDetails).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toEqual("/");
  });

  test("Shows error page when change details call returns an error", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const Providers = ({
      children,
      router = getRouter(children),
      fetchInitialUser = false,
    }: {
      children?: React.ReactNode;
      router?: Router;
      fetchInitialUser?: boolean;
    }) => {
      return (
        <ApiProvider fetchInitialUser={fetchInitialUser}>
          <TestUserProvider userRole="coordinator">
            <ElectionProvider electionId={1}>
              <RouterProvider router={router} />
            </ElectionProvider>
          </TestUserProvider>
        </ApiProvider>
      );
    };
    const router = setupTestRouter([
      {
        Component: null,
        errorElement: <ErrorBoundary />,
        children: [
          {
            path: "elections/:electionId",
            children: electionManagementRoutes,
          },
        ],
      },
    ]);
    const user = userEvent.setup();
    const updateDetails = spyOnHandler(CommitteeSessionUpdateHandler);
    overrideOnce("put", "/api/committee_sessions/1", 400, {
      error: "Invalid details",
      fatal: false,
      reference: "InvalidData",
    } satisfies ErrorResponse);

    await router.navigate("/elections/1/details");

    rtlRender(<Providers router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Details van de eerste zitting" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Waar vindt de eerste zitting plaats?" }),
    ).toBeInTheDocument();
    const location = screen.getByRole("textbox", { name: "Plaats van de zitting" });
    expect(location).toHaveValue("");

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Wanneer begon de eerste zitting van het gemeentelijk stembureau?",
      }),
    ).toBeInTheDocument();
    const date = screen.getByRole("textbox", { name: "Datum" });
    expect(date).toHaveValue("");
    const time = screen.getByRole("textbox", { name: "Tijd" });
    expect(time).toHaveValue("");

    await user.type(location, "Amsterdam");
    await user.type(date, "13-12-2025");
    await user.type(time, "09:15");

    const saveButton = screen.getByRole("button", { name: "Wijzigingen opslaan" });

    await user.click(saveButton);

    expect(updateDetails).toHaveBeenCalledExactlyOnceWith({
      location: "Amsterdam",
      start_date: "2025-12-13",
      start_time: "09:15",
    });
    expect(navigate).not.toHaveBeenCalled();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("De invoer is niet geldig")).toBeVisible();
  });

  test("Shows error page when change details call returns an error", async () => {
    // Since we test what happens after an error, we want vitest to ignore them
    vi.spyOn(console, "error").mockImplementation(() => {
      /* do nothing */
    });
    const Providers = ({
      children,
      router = getRouter(children),
      fetchInitialUser = false,
    }: {
      children?: React.ReactNode;
      router?: Router;
      fetchInitialUser?: boolean;
    }) => {
      return (
        <ApiProvider fetchInitialUser={fetchInitialUser}>
          <TestUserProvider userRole="coordinator">
            <ElectionProvider electionId={1}>
              <RouterProvider router={router} />
            </ElectionProvider>
          </TestUserProvider>
        </ApiProvider>
      );
    };
    const router = setupTestRouter([
      {
        Component: null,
        errorElement: <ErrorBoundary />,
        children: [
          {
            path: "elections/:electionId",
            children: electionManagementRoutes,
          },
        ],
      },
    ]);
    const user = userEvent.setup();
    const updateDetails = spyOnHandler(CommitteeSessionUpdateHandler);
    overrideOnce("put", "/api/committee_sessions/1", 404, {
      error: "Resource not found",
      fatal: true,
      reference: "EntryNotFound",
    } satisfies ErrorResponse);

    await router.navigate("/elections/1/details");

    rtlRender(<Providers router={router} />);

    expect(await screen.findByRole("heading", { level: 1, name: "Details van de eerste zitting" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Waar vindt de eerste zitting plaats?" }),
    ).toBeInTheDocument();
    const location = screen.getByRole("textbox", { name: "Plaats van de zitting" });
    expect(location).toHaveValue("");

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Wanneer begon de eerste zitting van het gemeentelijk stembureau?",
      }),
    ).toBeInTheDocument();
    const date = screen.getByRole("textbox", { name: "Datum" });
    expect(date).toHaveValue("");
    const time = screen.getByRole("textbox", { name: "Tijd" });
    expect(time).toHaveValue("");

    await user.type(location, "Amsterdam");
    await user.type(date, "13-12-2025");
    await user.type(time, "09:15");

    const saveButton = screen.getByRole("button", { name: "Wijzigingen opslaan" });

    await user.click(saveButton);

    expect(updateDetails).toHaveBeenCalledExactlyOnceWith({
      location: "Amsterdam",
      start_date: "2025-12-13",
      start_time: "09:15",
    });
    expect(navigate).not.toHaveBeenCalled();

    await expectNotFound("Niet gevonden");
  });
});
