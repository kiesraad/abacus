import { userEvent } from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import * as useUser from "@/hooks/user/useUser";
import { getElectionStatusMockData, statusResponseMock } from "@/testing/api-mocks/ElectionStatusMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { renderReturningRouter, screen, waitFor, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import { DataEntryPicker } from "./DataEntryPicker";

async function renderPicker(anotherEntry?: boolean) {
  const router = renderReturningRouter(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <DataEntryPicker anotherEntry={anotherEntry} />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );

  const expectedLabel = anotherEntry ? "Verder met een volgend stembureau?" : "Welk stembureau ga je invoeren?";
  expect(await screen.findByRole("group", { name: expectedLabel })).toBeVisible();

  return router;
}

const testUser = getTypistUser();

describe("Test DataEntryPicker", () => {
  beforeEach(() => {
    // mock a current logged in user
    vi.spyOn(useUser, "useUser").mockReturnValue(testUser);
    server.use(ElectionRequestHandler, ElectionStatusRequestHandler);
  });

  describe("DataEntrySourceNumberInput", () => {
    test("Form field entry", async () => {
      const user = userEvent.setup();

      await renderPicker();

      expect(await screen.findByRole("group", { name: "Welk stembureau ga je invoeren?" })).toBeVisible();
      const numberInput = screen.getByTestId("numberInput");

      // Test if the feedback field shows an error
      await user.type(numberInput, "abc");
      const feedback = await screen.findByTestId("inputFeedback");
      expect(await within(feedback).findByText("Geen stembureau gevonden met nummer abc")).toBeVisible();

      await user.clear(numberInput);

      // Test if maxLength on field works
      await user.type(numberInput, "1234567");
      expect(numberInput).toHaveValue("123456");

      await user.clear(numberInput);
    });

    test("Enter a valid number", async () => {
      const user = userEvent.setup();
      await renderPicker(true);

      const numberInput = screen.getByTestId("numberInput");

      // Test if the data entry source name is shown
      await user.type(numberInput, "33");
      const feedback = await screen.findByTestId("inputFeedback");
      expect(await within(feedback).findByText("Op Rolletjes")).toBeVisible();
    });

    test("Enter a valid number with leading zeros", async () => {
      const user = userEvent.setup();
      await renderPicker();

      const numberInput = await screen.findByTestId("numberInput");

      // Test if the data entry source name is shown
      await user.type(numberInput, "0034");
      const feedback = await screen.findByTestId("inputFeedback");
      expect(await within(feedback).findByText(/Testplek/)).toBeVisible();
    });

    test.each([
      {
        testDescription: "invalid",
        input: "abc",
        inputFeedback: "Geen stembureau gevonden met nummer abc",
        submitFeedback: "Voer een geldig nummer van een stembureau in om te beginnen",
      },
      {
        testDescription: "non-existing",
        input: "987654",
        inputFeedback: "Geen stembureau gevonden met nummer 987654",
        submitFeedback: "Voer een geldig nummer van een stembureau in om te beginnen",
      },
      {
        testDescription: "definitive",
        input: "34",
        inputFeedback: "Stembureau 34 (Testplek) is al twee keer ingevoerd",
        submitFeedback: "Het stembureau dat je geselecteerd hebt kan niet meer ingevoerd worden",
      },
      {
        testDescription: "entries different",
        input: "35",
        inputFeedback: "Stembureau 35 (Testschool) is al twee keer ingevoerd",
        submitFeedback: "Het stembureau dat je geselecteerd hebt kan niet meer ingevoerd worden",
      },
      {
        testDescription: "second entry in progress by other",
        input: "36",
        inputFeedback: "Een andere invoerder is bezig met stembureau 36",
        submitFeedback: "Een andere invoerder is bezig met stembureau 36 (Testbuurthuis)",
      },
      {
        testDescription: "first entry has errors",
        input: "37",
        inputFeedback: "Stembureau 37 ligt ter beoordeling bij de coördinator",
        submitFeedback: "Stembureau 37 ligt ter beoordeling bij de coördinator",
      },
      {
        testDescription: "first entry in progress by other",
        input: "38",
        inputFeedback: "Een andere invoerder is bezig met stembureau 38",
        submitFeedback: "Een andere invoerder is bezig met stembureau 38 (Testmuseum)",
      },
      {
        testDescription: "first entry done by same user",
        input: "39",
        inputFeedback: "Je mag stembureau 39 niet nog een keer invoeren",
        submitFeedback: "Je mag stembureau 39 niet nog een keer invoeren",
      },
    ])("Inputting and submitting an invalid data entry shows feedback and alert: $testDescription", async ({
      input,
      inputFeedback,
      submitFeedback,
    }) => {
      overrideOnce("get", "/api/elections/1/status", 200, statusResponseMock);

      const user = userEvent.setup();
      await renderPicker();

      const numberInput = await screen.findByTestId("numberInput");
      await user.type(numberInput, input);

      const inputFeedbackMessage = await screen.findByTestId("inputFeedback");
      await waitFor(() => {
        expect(inputFeedbackMessage).toHaveTextContent(inputFeedback);
      });

      const submitButton = screen.getByRole("button", { name: "Beginnen" });
      await user.click(submitButton);

      const submitFeedbackMessage = await screen.findByTestId("submitFeedback");
      expect(submitFeedbackMessage).toHaveTextContent(submitFeedback);
    });

    test("Selecting a non-existing data entry", async () => {
      const user = userEvent.setup();
      await renderPicker();

      const numberInput = await screen.findByTestId("numberInput");

      // Test if the error message is shown correctly without leading zeroes
      await user.type(numberInput, "0099");
      const feedback = await screen.findByTestId("inputFeedback");
      expect(await within(feedback).findByText("Geen stembureau gevonden met nummer 99")).toBeVisible();

      await user.clear(numberInput);

      // Test if the error message is shown correctly when just entering number 0
      await user.type(numberInput, "0");
      const newFeedback = await screen.findByTestId("inputFeedback");
      expect(await within(newFeedback).findByText("Geen stembureau gevonden met nummer 0")).toBeVisible();
    });

    test("Submitting an empty or invalid data entry shows alert", async () => {
      const user = userEvent.setup();
      await renderPicker();

      const numberInput = await screen.findByTestId("numberInput");
      const submitButton = screen.getByRole("button", { name: "Beginnen" });

      await user.click(submitButton);

      // Test that an alert is visible
      const submitFeedback = await screen.findByTestId("submitFeedback");
      expect(
        within(submitFeedback).getByText("Voer een geldig nummer van een stembureau in om te beginnen"),
      ).toBeVisible();

      // Now start typing an invalid number
      await user.type(numberInput, "abc");

      // Test that the alert disappeared
      expect(submitFeedback).not.toBeVisible();

      // Click submit again and see that the alert appeared again
      await user.click(submitButton);

      expect(
        within(screen.getByTestId("submitFeedback")).getByText(
          "Voer een geldig nummer van een stembureau in om te beginnen",
        ),
      ).toBeVisible();
    });

    test("Form displays message when searching", async () => {
      const user = userEvent.setup();
      await renderPicker();

      const numberInput = await screen.findByTestId("numberInput");

      await user.type(numberInput, "33");
      const feedback = await screen.findByTestId("inputFeedback");
      expect(within(feedback).getByText("aan het zoeken …")).toBeVisible();
    });

    test("Selecting data entry for second data entry opens correct page", async () => {
      server.use(
        http.get("/api/elections/1/status", () =>
          HttpResponse.json(
            getElectionStatusMockData([{ status: "first_entry_finalised" }, { status: "definitive" }]),
            {
              status: 200,
            },
          ),
        ),
      );

      const router = await renderPicker();

      const user = userEvent.setup();
      const numberInput = await screen.findByTestId("numberInput");
      await user.type(numberInput, "33");
      await user.click(screen.getByRole("button", { name: "Beginnen" }));

      expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1/2");
    });
  });

  describe("Data entry list", () => {
    test("Data entry list is displayed", async () => {
      overrideOnce("get", "/api/elections/1/status", 200, statusResponseMock);

      const user = userEvent.setup();
      await renderPicker();

      expect(await screen.findByText("Kies het stembureau")).not.toBeVisible();
      const openList = screen.getByTestId("openList");
      await user.click(openList);

      expect(screen.getByText("Kies het stembureau")).toBeVisible();

      // Check if the station number and name exist and are visible
      const list = screen.getByTestId("data_entry_list");
      expect(within(list).getByText("33")).toBeVisible();
      expect(within(list).getByText("Op Rolletjes")).toBeVisible();

      // These should not exist, as they are finalised
      expect(within(list).queryByText("34")).toBe(null);
      expect(within(list).queryByText("Testplek")).toBe(null);
    });

    test("Empty data entry list shows message", async () => {
      server.use(
        http.get("/api/elections/1/status", () => HttpResponse.json(getElectionStatusMockData([]), { status: 200 })),
      );
      const user = userEvent.setup();
      await renderPicker();

      const openList = await screen.findByTestId("openList");
      await user.click(openList);
      expect(screen.getByText("Kies het stembureau")).toBeVisible();

      // Check if the error message is visible
      expect(screen.getByText("Er zijn voor jou op dit moment geen stembureaus om in te voeren")).toBeVisible();
    });

    test("Show available data entries for current user only", async () => {
      overrideOnce(
        "get",
        "api/elections/1/status",
        200,
        getElectionStatusMockData([
          {
            status: "first_entry_in_progress",
            first_entry_user_id: testUser.user_id + 1,
            first_entry_progress: 42,
          },
        ]),
      );

      await renderPicker();

      const list = screen.queryByTestId("data_entry_list");
      expect(list).not.toBeInTheDocument();

      const alert = await screen.findByRole("alert");
      expect(within(alert).getByRole("paragraph")).toHaveTextContent(
        "Er zijn voor jou op dit moment geen stembureaus om in te voeren",
      );
    });

    test("All data entries are completed, list shows message", async () => {
      server.use(
        http.get("/api/elections/1/status", () =>
          HttpResponse.json(
            getElectionStatusMockData([
              { status: "definitive" },
              { status: "definitive" },
              { status: "definitive" },
              { status: "entries_different" },
            ]),
            { status: 200 },
          ),
        ),
      );

      const user = userEvent.setup();
      await renderPicker();

      const openList = await screen.findByTestId("openList");
      await user.click(openList);
      expect(screen.getByText("Kies het stembureau")).toBeVisible();

      // Check if the error message is visible
      expect(screen.getByText("Er zijn voor jou op dit moment geen stembureaus om in te voeren")).toBeVisible();
    });

    test("Second data entry has correct link", async () => {
      server.use(
        http.get("/api/elections/1/status", () =>
          HttpResponse.json(
            getElectionStatusMockData([{ status: "first_entry_finalised" }, { status: "definitive" }]),
            {
              status: 200,
            },
          ),
        ),
      );
      const router = await renderPicker();

      // Open the list
      const user = userEvent.setup();
      const openList = await screen.findByTestId("openList");
      await user.click(openList);

      // Click data entry for 33 and check if the link is correct
      const list = await screen.findByTestId("data_entry_list");
      await user.click(within(list).getByText("33"));

      expect(router.state.location.pathname).toEqual("/elections/1/data-entry/1/2");
    });
  });

  describe("Data entry in progress", () => {
    test("Show data entries as 'in progress'", async () => {
      server.use(
        http.get("/api/elections/1/status", () =>
          HttpResponse.json(
            getElectionStatusMockData([
              {
                status: "empty",
              },
              {
                status: "first_entry_in_progress",
                first_entry_user_id: 1,
                first_entry_progress: 42,
              },
              {
                status: "first_entry_in_progress",
                first_entry_user_id: 1,
                first_entry_progress: 42,
              },
              {
                status: "definitive",
                first_entry_user_id: 1,
                second_entry_user_id: 2,
              },
            ]),
            { status: 200 },
          ),
        ),
      );

      await renderPicker();

      const alert = await screen.findByRole("alert");
      expect(within(alert).getByRole("strong")).toHaveTextContent("Je hebt nog een openstaande invoer");
      const dataEntries = await within(alert).findAllByRole("link");
      expect(dataEntries.map((ps) => ps.textContent)).toEqual(["34 - Testplek", "35 - Testschool"]);
    });

    test("Show data entries as 'in progress' with different users", async () => {
      const electionStatus = getElectionStatusMockData([
        {
          status: "first_entry_in_progress",
          first_entry_user_id: testUser.user_id + 1,
          first_entry_progress: 42,
        },
      ]);
      const testPollingStation = electionStatus.statuses[0]!.source;

      // Have the server return an in progress data entry that is owned by a different user.
      server.use(http.get("/api/elections/1/status", () => HttpResponse.json(electionStatus, { status: 200 })));

      await renderPicker();

      const user = userEvent.setup();
      const numberInput = await screen.findByTestId("numberInput");
      await user.type(numberInput, `${testPollingStation.number}`);

      const feedback = await screen.findByTestId("inputFeedback");
      expect(
        await within(feedback).findByText(`Een andere invoerder is bezig met stembureau ${testPollingStation.number}`),
      ).toBeVisible();

      const submitButton = await screen.findByRole("button", { name: "Beginnen" });

      // Click submit and see that the alert appears
      await user.click(submitButton);

      // Test if the warning message is shown correctly
      await waitFor(() => {
        expect(screen.getByTestId("submitFeedback").textContent).toBe(
          `Een andere invoerder is bezig met stembureau ${testPollingStation.number} (${testPollingStation.name})`,
        );
      });
    });

    test("Show in progress for current user", async () => {
      const electionStatus = getElectionStatusMockData([
        {
          status: "first_entry_in_progress",
          first_entry_user_id: testUser.user_id,
          first_entry_progress: 42,
        },
      ]);
      const testPollingStation = electionStatus.statuses[0]!.source;

      // Have the server return an in progress data entry that is owned by a logged-in user.
      server.use(http.get("/api/elections/1/status", () => HttpResponse.json(electionStatus, { status: 200 })));

      // Render the picker with the overridden server responses
      await renderPicker();

      const user = userEvent.setup();
      const numberInput = await screen.findByTestId("numberInput");
      await user.type(numberInput, `${testPollingStation.number}`);

      const feedback = await screen.findByTestId("inputFeedback");
      expect(await within(feedback).findByText(testPollingStation.name)).toBeVisible();

      expect(within(feedback).getByRole("img", { hidden: true })).toHaveAttribute("data-icon", "IconEdit");
    });
  });

  describe("Data entry with errors", () => {
    const hasErrors = statusResponseMock.statuses.find(({ status }) => status === "first_entry_has_errors");
    const testPollingStation = pollingStationMockData.find(({ id }) => id === hasErrors!.source.id)!;

    test("Show message when searching", async () => {
      await renderPicker();
      const user = userEvent.setup();
      await user.type(
        await screen.findByRole("textbox", { name: "Voer het nummer in:" }),
        String(testPollingStation.number),
      );

      const feedback = await screen.findByTestId("inputFeedback");
      await waitFor(() => {
        expect(feedback).toHaveTextContent("Stembureau 37 ligt ter beoordeling bij de coördinator");
      });
    });

    test("Do not show in the list with available data entries", async () => {
      await renderPicker();

      const list = await screen.findByTestId("data_entry_list");
      expect(list).not.toHaveTextContent(testPollingStation.name);
    });
  });

  test("Show uncompleted data entries for current user", async () => {
    const electionStatus = getElectionStatusMockData([
      {
        status: "first_entry_in_progress",
        first_entry_user_id: testUser.user_id,
        first_entry_progress: 42,
      },
    ]);
    const testPollingStation = electionStatus.statuses[0]!.source;
    // Have the server return an in progress data entry that is owned by a logged-in user.
    server.use(http.get("/api/elections/1/status", () => HttpResponse.json(electionStatus, { status: 200 })));

    await renderPicker();

    const list = await screen.findByTestId("unfinished-list");
    expect(list).toBeVisible();

    expect(within(list).getByRole("link")).toHaveTextContent(testPollingStation.name);
  });

  test("Show recent status when searching", async () => {
    const electionStatus = getElectionStatusMockData([
      {
        status: "first_entry_in_progress",
        first_entry_user_id: testUser.user_id + 1,
        first_entry_progress: 42,
      },
    ]);
    const testPollingStation = electionStatus.statuses[0]!.source;

    server.use(http.get("/api/elections/1/status", () => HttpResponse.json(electionStatus, { status: 200 })));

    await renderPicker();

    const user = userEvent.setup();
    const numberInput = await screen.findByTestId("numberInput");
    await user.type(numberInput, testPollingStation.number.toString());

    const feedback = await screen.findByTestId("inputFeedback");

    expect(
      await within(feedback).findByText(`Een andere invoerder is bezig met stembureau ${testPollingStation.number}`),
    ).toBeVisible();
  });
});
