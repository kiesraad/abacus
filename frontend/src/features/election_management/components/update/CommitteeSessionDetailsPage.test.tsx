import * as ReactRouter from "react-router";
import { ReactNode } from "react";

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
    <ApiProvider fetchInitialUser={fetchInitialUser}>
      <TestUserProvider userRole="coordinator">
        <ElectionProvider electionId={1}>
          <ReactRouter.RouterProvider router={router} />
        </ElectionProvider>
      </TestUserProvider>
    </ApiProvider>
  );
};

function testRouter() {
  return setupTestRouter([
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
}

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
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("Shows empty form for first committee session and working validation", async () => {
    const user = userEvent.setup();
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "created" }));

    renderPage();

    // Check that the labels reflect the first committee session
    expect(
      await screen.findByRole("heading", { level: 1, name: "Gemeentelijk stembureau Heemdamseburg" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "Details van de eerste zitting" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 3, name: "Start van de zitting" })).toBeInTheDocument();

    // Check that the fields are empty
    const location = screen.getByRole("textbox", { name: "Plaats van de zitting" });
    expect(location).toHaveValue("");
    const date = screen.getByRole("textbox", { name: "Datum" });
    expect(date).toHaveValue("");
    const time = screen.getByRole("textbox", { name: "Tijd" });
    expect(time).toHaveValue("");
    const saveButton = screen.getByRole("button", { name: "Wijzigingen opslaan" });

    // Submit without entering data
    await user.click(saveButton);

    // Check for empty field validation
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

    // Check for invalid date and time field validation
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

    // Expect all fields to be valid now
    expect(location).toBeValid();
    expect(date).toBeValid();
    expect(time).toBeValid();
  });

  test("Shows form with pre-filled data for second committee session", async () => {
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

    // Check that the labels reflect the second committee session
    expect(
      await screen.findByRole("heading", { level: 1, name: "Gemeentelijk stembureau Heemdamseburg" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "Details van de tweede zitting" })).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Start van de zitting",
      }),
    ).toBeInTheDocument();

    // Check that the existing details are pre-filled
    const location = screen.getByRole("textbox", { name: "Plaats van de zitting" });
    expect(location).toHaveValue("Den Haag");
    const date = screen.getByRole("textbox", { name: "Datum" });
    expect(date).toHaveValue("18-03-2026");
    const time = screen.getByRole("textbox", { name: "Tijd" });
    expect(time).toHaveValue("21:36");
  });

  test("Shows form, save and navigate", async () => {
    const user = userEvent.setup();
    const updateDetails = spyOnHandler(CommitteeSessionUpdateHandler);
    overrideOnce(
      "get",
      "/api/elections/1",
      200,
      getElectionMockData(
        {},
        {
          status: "data_entry_not_started",
          location: "Den Haag",
          start_date: "2026-03-18",
          start_time: "21:36",
        },
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Gemeentelijk stembureau Heemdamseburg" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Wijzigingen opslaan" }));

    expect(updateDetails).toHaveBeenCalledExactlyOnceWith({
      location: "Den Haag",
      start_date: "2026-03-18",
      start_time: "21:36",
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("..");
  });

  test("Shows form, save and navigate to report", async () => {
    const user = userEvent.setup();
    const updateDetails = spyOnHandler(CommitteeSessionUpdateHandler);
    overrideOnce(
      "get",
      "/api/elections/1",
      200,
      getElectionMockData(
        {},
        {
          status: "data_entry_not_started",
          location: "Den Haag",
          start_date: "2026-03-18",
          start_time: "21:36",
        },
      ),
    );

    const router = testRouter();
    await router.navigate("/elections/1/details#redirect-to-report");
    rtlRender(<Providers router={router} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Gemeentelijk stembureau Heemdamseburg" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Naar proces-verbaal" }));

    expect(updateDetails).toHaveBeenCalledExactlyOnceWith({
      location: "Den Haag",
      start_date: "2026-03-18",
      start_time: "21:36",
    });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/elections/1/report/committee-session/1/download");
  });

  test("Shows form for sixth committee session, cancel and navigate", async () => {
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

    // Check that the labels reflect the sixth committee session
    expect(
      await screen.findByRole("heading", { level: 1, name: "Gemeentelijk stembureau Heemdamseburg" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 2, name: "Details van zitting 6" })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Annuleren" }));

    expect(updateDetails).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toEqual("/");
  });

  test("Shows error page when change details call returns a 400 error", async () => {
    const user = userEvent.setup();
    const updateDetails = spyOnHandler(CommitteeSessionUpdateHandler);
    overrideOnce("put", "/api/committee_sessions/1", 400, {
      error: "Invalid details",
      fatal: false,
      reference: "InvalidData",
    } satisfies ErrorResponse);

    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Gemeentelijk stembureau Heemdamseburg" }),
    ).toBeInTheDocument();

    const location = screen.getByRole("textbox", { name: "Plaats van de zitting" });
    const date = screen.getByRole("textbox", { name: "Datum" });
    const time = screen.getByRole("textbox", { name: "Tijd" });

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

    // Expect error alert to be shown after a 400 error
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("De invoer is niet geldig");
  });

  test("Shows error page when change details call returns a 404 error", async () => {
    // error is expected
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    const updateDetails = spyOnHandler(CommitteeSessionUpdateHandler);
    overrideOnce("put", "/api/committee_sessions/1", 404, {
      error: "Resource not found",
      fatal: true,
      reference: "EntryNotFound",
    } satisfies ErrorResponse);

    const router = testRouter();
    await router.navigate("/elections/1/details");
    rtlRender(<Providers router={router} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Gemeentelijk stembureau Heemdamseburg" }),
    ).toBeInTheDocument();

    const location = screen.getByRole("textbox", { name: "Plaats van de zitting" });
    const date = screen.getByRole("textbox", { name: "Datum" });
    const time = screen.getByRole("textbox", { name: "Tijd" });

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
