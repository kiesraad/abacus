import { beforeEach, describe, expect, test } from "vitest";

import { ElectionHomePage } from "app/module/election";

import { ElectionProvider, ElectionStatusProvider } from "@kiesraad/api";
import { ElectionRequestHandler } from "@kiesraad/api-mocks";
import { overrideOnce, render, screen, server } from "@kiesraad/test";

describe("ElectionHomePage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
  });

  test("Shows button", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });

    render(
      <ElectionProvider electionId={1}>
        <ElectionStatusProvider electionId={1}>
          <ElectionHomePage />
        </ElectionStatusProvider>
      </ElectionProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Gemeenteraadsverkiezingen 2026" }));
    const list = await screen.findByTestId("election-pages");
    expect(list).toBeVisible();
    expect(list.childElementCount).toBe(2);
    expect(list.children[0]).toHaveTextContent("Coördinator:");
    expect(list.children[0]?.children[0]?.childElementCount).toBe(3);
    expect(list.children[0]?.children[0]?.children[0]).toHaveTextContent("Stembureaus");
    expect(list.children[0]?.children[0]?.children[1]).toHaveTextContent("Statusoverzicht");
    expect(list.children[0]?.children[0]?.children[2]).toHaveTextContent("Zetelverdeling");
    expect(list.children[1]).toHaveTextContent("Invoerder:");
    expect(list.children[1]?.children[0]?.childElementCount).toBe(1);
    expect(list.children[1]?.children[0]?.children[0]).toHaveTextContent("Invoeren");
  });
});
