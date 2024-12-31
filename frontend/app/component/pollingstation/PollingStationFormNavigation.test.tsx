import { render, screen } from "@testing-library/react";
import { describe, expect, Mock, test, vi } from "vitest";

import { defaultFormState, emptyDataEntryRequest } from "app/component/form/testHelperFunctions.ts";

import { usePollingStationFormController } from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";

import { PollingStationFormNavigation } from "./PollingStationFormNavigation";

const mocks = vi.hoisted(() => {
  return {
    useNavigate: vi.fn().mockReturnValue(vi.fn()),
    useBlocker: vi.fn().mockReturnValue(vi.fn()),
  };
});

vi.mock("react-router-dom", () => ({
  useNavigate: mocks.useNavigate,
  useBlocker: mocks.useBlocker,
  Navigate: vi.fn(),
  Route: vi.fn(),
  createRoutesFromElements: vi.fn(),
}));

vi.mock("@kiesraad/api", async () => {
  const utils = await vi.importActual("../../../lib/api/form/pollingstation/pollingStationUtils.ts");
  return {
    usePollingStationFormController: vi.fn(),
    currentFormHasChanges: utils.currentFormHasChanges,
  };
});

describe("PollingStationFormNavigation", () => {
  test("It blocks navigation when form has changes", () => {
    (usePollingStationFormController as Mock).mockReturnValue({
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
    }
  });

  test("It blocks navigation when form has errors", async () => {
    (usePollingStationFormController as Mock).mockReturnValue({
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
    }
  });

  test("422 response results in display of error message", async () => {
    (usePollingStationFormController as Mock).mockReturnValue({
      status: { current: "idle" },
      formState: defaultFormState,
      apiError: {
        code: 422,
        message: "JSON error or invalid data (Unprocessable Content)",
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

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    const feedbackServerError = await screen.findByTestId("error-modal");
    expect(feedbackServerError).toHaveTextContent("Foutcode: 422JSON error or invalid data (Unprocessable Content)");
  });

  test("500 response results in display of error message", async () => {
    (usePollingStationFormController as Mock).mockReturnValue({
      status: { current: "idle" },
      formState: defaultFormState,
      apiError: {
        code: 500,
        message: "Internal server error",
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

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    const feedbackServerError = await screen.findByTestId("error-modal");

    expect(feedbackServerError).toHaveTextContent("Foutcode: 500Internal server error");
  });
});
