import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, type Mock, test, vi } from "vitest";

import { dataEntryValidGetMockResponse, subCommitteeSource } from "@/testing/api-mocks/DataEntryMockData";
import { DataEntryResetHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen, spyOnHandler } from "@/testing/test-utils";
import type {
  CommitteeSessionStatus,
  DATA_ENTRY_RESET_REQUEST_PATH,
  DataEntrySource,
  DataEntryStatusName,
} from "@/types/generated/openapi";

import { ReadOnlyDataEntryDelete } from "./ReadOnlyDataEntryDelete";

function renderComponent(
  status: DataEntryStatusName,
  committeeSessionStatus: CommitteeSessionStatus,
  dataEntrySource = dataEntryValidGetMockResponse.source,
) {
  const onDeleted = vi.fn();
  const onError = vi.fn();

  render(
    <ReadOnlyDataEntryDelete
      dataEntrySource={dataEntrySource}
      dataEntryId={5}
      status={status}
      committeeSessionStatus={committeeSessionStatus}
      onDeleted={onDeleted}
      onError={onError}
    ></ReadOnlyDataEntryDelete>,
  );
  return { onDeleted, onError };
}

describe("ReadOnlyDataEntryDelete", () => {
  let deleteDataEntry: Mock;

  beforeEach(() => {
    server.use(DataEntryResetHandler);
    deleteDataEntry = spyOnHandler(DataEntryResetHandler);
  });

  describe.each<[string, DataEntrySource]>([
    ["37", dataEntryValidGetMockResponse.source],
    ["Juinen", subCommitteeSource],
  ])("for stembureau %s", (label, source) => {
    const question = `Weet je zeker dat je de invoer voor stembureau ${label} wilt verwijderen?`;
    const oneEntryText = `${question} Deze actie kan niet worden teruggedraaid.`;
    const twoEntriesText = `${question} Let op: zowel de eerste als de tweede invoer wordt verwijderd. Deze actie kan niet worden teruggedraaid.`;
    const completedText = `${question} Let op: het proces-verbaal en andere documenten van deze zitting worden ook verwijderd en kunnen niet meer uit Abacus worden gedownload. Deze actie kan niet worden teruggedraaid.`;
    test.each<[DataEntryStatusName, CommitteeSessionStatus, string]>([
      ["first_entry_finalised", "data_entry", oneEntryText],
      ["second_entry_in_progress", "data_entry", twoEntriesText],
      ["first_entry_correction", "data_entry", twoEntriesText],
      ["second_entry_correction", "data_entry", twoEntriesText],
      ["definitive", "data_entry", twoEntriesText],
      ["definitive", "completed", completedText],
    ])("delete after confirm for data entry status %s and committee session status %s", async (status, committeeSessionStatus, text) => {
      const { onDeleted } = renderComponent(status, committeeSessionStatus, source);

      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Invoer verwijderen" }));

      expect(await screen.findByRole("dialog")).toBeInTheDocument();

      const modal = await screen.findByTestId("modal-dialog");
      expect(modal).toHaveTextContent(text);

      await user.click(screen.getByRole("button", { name: "Verwijder invoer" }));
      expect(deleteDataEntry).toHaveBeenCalledOnce();
      expect(onDeleted).toHaveBeenCalledOnce();
    });
  });

  test("cancel delete", async () => {
    const { onDeleted } = renderComponent("first_entry_finalised", "data_entry");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Invoer verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Annuleren" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteDataEntry).not.toHaveBeenCalledOnce();
    expect(onDeleted).not.toHaveBeenCalledOnce();
  });

  test("on error", async () => {
    overrideOnce("delete", "/api/data_entries/5" satisfies DATA_ENTRY_RESET_REQUEST_PATH, 401, {
      error: "Invalid session",
      fatal: false,
      reference: "InvalidSession",
    });

    const { onDeleted, onError } = renderComponent("first_entry_finalised", "data_entry");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Invoer verwijderen" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Verwijder invoer" }));

    expect(onError).toHaveBeenCalledOnce();
    expect(onDeleted).not.toHaveBeenCalledOnce();
  });
});
