import { userEvent } from "@testing-library/user-event";
import * as ReactRouter from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MessagesProvider } from "@/hooks/messages/MessagesProvider";
import * as useUser from "@/hooks/user/useUser";
import { electionMockData } from "@/testing/api-mocks/ElectionMockData";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { DataEntryClaimHandler, DataEntrySaveHandler } from "@/testing/api-mocks/RequestHandlers";
import { validationResultMockData } from "@/testing/api-mocks/ValidationResultMockData";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";
import { getDefaultDataEntryState } from "../../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../../testing/test.utils";
import { DataEntryProvider } from "../DataEntryProvider";
import { DataEntrySection } from "../DataEntrySection";

function renderForm() {
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "counting_differences_polling_station" });

  return render(
    <MessagesProvider>
      <DataEntryProvider
        election={electionMockData}
        dataEntryId={pollingStationMockData[0]!.data_entry_id!}
        entryNumber={1}
      >
        <DataEntrySection committeeCategory={electionMockData.committee_category} />
      </DataEntryProvider>
    </MessagesProvider>,
  );
}

describe("Test CountingDifferencesPollingStationForm errors", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(DataEntryClaimHandler, DataEntrySaveHandler);
  });

  test("F.111 Both questions need to be answered", async () => {
    const user = userEvent.setup();

    overrideServerClaimDataEntryResponse({
      formState: getDefaultDataEntryState().formState,
      results: {},
    });
    renderForm();

    await screen.findByTestId("counting_differences_polling_station_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F111], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.111",
      "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
      "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });

  test("F.112 Only one answer per question is allowed", async () => {
    const user = userEvent.setup();
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDataEntryState().formState,
      results: {},
    });
    renderForm();

    await screen.findByTestId("counting_differences_polling_station_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F112], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.112",
      "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
      "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });
});
