import { userEvent } from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import { getCertificateMockData, getSubCommitteeMockData } from "@/testing/api-mocks/SubCommitteeMockData";
import { renderReturningRouter, screen, within } from "@/testing/test-utils";

import { SubCommitteeKeysOverview } from "./SubCommitteeKeysOverview";

describe("SubCommitteeKeysOverview", () => {
  test("Imported row navigates to the sub committee detail page, pending row does not", async () => {
    const user = userEvent.setup();

    const router = renderReturningRouter(
      <MessagesProvider>
        <SubCommitteeKeysOverview
          subCommittees={[
            getSubCommitteeMockData({ id: 1, authority_id: "0358", authority_name: "Aalsmeer" }),
            getSubCommitteeMockData({
              id: 7,
              authority_id: "1942",
              authority_name: "Gooise Meren",
              certificates: [
                getCertificateMockData(),
                getCertificateMockData(),
                getCertificateMockData(),
                getCertificateMockData(),
              ],
            }),
          ]}
          electionId={1}
          onSuccess={vi.fn()}
        />
      </MessagesProvider>,
    );

    const [pendingTable, importedTable] = await screen.findAllByRole("table");

    await user.click(within(pendingTable!).getByRole("row", { name: "0358 Aalsmeer" }));
    expect(router.state.location.pathname).toEqual("/");

    await user.click(within(importedTable!).getByRole("row", { name: "1942 Gooise Meren 4" }));
    expect(router.state.location.pathname).toEqual("/7");
  });
});
