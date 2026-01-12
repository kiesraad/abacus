import { userEvent } from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import * as useUser from "@/hooks/user/useUser";
import { electionDetailsMockResponse, getElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { statusResponseMock } from "@/testing/api-mocks/ElectionStatusMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, renderReturningRouter, screen, waitFor, within } from "@/testing/test-utils";
import type { ElectionStatusResponse, LoginResponse } from "@/types/generated/openapi";

import { PollingStationChoiceForm } from "./PollingStationChoiceForm";

async function renderPollingStationChoiceForm() {
  const router = renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <PollingStationChoiceForm />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );

  expect(await screen.findByRole("group", { name: "Welk stembureau ga je invoeren?" })).toBeVisible();

  return router;
}

const testUser: LoginResponse = {
  username: "test-user-1",
  user_id: 1,
  role: "typist",
  needs_password_change: false,
};

describe("Test PollingStationChoiceForm", () => {
  beforeEach(() => {
    // mock a current logged in user
    vi.spyOn(useUser, "useUser").mockReturnValue(testUser);
    server.use(ElectionStatusRequestHandler);
  });

  describe("Polling station choice form", () => {
    test("Form field entry", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();

      await renderPollingStationChoiceForm();

      expect(await screen.findByRole("group", { name: "Welk stembureau ga je invoeren?" })).toBeVisible();
      const pollingStation = screen.getByTestId("pollingStation");

      // Test if the feedback field shows an error
      await user.type(pollingStation, "abc");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText("Geen stembureau gevonden met nummer abc")).toBeVisible();

      await user.clear(pollingStation);

      // Test if maxLength on field works
      await user.type(pollingStation, "1234567");
      expect(pollingStation).toHaveValue("123456");

      await user.clear(pollingStation);
    });

    test("Selecting a valid polling station", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      render(
        <ElectionProvider electionId={1}>
          <ElectionStatusProvider electionId={1}>
            <PollingStationChoiceForm anotherEntry />
          </ElectionStatusProvider>
        </ElectionProvider>,
      );

      expect(await screen.findByRole("group", { name: "Verder met een volgend stembureau?" })).toBeVisible();
      const pollingStation = screen.getByTestId("pollingStation");

      // Test if the polling station name is shown
      await user.type(pollingStation, "33");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText("Op Rolletjes")).toBeVisible();
    });

    test("Selecting a valid polling station with leading zeros", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      await renderPollingStationChoiceForm();

      const pollingStation = await screen.findByTestId("pollingStation");

      // Test if the polling station name is shown
      await user.type(pollingStation, "0034");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText(/Testplek/)).toBeVisible();
    });

    test.each([
      {
        testDescription: "invalid",
        pollingStationInput: "abc",
        selectorFeedback: "Geen stembureau gevonden met nummer abc",
        submitFeedback: "Voer een geldig nummer van een stembureau in om te beginnen",
      },
      {
        testDescription: "non-existing",
        pollingStationInput: "987654",
        selectorFeedback: "Geen stembureau gevonden met nummer 987654",
        submitFeedback: "Voer een geldig nummer van een stembureau in om te beginnen",
      },
      {
        testDescription: "definitive",
        pollingStationInput: "34",
        selectorFeedback: "Stembureau 34 (Testplek) is al twee keer ingevoerd",
        submitFeedback: "Het stembureau dat je geselecteerd hebt kan niet meer ingevoerd worden",
      },
      {
        testDescription: "entries different",
        pollingStationInput: "35",
        selectorFeedback: "Stembureau 35 (Testschool) is al twee keer ingevoerd",
        submitFeedback: "Het stembureau dat je geselecteerd hebt kan niet meer ingevoerd worden",
      },
      {
        testDescription: "second entry in progress by other",
        pollingStationInput: "36",
        selectorFeedback: "Een andere invoerder is bezig met stembureau 36",
        submitFeedback: "Een andere invoerder is bezig met stembureau 36 (Testbuurthuis)",
      },
      {
        testDescription: "first entry has errors",
        pollingStationInput: "37",
        selectorFeedback: "Stembureau 37 ligt ter beoordeling bij de coördinator",
        submitFeedback: "Stembureau 37 ligt ter beoordeling bij de coördinator",
      },
      {
        testDescription: "first entry in progress by other",
        pollingStationInput: "38",
        selectorFeedback: "Een andere invoerder is bezig met stembureau 38",
        submitFeedback: "Een andere invoerder is bezig met stembureau 38 (Testmuseum)",
      },
      {
        testDescription: "first entry done by same user",
        pollingStationInput: "39",
        selectorFeedback: "Je mag stembureau 39 niet nog een keer invoeren",
        submitFeedback: "Je mag stembureau 39 niet nog een keer invoeren",
      },
    ])("Inputting and submitting an invalid polling station shows feedback and alert: $testDescription", async ({
      pollingStationInput,
      selectorFeedback,
      submitFeedback,
    }) => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      overrideOnce("get", "/api/elections/1/status", 200, statusResponseMock);

      const user = userEvent.setup();
      await renderPollingStationChoiceForm();

      const pollingStation = await screen.findByTestId("pollingStation");
      await user.type(pollingStation, pollingStationInput);

      const pollingStationSelectFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      await waitFor(() => {
        expect(pollingStationSelectFeedback).toHaveTextContent(selectorFeedback);
      });

      const submitButton = screen.getByRole("button", { name: "Beginnen" });
      await user.click(submitButton);

      const pollingStationSubmitFeedback = await screen.findByTestId("pollingStationSubmitFeedback");
      expect(pollingStationSubmitFeedback).toHaveTextContent(submitFeedback);
    });

    test("Selecting a non-existing polling station", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      await renderPollingStationChoiceForm();

      const pollingStation = await screen.findByTestId("pollingStation");

      // Test if the error message is shown correctly without leading zeroes
      await user.type(pollingStation, "0099");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText("Geen stembureau gevonden met nummer 99")).toBeVisible();

      await user.clear(pollingStation);

      // Test if the error message is shown correctly when just entering number 0
      await user.type(pollingStation, "0");
      const pollingStationFeedback2 = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback2).findByText("Geen stembureau gevonden met nummer 0")).toBeVisible();
    });

    test("Selecting a polling station in next session without corrected_results=true", async () => {
      // Set to session 2, with an investigation on polling station 1 without corrected_results=true
      const electionDataSecondSession = getElectionMockData(
        {},
        { id: 1, number: 2, status: "data_entry_not_started" },
        [{ polling_station_id: 1, reason: "Test reason 1" }],
      );
      overrideOnce("get", "/api/elections/1", 200, electionDataSecondSession);
      server.use(http.get("/api/elections/1/status", () => HttpResponse.json({ statuses: [] }, { status: 200 })));

      const user = userEvent.setup();
      await renderPollingStationChoiceForm();

      const pollingStation = await screen.findByTestId("pollingStation");
      await user.type(pollingStation, "33");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(
        await within(pollingStationFeedback).findByText("Stembureau 33 kan nu niet ingevoerd worden"),
      ).toBeVisible();
    });

    test("Submitting an empty or invalid polling station shows alert", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      await renderPollingStationChoiceForm();

      const pollingStation = await screen.findByTestId("pollingStation");
      const submitButton = screen.getByRole("button", { name: "Beginnen" });

      await user.click(submitButton);

      // Test that an alert is visible
      const pollingStationSubmitFeedback = await screen.findByTestId("pollingStationSubmitFeedback");
      expect(
        within(pollingStationSubmitFeedback).getByText("Voer een geldig nummer van een stembureau in om te beginnen"),
      ).toBeVisible();

      // Now start typing an invalid polling station number
      await user.type(pollingStation, "abc");

      // Test that the alert disappeared
      expect(pollingStationSubmitFeedback).not.toBeVisible();

      // Click submit again and see that the alert appeared again
      await user.click(submitButton);

      expect(
        within(screen.getByTestId("pollingStationSubmitFeedback")).getByText(
          "Voer een geldig nummer van een stembureau in om te beginnen",
        ),
      ).toBeVisible();
    });

    test("Form displays message when searching", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      await renderPollingStationChoiceForm();

      const pollingStation = await screen.findByTestId("pollingStation");

      await user.type(pollingStation, "33");
      const pollingStationSearching = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(within(pollingStationSearching).getByText("aan het zoeken …")).toBeVisible();
    });

    test("Selecting polling station with second data entry opens correct page", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);

      server.use(
        http.get("/api/elections/1/status", () =>
          HttpResponse.json(
            {
              statuses: [
                {
                  polling_station_id: 1,
                  status: "first_entry_finalised",
                },
                {
                  polling_station_id: 2,
                  status: "definitive",
                },
              ],
            } satisfies ElectionStatusResponse,
            { status: 200 },
          ),
        ),
      );

      const router = await renderPollingStationChoiceForm();

      const user = userEvent.setup();
      const pollingStation = await screen.findByTestId("pollingStation");
      await user.type(pollingStation, "33");
      await user.click(screen.getByRole("button", { name: "Beginnen" }));

      expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1/2");
    });
  });

  describe("Polling station list", () => {
    test("Polling station list is displayed", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      overrideOnce("get", "/api/elections/1/status", 200, statusResponseMock);

      const user = userEvent.setup();
      await renderPollingStationChoiceForm();

      expect(await screen.findByText("Kies het stembureau")).not.toBeVisible();
      const openPollingStationList = screen.getByTestId("openPollingStationList");
      await user.click(openPollingStationList);

      expect(screen.getByText("Kies het stembureau")).toBeVisible();

      // Check if the station number and name exist and are visible
      const pollingStationList = screen.getByTestId("polling_station_list");
      expect(within(pollingStationList).getByText("33")).toBeVisible();
      expect(within(pollingStationList).getByText("Op Rolletjes")).toBeVisible();

      // These should not exist, as they are finalised
      expect(within(pollingStationList).queryByText("34")).toBe(null);
      expect(within(pollingStationList).queryByText("Testplek")).toBe(null);
    });

    test("Empty polling station list shows message", async () => {
      overrideOnce("get", "/api/elections/1", 200, { ...electionDetailsMockResponse, polling_stations: [] });
      const user = userEvent.setup();
      await renderPollingStationChoiceForm();

      const openPollingStationList = await screen.findByTestId("openPollingStationList");
      await user.click(openPollingStationList);
      expect(screen.getByText("Kies het stembureau")).toBeVisible();

      // Check if the error message is visible
      expect(screen.getByText("Geen stembureaus gevonden")).toBeVisible();
    });

    test("Show polling station list for current user only", async () => {
      server.use(ElectionRequestHandler);
      const testPollingStation = pollingStationMockData[0]!;
      overrideOnce("get", "api/elections/1/status", 200, {
        statuses: [
          {
            polling_station_id: testPollingStation.id,
            status: "first_entry_in_progress",
            first_entry_user_id: testUser.user_id + 1,
            first_entry_progress: 42,
          },
        ],
      } satisfies ElectionStatusResponse);

      await renderPollingStationChoiceForm();

      const pollingStationList = screen.queryByTestId("polling_station_list");
      expect(pollingStationList).not.toBeInTheDocument();

      const alert = await screen.findByRole("alert");
      expect(within(alert).getByRole("paragraph")).toHaveTextContent(
        "Er zijn voor jou op dit moment geen stembureaus om in te voeren",
      );
    });

    test("All data entries of polling stations are finished, polling station list shows message", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);

      server.use(
        http.get("/api/elections/1/status", () =>
          HttpResponse.json(
            {
              statuses: [
                {
                  polling_station_id: 1,
                  status: "definitive",
                },
                {
                  polling_station_id: 2,
                  status: "definitive",
                },
                {
                  polling_station_id: 3,
                  status: "definitive",
                },
                {
                  polling_station_id: 4,
                  status: "entries_different",
                },
              ],
            } satisfies ElectionStatusResponse,
            { status: 200 },
          ),
        ),
      );

      const user = userEvent.setup();
      await renderPollingStationChoiceForm();

      const openPollingStationList = await screen.findByTestId("openPollingStationList");
      await user.click(openPollingStationList);
      expect(screen.getByText("Kies het stembureau")).toBeVisible();

      // Check if the error message is visible
      expect(screen.getByText("Er zijn voor jou op dit moment geen stembureaus om in te voeren")).toBeVisible();
    });

    test("Second data entry has correct link", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      server.use(
        http.get("/api/elections/1/status", () =>
          HttpResponse.json(
            {
              statuses: [
                {
                  polling_station_id: 1,
                  status: "first_entry_finalised",
                },
                {
                  polling_station_id: 2,
                  status: "definitive",
                },
              ],
            } satisfies ElectionStatusResponse,
            { status: 200 },
          ),
        ),
      );
      const router = await renderPollingStationChoiceForm();

      // Open the polling station list
      const user = userEvent.setup();
      const openPollingStationList = await screen.findByTestId("openPollingStationList");
      await user.click(openPollingStationList);

      // Click polling station 33 and check if the link is correct
      const pollingStationList = await screen.findByTestId("polling_station_list");
      await user.click(within(pollingStationList).getByText("33"));

      expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1/2");
    });
  });

  describe("Polling station in progress", () => {
    test("Show polling stations as 'in progress'", async () => {
      server.use(ElectionRequestHandler);
      overrideOnce("get", "api/elections/1/status", 200, {
        statuses: [
          { polling_station_id: 1, status: "empty" },
          {
            polling_station_id: 2,
            status: "first_entry_in_progress",
            first_entry_user_id: 1,
            first_entry_progress: 42,
          },
          {
            polling_station_id: 3,
            status: "first_entry_in_progress",
            first_entry_user_id: 1,
            first_entry_progress: 42,
          },
          { polling_station_id: 4, status: "definitive", first_entry_user_id: 1, second_entry_user_id: 2 },
        ],
      } satisfies ElectionStatusResponse);

      await renderPollingStationChoiceForm();

      const alert = await screen.findByRole("alert");
      expect(within(alert).getByRole("strong")).toHaveTextContent("Je hebt nog een openstaande invoer");
      const pollingStations = await within(alert).findAllByRole("link");
      expect(pollingStations.map((ps) => ps.textContent)).toEqual(["34 - Testplek", "35 - Testschool"]);
    });

    test("Show polling stations as 'in progress' with different users", async () => {
      const testPollingStation = pollingStationMockData[0]!;

      server.use(ElectionRequestHandler);

      // Have the server return an in progress polling station that is owned by a different user.
      server.use(
        http.get("/api/elections/1/status", () =>
          HttpResponse.json(
            {
              statuses: [
                {
                  polling_station_id: testPollingStation.id,
                  status: "first_entry_in_progress",
                  first_entry_user_id: testUser.user_id + 1,
                  first_entry_progress: 42,
                },
              ],
            } satisfies ElectionStatusResponse,
            { status: 200 },
          ),
        ),
      );

      // Render the polling station choice page with the overridden server responses
      await renderPollingStationChoiceForm();

      // Search for polling station 2
      const user = userEvent.setup();
      const pollingStation = await screen.findByTestId("pollingStation");

      await user.type(pollingStation, `${testPollingStation.number}`);

      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(
        await within(pollingStationFeedback).findByText(
          `Een andere invoerder is bezig met stembureau ${testPollingStation.number}`,
        ),
      ).toBeVisible();

      const submitButton = await screen.findByRole("button", { name: "Beginnen" });

      // Click submit and see that the alert appears
      await user.click(submitButton);

      // Test if the warning message is shown correctly
      await waitFor(() => {
        expect(screen.getByTestId("pollingStationSubmitFeedback").textContent).toBe(
          `Een andere invoerder is bezig met stembureau ${testPollingStation.number} (${testPollingStation.name})`,
        );
      });
    });

    test("Show in progress for current user", async () => {
      const testPollingStation = pollingStationMockData[0]!;

      server.use(ElectionRequestHandler);

      // Have the server return an in progress polling station that is owned by a logged-in user.
      server.use(
        http.get("/api/elections/1/status", () =>
          HttpResponse.json(
            {
              statuses: [
                {
                  polling_station_id: testPollingStation.id,
                  status: "first_entry_in_progress",
                  first_entry_user_id: testUser.user_id,
                  first_entry_progress: 42,
                },
              ],
            } satisfies ElectionStatusResponse,
            { status: 200 },
          ),
        ),
      );

      // Render the polling station choice page with the overridden server responses
      await renderPollingStationChoiceForm();

      // Search for polling station 2
      const user = userEvent.setup();
      const pollingStation = await screen.findByTestId("pollingStation");

      await user.type(pollingStation, `${testPollingStation.number}`);

      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText(testPollingStation.name)).toBeVisible();

      expect(within(pollingStationFeedback).getByRole("img", { hidden: true })).toHaveAttribute(
        "data-icon",
        "IconEdit",
      );
    });
  });

  describe("Polling station with data entry that has errors", () => {
    const hasErrors = statusResponseMock.statuses.find(({ status }) => status === "first_entry_has_errors");
    const testPollingStation = pollingStationMockData.find(({ id }) => id === hasErrors!.polling_station_id)!;

    beforeEach(() => {
      server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
    });

    test("Show message when searching", async () => {
      await renderPollingStationChoiceForm();
      const user = userEvent.setup();
      await user.type(
        await screen.findByRole("textbox", { name: "Voer het nummer in:" }),
        String(testPollingStation.number),
      );

      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      await waitFor(() => {
        expect(pollingStationFeedback).toHaveTextContent("Stembureau 37 ligt ter beoordeling bij de coördinator");
      });
    });

    test("Do not show in the list with available polling stations", async () => {
      await renderPollingStationChoiceForm();

      const pollingStationList = await screen.findByTestId("polling_station_list");
      expect(pollingStationList).not.toHaveTextContent(testPollingStation.name);
    });
  });

  test("Show unfinished data entries for current user", async () => {
    server.use(ElectionRequestHandler);
    const testPollingStation = pollingStationMockData[0]!;
    // Have the server return an in progress polling station that is owned by a logged-in user.
    overrideOnce("get", "api/elections/1/status", 200, {
      statuses: [
        {
          polling_station_id: testPollingStation.id,
          status: "first_entry_in_progress",
          first_entry_user_id: testUser.user_id,
          first_entry_progress: 42,
        },
      ],
    } satisfies ElectionStatusResponse);

    await renderPollingStationChoiceForm();

    const list = await screen.findByTestId("unfinished-list");
    expect(list).toBeVisible();

    expect(within(list).getByRole("link")).toHaveTextContent(testPollingStation.name);
  });

  test("Show recent status when searching for polling station", async () => {
    const testPollingStation = pollingStationMockData[0]!;

    server.use(ElectionRequestHandler);
    server.use(
      http.get("/api/elections/1/status", () =>
        HttpResponse.json(
          {
            statuses: [
              {
                polling_station_id: testPollingStation.id,
                status: "first_entry_in_progress",
                first_entry_user_id: testUser.user_id + 1,
              },
            ],
          } satisfies ElectionStatusResponse,
          { status: 200 },
        ),
      ),
    );

    await renderPollingStationChoiceForm();

    const user = userEvent.setup();
    const pollingStation = await screen.findByTestId("pollingStation");
    await user.type(pollingStation, testPollingStation.number.toString());

    const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");

    expect(
      await within(pollingStationFeedback).findByText(
        `Een andere invoerder is bezig met stembureau ${testPollingStation.number}`,
      ),
    ).toBeVisible();
  });
});
