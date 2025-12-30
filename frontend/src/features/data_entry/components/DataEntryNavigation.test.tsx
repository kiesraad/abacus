import { render, screen, waitFor, within } from "@testing-library/react";
import * as ReactRouter from "react-router";
import { describe, expect, test, vi } from "vitest";

import * as useUser from "@/hooks/user/useUser";
import { setupTestRouter } from "@/testing/test-utils";
import { getTypistUser } from "@/testing/user-mock-data";

import * as useDataEntryContext from "../hooks/useDataEntryContext";
import { getDefaultDataEntryState, getDefaultDataEntryStateAndActionsLoaded } from "../testing/mock-data";
import { DataEntryStateAndActionsLoaded, Status, SubmitCurrentFormOptions } from "../types/types";
import { DataEntryNavigation } from "./DataEntryNavigation";

const baseMockData = getDefaultDataEntryStateAndActionsLoaded();
const testPath = `/elections/${baseMockData.election.id}/data-entry/${baseMockData.pollingStationId}/1`;

function renderComponent(onSubmit: (options?: SubmitCurrentFormOptions) => Promise<boolean>) {
  const router = setupTestRouter([
    {
      path: "/",
      element: <ReactRouter.Navigate to={testPath} replace />,
      handle: { public: true },
    },
    {
      path: "/elections/:electionId/data-entry/:pollingStationId/:entryNumber",
      element: <DataEntryNavigation onSubmit={onSubmit} />,
      children: [{ path: "differences_counts", element: <div>Differences</div>, handle: { public: true } }],
    },
    {
      path: "/test",
      element: <div>Test</div>,
      handle: { public: true },
    },
  ]);

  render(<ReactRouter.RouterProvider router={router} />);
  return router;
}

