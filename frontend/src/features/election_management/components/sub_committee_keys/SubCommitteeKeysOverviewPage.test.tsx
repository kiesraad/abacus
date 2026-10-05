import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import {
  CSBElectionRequestHandler,
  CSBSubCommitteeCertificatesRequestHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { SubCommitteeKeysOverviewPage } from "./SubCommitteeKeysOverviewPage";

describe("SubCommitteeKeysOverviewPage", () => {
  beforeEach(() => {
    server.use(CSBElectionRequestHandler, CSBSubCommitteeCertificatesRequestHandler);
  });

  test("Shows the pending and imported keys of the sub committees", async () => {
    render(
      <MessagesProvider>
        <ElectionProvider electionId={2}>
          <SubCommitteeKeysOverviewPage />
        </ElectionProvider>
      </MessagesProvider>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Sleutels van GSB's beheren" })).toBeVisible();

    const [pendingTable, importedTable] = screen.getAllByRole("table");
    expect(pendingTable).toHaveTableContent([
      ["Nummer", "Gemeentelijk stembureau"],
      ["0358", "Aalsmeer"],
      ["0362", "Amstelveen"],
      ["0375", "Beverwijk"],
      ["0376", "Blaricum"],
    ]);
    expect(importedTable).toHaveTableContent([
      ["Nummer", "Gemeentelijk stembureau", "Sleutels"],
      ["0377", "Bloemendaal", "1"],
      ["0384", "Diemen", "2"],
      ["1942", "Gooise Meren", "4"],
      ["0392", "Haarlem", "1"],
    ]);
  });
});
