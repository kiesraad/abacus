import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import { getCSBElectionMockData } from "@/testing/api-mocks/ElectionMockData";
import { overrideOnce } from "@/testing/server";
import { renderReturningRouter, screen, within } from "@/testing/test-utils";
import type {
  CSBDataEntryImportValidateResponse,
  ErrorReference,
  ErrorResponse,
  RedactedEmlHash,
  SubCommitteeFirstSession,
} from "@/types/generated/openapi";

import { DataEntryImportPage } from "./DataEntryImportPage";

const electionId = 2;
const electionName = "Gemeenteraad Heemdamseburg 2026";
const electionPath = `/api/elections/${electionId}`;
const validatePath = `${electionPath}/data_entry/import/validate`;
const importPath = `${electionPath}/data_entry/import`;

const subCommittee: SubCommitteeFirstSession = {
  committee_session_id: 1,
  id: 1,
  number: 35,
  name: "Heemdamseburg",
  authority_id: "0035",
  authority_name: "Heemdamseburg",
  data_entry_id: 1,
};

const redactedHash: RedactedEmlHash = {
  chunks: [
    "5497",
    "947b",
    "9664",
    "d818",
    "2120",
    "",
    "9e05",
    "ce5b",
    "12bd",
    "3430",
    "",
    "778a",
    "cc6a",
    "253f",
    "78c2",
    "64f6",
  ],
  redacted_indexes: [5, 10],
};

const validateResponse: CSBDataEntryImportValidateResponse = {
  election_name: electionName,
  election_date: "2026-11-30",
  sub_committee: subCommittee,
  hash: redactedHash,
};

function errorResponse(reference: ErrorReference, errorMessage: string = reference): ErrorResponse {
  return { error: errorMessage, fatal: false, reference };
}

const pushMessage = vi.fn();

function renderPage() {
  return renderReturningRouter(
    <ElectionProvider electionId={electionId}>
      <DataEntryImportPage />
    </ElectionProvider>,
  );
}

async function selectFile(user: ReturnType<typeof userEvent.setup>) {
  const input = await screen.findByLabelText("Bestand kiezen");
  await user.upload(input, new File(["content"], "tellingsbestand_510b.zip", { type: "application/zip" }));
}

async function enterHashStubs(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Controle deel 1"), "c6ae");
  await user.type(screen.getByLabelText("Controle deel 2"), "b44a");
  await user.click(screen.getByRole("button", { name: "Volgende" }));
}

