import { beforeEach, describe, expect, test } from "vitest";

import { render, screen } from "@/testing/test-utils";

describe("Custom matchers", () => {
  describe("toHaveTableContent", () => {
    beforeEach(() => {
      render(
        <>
          <h1>Heading</h1>
          <table>
            <thead>
              <tr>
                <th>Column One</th>
                <th>Column Two</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  Cell One <img alt="A fancy badge" />
                </td>
                <td>
                  <span>Cell Two</span>
                </td>
              </tr>
              <tr>
                <td colSpan={2}>Big Cell</td>
              </tr>
              <tr>
                <td>
                  Text<span>badge</span>
                </td>
                <td>
                  <div>
                    <span>{52}</span>
                    <span>
                      {4}/{23}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </>,
      );
    });

    test("Expect to have table content", async () => {
      const table = await screen.findByRole("table");
      expect(table).toHaveTableContent([
        ["Column One", "Column Two"],
        ["Cell One", "Cell Two"],
        ["Big Cell"],
        ["Text badge", "52 4/23"],
      ]);
    });

    test("Expect to have table content to fail", async () => {
      const table = await screen.findByRole("table");
      expect(() => {
        expect(table).toHaveTableContent([
          ["Column One", "Column Two"],
          ["Cell One", "Cell Two"],
        ]);
      }).toThrowError(/Expected table to have content/);
    });

    test("Expect not to have table content to fail", async () => {
      const table = await screen.findByRole("table");
      expect(() => {
        expect(table).not.toHaveTableContent([
          ["Column One", "Column Two"],
          ["Cell One", "Cell Two"],
          ["Big Cell"],
          ["Text badge", "52 4/23"],
        ]);
      }).toThrowError(/Expected table not to have content/);
    });

    test("Expect to fail for non-table elements", async () => {
      const heading = await screen.findByRole("heading");
      expect(() => {
        expect(heading).toHaveTableContent([["Content"]]);
      }).toThrowError(/Expected an HTMLTableElement/);
    });
  });
});
