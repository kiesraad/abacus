import { userEvent } from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
//import { http, HttpResponse } from "msw";

import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

import { ElectionProvider } from "@/api/election/ElectionProvider";
import { ElectionStatusProvider } from "@/api/election/ElectionStatusProvider";
import { ElectionStatusResponse, LoginResponse } from "@/api/gen/openapi";
import { useUser } from "@/api/useUser";
import { electionDetailsMockResponse } from "@/testing/api-mocks/ElectionMockData";
import { statusResponseMock } from "@/testing/api-mocks/ElectionStatusMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, renderReturningRouter, screen, waitFor, within } from "@/testing/test-utils";

import { DataEntryChoiceForm } from "./DataEntryChoiceForm";

vi.mock("@/api/useUser");

function renderDataEntryChoicePage() {
  return renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <DataEntryChoiceForm />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );
}

const testUser: LoginResponse = {
  username: "test-user-1",
  user_id: 1,
  role: "typist",
  needs_password_change: false,
};

describe("Test DataEntryChoiceForm", () => {
  beforeEach(() => {
    // mock a current logged in user
    (useUser as Mock).mockReturnValue(testUser satisfies LoginResponse);
    server.use(ElectionStatusRequestHandler);
  });
  // afterEach(() => {
  //   server.resetHandlers();
  //   vi.clearAllMocks();
  // });
  describe("Polling station choice form", () => {
    test("Form field entry", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();

      renderDataEntryChoicePage();

      expect(await screen.findByRole("group", { name: "Welk stembureau ga je invoeren?" }));
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
            <DataEntryChoiceForm anotherEntry />
          </ElectionStatusProvider>
        </ElectionProvider>,
      );

      expect(await screen.findByRole("group", { name: "Verder met een volgend stembureau?" }));
      const pollingStation = screen.getByTestId("pollingStation");

      // Test if the polling station name is shown
      await user.type(pollingStation, "33");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText("Op Rolletjes")).toBeVisible();
    });

    test("Selecting a valid polling station with leading zeros", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      renderDataEntryChoicePage();

      const pollingStation = await screen.findByTestId("pollingStation");

      // Test if the polling station name is shown
      await user.type(pollingStation, "0034");
      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText(/Testplek/)).toBeVisible();
    });

    test("Selecting a non-existing polling station", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      renderDataEntryChoicePage();

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

    test("Submitting an empty or invalid polling station shows alert", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      renderDataEntryChoicePage();

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

    test("Selecting a valid, but finalised polling station shows alert", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      overrideOnce("get", "/api/elections/1/status", 200, statusResponseMock);
      const user = userEvent.setup();
      render(
        <ElectionProvider electionId={1}>
          <ElectionStatusProvider electionId={1}>
            <DataEntryChoiceForm anotherEntry />
          </ElectionStatusProvider>
        </ElectionProvider>,
      );

      const submitButton = await screen.findByRole("button", { name: "Beginnen" });
      const pollingStation = screen.getByTestId("pollingStation");

      // Test if the polling station name is shown
      await user.type(pollingStation, "34");

      // Click submit and see that the alert appears
      await user.click(submitButton);

      // Test if the warning message is shown correctly
      await waitFor(() => {
        expect(screen.getByTestId("pollingStationSelectorFeedback").textContent).toBe(
          "Stembureau 34 (Testplek) is al twee keer ingevoerd",
        );
      });

      expect(
        within(screen.getByTestId("pollingStationSubmitFeedback")).getByText(
          "Het stembureau dat je geselecteerd hebt kan niet meer ingevoerd worden",
        ),
      ).toBeVisible();
    });

    test("Selecting a valid, but with different entries polling station shows alert", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      overrideOnce("get", "/api/elections/1/status", 200, statusResponseMock);
      const user = userEvent.setup();
      render(
        <ElectionProvider electionId={1}>
          <ElectionStatusProvider electionId={1}>
            <DataEntryChoiceForm anotherEntry />
          </ElectionStatusProvider>
        </ElectionProvider>,
      );

      const submitButton = await screen.findByRole("button", { name: "Beginnen" });
      const pollingStation = screen.getByTestId("pollingStation");

      // Test if the polling station name is shown
      await user.type(pollingStation, "35");

      // Click submit and see that the alert appears
      await user.click(submitButton);

      // Test if the warning message is shown correctly
      await waitFor(() => {
        expect(screen.getByTestId("pollingStationSelectorFeedback").textContent).toBe(
          "Stembureau 35 (Testschool) is al twee keer ingevoerd",
        );
      });

      expect(
        within(screen.getByTestId("pollingStationSubmitFeedback")).getByText(
          "Het stembureau dat je geselecteerd hebt kan niet meer ingevoerd worden",
        ),
      ).toBeVisible();
    });

    test("Form displays message when searching", async () => {
      overrideOnce("get", "/api/elections/1", 200, electionDetailsMockResponse);
      const user = userEvent.setup();
      renderDataEntryChoicePage();

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
                  status: "second_entry_not_started",
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

      const router = renderDataEntryChoicePage();

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
      renderDataEntryChoicePage();

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
      renderDataEntryChoicePage();

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

      renderDataEntryChoicePage();

      const pollingStationList = await screen.findByTestId("polling_station_list");
      expect(pollingStationList).not.toHaveTextContent(testPollingStation.name);
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
      renderDataEntryChoicePage();

      const openPollingStationList = await screen.findByTestId("openPollingStationList");
      await user.click(openPollingStationList);
      expect(screen.getByText("Kies het stembureau")).toBeVisible();

      // Check if the error message is visible
      expect(screen.getByText("Alle stembureaus zijn twee keer ingevoerd")).toBeVisible();
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
                  status: "second_entry_not_started",
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
      const router = renderDataEntryChoicePage();

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
          { polling_station_id: 1, status: "first_entry_not_started" },
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

      renderDataEntryChoicePage();

      const alert = await screen.findByRole("alert");
      expect(await within(alert).findByRole("heading", { name: "Je hebt nog een openstaande invoer" })).toBeVisible();

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
      renderDataEntryChoicePage();

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
      renderDataEntryChoicePage();

      // Search for polling station 2
      const user = userEvent.setup();
      const pollingStation = await screen.findByTestId("pollingStation");

      await user.type(pollingStation, `${testPollingStation.number}`);

      const pollingStationFeedback = await screen.findByTestId("pollingStationSelectorFeedback");
      expect(await within(pollingStationFeedback).findByText(testPollingStation.name)).toBeVisible();

      expect(within(pollingStationFeedback).getByRole("img")).toHaveAttribute("data-icon", "IconPencil");
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

    renderDataEntryChoicePage();

    const list = await screen.findByTestId("unfinished-list");
    expect(list).toBeVisible();

    expect(within(list).getByRole("link")).toHaveTextContent(testPollingStation.name);
  });

  test("Show recent status when searching for polling station", async () => {
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

    const testPollingStation = pollingStationMockData[0]!;
    // Have the server return an in progress polling station that is owned by a logged-in user.
    overrideOnce("get", "api/elections/1/status", 200, {
      statuses: [
        {
          polling_station_id: testPollingStation.id,
          status: "first_entry_not_started",
        },
      ],
    } satisfies ElectionStatusResponse);

    renderDataEntryChoicePage();

    // handlers are marked as "exhausted" after the first request so overriding it again without a reset will not work
    // see: https://mswjs.io/docs/best-practices/network-behavior-overrides/#one-time-override
    // server.resetHandlers();

    // overrideOnce("get", "api/elections/1/status", 200, {
    //   statuses: [
    //     {
    //       polling_station_id: testPollingStation.id,
    //       status: "first_entry_in_progress",
    //       first_entry_user_id: testUser.user_id + 1,
    //     },
    //   ],
    // } satisfies ElectionStatusResponse);

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
