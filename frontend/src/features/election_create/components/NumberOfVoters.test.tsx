import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { NewElection } from "@/types/generated/openapi";

import * as useElectionCreateContext from "../hooks/useElectionCreateContext";
import { NumberOfVoters } from "./NumberOfVoters";

async function renderPage() {
  render(
    <ElectionProvider electionId={1}>
      <NumberOfVoters />
    </ElectionProvider>,
  );

  expect(
    await screen.findByRole("heading", { name: "Hoeveel kiesgerechtigden telt de gemeente?" }),
  ).toBeInTheDocument();
}

const election = { name: "Naam", location: "Plek" } as NewElection;

describe("NumberOfVoters component", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
  });

  test("should dispatch number of voters", async () => {
    const state = { election, numberOfVoters: 0 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    await renderPage();

    const user = userEvent.setup();
    const input = screen.getByLabelText("Aantal kiesgerechtigden");
    await user.type(input, "1337");
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      type: "SET_NUMBER_OF_VOTERS",
      numberOfVoters: 1337,
    });
  });

  test("should show error when number of voters is empty", async () => {
    const state = { election, numberOfVoters: 0 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    await renderPage();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Volgende" }));

    const input = screen.getByLabelText("Aantal kiesgerechtigden");
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleErrorMessage("Vul het aantal kiesgerechtigden in");
    expect(dispatch).not.toHaveBeenCalled();
  });

  test("should prefill number of voters from the eml", async () => {
    const state = { election, numberOfVoters: 1234 };
    const dispatch = vi.fn();
    vi.spyOn(useElectionCreateContext, "useElectionCreateContext").mockReturnValue({ state, dispatch });
    await renderPage();

    expect(screen.getByLabelText("Aantal kiesgerechtigden")).toHaveValue("1234");
  });
});
