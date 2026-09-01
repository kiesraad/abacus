import { expect } from "vitest";
import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { overrideOnce } from "@/testing/server";
import { screen, within } from "@/testing/test-utils";
import type {
  ClaimDataEntryResponse,
  DATA_ENTRY_CLAIM_REQUEST_PATH,
  PoliticalGroup,
  Results,
} from "@/types/generated/openapi";
import { getCandidateFullName } from "@/utils/candidate";
import type { FormState } from "../types/types";
import { getClientState } from "../utils/dataEntryUtils";
import { getCommonInitialValues, getCSOInitialValues, getDSOInitialValues } from "./mock-data";

type FirstSessionModel = Extract<Results["model"], "CSOFirstSession" | "DSOFirstSession">;

export interface OverrideServerClaimDataEntryResponseProps<T extends FirstSessionModel = "CSOFirstSession"> {
  formState: FormState;
  results: Partial<Extract<Results, { model: T }>>;
  model?: T;
  acceptErrorsAndWarnings?: boolean;
  continueToNextSection?: boolean;
  progress?: number;
  validationResults?: ClaimDataEntryResponse["validation_results"];
}

export function overrideServerClaimDataEntryResponse<T extends FirstSessionModel = "CSOFirstSession">({
  formState,
  results,
  model = "CSOFirstSession" as T,
  continueToNextSection = true,
  validationResults = { errors: [], warnings: [] },
}: OverrideServerClaimDataEntryResponseProps<T>) {
  overrideOnce("post", "/api/data_entries/1/1/claim" satisfies DATA_ENTRY_CLAIM_REQUEST_PATH, 200, {
    client_state: getClientState(formState, formState.furthest, false, continueToNextSection),
    data:
      model === "CSOFirstSession"
        ? { model, ...getCSOInitialValues(), ...results }
        : model === "DSOFirstSession"
          ? { model, ...getDSOInitialValues(), ...results }
          : { model, ...getCommonInitialValues(), ...results },
    validation_results: validationResults,
    source: {
      type: "PollingStation",
      id: pollingStationMockData[0]!.id,
      number: pollingStationMockData[0]!.number,
      name: pollingStationMockData[0]!.name,
      committee_session_id: 1,
      session_type: "First",
      data_entry_id: 1,
      locality: pollingStationMockData[0]!.locality,
      postal_code: pollingStationMockData[0]!.postal_code,
      address: pollingStationMockData[0]!.address,
    },
    status: "first_entry_in_progress",
    is_correction: false,
  } satisfies ClaimDataEntryResponse);
}

export function expectFieldsToBeInvalidAndToHaveAccessibleErrorMessage(fields: Array<string>, feedbackMessage: string) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`value-${field}`)).getByRole("textbox");
    expect(inputField).toBeInvalid();
    expect(inputField).toHaveAccessibleErrorMessage(feedbackMessage);
  });
}

export function expectFieldsToHaveIconAndToHaveAccessibleName(fields: Array<string>, accessibleName: string) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`value-${field}`)).getByRole("img");
    expect(icon).toHaveAccessibleName(accessibleName);
  });
}

export function expectCheckboxListToBeInvalidAndToHaveTextContent(fields: Array<string>, feedbackMessage: string) {
  fields.forEach((field) => {
    const inputField = screen.getByTestId(field);
    expect(inputField).toHaveTextContent(feedbackMessage);
  });
}

export function expectFieldsToBeValidAndToNotHaveAccessibleErrorMessage(fields: Array<string>) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`value-${field}`)).getByRole("textbox");
    expect(inputField).toBeValid();
    expect(inputField).not.toHaveAccessibleErrorMessage();
  });
}

export function expectFieldsToBeDisabled(fields: Array<string>) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`value-${field}`)).getByRole("textbox");
    expect(inputField).toBeDisabled();
  });
}

export function expectFieldsToNotHaveIcon(fields: Array<string>) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`value-${field}`)).queryByRole("img");
    expect(icon).toBeNull();
  });
}

export function getCandidateFullNamesFromMockData(politicalGroupMockData: PoliticalGroup): string[] {
  return politicalGroupMockData.candidates.map((candidate) => getCandidateFullName(candidate));
}

export function expectCheckboxToBeValidAndToNotHaveAccessibleErrorMessage(fields: Array<string>) {
  fields.forEach((field) => {
    const inputField = within(screen.getByTestId(`checkbox-container-${field}`)).getByRole("checkbox");
    expect(inputField).toBeValid();
    expect(inputField).not.toHaveAccessibleErrorMessage();
  });
}

export function expectInputToBeValidAndToNotHaveAccessibleErrorMessage(fields: Array<string>) {
  fields.forEach((field) => {
    const inputField = screen.getByTestId(`data.${field}`);
    expect(inputField).toBeValid();
    expect(inputField).not.toBeInvalid();
  });
}

export function expectInputToNotHaveIcon(fields: Array<string>) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`data.${field}`)).queryByRole("img");
    expect(icon).toBeNull();
  });
}
