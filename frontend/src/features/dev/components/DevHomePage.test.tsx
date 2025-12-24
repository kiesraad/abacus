import { beforeEach, describe, expect, test } from "vitest";

import { ElectionListRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { server } from "@/testing/server";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { render, screen } from "@/testing/test-utils";

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
