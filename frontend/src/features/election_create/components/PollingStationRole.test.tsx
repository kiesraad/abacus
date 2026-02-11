import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { renderReturningRouter, screen } from "@/testing/test-utils";
import type { ElectionCategory, NewElection } from "@/types/generated/openapi";

import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { PollingStationRole } from "./PollingStationRole";

const election = { name: "Naam", location: "Plek" } as NewElection;

describe("PollingStationRole component", () => {
  test("Navigates to election create page when no election", () => {
    const state = {};
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(<PollingStationRole />);

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test("Navigates to candidate list upload page", async () => {
    const state = { election, electionCategory: "Municipal" as ElectionCategory };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <PollingStationRole />
      </ElectionCreateContextProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Rol van het stembureau" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Gemeentelijk stembureau (GSB)" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Centraal stembureau (CSB)" })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "SET_CATEGORY_TYPE",
      electionCategory: "Municipal",
    });

    expect(router.state.location.pathname).toEqual("/elections/create/list-of-candidates");
  });

  test("CSB checked: Navigates to candidate list upload page", async () => {
    const state = { election, electionCategory: "Central" as ElectionCategory };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <PollingStationRole />
      </ElectionCreateContextProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Rol van het stembureau" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Gemeentelijk stembureau (GSB)" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Centraal stembureau (CSB)" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "SET_CATEGORY_TYPE",
      electionCategory: "Central",
    });

    expect(router.state.location.pathname).toEqual("/elections/create/list-of-candidates");
  });
});
