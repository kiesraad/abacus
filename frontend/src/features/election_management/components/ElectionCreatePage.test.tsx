import { beforeEach, describe, expect, test } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { ElectionStatusProvider } from "@/api/election/ElectionStatusProvider";
import { TestUserProvider } from "@/api/TestUserProvider";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { ElectionCreatePage } from "./ElectionCreatePage";

describe("ElectionCreatePage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
  });

  test("Shows button", async () => {
    overrideOnce("get", "/api/elections/1/status", 200, {
      statuses: [],
    });

    render(
      <TestUserProvider userRole="administrator">
        <ElectionProvider electionId={1}>
          <ElectionCreatePage />
        </ElectionProvider>
      </TestUserProvider>,
    );

    // Wait for the page to be loaded
    expect(await screen.findByRole("heading", { level: 1, name: "Verkiezing toevoegen" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Importeer verkiezingsdefinitie" }));
    expect(await screen.findByLabelText("Bestand kiezen"));
    expect(await screen.findByLabelText("Geen bestand gekozen"));
  });
});
