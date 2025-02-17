import { render } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";

import { WhoAmIRequestHandler } from "@kiesraad/api-mocks";
import { Providers, screen, server, waitFor } from "@kiesraad/test";

import { ChangePasswordPage } from "./ChangePasswordPage";

describe("ChangePasswordPage", () => {
  beforeEach(() => {
    server.use(WhoAmIRequestHandler);
  });

  test("The change-password page should state the currently logged-in user", async () => {
    render(
      <Providers fetchInitialUser={true}>
        <ChangePasswordPage />
      </Providers>,
    );

    await waitFor(() => {
      expect(screen.getByText("Gebruikersnaam: admin")).toBeVisible();
    });
  });
});
