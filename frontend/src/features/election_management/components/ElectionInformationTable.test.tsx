import { waitFor } from "@testing-library/react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { committeeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import {
  getCSBElectionMockData,
  getElectionMockData,
  provincialElectionPS2MockData,
} from "@/testing/api-mocks/ElectionMockData";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { render, screen, within } from "@/testing/test-utils";
import type { CommitteeSessionStatus, ElectionWithPoliticalGroups, Role } from "@/types/generated/openapi";
import { ElectionInformationTable } from "./ElectionInformationTable";

const navigate = vi.fn();

function getElection(electionNumberOfVoters: number): ElectionWithPoliticalGroups {
  return getElectionMockData({
    counting_method: "DSO",
    number_of_voters: electionNumberOfVoters,
    political_groups: [
      {
        number: 1,
        name: "Wijzen van Water en Wind",
        candidates: [
          {
            number: 1,
            initials: "A.",
            first_name: "Alice",
            last_name: "Foo",
            locality: "Amsterdam",
            gender: "Female",
          },
        ],
      },
    ],
  }).election;
}

const renderGSBTable = (
  userRole: Role,
  election: ElectionWithPoliticalGroups,
  committeeSessionNumber: number,
  committeeSessionStatus: CommitteeSessionStatus,
  publicKeyRegistered?: boolean,
) => {
  render(
    <TestUserProvider userRole={userRole}>
      <ElectionInformationTable
        role={userRole}
        publicKeyRegistered={publicKeyRegistered}
        election={election}
        committeeSession={{
          ...committeeSessionMockData,
          number: committeeSessionNumber,
          status: committeeSessionStatus,
        }}
        numberOfPollingStations={1}
      />
    </TestUserProvider>,
  );
};

const renderCSBTable = (userRole: Role) => {
  render(
    <TestUserProvider userRole={userRole}>
      <ElectionInformationTable
        election={getCSBElectionMockData().election}
        committeeSession={getCSBElectionMockData().current_committee_session}
        numberOfPollingStations={1}
      />
    </TestUserProvider>,
  );
};

