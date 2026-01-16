import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { renderReturningRouter, screen } from "@/testing/test-utils";
import type { NewElection } from "@/types/generated/openapi";

import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { PollingStationRole } from "./PollingStationRole";

const election = { name: "Naam", location: "Plek" } as NewElection;

describe("PollingStationRole component", () => {
  test("Navigates to election create page when no election", () => {
    const state = {};
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <PollingStationRole />
      </ElectionCreateContextProvider>,
    );

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test("Navigates to candidate list upload page", async () => {
    const state = { election };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <PollingStationRole />
      </ElectionCreateContextProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Rol van het stembureau" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Gemeentelijk stembureau (GSB)" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Centraal stembureau (CSB) (Niet beschikbaar in deze versie)" }),
    ).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(router.state.location.pathname).toEqual("/elections/create/list-of-candidates");
  });
});
