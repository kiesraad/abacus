import * as ReactRouter from "react-router";

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import {
  CommitteeSessionChangeNumberOfVotersHandler,
  ElectionRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";

import { NumberOfVotersPage } from "./NumberOfVotersPage";

const navigate = vi.fn();

async function renderPage() {
  render(
    <ElectionProvider electionId={1}>
      <NumberOfVotersPage />
    </ElectionProvider>,
  );
  expect(
    await screen.findByRole("heading", { level: 1, name: "Gemeentelijk stembureau Heemdamseburg" }),
  ).toBeInTheDocument();
}

describe("NumberOfVotersPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, CommitteeSessionChangeNumberOfVotersHandler);
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("save and navigate on submit", async () => {
    await renderPage();
    const changeVoters = spyOnHandler(CommitteeSessionChangeNumberOfVotersHandler);
    const user = userEvent.setup();

    const input = screen.getByRole("textbox", { name: "Aantal kiesgerechtigden" });
    expect(input).toHaveValue("2000");
    await user.clear(input);
    await user.type(input, "2500");
    await user.click(screen.getByRole("button", { name: "Opslaan" }));

    expect(changeVoters).toHaveBeenCalledExactlyOnceWith({ number_of_voters: 2500 });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("..");
  });

  test("save and shows error on empty or 0 submit", async () => {
    await renderPage();
    const changeVoters = spyOnHandler(CommitteeSessionChangeNumberOfVotersHandler);
    const user = userEvent.setup();

    const input = screen.getByRole("textbox", { name: "Aantal kiesgerechtigden" });
    expect(input).toHaveValue("2000");
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Opslaan" }));

    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleErrorMessage("Vul het aantal kiesgerechtigden in");
    expect(changeVoters).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();

    await user.type(input, "0");
    await user.click(screen.getByRole("button", { name: "Opslaan" }));

    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleErrorMessage("Vul het aantal kiesgerechtigden in");
    expect(changeVoters).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