describe("ElectionInformationTable", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  describe("GSB", () => {
    test("renders a table with the election information for first committee session status created for coordinator", async () => {
      // Number of voters can technically not be lower than 1
      renderGSBTable("coordinator_gsb", getElection(0), 1, "created");

      const election_information_table = await screen.findByTestId("election-information-table");
      expect(election_information_table).toBeVisible();
      expect(election_information_table).toHaveTableContent([
        ["Verkiezing", "Gemeenteraad Heemdamseburg 2026, 30 november"],
        ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
        ["Kiesgebied", "0035 - Heemdamseburg"],
        ["Aantal kiesgerechtigden", "0"],
        ["Type stembureau", "Gemeentelijk stembureau"],
        ["Stembureaus", "1 stembureau"],
        ["Type stemopneming", "Decentrale stemopneming"],
      ]);

      const tableRows = within(election_information_table).getAllByRole("row");
      expect(tableRows[3]!.textContent).toEqual("Aantal kiesgerechtigden0");
      tableRows[3]!.click();
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("number-of-voters");
      });
    });

    test("renders a table with the election information for first committee session status in_preparation for coordinator", async () => {
      renderGSBTable("coordinator_gsb", getElection(1234), 1, "in_preparation");

      const election_information_table = await screen.findByTestId("election-information-table");
      expect(election_information_table).toBeVisible();
      expect(election_information_table).toHaveTableContent([
        ["Verkiezing", "Gemeenteraad Heemdamseburg 2026, 30 november"],
        ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
        ["Kiesgebied", "0035 - Heemdamseburg"],
        ["Aantal kiesgerechtigden", "1.234"],
        ["Type stembureau", "Gemeentelijk stembureau"],
        ["Stembureaus", "1 stembureau"],
        ["Type stemopneming", "Decentrale stemopneming"],
      ]);

      const tableRows = within(election_information_table).getAllByRole("row");
      expect(tableRows[3]!.textContent).toEqual("Aantal kiesgerechtigden1.234");
      tableRows[3]!.click();
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("number-of-voters");
      });
    });

    test("renders a table with the election information for first committee session status data_entry for coordinator", async () => {
      renderGSBTable("coordinator_gsb", getElection(1234), 1, "data_entry");

      const election_information_table = await screen.findByTestId("election-information-table");
      expect(election_information_table).toBeVisible();
      expect(election_information_table).toHaveTableContent([
        ["Verkiezing", "Gemeenteraad Heemdamseburg 2026, 30 november"],
        ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
        ["Kiesgebied", "0035 - Heemdamseburg"],
        ["Aantal kiesgerechtigden", "1.234"],
        ["Type stembureau", "Gemeentelijk stembureau"],
        ["Stembureaus", "1 stembureau"],
        ["Type stemopneming", "Decentrale stemopneming"],
      ]);

      const tableRows = within(election_information_table).getAllByRole("row");
      expect(tableRows[3]!.textContent).toEqual("Aantal kiesgerechtigden1.234");
      tableRows[3]!.click();
      await waitFor(() => {
        expect(navigate).not.toHaveBeenCalled();
      });
    });

    test("renders a table with the election information for second committee session status created for coordinator", async () => {
      renderGSBTable("coordinator_gsb", getElection(1234), 2, "created");

      const election_information_table = await screen.findByTestId("election-information-table");
      expect(election_information_table).toBeVisible();
      expect(election_information_table).toHaveTableContent([
        ["Verkiezing", "Gemeenteraad Heemdamseburg 2026, 30 november"],
        ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
        ["Kiesgebied", "0035 - Heemdamseburg"],
        ["Aantal kiesgerechtigden", "1.234"],
        ["Type stembureau", "Gemeentelijk stembureau"],
        ["Stembureaus", "1 stembureau"],
        ["Type stemopneming", "Decentrale stemopneming"],
      ]);

      const tableRows = within(election_information_table).getAllByRole("row");
      expect(tableRows[3]!.textContent).toEqual("Aantal kiesgerechtigden1.234");
      tableRows[3]!.click();
      await waitFor(() => {
        expect(navigate).not.toHaveBeenCalled();
      });
    });

    test("renders a table with the election information for administrator with registered public key", async () => {
      renderGSBTable("administrator", getElection(1234), 1, "created", true);

      const election_information_table = await screen.findByTestId("election-information-table");
      expect(election_information_table).toBeVisible();
      expect(election_information_table).toHaveTableContent([
        ["Verkiezing", "Gemeenteraad Heemdamseburg 2026, 30 november"],
        ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
        ["Kiesgebied", "0035 - Heemdamseburg"],
        ["Aantal kiesgerechtigden", "1.234"],
        ["Type stembureau", "Gemeentelijk stembureau"],
        ["Publieke sleutel", "Bekijken en downloaden"],
        ["Stembureaus", "1 stembureau"],
        ["Type stemopneming", "Decentrale stemopneming"],
      ]);

      const tableRows = within(election_information_table).getAllByRole("row");
      expect(tableRows[3]!.textContent).toEqual("Aantal kiesgerechtigden1.234");
      tableRows[3]!.click();
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("number-of-voters");
      });

      expect(tableRows[5]!.textContent).toEqual("Publieke sleutelBekijken en downloaden");
      tableRows[5]!.click();
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("certificate");
      });
    });

    test("renders a table with the election information for administrator with unregistered public key", async () => {
      renderGSBTable("administrator", getElection(1234), 1, "created", false);

      const election_information_table = await screen.findByTestId("election-information-table");
      expect(election_information_table).toBeVisible();
      expect(election_information_table).toHaveTableContent([
        ["Verkiezing", "Gemeenteraad Heemdamseburg 2026, 30 november"],
        ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
        ["Kiesgebied", "0035 - Heemdamseburg"],
        ["Aantal kiesgerechtigden", "1.234"],
        ["Type stembureau", "Gemeentelijk stembureau"],
        ["Publieke sleutel", "Nog niet geregistreerd"],
        ["Stembureaus", "1 stembureau"],
        ["Type stemopneming", "Decentrale stemopneming"],
      ]);

      const tableRows = within(election_information_table).getAllByRole("row");
      expect(tableRows[5]!.textContent).toEqual("Publieke sleutelNog niet geregistreerd");
      tableRows[5]!.click();
      await waitFor(() => {
        expect(navigate).toHaveBeenCalledWith("certificate");
      });
    });

    test("does not render public key row for coordinator", async () => {
      renderGSBTable("coordinator_gsb", getElection(1234), 1, "created");

      const election_information_table = await screen.findByTestId("election-information-table");
      expect(within(election_information_table).queryByText("Publieke sleutel")).not.toBeInTheDocument();
    });

    test("renders a table with the election information including district when district exists", async () => {
      renderGSBTable("coordinator_gsb", provincialElectionPS2MockData, 1, "created", true);

      const election_information_table = await screen.findByTestId("election-information-table");
      expect(election_information_table).toBeVisible();
      expect(election_information_table).toHaveTableContent([
        ["Verkiezing", "Provinciale Staten Oost-Holland 2027, 30 november"],
        ["Kieskring", "II - Juinen"],
        ["Lijsten en kandidaten", "2 lijsten en 31 kandidaten"],
        ["Kiesgebied", "0036 - Juinen"],
        ["Aantal kiesgerechtigden", "2.000"],
        ["Type stembureau", "Gemeentelijk stembureau"],
        ["Stembureaus", "1 stembureau"],
        ["Type stemopneming", "Centrale stemopneming"],
      ]);
    });
  });

  describe("CSB", () => {
    test("renders a table with the election information for first committee session status created for coordinator", async () => {
      renderCSBTable("coordinator_csb");

      const election_information_table = await screen.findByTestId("election-information-table");
      expect(election_information_table).toBeVisible();
      expect(election_information_table).toHaveTableContent([
        ["Verkiezing", "Gemeenteraad Heemdamseburg 2026, 30 november"],
        ["Lijsten en kandidaten", "2 lijsten en 31 kandidaten"],
        ["Kiesgebied", "CSB - Heemdamseburg"],
        ["Type stembureau", "Centraal stembureau"],
      ]);
    });
  });
});
