import { Navigate, RouterProvider } from "react-router";

import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { useUser } from "@/hooks/user/useUser";
import { setupTestRouter } from "@/testing/test-utils";
import { PollingStationResults } from "@/types/generated/openapi";

import { useDataEntryContext } from "../hooks/useDataEntryContext";
import {
  getDefaultDataEntryState,
  getDefaultDataEntryStateAndActionsLoaded,
  getDefaultUser,
} from "../testing/mock-data";
import { DataEntryStateAndActionsLoaded, Status, SubmitCurrentFormOptions } from "../types/types";
import { DataEntryNavigation } from "./DataEntryNavigation";

vi.mock("react-router");
vi.mock("@/hooks/user/useUser");
vi.mock("../hooks/useDataEntryContext");

//
const baseMockData = getDefaultDataEntryStateAndActionsLoaded();
const testPath = `/elections/${baseMockData.election.id}/data-entry/${baseMockData.pollingStationId}/1`;

function renderComponent(
  onSubmit: (options?: SubmitCurrentFormOptions) => Promise<boolean>,
  currentValues?: Partial<PollingStationResults>,
) {
  const router = setupTestRouter([
    {
      path: "/",
      element: <Navigate to={testPath} replace />,
    },
    {
      path: "/elections/:electionId/data-entry/:pollingStationId/:entryNumber",
      element: <DataEntryNavigation onSubmit={onSubmit} currentValues={currentValues} />,
      children: [{ path: "differences", element: <div>Differences</div> }],
    },
    {
      path: "/test",
      element: <div>Test</div>,
    },
  ]);

  render(<RouterProvider router={router} />);
  return router;
}

