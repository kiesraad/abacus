import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getDataEntryWithStatusList } from "@/features/data_entry_home/utils/util";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { ElectionStatusProvider } from "@/hooks/election/ElectionStatusProvider";
import * as useElectionStatus from "@/hooks/election/useElectionStatus";
import * as useUser from "@/hooks/user/useUser";
import { electionStatusesMock, statusResponseMock } from "@/testing/api-mocks/ElectionStatusMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { ElectionRequestHandler, ElectionStatusRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, waitFor, within } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import { DataEntryPicker } from "./DataEntryPicker";

const typist = getTypistUser();

async function renderPicker() {
  const entries = getDataEntryWithStatusList({ statuses: electionStatusesMock, user: typist });

  render(
    <ElectionProvider electionId={1}>
      <ElectionStatusProvider electionId={1}>
        <DataEntryPicker dataEntryWithStatus={entries} />
      </ElectionStatusProvider>
    </ElectionProvider>,
  );

  expect(await screen.findByTestId("numberInput")).toBeVisible();
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
      await renderPicker();

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
      await user.type(numberInput, "0033");
      const feedback = await screen.findByTestId("inputFeedback");
      expect(await within(feedback).findByText(/Op Rolletjes/)).toBeVisible();
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
      const navigate = vi.fn();
      vi.spyOn(ReactRouter, "useNavigate").mockImplementation(() => navigate);

      await renderPicker();

      const user = userEvent.setup();
      const numberInput = await screen.findByTestId("numberInput");
      await user.type(numberInput, "33");
      await user.click(screen.getByRole("button", { name: "Beginnen" }));

      expect(navigate).toHaveBeenCalledWith("/elections/1/data-entry/1/1");
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
  });

  test("Show recent status when searching", async () => {
    const refetch = vi.fn();
    vi.spyOn(useElectionStatus, "useElectionStatus").mockReturnValue({ statuses: [], refetch });

    await renderPicker();
    expect(refetch).not.toHaveBeenCalled();

    const user = userEvent.setup();
    const numberInput = await screen.findByTestId("numberInput");
    await user.type(numberInput, "34");
    expect(refetch).toHaveBeenCalledOnce();
  });
});
