import {
  createMemoryRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from "react-router-dom";

import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { userTypeInputs } from "app/test/unit";

import { ApiProvider } from "@kiesraad/api";

import { InputHomePage, InputLayout } from "../";
import { ElectionLayout } from "../../ElectionLayout";
import { NotFound } from "../../NotFound";
import { RootLayout } from "../../RootLayout";
import {
  CandidatesVotesPage,
  DifferencesPage,
  PollingStationHomePage,
  PollingStationLayout,
  RecountedPage,
  VotersAndVotesPage,
} from "./";

export const routes = createRoutesFromElements(
  <Route element={<RootLayout />}>
    <Route path="/" element={<div>Home</div>} />
    <Route path=":electionId" element={<ElectionLayout />} errorElement={<NotFound />}>
      <Route path="input" element={<InputLayout />}>
        <Route index element={<InputHomePage />} />
        <Route path=":pollingStationId" element={<PollingStationLayout />}>
          <Route index element={<PollingStationHomePage />} />
          <Route path="recounted" element={<RecountedPage />} />
          <Route path="numbers" element={<VotersAndVotesPage />} />
          <Route path="differences" element={<DifferencesPage />} />
          <Route path="list/:listNumber" element={<CandidatesVotesPage />} />
          <Route path="save" element={<div>Placeholder Check and Save Page</div>} />
        </Route>
      </Route>
    </Route>
  </Route>,
);

const router = createMemoryRouter(routes, {
  future: {
    v7_normalizeFormMethod: true,
  },
});

const Component = (
  <ApiProvider host={process.env.API_HOST || ""}>
    <RouterProvider router={router} />
  </ApiProvider>
);

describe("PollingStation integration tests", () => {
  test("It renders", async () => {
    render(Component);

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