describe("DataEntryImportPage", () => {
  beforeEach(() => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage,
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
    overrideOnce("get", electionPath, 200, getCSBElectionMockData());
  });

  test("imports a GSB count file (510b) from start to finish", async () => {
    const user = userEvent.setup();
    const router = renderPage();

    expect(await screen.findByRole("heading", { level: 1, name: "Importeer tellingsbestand" })).toBeVisible();

    // 1. Select file - POST to validatePath is made without a hash.
    overrideOnce("post", validatePath, 200, validateResponse);
    await selectFile(user);
    expect(await screen.findByRole("heading", { name: "Controleer tellingsbestand" })).toBeVisible();
    expect(screen.getByText("tellingsbestand_510b.zip")).toBeVisible();
    expect(screen.getByText(electionName)).toBeVisible();

    // 2. Complete check hash form - POST to validatePath contains completed hash.
    overrideOnce("post", validatePath, 200, validateResponse);
    await enterHashStubs(user);
    expect(await screen.findByRole("heading", { name: "Controleren en opslaan" })).toBeVisible();
    expect(screen.getByText(electionName)).toBeVisible();
    expect(screen.getByText("Gemeentelijk stembureau")).toBeVisible();
    expect(screen.getByText(/Heemdamseburg \(0035\)/)).toBeVisible();

    // 3. Check and save.
    overrideOnce("post", importPath, 200, {
      election_name: electionName,
      election_date: "2026-11-30",
      sub_committee: subCommittee,
    });
    await user.click(screen.getByRole("button", { name: "Opslaan" }));
    expect(pushMessage).toHaveBeenCalledWith({ title: "Tellingsbestand GSB Heemdamseburg geïmporteerd" });
    expect(router.state.location.pathname).toEqual(`/elections/${electionId}/status`);
  });

  describe("import validation errors", () => {
    test.each([
      { status: 422, reference: "ZipError", title: "Geen geldig ZIP-bestand" },
      { status: 422, reference: "InvalidCountType", title: "Geen tellingsbestand EML 510b" },
      { status: 422, reference: "EmlImportError", title: "Tellingsbestand hoort niet bij dit CSB" },
      { status: 422, reference: "UnknownCommittee", title: "Tellingsbestand hoort niet bij dit CSB" },
      { status: 422, reference: "DataEntryAlreadyImported", title: "Telresultaten GSB al geïmporteerd" },
      { status: 422, reference: "DataEntryNotAllowed", title: "GSB al ingevoerd" },
      { status: 422, reference: "DataEntryValidationErrors", title: "Tellingsbestand bevat fouten" },
      { status: 422, reference: "EmlError", title: "Tellingsbestand bevat fouten" },
      { status: 422, reference: "InvalidCommitteeSessionStatus", title: "Importeren niet gelukt" },
      { status: 500, reference: "InternalServerError", title: "Importeren niet gelukt" },
    ] satisfies {
      status: number;
      reference: ErrorReference;
      title: string;
    }[])("shows the expected message for $reference", async ({ status, reference, title }) => {
      const user = userEvent.setup();
      renderPage();

      overrideOnce("post", validatePath, status, errorResponse(reference));
      await selectFile(user);

      const alert = await screen.findByRole("alert");
      expect(within(alert).getByText(title)).toBeVisible();
      expect(screen.getByLabelText("Bestand kiezen")).toBeVisible();
    });

    test("shows the upload limit reported by the backend when the file is too large", async () => {
      const user = userEvent.setup();
      renderPage();

      overrideOnce("post", validatePath, 413, errorResponse("RequestPayloadTooLarge", "12"));
      await selectFile(user);

      const alert = await screen.findByRole("alert");
      expect(within(alert).getByText("Het bestand is te groot")).toBeVisible();
      expect(alert).toHaveTextContent("tellingsbestand_510b.zip");
      expect(alert).toHaveTextContent("maximaal 12 Megabyte");
      expect(screen.getByLabelText("Bestand kiezen")).toBeVisible();
    });
  });

  test("invalid hash does not let the user advance and shows message", async () => {
    const user = userEvent.setup();
    renderPage();

    overrideOnce("post", validatePath, 200, validateResponse);
    await selectFile(user);
    expect(await screen.findByRole("heading", { name: "Controleer tellingsbestand" })).toBeVisible();

    overrideOnce("post", validatePath, 400, errorResponse("InvalidHash"));
    await enterHashStubs(user);

    // See frontend/src/components/check_hash/CheckHash.test.tsx for more tests.
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Controleer tellingsbestand" })).toBeVisible();
  });

  test("shows failed import of final submit as message on status page", async () => {
    const user = userEvent.setup();
    const router = renderPage();

    overrideOnce("post", validatePath, 200, validateResponse);
    await selectFile(user);
    overrideOnce("post", validatePath, 200, validateResponse);
    await enterHashStubs(user);
    expect(await screen.findByRole("heading", { name: "Controleren en opslaan" })).toBeVisible();

    overrideOnce("post", importPath, 422, errorResponse("DataEntryNotAllowed"));
    await user.click(screen.getByRole("button", { name: "Opslaan" }));

    expect(pushMessage).toHaveBeenCalledWith({
      type: "error",
      title: "GSB al ingevoerd",
      text: expect.anything() as unknown,
    });
    expect(router.state.location.pathname).toEqual(`/elections/${electionId}/status`);
  });

  test("abort navigates back to the election status page", async () => {
    const user = userEvent.setup();
    const router = renderPage();

    await user.click(await screen.findByRole("button", { name: "Importeren afbreken" }));
    expect(router.state.location.pathname).toEqual(`/elections/${electionId}/status`);
  });
});
