import * as ReactRouter from "react-router";

import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { committeeSessionMockData } from "@/testing/api-mocks/CommitteeSessionMockData";
import { render, screen, within } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { CommitteeSession, Role } from "@/types/generated/openapi";

import { ElectionInformationTable } from "./ElectionInformationTable";

const navigate = vi.fn();

const renderTable = (userRole: Role, committeeSession: CommitteeSession) => {
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
        committeeSession={committeeSession}
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
    renderTable("coordinator", { ...committeeSessionMockData, number_of_voters: 0, status: "created" });

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
    renderTable("coordinator", { ...committeeSessionMockData, status: "data_entry_not_started" });

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "2.000"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "1 stembureau"],
      ["Type stemopneming", "Decentrale stemopneming"],
    ]);

    const tableRows = within(election_information_table).getAllByRole("row");
    expect(tableRows[3]!.textContent).toEqual("Aantal kiesgerechtigden2.000");
    tableRows[3]!.click();
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("number-of-voters");
    });
  });

  test("renders a table with the election information for first committee session status in_progress for coordinator", async () => {
    renderTable("coordinator", committeeSessionMockData);

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "2.000"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "1 stembureau"],
      ["Type stemopneming", "Decentrale stemopneming"],
    ]);

    const tableRows = within(election_information_table).getAllByRole("row");
    expect(tableRows[3]!.textContent).toEqual("Aantal kiesgerechtigden2.000");
    tableRows[3]!.click();
    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  test("renders a table with the election information for second committee session status created for coordinator", async () => {
    renderTable("coordinator", { ...committeeSessionMockData, number: 2, status: "created" });

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "2.000"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "1 stembureau"],
      ["Type stemopneming", "Decentrale stemopneming"],
    ]);

    const tableRows = within(election_information_table).getAllByRole("row");
    expect(tableRows[3]!.textContent).toEqual("Aantal kiesgerechtigden2.000");
    tableRows[3]!.click();
    await waitFor(() => {
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  test("renders a table with the election information for administrator", async () => {
    renderTable("administrator", { ...committeeSessionMockData, status: "created" });

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "2.000"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "1 stembureau"],
      ["Type stemopneming", "Decentrale stemopneming"],
    ]);

    const tableRows = within(election_information_table).getAllByRole("row");
    expect(tableRows[3]!.textContent).toEqual("Aantal kiesgerechtigden2.000");
    tableRows[3]!.click();
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("number-of-voters");
    });
  });
});