describe("DataEntryNavigation", () => {
  describe("Blocker behaviour", () => {
    test.each<Status>(["deleted", "finalised", "finalising", "aborted"])(
      "Does not block navigation for status: %s",
      async (status) => {
        const state: DataEntryStateAndActionsLoaded = {
          ...getDefaultDataEntryStateAndActionsLoaded(),
          status,
        };

        vi.mocked(useDataEntryContext).mockReturnValue(state);
        vi.mocked(useUser).mockReturnValue(getDefaultUser());
        const router = renderComponent(vi.fn());
        await router.navigate("/test");
        expect(router.state.location.pathname).toBe("/test");
      },
    );

    test.each<Status>(["idle", "saving", "deleting"])("Does block navigation for status: %s", async (status) => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status,
      };

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());
      const router = renderComponent(vi.fn());
      await router.navigate("/test");
      expect(router.state.location.pathname).toBe(testPath);

      const modal = await screen.findByRole("dialog");
      expect(modal).toBeVisible();
      const title = within(modal).getByText("Wat wil je doen met je invoer?");
      expect(title).toBeVisible();
    });

    test("Does not block navigation if user is null", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status: "idle",
      };

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(null);
      const router = renderComponent(vi.fn());
      await router.navigate("/test");
      expect(router.state.location.pathname).toBe("/test");
    });

    test("Does not block when navigating to the same page", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status: "idle",
      };

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());
      const router = renderComponent(vi.fn());
      await router.navigate(testPath);
      expect(router.state.location.pathname).toBe(testPath);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("Blocks when form has changes", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        formState: {
          current: "voters_votes_counts",
          furthest: "differences_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts,
              hasChanges: true,
            },
          },
        },
        status: "idle",
      };

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());

      const router = renderComponent(vi.fn());

      //navigate within data entry flow
      await router.navigate(testPath + "/differences");
      expect(router.state.location.pathname).toBe(testPath);

      const modal = await screen.findByRole("dialog");
      expect(modal).toBeVisible();
      const title = within(modal).getByText("Let op: niet opgeslagen wijzigingen");
      expect(title).toBeVisible();
    });

    test("Sets cache when form has changes and section is furthest", async () => {
      const setCache = vi.fn();
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        setCache,
        formState: {
          current: "voters_votes_counts",
          furthest: "voters_votes_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts,
              hasChanges: true,
            },
          },
        },
        status: "idle",
      };

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());

      const router = renderComponent(vi.fn());

      //navigate within data entry flow
      await router.navigate(testPath + "/differences");
      expect(setCache).toHaveBeenCalled();
      expect(router.state.location.pathname).toBe(testPath + "/differences");
    });
  });

  describe("Abort modal actions", () => {
    test("Abort modal save", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status: "idle",
      };

      const onSubmit = vi.fn(async () => {
        return Promise.resolve(true);
      });

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());
      const router = renderComponent(onSubmit);
      await router.navigate("/test");

      const modal = await screen.findByRole("dialog");

      const saveButton = within(modal).getByRole("button", { name: "Invoer bewaren" });
      expect(saveButton).toBeVisible();
      saveButton.click();

      expect(onSubmit).toHaveBeenCalled();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/test");
      });
    });

    test("Abort modal delete", async () => {
      const onDeleteDataEntry = vi.fn(async () => {
        return Promise.resolve(true);
      });
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        onDeleteDataEntry,
        status: "idle",
      };

      const onSubmit = vi.fn(async () => {
        return Promise.resolve(true);
      });

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());
      const router = renderComponent(onSubmit);
      await router.navigate("/test");

      const modal = await screen.findByRole("dialog");

      const deleteButton = within(modal).getByRole("button", { name: "Niet bewaren" });
      expect(deleteButton).toBeVisible();
      deleteButton.click();

      expect(onDeleteDataEntry).toHaveBeenCalled();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/test");
      });
    });

    test("Abort modal close", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status: "idle",
      };

      const onSubmit = vi.fn(async () => {
        return Promise.resolve(true);
      });

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());
      const router = renderComponent(onSubmit);
      await router.navigate("/test");

      const modal = await screen.findByRole("dialog");

      const closeButton = within(modal).getByRole("button", { name: "Annuleren" });
      expect(closeButton).toBeVisible();
      closeButton.click();

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(testPath);
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Data entry modal actions", () => {
    test("Data entry modal discard changes", async () => {
      const updateFormSection = vi.fn();
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        updateFormSection,
        formState: {
          current: "voters_votes_counts",
          furthest: "differences_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts,
              hasChanges: true,
            },
          },
        },
        status: "idle",
      };

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());

      const router = renderComponent(vi.fn());

      //navigate within data entry flow
      await router.navigate(testPath + "/differences");

      const modal = await screen.findByRole("dialog");
      const noSaveButton = within(modal).getByRole("button", { name: "Niet bewaren" });
      expect(noSaveButton).toBeVisible();
      noSaveButton.click();
      expect(updateFormSection).toHaveBeenCalledWith({
        hasChanges: false,
      });

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(testPath + "/differences");
      });
    });

    test("Data entry modal save changes", async () => {
      const onSubmit = vi.fn(async () => {
        return Promise.resolve(true);
      });

      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        formState: {
          current: "voters_votes_counts",
          furthest: "differences_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts,
              hasChanges: true,
            },
          },
        },
        status: "idle",
      };

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());

      const router = renderComponent(onSubmit);

      //navigate within data entry flow
      await router.navigate(testPath + "/differences");

      const modal = await screen.findByRole("dialog");
      const saveButton = within(modal).getByRole("button", { name: "Wijzigingen opslaan" });
      expect(saveButton).toBeVisible();
      saveButton.click();
      expect(onSubmit).toHaveBeenCalled();

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(testPath + "/differences");
      });
    });

    test("Data entry modal close", async () => {
      const updateFormSection = vi.fn();
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        updateFormSection,
        formState: {
          current: "voters_votes_counts",
          furthest: "differences_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts,
              hasChanges: true,
            },
          },
        },
        status: "idle",
      };

      vi.mocked(useDataEntryContext).mockReturnValue(state);
      vi.mocked(useUser).mockReturnValue(getDefaultUser());

      const router = renderComponent(vi.fn());

      //navigate within data entry flow
      await router.navigate(testPath + "/differences");

      const modal = await screen.findByRole("dialog");
      const closeButton = within(modal).getByRole("button", { name: "Annuleren" });
      expect(closeButton).toBeVisible();
      closeButton.click();

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(testPath);
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
