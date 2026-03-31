import { userEvent } from "@testing-library/user-event/dist/cjs/index.js";
import { HttpResponse, http } from "msw";
import * as ReactRouter from "react-router";
import { describe, expect, test, vi } from "vitest";
import { CollapsibleDataEntryList } from "@/features/data_entry_home/components/CollapsibleDataEntryList";
import { getDataEntryWithStatusList } from "@/features/data_entry_home/utils/util";
import * as useUser from "@/hooks/user/useUser";
import { getElectionStatusMockData } from "@/testing/api-mocks/ElectionStatusMockData";
import { server } from "@/testing/server";
import { render, screen, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import type { ElectionStatusResponse } from "@/types/generated/openapi";

const typist = getTypistUser();

function renderComponent({ statuses }: ElectionStatusResponse) {
  const entries = getDataEntryWithStatusList({ statuses, user: typist });
  vi.spyOn(useUser, "useUser").mockReturnValue(typist);
  const onToggle = vi.fn();
  render(<CollapsibleDataEntryList electionId={1} availableDataEntries={entries} onToggle={onToggle} />);
}

describe("CollapsibleDataEntryList component", () => {
  test("Data entry list is displayed", async () => {
    const user = userEvent.setup();
    renderComponent(
      getElectionStatusMockData([
        { status: "first_entry_in_progress", first_entry_user_id: typist.user_id },
        { status: "first_entry_finalised", first_entry_user_id: typist.user_id },
      ]),
    );

    expect(await screen.findByText("Kies het stembureau")).not.toBeVisible();

    const openList = screen.getByTestId("openList");
    await user.click(openList);

    expect(screen.getByText("Kies het stembureau")).toBeVisible();

    // Check if the station number and name exist and are visible
    const list = await screen.findByTestId("data_entry_list");
    expect(list).toHaveTableContent([
      ["Nummer", "Stembureau"],
      ["33", "Op Rolletjes 1e invoer"],
      ["34", "Testplek 2e invoer"],
    ]);
  });

  test("Empty data entry list shows message", async () => {
    server.use(
      http.get("/api/elections/1/status", () => HttpResponse.json(getElectionStatusMockData([]), { status: 200 })),
    );
    const user = userEvent.setup();
    renderComponent(getElectionStatusMockData([]));

    const openList = await screen.findByTestId("openList");
    await user.click(openList);
    expect(screen.getByText("Kies het stembureau")).toBeVisible();

    // Check if the error message is visible
    expect(screen.getByText("Er zijn voor jou op dit moment geen stembureaus om in te voeren")).toBeVisible();
  });

  test("Data entry has correct link", async () => {
    const navigate = vi.fn();
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);

    renderComponent(
      getElectionStatusMockData([{ status: "first_entry_finalised", first_entry_user_id: typist.user_id }]),
    );

    // Open the list
    const user = userEvent.setup();
    const openList = await screen.findByTestId("openList");
    await user.click(openList);

    // Click data entry for 33 and check if the link is correct
    const list = await screen.findByTestId("data_entry_list");
    await user.click(within(list).getByText("33"));

    expect(navigate).toHaveBeenCalledWith("/elections/1/data-entry/1/2");
  });
});
