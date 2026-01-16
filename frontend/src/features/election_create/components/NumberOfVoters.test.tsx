import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { render, renderReturningRouter, screen } from "@/testing/test-utils";
import type { NewElection } from "@/types/generated/openapi";

import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import { NumberOfVoters } from "./NumberOfVoters";

async function renderPage() {
  render(
    <ElectionCreateContextProvider>
      <NumberOfVoters />
    </ElectionCreateContextProvider>,
  );

  expect(
    await screen.findByRole("heading", { name: "Hoeveel kiesgerechtigden telt de gemeente?" }),
  ).toBeInTheDocument();
}

const election = { name: "Naam", location: "Plek" } as NewElection;

describe("NumberOfVoters component", () => {
  test("Navigates to election create page when no election", () => {
    const state = {};
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const router = renderReturningRouter(<NumberOfVoters />);

    expect(router.state.location.pathname).toEqual("/elections/create");
  });

  test("Dispatches number of voters", async () => {
    const state = { election, numberOfVoters: 0 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const user = userEvent.setup();

    await renderPage();

    const input = screen.getByRole("textbox", { name: "Aantal kiesgerechtigden" });
    await user.type(input, "1337");
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "SET_NUMBER_OF_VOTERS",
      numberOfVoters: 1337,
      isNumberOfVotersUserEdited: true,
    });
  });

  test("Shows an error when number of voters is empty", async () => {
    const state = { election, numberOfVoters: 0 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    const user = userEvent.setup();

    await renderPage();

    await user.click(screen.getByRole("button", { name: "Volgende" }));

    const input = screen.getByRole("textbox", { name: "Aantal kiesgerechtigden" });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleErrorMessage("Vul het aantal kiesgerechtigden in");
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("Prefills number of voters from the EML", async () => {
    const state = { election, numberOfVoters: 1234 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });

    await renderPage();

    expect(screen.getByRole("textbox", { name: "Aantal kiesgerechtigden" })).toHaveValue("1234");
    expect(screen.getByText("Ingelezen uit bestand met stembureaus")).toBeVisible();
  });
});
