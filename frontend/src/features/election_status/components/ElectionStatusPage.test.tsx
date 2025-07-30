import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ElectionLayout } from "@/components/layout/ElectionLayout";
import { ElectionStatusLayout } from "@/components/layout/ElectionStatusLayout";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  ElectionListRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
  UserListRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { Providers } from "@/testing/Providers";
import { overrideOnce, server } from "@/testing/server";
import { screen, setupTestRouter } from "@/testing/test-utils";

import { electionStatusRoutes } from "../routes";

const navigate = vi.fn();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

async function renderPage() {
  // Set up router and navigate to the election data entry status page
  const router = setupTestRouter([
    {
      path: "/elections/:electionId",
      Component: ElectionLayout,
      errorElement: <ErrorBoundary />,
      children: [
        {
          path: "status",
          Component: ElectionStatusLayout,
          children: electionStatusRoutes,
        },
      ],
    },
  ]);

  await router.navigate("/elections/1/status");
  rtlRender(<Providers router={router} />);

  // Wait for the page to be loaded
  expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();

  return router;
}

describe("ElectionStatusPage", () => {
  beforeEach(() => {
    server.use(
      ElectionListRequestHandler,
      ElectionRequestHandler,
      ElectionStatusRequestHandler,
      UserListRequestHandler,
    );
  });

  test("Finish input not visible when data entry is in progress", async () => {
    await renderPage();

    // Test that the data entry finished message doesn't exist
    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
  });

  test("Finish input visible when data entry has finished", async () => {
    const user = userEvent.setup();
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "definitive" },
        { id: 2, status: "definitive" },
      ],
    });

    await renderPage();

    expect(await screen.findByText("Alle stembureaus zijn twee keer ingevoerd")).toBeVisible();
    const finishButton = screen.getByRole("button", { name: "Invoerfase afronden" });
    expect(finishButton).toBeVisible();

    await user.click(finishButton);

    expect(navigate).toHaveBeenCalledWith("../report");
  });

  test("Finish input not visible when election is finished", async () => {
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [
        { id: 1, status: "definitive" },
        { id: 2, status: "definitive" },
      ],
    });

    await renderPage();

    expect(screen.queryByText("Alle stembureaus zijn twee keer ingevoerd")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invoerfase afronden" })).not.toBeInTheDocument();
  });
});
