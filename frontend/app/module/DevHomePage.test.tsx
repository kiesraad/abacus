import { beforeEach, describe, expect, test } from "vitest";

import { ElectionListRequestHandler } from "@kiesraad/api-mocks";
import { render, screen, server } from "@kiesraad/test";

import { DevHomePage } from "./DevHomePage";

describe("DevHomePage", () => {
  beforeEach(() => {
    server.use(ElectionListRequestHandler);
  });

  test("renders DevHomePage with election links", async () => {
    render(<DevHomePage />);

    expect(await screen.findByRole("heading", { level: 1, name: "Abacus 🧮" })).toBeVisible();
    expect(screen.getAllByRole("link", { name: "Gemeenteraadsverkiezingen 2026" })[0]).toBeVisible();
  });
});
