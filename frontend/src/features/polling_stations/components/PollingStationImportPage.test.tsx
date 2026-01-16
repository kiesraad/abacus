import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import * as useMessages from "@/hooks/messages/useMessages";
import { pollingStationRequestMockData } from "@/testing/api-mocks/PollingStationRequestMockData";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";
import * as uploadFileSize from "@/utils/uploadFileSize";
import { PollingStationImportPage } from "./PollingStationImportPage";

async function renderPage() {
  render(
    <ElectionProvider electionId={1}>
      <PollingStationImportPage />
    </ElectionProvider>,
  );

  // Ensure rendering is complete
  expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus importeren" })).toBeVisible();
}

async function uploadFile(file: File) {
  const user = userEvent.setup();

  const input = await screen.findByLabelText("Bestand kiezen");
  expect(input).toBeVisible();
  expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();
  await user.upload(input, file);
}

const filename = "foo.txt";
const file = new File(["foo"], filename, { type: "text/plain" });

describe("PollingStationImportPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage: vi.fn(),
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
  });

  test("Shows form", async () => {
    await renderPage();
  });

  test("Upload an incorrect file", async () => {
    overrideOnce("post", "/api/elections/1/polling_stations/validate-import", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    await renderPage();
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldig stembureaubestand");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Het bestand foo.txt bevat geen geldige lijst met stembureaus. Kies een ander bestand.",
    );
  });

  test("It shows error when frontend determines polling stations file is too large", async () => {
    vi.spyOn(uploadFileSize, "isFileTooLarge").mockResolvedValueOnce(true);

    await renderPage();
    await uploadFile(file);

    expect(screen.getByLabelText("Geen bestand gekozen")).toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldig stembureaubestand");
    expect(screen.getByRole("alert")).toHaveTextContent(
      `Het bestand ${filename} is te groot. Kies een bestand van maximaal 5 Megabyte`,
    );
  });

  test("It shows error when backend determines polling stations file is too large", async () => {
    overrideOnce("post", "/api/elections/1/polling_stations/validate-import", 413, {
      error: "15",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    await renderPage();
    await uploadFile(file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Ongeldig stembureaubestand");
    expect(screen.getByRole("alert")).toHaveTextContent(
      `Het bestand ${filename} is te groot. Kies een bestand van maximaal 5 Megabyte`,
    );
  });

  test("Upload a file, show preview", async () => {
    overrideOnce("post", "/api/elections/1/polling_stations/validate-import", 200, {
      polling_stations: pollingStationRequestMockData,
    });

    await renderPage();
    await uploadFile(file);

    // Check the overview table
    expect(await screen.findByRole("table")).toBeVisible();
    expect(await screen.findAllByRole("row")).toHaveLength(10);
  });
});
