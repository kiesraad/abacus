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
import { getDefaultDSODataEntryState } from "../../testing/mock-data";
import { overrideServerClaimDataEntryResponse } from "../../testing/test.utils";
import { DataEntryProvider } from "../DataEntryProvider";
import { DataEntrySection } from "../DataEntrySection";

function renderForm() {
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "about_report" });

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

describe("Test AboutReportForm errors", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(DataEntryClaimHandler, DataEntrySaveHandler);
  });

  test("F.121 Radio's not checked", async () => {
    const user = userEvent.setup();

    overrideServerClaimDataEntryResponse({
      formState: getDefaultDSODataEntryState().formState,
      results: {},
      model: "DSOFirstSession",
    });
    renderForm();

    await screen.findByTestId("about_report_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F121], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.121",
      "Beantwoord de vragen over het papieren proces-verbaal.",
      "Overleg met de coördinator als je twijfelt.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });

  test("F.122 TwoDocuments but PageMissing", async () => {
    const user = userEvent.setup();
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDSODataEntryState().formState,
      results: {},
      model: "DSOFirstSession",
    });
    renderForm();

    await screen.findByTestId("about_report_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F122], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Het inlegvel ontbreekt, maar hoort wel aanwezig te zijn",
      "F.122",
      "Overleg met de coördinator over het ontbrekende inlegvel.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });
});
