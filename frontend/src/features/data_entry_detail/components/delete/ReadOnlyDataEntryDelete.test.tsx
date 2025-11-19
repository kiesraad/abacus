import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, Mock, test, vi } from "vitest";

import { pollingStationMockData } from "@/testing/api-mocks/PollingStationMockData";
import { PollingStationDataEntriesAndResultDeleteHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";
import {
  DataEntryStatusName,
  POLLING_STATION_DATA_ENTRIES_AND_RESULT_DELETE_REQUEST_PATH,
} from "@/types/generated/openapi";

import { ReadOnlyDataEntryDelete } from "./ReadOnlyDataEntryDelete";

function renderComponent(status: DataEntryStatusName) {
  const onDeleted = vi.fn();
  const onError = vi.fn();
  render(
    <ReadOnlyDataEntryDelete
      pollingStation={pollingStationMockData[4]!}
      status={status}
      onDeleted={onDeleted}
      onError={onError}
    ></ReadOnlyDataEntryDelete>,
  );
  return { onDeleted, onError };
}

describe("ReadOnlyDataEntryDelete", () => {
  let deleteDataEntry: Mock;

  beforeEach(() => {
    server.use(PollingStationDataEntriesAndResultDeleteHandler);
    deleteDataEntry = spyOnHandler(PollingStationDataEntriesAndResultDeleteHandler);
  });

  test("delete after confirm", async () => {
    const { onDeleted } = renderComponent("second_entry_not_started");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Invoer verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const modal = await screen.findByTestId("modal-dialog");
    expect(modal).toHaveTextContent(
      "Weet je zeker dat je de invoer voor stembureau 37 wilt verwijderen? Deze actie kan niet worden teruggedraaid.",
    );

    await user.click(screen.getByRole("button", { name: "Verwijder invoer" }));
    expect(deleteDataEntry).toHaveBeenCalledOnce();
    expect(onDeleted).toHaveBeenCalledOnce();
  });

  test("Renders different text when there are 2 data entries", async () => {
    const { onDeleted } = renderComponent("definitive");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Invoer verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const modal = await screen.findByTestId("modal-dialog");
    expect(modal).toHaveTextContent(
      "Weet je zeker dat je de invoer voor stembureau 37 wilt verwijderen? Let op: zowel de eerste als de tweede invoer wordt verwijderd. Deze actie kan niet worden teruggedraaid.",
    );

    await user.click(screen.getByRole("button", { name: "Verwijder invoer" }));
    expect(deleteDataEntry).toHaveBeenCalledOnce();
    expect(onDeleted).toHaveBeenCalledOnce();
  });

  test("cancel delete", async () => {
    const { onDeleted } = renderComponent("second_entry_not_started");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Invoer verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Annuleren" })[0]!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteDataEntry).not.toHaveBeenCalledOnce();
    expect(onDeleted).not.toHaveBeenCalledOnce();
  });

  test("on error", async () => {
    overrideOnce(
      "delete",
      "/api/polling_stations/5/data_entries" satisfies POLLING_STATION_DATA_ENTRIES_AND_RESULT_DELETE_REQUEST_PATH,
      401,
      {
        error: "Invalid session",
        fatal: false,
        reference: "InvalidSession",
      },
    );

    const { onDeleted, onError } = renderComponent("second_entry_not_started");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Invoer verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Verwijder invoer" }));

    expect(onError).toHaveBeenCalledOnce();
    expect(onDeleted).not.toHaveBeenCalledOnce();
  });
});
