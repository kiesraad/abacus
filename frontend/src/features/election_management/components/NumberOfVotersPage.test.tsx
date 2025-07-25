import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { NumberOfVotersPage } from "@/features/election_management/components/NumberOfVotersPage";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import {
  ElectionCommitteeSessionChangeNumberOfVotersHandler,
  ElectionRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";

const navigate = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

async function renderPage() {
  render(
    <ElectionProvider electionId={1}>
      <NumberOfVotersPage />
    </ElectionProvider>,
  );
  expect(await screen.findByRole("heading", { name: "Heemdamseburg" })).toBeInTheDocument();
}

describe("NumberOfVotersPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler, ElectionCommitteeSessionChangeNumberOfVotersHandler);
  });
  test("save and navigate on submit", async () => {
    await renderPage();
    const changeVoters = spyOnHandler(ElectionCommitteeSessionChangeNumberOfVotersHandler);
    const user = userEvent.setup();

    const input = screen.getByLabelText("Aantal kiesgerechtigden");
    expect(input).toHaveValue("2.000");
    await user.click(screen.getByRole("button", { name: "Opslaan" }));

    expect(changeVoters).toHaveBeenCalledExactlyOnceWith({ number_of_voters: 2000 });
    expect(navigate).toHaveBeenCalledExactlyOnceWith("..");
  });
});
