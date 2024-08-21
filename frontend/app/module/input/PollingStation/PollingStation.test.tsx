import { createMemoryRouter } from "react-router-dom";

import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { routes } from "app/routes.tsx";
import { Providers, screen, userTypeInputs, waitFor } from "app/test/unit";

const router = createMemoryRouter(routes, {
  future: {
    v7_normalizeFormMethod: true,
  },
});

const render = () => rtlRender(<Providers router={router} />);

describe("Polling Station data entry integration tests", () => {
  test("It renders", async () => {
    render();

    const user = userEvent.setup();
    await router.navigate("/1/input/1");

    expect(router.state.location.pathname).toEqual("/1/input/1");
    await waitFor(() => {
      expect(screen.getByTestId("begin")).toHaveTextContent("Klik");
    });

    screen.getByTestId("begin-button").click();

    await waitFor(() => {
      expect(screen.getByTestId("recounted_form")).toBeInTheDocument();
    });

    screen.getByTestId("no").click();
    expect(screen.getByTestId("no")).toBeChecked();

    const submitButton = screen.getByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("voters_and_votes_form")).toBeInTheDocument();
    });

    await userTypeInputs(user, {
      poll_card_count: 1,
      proxy_certificate_count: 2,
      voter_card_count: 3,
      total_admitted_voters_count: 6,
      votes_candidates_counts: 4,
      blank_votes_count: 5,
      invalid_votes_count: 6,
      total_votes_cast_count: 15,
    });
  });
});
