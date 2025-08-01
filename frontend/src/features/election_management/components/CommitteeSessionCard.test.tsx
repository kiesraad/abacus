import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { useUser } from "@/hooks/user/useUser";
import { getCommitteeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { CommitteeSessionStatusChangeRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, renderReturningRouter, screen, spyOnHandler } from "@/testing/test-utils";
import { getAdminUser, getCoordinatorUser } from "@/testing/user-mock-data";

import { CommitteeSessionCard } from "./CommitteeSessionCard";

const navigate = vi.fn();

vi.mock("@/hooks/user/useUser");
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

describe("UI component: CommitteeSessionCard", () => {
  beforeEach(() => {
    server.use(CommitteeSessionStatusChangeRequestHandler);
  });

  test("The card renders with status created committee session number 1", () => {
    vi.mocked(useUser).mockReturnValue(getCoordinatorUser());
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "created",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Zitting voorbereiden")).toBeInTheDocument();
  });

  test("The card renders with status created committee session number 2", () => {
    vi.mocked(useUser).mockReturnValue(getCoordinatorUser());
    const committeeSession = getCommitteeSessionMockData({
      number: 2,
      status: "created",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Tweede zitting")).toBeVisible();
    expect(screen.getByText("— Zitting voorbereiden")).toBeVisible();
  });

  test("The card renders with status data_entry_not_started for coordinator", async () => {
    vi.mocked(useUser).mockReturnValue(getCoordinatorUser());
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
    expect(screen.getByText("— Klaar voor steminvoer")).toBeVisible();

    const startButton = screen.getByRole("button", { name: "Start steminvoer" });
    expect(startButton).toBeVisible();

    await user.click(startButton);

    expect(statusChange).toHaveBeenCalledWith({ status: "data_entry_in_progress" });
    expect(navigate).toHaveBeenCalledWith("status");
  });

  test("The card renders with status data_entry_not_started for administrator", () => {
    vi.mocked(useUser).mockReturnValue(getAdminUser());
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_not_started",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Klaar voor steminvoer")).toBeVisible();

    expect(screen.queryByRole("button", { name: "Start steminvoer" })).not.toBeInTheDocument();
  });

  test("The card renders with status data_entry_in_progress", async () => {
    vi.mocked(useUser).mockReturnValue(getCoordinatorUser());
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
    expect(screen.getByText("— Steminvoer bezig")).toBeVisible();

    const statusButton = screen.getByRole("link", { name: "Bekijk voortgang" });
    expect(statusButton).toBeVisible();

    await user.click(statusButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toEqual("/status");
  });

  test("The card renders with status data_entry_paused", () => {
    vi.mocked(useUser).mockReturnValue(getCoordinatorUser());
    const committeeSession = getCommitteeSessionMockData({
      number: 1,
      status: "data_entry_paused",
      start_date: "",
      start_time: "",
      location: "Juinen",
    });
    render(<CommitteeSessionCard committeeSession={committeeSession} currentSession={true} />);

    expect(screen.getByText("Eerste zitting")).toBeVisible();
    expect(screen.getByText("— Steminvoer gepauzeerd")).toBeVisible();
  });

  test("The card renders with status data_entry_finished for coordinator", async () => {
    vi.mocked(useUser).mockReturnValue(getCoordinatorUser());
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
    expect(screen.getByText("— Steminvoer afgerond")).toBeVisible();

    expect(screen.getByRole("button", { name: "Resultaten en documenten" }));

    const viewStatusButton = screen.getByRole("button", { name: "Steminvoer bekijken" });
    expect(viewStatusButton).toBeVisible();

    await user.click(viewStatusButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("status");
  });

  test("The card renders with status data_entry_finished for administrator", async () => {
    vi.mocked(useUser).mockReturnValue(getAdminUser());
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
    expect(screen.getByText("— Steminvoer afgerond")).toBeVisible();

    expect(screen.queryByRole("button", { name: "Resultaten en documenten" })).not.toBeInTheDocument();

    const viewStatusButton = screen.getByRole("button", { name: "Steminvoer bekijken" });
    expect(viewStatusButton).toBeVisible();

    await user.click(viewStatusButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("status");
  });

  test("The card renders with status data_entry_finished not current session and details already saved", async () => {
    vi.mocked(useUser).mockReturnValue(getCoordinatorUser());
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
    expect(screen.getByText("— Steminvoer afgerond")).toBeVisible();
    expect(screen.getByText("zondag 9 november 2025 09:15")).toBeVisible();

    expect(screen.queryByRole("button", { name: "Steminvoer bekijken" })).not.toBeInTheDocument();

    const reportButton = screen.getByRole("button", { name: "Resultaten en documenten" });
    expect(reportButton).toBeVisible();

    await user.click(reportButton);

    expect(statusChange).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("report/download");
  });
});
