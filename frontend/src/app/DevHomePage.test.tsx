import { beforeEach, describe, expect, test } from "vitest";

import { TestUserProvider } from "@/api";
import { render, screen, server } from "@/testing";
import { ElectionListRequestHandler } from "@/testing/api-mocks/RequestHandlers";

import { DevHomePage } from "./DevHomePage";

describe("DevHomePage", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler);
  });

  test("renders DevHomePage with election links", async () => {
    render(
      <TestUserProvider userRole="typist">
        <DevHomePage />
      </TestUserProvider>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Abacus 🧮" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Gemeenteraadsverkiezingen 2026" })[0]).toBeVisible();
  });
});
