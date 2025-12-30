import { expect } from "vitest";

import { overrideOnce } from "@/testing/server";
import { screen, within } from "@/testing/test-utils";
import type {
  ClaimDataEntryResponse,
  CSOFirstSessionResults,
  POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
  PoliticalGroup,
} from "@/types/generated/openapi";
import { getCandidateFullName } from "@/utils/candidate";

import type { FormState } from "../types/types";
import { getClientState } from "../utils/dataEntryUtils";
import { getInitialValues } from "./mock-data";

export interface OverrideServerClaimDataEntryResponseProps {
  formState: FormState;
  pollingStationResults: Partial<CSOFirstSessionResults>;
  acceptErrorsAndWarnings?: boolean;
  continueToNextSection?: boolean;
  progress?: number;
  validationResults?: ClaimDataEntryResponse["validation_results"];
}

export function overrideServerClaimDataEntryResponse({
  formState,
  pollingStationResults,
  continueToNextSection = true,
  validationResults = { errors: [], warnings: [] },
}: OverrideServerClaimDataEntryResponseProps) {
  overrideOnce(
    "post",
    "/api/polling_stations/1/data_entries/1/claim" satisfies POLLING_STATION_DATA_ENTRY_CLAIM_REQUEST_PATH,
    200,
    {
      client_state: getClientState(formState, formState.furthest, false, continueToNextSection),
      data: {
        model: "CSOFirstSession",
        ...getInitialValues(),
        ...pollingStationResults,
      },
      validation_results: validationResults,
    } satisfies ClaimDataEntryResponse,
  );
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

export function expectFieldsToNotHaveIcon(fields: Array<string>) {
  fields.forEach((field) => {
    const icon = within(screen.getByTestId(`value-${field}`)).queryByRole("img");
    expect(icon).toBeNull();
  });
}

export function getCandidateFullNamesFromMockData(politicalGroupMockData: PoliticalGroup): string[] {
  return politicalGroupMockData.candidates.map(getCandidateFullName);
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
