import { waitFor } from "@testing-library/react";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { committeeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { render, screen, within } from "@/testing/test-utils";
import type { CommitteeSessionStatus, Role } from "@/types/generated/openapi";

import { ElectionInformationTable } from "./ElectionInformationTable";

const navigate = vi.fn();

const renderTable = (
  userRole: Role,
  electionNumberOfVoters: number,
  committeeSessionNumber: number,
  committeeSessionStatus: CommitteeSessionStatus,
) => {
  render(
    <TestUserProvider userRole={userRole}>
      <ElectionInformationTable
        election={{
          id: 1,
          name: "Gemeenteraadsverkiezingen 2026",
          counting_method: "DSO",
          election_id: "Heemdamseburg_2024",
          location: "Heemdamseburg",
          domain_id: "0035",
          category: "Municipal",
          number_of_seats: 29,
          number_of_voters: electionNumberOfVoters,
          election_date: "2024-11-30",
          nomination_date: "2024-11-01",
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
        }}
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

describe("ElectionInformationTable", () => {
  beforeEach(() => {
    vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);
  });

  test("renders a table with the election information for first committee session status created for coordinator", async () => {
    // Number of voters can technically not be lower than 1
    renderTable("coordinator", 0, 1, "created");

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "0"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
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

  test("renders a table with the election information for first committee session status not_started for coordinator", async () => {
    renderTable("coordinator", 1234, 1, "data_entry_not_started");

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "1.234"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
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

  test("renders a table with the election information for first committee session status in_progress for coordinator", async () => {
    renderTable("coordinator", 1234, 1, "data_entry_in_progress");

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "1.234"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
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
    renderTable("coordinator", 1234, 2, "created");

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "1.234"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
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

  test("renders a table with the election information for administrator", async () => {
    renderTable("administrator", 1234, 1, "created");

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "1.234"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
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
});
