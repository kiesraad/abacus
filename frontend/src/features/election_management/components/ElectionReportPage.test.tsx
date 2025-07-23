import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import { getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  CommitteeSessionStatusChangeRequestHandler,
  ElectionRequestHandler,
  ElectionStatusRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { renderReturningRouter, screen, spyOnHandler } from "@/testing/test-utils";

import { ElectionReportPage } from "./ElectionReportPage";

const navigate = vi.fn();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const renderPage = async () => {
  const router = renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <ElectionReportPage />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Eerste zitting" })).toBeVisible();
  expect(
    await screen.findByRole("heading", { level: 2, name: "Telresultaten eerste zitting gemeente Heemdamseburg" }),
  ).toBeVisible();
  return router;
};

describe("ElectionReportPage", () => {
  beforeEach(() => {
    server.use(CommitteeSessionStatusChangeRequestHandler, ElectionRequestHandler, ElectionStatusRequestHandler);
  });

  test("Shows page and click on back to overview", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    const router = await renderPage();

    expect(await screen.findByRole("button", { name: "Download los proces-verbaal" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Download proces-verbaal met telbestand" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Steminvoer hervatten" })).toBeVisible();

    const backButton = screen.getByRole("link", { name: "Terug naar overzicht" });
    expect(backButton).toBeVisible();
    await user.click(backButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toEqual("/");
  });

  test("Shows page and click on resume data entry", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    overrideOnce("get", "/api/elections/1", 200, getElectionMockData({}, { status: "data_entry_finished" }));

    await renderPage();

    expect(await screen.findByRole("button", { name: "Download los proces-verbaal" })).toBeVisible();
    expect(await screen.findByRole("button", { name: "Download proces-verbaal met telbestand" })).toBeVisible();
    expect(await screen.findByRole("link", { name: "Terug naar overzicht" })).toBeVisible();

    const resumeButton = screen.getByRole("button", { name: "Steminvoer hervatten" });
    expect(resumeButton).toBeVisible();
    await user.click(resumeButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_in_progress" });
    expect(navigate).toHaveBeenCalledWith("../../status");
  });
});
