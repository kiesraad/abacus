import { useBlocker, useNavigate } from "react-router-dom";

import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, Mock, test, vi } from "vitest";

import { usePollingStationFormController } from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";

import { PollingStationFormNavigation } from "./PollingStationFormNavigation";

vi.mock("react-router-dom", () => ({
  Link: vi.fn(),
  useNavigate: vi.fn(),
  useBlocker: vi.fn(),
}));

vi.mock("@kiesraad/api", async () => {
  const utils = await vi.importActual("../../../lib/api/form/pollingstation/pollingStationUtils.ts");
  return {
    usePollingStationFormController: vi.fn(),
    currentFormHasChanges: utils.currentFormHasChanges,
  };
});

describe("PollingStationFormNavigation", () => {
  const mockFormState = {
    current: "recounted",
    active: "recounted",
    sections: {
      recounted: {
        index: 0,
        id: "recounted",
        errors: [],
        warnings: [],
        ignoreWarnings: false,
        isSaved: false,
      },
      voters_votes_counts: {
        index: 1,
        id: "voters_votes_counts",
        errors: [],
        warnings: [],
        ignoreWarnings: false,
        isSaved: false,
      },
    },
    isCompleted: false,
  };

  const mockCurrentForm = {
    id: "section1",
    getValues: vi.fn().mockReturnValue({}),
  };

  const mockNavigate = vi.fn();

  const mockController = {
    status: { current: "idle" },
    formState: mockFormState,
    currentForm: mockCurrentForm,
    error: null,
    targetFormSection: "voters_votes_counts",
    apiError: null,
    values: {},
    setTemporaryCache: vi.fn(),
    submitCurrentForm: vi.fn(),
  };

  beforeAll(() => {
    (useBlocker as Mock).mockReturnValue(vi.fn());
    (useNavigate as Mock).mockReturnValue(mockNavigate);
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  test("It Navigates to targetFormSection", () => {
    (usePollingStationFormController as Mock).mockReturnValue(mockController);

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    expect(mockNavigate).toHaveBeenCalledWith("/elections/1/data-entry/1/voters-and-votes");
  });

  test("It blocks navigation when form has changes", () => {
    (usePollingStationFormController as Mock).mockReturnValue({
      status: { current: "idle" },
      formState: {
        ...mockFormState,
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

    const shouldBlock = (useBlocker as Mock).mock.lastCall;
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
        ...mockFormState,
        sections: {
          ...mockFormState.sections,
          recounted: {
            ...mockFormState.sections.recounted,
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
      targetFormSection: "recounted",
      values: {
        recounted: true,
      },
    });

    (useBlocker as Mock).mockReturnValue({
      state: "blocked",
      location: { pathname: "/elections/1/data-entry/1/" },
    });

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    const shouldBlock = (useBlocker as Mock).mock.lastCall;
    if (Array.isArray(shouldBlock)) {
      const blocker = shouldBlock[0] as ({
        currentLocation,
        nextLocation,
      }: {
        currentLocation: { pathname: string };
        nextLocation: { pathname: string };
      }) => boolean;

      //TODO: check these tests after determining what should be blocked
      expect(
        blocker({
          currentLocation: { pathname: "/elections/1/data-entry/1/voters-and-votes" },
          nextLocation: { pathname: "/elections/1/data-entry/1/differences" },
        }),
      ).toBe(false);

      const title = await screen.findByTestId("modal-blocker-title");
      expect(title).toBeInTheDocument();
    }
  });

  test("422 response results in display of error message", async () => {
    (usePollingStationFormController as Mock).mockReturnValue({
      status: { current: "idle" },
      formState: {
        ...mockFormState,
      },
      apiError: {
        code: 422,
        error: "JSON error or invalid data (Unprocessable Content)",
      },
      currentForm: {
        id: "recounted",
        type: "recounted",
        getValues: () => ({
          recounted: true,
        }),
      },
      setTemporaryCache: vi.fn(),
      targetFormSection: "recounted",
      values: {
        recounted: true,
      },
    });

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    const feedbackServerError = await screen.findByTestId("feedback-server-error");
    expect(feedbackServerError).toHaveTextContent(
      "Sorry, er ging iets mis422: JSON error or invalid data (Unprocessable Content)",
    );
  });

  test("500 response results in display of error message", async () => {
    (usePollingStationFormController as Mock).mockReturnValue({
      status: { current: "idle" },
      formState: {
        ...mockFormState,
      },
      apiError: {
        code: 500,
        error: "Internal server error",
      },
      currentForm: {
        id: "recounted",
        type: "recounted",
        getValues: () => ({
          recounted: true,
        }),
      },
      setTemporaryCache: vi.fn(),
      targetFormSection: "recounted",
      values: {
        recounted: true,
      },
    });

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    const feedbackServerError = await screen.findByTestId("feedback-server-error");
    expect(feedbackServerError).toHaveTextContent("Sorry, er ging iets mis500: Internal server error");
  });
});
