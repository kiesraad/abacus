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
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "extra_investigation" });

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

describe("Test ExtraInvestigationForm errors", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(DataEntryClaimHandler, DataEntrySaveHandler);
  });

  test("F.101 Both questions need to be answered or unanswered", async () => {
    const user = userEvent.setup();

    overrideServerClaimDataEntryResponse({
      formState: getDefaultDataEntryState().formState,
      results: {},
    });
    renderForm();

    await screen.findByTestId("extra_investigation_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F101], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.101",
      "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
      "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });

  test("F.102 Only one answer per question is allowed", async () => {
    const user = userEvent.setup();
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDataEntryState().formState,
      results: {},
    });
    renderForm();

    await screen.findByTestId("extra_investigation_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F102], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.102",
      "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
      "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });
});