describe("DataEntryNavigation", () => {
  describe("Blocker behaviour", () => {
    test.each<Status>([
      "deleted",
      "finalised",
      "finalising",
      "aborted",
    ])("Does not block navigation for status: %s", async (status) => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status,
      };

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "test" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(vi.fn());

      await router.navigate("/test");
      expect(router.state.location.pathname).toBe("/test");
    });

    test.each<Status>([
      "idle",
      "saving",
      "deleting",
    ])("Does not block navigation without changes for status: %s", async (status) => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status,
      };

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "differences_counts" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(vi.fn());

      await router.navigate(`${testPath}/differences_counts`);
      expect(router.state.location.pathname).toBe(`${testPath}/differences_counts`);
    });

    test.each<Status>([
      "idle",
      "saving",
      "deleting",
    ])("Blocks navigation when form has changes for status: %s", async (status) => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        formState: {
          furthest: "differences_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts!,
              hasChanges: true,
            },
          },
        },
        status,
      };

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "voters_votes_counts" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(vi.fn());

      //navigate within data entry flow
      await router.navigate(`${testPath}/differences_counts`);
      expect(router.state.location.pathname).toBe(testPath);

      const modal = await screen.findByRole("dialog");
      expect(modal).toBeVisible();
      const title = within(modal).getByText("Let op: niet opgeslagen wijzigingen");
      expect(title).toBeVisible();
    });

    test("Does not block navigation if user is null", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status: "idle",
      };

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "test" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(null);

      const router = renderComponent(vi.fn());
      await router.navigate("/test");

      expect(router.state.location.pathname).toBe("/test");
    });

    test("Does not block when navigating to the same page", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status: "idle",
      };

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "test" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(vi.fn());
      await router.navigate(testPath);

      expect(router.state.location.pathname).toBe(testPath);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    test("Sets cache when form has changes and section is furthest", async () => {
      const setCache = vi.fn();
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        setCache,
        formState: {
          furthest: "voters_votes_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts!,
              hasChanges: true,
            },
          },
        },
        status: "idle",
      };

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "voters_votes_counts" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(vi.fn());

      //navigate within data entry flow
      await router.navigate(`${testPath}/differences_counts`);
      expect(setCache).toHaveBeenCalled();
      expect(router.state.location.pathname).toBe(`${testPath}/differences_counts`);
    });
  });

  describe("Abort modal actions", () => {
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

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "test" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(onSubmit);
      await router.navigate("/test");

      const modal = await screen.findByRole("dialog");

      const deleteButton = within(modal).getByRole("button", { name: "Verwijder invoer" });
      expect(deleteButton).toBeVisible();
      deleteButton.click();

      expect(onDeleteDataEntry).toHaveBeenCalled();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/test");
      });
    });

    test("Abort modal save", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status: "idle",
      };

      const onSubmit = vi.fn(async () => {
        return Promise.resolve(true);
      });

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "test" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

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

    test("Abort modal save, sectionId save", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status: "idle",
      };

      const onSubmit = vi.fn(async () => {
        return Promise.resolve(true);
      });

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "save" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(onSubmit);
      await router.navigate("/test");

      const modal = await screen.findByRole("dialog");

      const saveButton = within(modal).getByRole("button", { name: "Invoer bewaren" });
      expect(saveButton).toBeVisible();
      saveButton.click();

      expect(onSubmit).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe("/test");
      });
    });

    test("Abort modal save, onSubmit false", async () => {
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        status: "idle",
      };

      const onSubmit = vi.fn(async () => {
        return Promise.resolve(false);
      });

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "test" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(onSubmit);
      await router.navigate("/test");

      const modal = await screen.findByRole("dialog");

      const saveButton = within(modal).getByRole("button", { name: "Invoer bewaren" });
      saveButton.click();
      await waitFor(() => {
        expect(router.state.location.pathname).toBe(testPath);
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

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "test" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(onSubmit);
      await router.navigate("/test");

      const modal = await screen.findByRole("dialog");

      const closeButton = within(modal).getByRole("button", { name: "Venster sluiten" });
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
          furthest: "differences_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts!,
              hasChanges: true,
            },
          },
        },
        status: "idle",
      };

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "voters_votes_counts" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(vi.fn());

      //navigate within data entry flow
      await router.navigate(`${testPath}/differences_counts`);

      const modal = await screen.findByRole("dialog");
      const noSaveButton = within(modal).getByRole("button", { name: "Niet bewaren" });
      expect(noSaveButton).toBeVisible();
      noSaveButton.click();
      expect(updateFormSection).toHaveBeenCalledWith("voters_votes_counts", {
        hasChanges: false,
      });

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(`${testPath}/differences_counts`);
      });
    });

    test("Data entry modal save changes", async () => {
      const onSubmit = vi.fn(async () => {
        return Promise.resolve(true);
      });

      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        formState: {
          furthest: "differences_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts!,
              hasChanges: true,
            },
          },
        },
        status: "idle",
      };

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "voters_votes_counts" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(onSubmit);

      //navigate within data entry flow
      await router.navigate(`${testPath}/differences_counts`);

      const modal = await screen.findByRole("dialog");
      const saveButton = within(modal).getByRole("button", { name: "Wijzigingen opslaan" });
      expect(saveButton).toBeVisible();
      saveButton.click();
      expect(onSubmit).toHaveBeenCalled();

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(`${testPath}/differences_counts`);
      });
    });

    test("Data entry modal close", async () => {
      const updateFormSection = vi.fn();
      const state: DataEntryStateAndActionsLoaded = {
        ...getDefaultDataEntryStateAndActionsLoaded(),
        updateFormSection,
        formState: {
          furthest: "differences_counts",
          sections: {
            ...getDefaultDataEntryState().formState.sections,
            voters_votes_counts: {
              ...getDefaultDataEntryState().formState.sections.voters_votes_counts!,
              hasChanges: true,
            },
          },
        },
        status: "idle",
      };

      vi.spyOn(ReactRouter, "useParams").mockReturnValue({ sectionId: "voters_votes_counts" });
      vi.spyOn(useDataEntryContext, "useDataEntryContext").mockReturnValue(state);
      vi.spyOn(useUser, "useUser").mockReturnValue(getTypistUser());

      const router = renderComponent(vi.fn());

      //navigate within data entry flow
      await router.navigate(`${testPath}/differences_counts`);

      const modal = await screen.findByRole("dialog");
      const closeButton = within(modal).getByRole("button", { name: "Venster sluiten" });
      expect(closeButton).toBeVisible();
      closeButton.click();

      await waitFor(() => {
        expect(router.state.location.pathname).toBe(testPath);
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
