import { describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";
import { TestUserProvider } from "@/testing/TestUserProvider.tsx";
import { Role } from "@/types/generated/openapi.ts";

import { ElectionInformationTable } from "./ElectionInformationTable";

const renderTable = (userRole: Role) => {
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
        numberOfPollingStations={1}
        numberOfVoters={0}
      />
    </TestUserProvider>,
  );
};

describe("ElectionInformationTable", () => {
  test("renders a table with the election information for coordinator", async () => {
    renderTable("coordinator");

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "Nog invullen"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "1 stembureau"],
      ["Type stemopneming", "Decentrale stemopneming"],
    ]);
  });

  test("renders a table with the election information for administrator", async () => {
    renderTable("administrator");

    const election_information_table = await screen.findByTestId("election-information-table");
    expect(election_information_table).toBeVisible();
    expect(election_information_table).toHaveTableContent([
      ["Verkiezing", "Gemeenteraadsverkiezingen 2026, 30 november"],
      ["Kiesgebied", "0035 - Gemeente Heemdamseburg"],
      ["Lijsten en kandidaten", "1 lijst en 1 kandidaat"],
      ["Aantal kiesgerechtigden", "Nog in te vullen door een coördinator"],
      ["Invoer doen voor", "Gemeentelijk stembureau"],
      ["Stembureaus", "1 stembureau"],
      ["Type stemopneming", "Decentrale stemopneming"],
    ]);
  });
});
