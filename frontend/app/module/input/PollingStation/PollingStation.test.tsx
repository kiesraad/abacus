import { createMemoryRouter } from "react-router-dom";

import { render as rtlRender } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { routes } from "app/routes.tsx";
import { Providers, screen, userTypeInputs, waitFor } from "app/test/unit";

import { electionMockData } from "@kiesraad/api-mocks";

const router = createMemoryRouter(routes, {
  future: {
    v7_normalizeFormMethod: true,
  },
});

const render = () => rtlRender(<Providers router={router} />);

describe("Polling Station data entry integration tests", () => {
  test("Can navigate through form", async () => {
    render();

    const user = userEvent.setup();
    await router.navigate("/1/input/1");
    expect(router.state.location.pathname).toEqual("/1/input/1");

    // this automatically redirects to /1/input/1/recounted
    // → Recounted form ("Is er herteld?")
    await waitFor(() => {
      expect(router.state.location.pathname).toEqual("/1/input/1/recounted");
    });

    expect(screen.getByTestId("recounted_form")).toBeInTheDocument();
    screen.getByTestId("no").click();
    expect(screen.getByTestId("no")).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Volgende" }));

    // → Voters and votes form ("Aantal kiezers en stemmen" / "Toegelaten kiezers en uitgebrachte stemmen")
    await waitFor(() => {
      expect(screen.getByTestId("voters_and_votes_form")).toBeInTheDocument();
    });

    const total_votes = electionMockData.political_groups.length * 10;
    await userTypeInputs(user, {
      poll_card_count: total_votes,
      proxy_certificate_count: 0,
      voter_card_count: 0,
      total_admitted_voters_count: total_votes,
      votes_candidates_counts: total_votes,
      blank_votes_count: 0,
      invalid_votes_count: 0,
      total_votes_cast_count: total_votes,
    });

    await user.click(screen.getByRole("button", { name: "Volgende" }));

    // → Differences form ("Verschillen" / "Verschil tussen aantal kiezers en getelde stemmen")
    await waitFor(() => {
      expect(screen.getByTestId("differences_form")).toBeInTheDocument();
    });

    await userTypeInputs(user, {
      more_ballots_count: 0,
      fewer_ballots_count: 0,
      unreturned_ballots_count: 0,
      too_few_ballots_handed_out_count: 0,
      too_many_ballots_handed_out_count: 0,
      other_explanation_count: 0,
      no_explanation_count: 0,
    });

    await user.click(screen.getByRole("button", { name: "Volgende" }));

    // → Political group candidates votes form (stemmen op kandidaten per politieke groepering)
    for (const pg of electionMockData.political_groups) {
      await waitFor(() => {
        expect(screen.getByTestId(`candidates_form_${pg.number}`)).toBeInTheDocument();
      });

      await userTypeInputs(user, {
        "candidate_votes[0].votes": 5,
        "candidate_votes[1].votes": 5,
        total: 10,
      });

      await user.click(screen.getByRole("button", { name: "Volgende" }));
    }

    // → Check and Save Page ("Controleren en opslaan")
    // FIXME: the last political group page doesn't navigate to the Check and Save page
    // await waitFor(() => {
    //   expect(router.state.location.pathname).toEqual("/1/input/1/save");
    // });
  });
});
