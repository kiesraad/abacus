import { describe, expect, test } from "vitest";
import { UnfinishedEntriesList } from "@/features/data_entry_home/components/UnfinishedEntriesList";
import { getDataEntryWithStatusList } from "@/features/data_entry_home/utils/util";
import { getElectionStatusMockData } from "@/testing/api-mocks/ElectionStatusMockData";
import { render, screen, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";

const user = getTypistUser();

describe("UnfinishedEntriesList component", () => {
  test("Resume input visible when some are unfinished", async () => {
    const entries = getDataEntryWithStatusList({
      ...getElectionStatusMockData([
        { status: "first_entry_in_progress", first_entry_user_id: user.user_id },
        { status: "first_entry_in_progress", first_entry_user_id: user.user_id },
      ]),
      user,
    });

    render(<UnfinishedEntriesList electionId={1} dataEntries={entries} />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("strong")).toHaveTextContent("Je hebt nog een openstaande invoer");
    const dataEntries = await within(alert).findAllByRole("link");
    expect(dataEntries.map((ps) => ps.textContent)).toEqual(["33 - Op Rolletjes", "34 - Testplek"]);
  });

  test("Resume input invisible when none are unfinished", () => {
    render(<UnfinishedEntriesList electionId={1} dataEntries={[]} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
