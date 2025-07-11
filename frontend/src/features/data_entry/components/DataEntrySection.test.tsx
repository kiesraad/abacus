import { useParams } from "react-router";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { useUser } from "@/hooks/user/useUser";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import {
  PollingStationDataEntryClaimHandler,
  PollingStationDataEntrySaveHandler,
} from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { getDataEntryStructure } from "@/utils/dataEntryStructure";

import { getTypistUser } from "../testing/mock-data";
import { DataEntryProvider } from "./DataEntryProvider";
import { DataEntrySection } from "./DataEntrySection";

vi.mock("@/hooks/user/useUser");
vi.mock("react-router");

function renderComponent(sectionId: string) {
  vi.mocked(useParams).mockReturnValue({ sectionId });

  return render(
    <DataEntryProvider election={electionMockData} pollingStationId={1} entryNumber={1}>
      <DataEntrySection />
    </DataEntryProvider>,
  );
}

describe("DataEntrySection", () => {
  beforeEach(() => {
    vi.mocked(useUser).mockReturnValue(getTypistUser());
    server.use(PollingStationDataEntryClaimHandler, PollingStationDataEntrySaveHandler);
  });

  describe("Section Badge Display", () => {
    test("displays badge for voters_votes_counts section", async () => {
      renderComponent("voters_votes_counts");

      const title = await screen.findByText("Toegelaten kiezers en uitgebrachte stemmen");
      expect(title).toBeInTheDocument();

      const badge = screen.getByText("B1-3.1 en 3.2");
      expect(badge).toBeInTheDocument();
    });

    test("displays badge for differences_counts section", async () => {
      renderComponent("differences_counts");

      const title = await screen.findByText("Verschillen tussen toegelaten kiezers en uitgebrachte stemmen");
      expect(title).toBeInTheDocument();

      const badge = screen.getByText("B1-3.3");
      expect(badge).toBeInTheDocument();
    });

    test.each([
      {
        sectionId: "recounted",
        expectedTitle: "Is het selectievakje op de eerste pagina aangevinkt?",
      },
      {
        sectionId: "political_group_votes_1",
        expectedTitle: "Lijst 1 - Vurige Vleugels Partij",
      },
    ])("does not display badge for $sectionId", async ({ sectionId, expectedTitle }) => {
      renderComponent(sectionId);

      const title = await screen.findByText(expectedTitle);
      expect(title).toBeInTheDocument();

      const dataEntryStructure = getDataEntryStructure(electionMockData);
      const section = dataEntryStructure.find((s) => s.id === sectionId);
      expect(section?.sectionNumber).toBeUndefined();

      expect(screen.queryByText(/B1-.*/)).not.toBeInTheDocument();
    });
  });
});
