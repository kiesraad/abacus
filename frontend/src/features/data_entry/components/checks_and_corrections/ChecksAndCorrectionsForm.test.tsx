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
  vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "checks_and_corrections" });

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

describe("Test ChecksAndCorrectionsForm errors", () => {
  beforeEach(() => {
    vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());
    server.use(DataEntryClaimHandler, DataEntrySaveHandler);
  });

  test("F.131 Checkboxes not checked", async () => {
    const user = userEvent.setup();

    overrideServerClaimDataEntryResponse({
      formState: getDefaultDSODataEntryState().formState,
      results: {},
      model: "DSOFirstSession",
    });
    renderForm();

    await screen.findByTestId("checks_and_corrections_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F131], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.131",
      "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
      "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });

  test("F.132 Corrigendum but no corrected results own initiative", async () => {
    const user = userEvent.setup();
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDSODataEntryState().formState,
      results: {},
      model: "DSOFirstSession",
    });
    renderForm();

    await screen.findByTestId("checks_and_corrections_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F132], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.132",
      "Er is een corrigendum, maar er zijn volgens de antwoorden op het inlegvel 'controles en correcties' geen gecorrigeerde telresultaten.",
      "Overleg met de coördinator.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });

  test("F.133 No corrigendum but corrected results", async () => {
    const user = userEvent.setup();
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDSODataEntryState().formState,
      results: {},
      model: "DSOFirstSession",
    });
    renderForm();

    await screen.findByTestId("checks_and_corrections_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F133], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.133",
      "Er is geen corrigendum, maar er zijn volgens de antwoorden op het inlegvel 'controles en correcties' wel gecorrigeerde telresultaten.",
      "Overleg met de coördinator.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });

  test("F.134 Multiple answers given on corrected results own initiative", async () => {
    const user = userEvent.setup();
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDSODataEntryState().formState,
      results: {},
      model: "DSOFirstSession",
    });
    renderForm();

    await screen.findByTestId("checks_and_corrections_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F134], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.134",
      "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
      "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });

  test("F.135 Answers given on corrected results csb request", async () => {
    const user = userEvent.setup();
    overrideServerClaimDataEntryResponse({
      formState: getDefaultDSODataEntryState().formState,
      results: {},
      model: "DSOFirstSession",
    });
    renderForm();

    await screen.findByTestId("checks_and_corrections_form");
    overrideOnce("post", "/api/data_entries/1/1", 200, {
      validation_results: { errors: [validationResultMockData.F135], warnings: [] },
    });

    const submitButton = await screen.findByRole("button", { name: "Volgende" });
    await user.click(submitButton);

    const feedbackMessage = [
      "Controleer je antwoorden",
      "F.135",
      "Heb je iets niet goed overgenomen? Herstel de fout en ga verder.",
      "Heb je alles gecontroleerd en komt je invoer overeen met het papier? Ga dan verder.",
    ].join("");

    expect(await screen.findByTestId("feedback-error")).toHaveTextContent(feedbackMessage);
    expect(screen.queryByTestId("feedback-warning")).toBeNull();
  });
});
