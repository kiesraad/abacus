import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { CommitteeSessionStatusChangeRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, renderReturningRouter, screen, spyOnHandler } from "@/testing/test-utils";

import { CommitteeSessionCard } from "./CommitteeSessionCard";

const navigate = vi.fn();

vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

describe("UI component: CommitteeSessionCard", () => {
  beforeEach(() => {
    server.use(CommitteeSessionStatusChangeRequestHandler);
  });

  test("The card renders with status created committee session number 1", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "created",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Voorbereiden")).toBeInTheDocument();
  });

  test("The card renders with status created committee session number 2", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 2,
      status: "created",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Tweede zitting")).toBeVisible();
    expect(screen.getByText("— Voorbereiden")).toBeVisible();
  });

  test("The card renders with status data_entry_not_started", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_not_started",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Klaar voor invoer")).toBeVisible();

    const startButton = screen.getByRole("button", { name: "Start steminvoer" });
    expect(startButton).toBeVisible();

    await user.click(startButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_in_progress" });
    expect(navigate).toHaveBeenCalledWith("status");
  });

  test("The card renders with status data_entry_in_progress", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_in_progress",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    const router = renderReturningRouter(
      <CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />,
    );

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoerders bezig")).toBeVisible();

    const statusButton = screen.getByRole("link", { name: "Bekijk voortgang" });
    expect(statusButton).toBeVisible();

    await user.click(statusButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toEqual("/status");
  });

  test("The card renders with status data_entry_paused", () => {
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_paused",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoer gepauzeerd")).toBeVisible();
  });

  test("The card renders with status data_entry_finished", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_finished",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoerders klaar")).toBeVisible();

    expect(screen.getByRole("button", { name: "Resultaten en documenten" }));

    const viewStatusButton = screen.getByRole("button", { name: "Steminvoer bekijken" });
    expect(viewStatusButton).toBeVisible();

    await user.click(viewStatusButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("status");
  });

  test("The card renders with status data_entry_finished not current session and details already saved", async () => {
    const user = userEvent.setup();
    const statusChange = spyOnHandler(CommitteeSessionStatusChangeRequestHandler);
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_finished",
      start_date: "2025-11-09",
      start_time: "09:15",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={false} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Invoerders klaar")).toBeVisible();
    expect(screen.getByText("zondag 9 november 2025 09:15")).toBeVisible();

    expect(screen.queryByRole("button", { name: "Steminvoer bekijken" })).not.toBeInTheDocument();

    const reportButton = screen.getByRole("button", { name: "Resultaten en documenten" });
    expect(reportButton).toBeVisible();

    await user.click(reportButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("report/download");
  });
});
