import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { defaultFormState, emptyDataEntryRequest } from "app/component/form/testHelperFunctions";

import { electionMockData } from "@kiesraad/api-mocks";

import { PollingStationFormNavigation } from "./PollingStationFormNavigation";

const mocks = vi.hoisted(() => ({
  useBlocker: vi.fn().mockReturnValue(vi.fn()),
  usePollingStationFormController: vi.fn(),
}));

vi.mock("react-router", () => ({
  useNavigate: () => () => {},
  useBlocker: mocks.useBlocker,
  Navigate: () => {},
  Route: () => {},
  createRoutesFromElements: () => {},
}));

vi.mock("../form/data_entry/usePollingStationFormController", () => ({
  usePollingStationFormController: mocks.usePollingStationFormController,
}));

describe("PollingStationFormNavigation", () => {
  test("It blocks navigation when form has changes", () => {
    mocks.usePollingStationFormController.mockReturnValue({
      status: { current: "idle" },
      formState: {
        ...defaultFormState,
        current: "voters_votes_counts",
      },
      error: null,
      currentForm: {
        id: "recounted",
        type: "recounted",
        getValues: () => ({
          recounted: false,
        }),
      },
      setTemporaryCache: vi.fn(),
      values: {
        recounted: true,
      },
    });

    mocks.useBlocker.mockReturnValue({
      state: "blocked",
      location: { pathname: "/elections/1/data-entry/1/1" },
    });

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    const shouldBlock = mocks.useBlocker.mock.lastCall;
    if (Array.isArray(shouldBlock)) {
      const blocker = shouldBlock[0] as ({
        currentLocation,
        nextLocation,
      }: {
        currentLocation: { pathname: string };
        nextLocation: { pathname: string };
      }) => boolean;

      expect(blocker({ currentLocation: { pathname: "a" }, nextLocation: { pathname: "b" } })).toBe(true);
    } else {
      expect.fail("shouldBlock should be an array");
    }
  });

  test("It blocks navigation when form has errors", async () => {
    mocks.usePollingStationFormController.mockReturnValue({
      status: { current: "idle" },
      formState: {
        ...defaultFormState,
        sections: {
          ...defaultFormState.sections,
          recounted: {
            ...defaultFormState.sections.recounted,
            errors: ["error"],
          },
        },
        active: "recounted",
        current: "recounted",
      },
      apiError: null,
      error: null,
      currentForm: {
        id: "recounted",
        type: "recounted",
        getValues: () => ({
          recounted: true,
        }),
      },
      setTemporaryCache: vi.fn(),
      values: {
        recounted: true,
      },
      entryNumber: 1,
    });

    mocks.useBlocker.mockReturnValue({
      state: "blocked",
      location: { pathname: "/elections/1/data-entry/1/1" },
    });

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    const shouldBlock = mocks.useBlocker.mock.lastCall;
    if (Array.isArray(shouldBlock)) {
      const blocker = shouldBlock[0] as ({
        currentLocation,
        nextLocation,
      }: {
        currentLocation: { pathname: string };
        nextLocation: { pathname: string };
      }) => boolean;

      expect(
        blocker({
          currentLocation: { pathname: "/elections/1/data-entry/1/1/voters-and-votes" },
          nextLocation: { pathname: "/elections/1/data-entry/1/1/differences" },
        }),
      ).toBe(false);

      const title = await screen.findByTestId("modal-title");
      expect(title).toBeInTheDocument();
    } else {
      expect.fail("shouldBlock should be an array");
    }
  });

  test("422 response results in display of error message", async () => {
    mocks.usePollingStationFormController.mockReturnValue({
      status: { current: "idle" },
      formState: defaultFormState,
      apiError: {
        code: 422,
        message: "De JSON is niet geldig",
      },
      currentForm: {
        id: "recounted",
        type: "recounted",
        getValues: () => ({
          recounted: true,
        }),
      },
      setTemporaryCache: vi.fn(),
      values: {
        recounted: true,
      },
    });

    mocks.useBlocker.mockReturnValue({ state: "unblocked" });

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    const feedbackServerError = await screen.findByTestId("error-modal");
    expect(feedbackServerError).toHaveTextContent("De JSON is niet geldig");
  });

  test("500 response results in display of error message", async () => {
    mocks.usePollingStationFormController.mockReturnValue({
      status: { current: "idle" },
      formState: defaultFormState,
      apiError: {
        code: 500,
        message: "Er is een interne fout opgetreden",
      },
      currentForm: {
        id: "recounted",
        type: "recounted",
        getValues: () => ({
          recounted: true,
        }),
      },
      setTemporaryCache: vi.fn(),
      values: emptyDataEntryRequest.data,
    });

    mocks.useBlocker.mockReturnValue({ state: "unblocked" });

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    const feedbackServerError = await screen.findByTestId("error-modal");

    expect(feedbackServerError).toHaveTextContent("Er is een interne fout opgetreden");
  });
});
