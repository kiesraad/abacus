import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { renderReturningRouter, screen, waitFor } from "@/testing/test-utils";
import type { NewElection } from "@/types/generated/openapi";
import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { CountingMethodType } from "./CountingMethodType";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";

const election = { name: "Naam", location: "Plek" } as NewElection;

describe("CountingMethodType component", () => {
  test("Navigates to election create page when no election", () => {
    const state = {};
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(<CountingMethodType />);

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test("Renders form and shows error when submitting without selecting a list", async () => {
    const state = { election };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const user = userEvent.setup();

    renderReturningRouter(
      <ElectionCreateContextProvider>
        <CountingMethodType />
      </ElectionCreateContextProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: `Type stemopneming in ${election.location}` }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Centrale stemopneming \(CSO\)/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Decentrale stemopneming \(DSO\)/ })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(await screen.findByText("Deze vraag is verplicht")).toBeVisible();
  });

  test("Navigates to number of voters page", async () => {
    const state = { election };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <ElectionCreateContextProvider>
        <CountingMethodType />
      </ElectionCreateContextProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: `Type stemopneming in ${election.location}` }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Centrale stemopneming \(CSO\)/ })).not.toBeChecked();
    const DSORadio = screen.getByRole("radio", { name: /Decentrale stemopneming \(DSO\)/ });
    expect(DSORadio).not.toBeChecked();
    await waitFor(() => {
      DSORadio.click();
    });
    expect(DSORadio).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(router.state.location.pathname).toEqual("/elections/create/number-of-voters");
  });
});
