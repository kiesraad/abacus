import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { TestUserProvider } from "@/testing/TestUserProvider";
import { render, screen, waitFor } from "@/testing/test-utils";
import { AuthorizationDialog } from "./AuthorizationDialog";
import { EXPIRATION_DIALOG_SECONDS } from "./authorizationConstants";

function TestAuthorizationDialog({ sessionValidFor }: { sessionValidFor: number | null }) {
  const [hideDialog, setHideDialog] = useState(false);

  return (
    <AuthorizationDialog sessionValidFor={sessionValidFor} hideDialog={hideDialog} setHideDialog={setHideDialog} />
  );
}

describe("AuthorizationDialog", () => {
  test("Does not show dialog when session is still valid", () => {
    render(
      <TestUserProvider userRole="typist_gsb">
        <TestAuthorizationDialog sessionValidFor={EXPIRATION_DIALOG_SECONDS + 1} />
      </TestUserProvider>,
    );
    expect(screen.queryByTestId("modal-title")).toBeNull();
  });

  test("Show dialog on short session lifetime", () => {
    render(
      <TestUserProvider userRole="typist_gsb">
        <TestAuthorizationDialog sessionValidFor={60} />
      </TestUserProvider>,
    );

    expect(screen.queryByTestId("modal-title")).toHaveTextContent("Je wordt bijna uitgelogd");
  });

  test("Does not show dialog when the user is not logged in", () => {
    render(
      <TestUserProvider userRole={null}>
        <TestAuthorizationDialog sessionValidFor={60} />
      </TestUserProvider>,
    );

    expect(screen.queryByTestId("modal-title")).not.toBeInTheDocument();
  });

  test("Dialog can be closed", async () => {
    render(
      <TestUserProvider userRole="typist_gsb">
        <TestAuthorizationDialog sessionValidFor={60} />
      </TestUserProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Venster sluiten" }));

    await waitFor(() => {
      expect(screen.queryByTestId("modal-title")).toBeNull();
    });
  });

  test("Dialog can be dismissed", async () => {
    render(
      <TestUserProvider userRole="typist_gsb">
        <TestAuthorizationDialog sessionValidFor={60} />
      </TestUserProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Blijf ingelogd" }));

    await waitFor(() => {
      expect(screen.queryByTestId("modal-title")).toBeNull();
    });
  });
});
