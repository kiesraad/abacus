import { useBlocker, useNavigate } from "react-router-dom";

import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, Mock, test, vi } from "vitest";

import { usePollingStationFormController } from "@kiesraad/api";
import { electionMockData } from "@kiesraad/api-mocks";

import { PollingStationFormNavigation } from "./PollingStationFormNavigation";

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
  useBlocker: vi.fn(),
}));

vi.mock("@kiesraad/api", async () => {
  const utils = await vi.importActual(
    "../../../lib/api/form/pollingstation/pollingStationUtils.ts",
  );
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
    formState: mockFormState,
    currentForm: mockCurrentForm,
    error: null,
    targetFormSection: "voters_votes_counts",
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
    (usePollingStationFormController as Mock).mockReturnValueOnce(mockController);

    render(<PollingStationFormNavigation pollingStationId={1} election={electionMockData} />);

    expect(mockNavigate).toHaveBeenCalledWith("/1/input/1/numbers");
  });

  test("It blocks navigation when form has changes", () => {
    (usePollingStationFormController as Mock).mockReturnValueOnce({
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

      expect(blocker({ currentLocation: { pathname: "a" }, nextLocation: { pathname: "b" } })).toBe(
        true,
      );
    }
  });

  test("It blocks navigation when form has errors", async () => {
    (usePollingStationFormController as Mock).mockReturnValueOnce({
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

      expect(blocker({ currentLocation: { pathname: "a" }, nextLocation: { pathname: "b" } })).toBe(
        true,
      );

      const title = await screen.findByTestId("modal-blocker-title");
      expect(title).toBeInTheDocument();
    }
  });
});
