import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import * as useMessages from "@/hooks/messages/useMessages";
import { ElectionProvider } from "@/hooks/election/ElectionProvider";
import { pollingStationRequestMockData } from "@/testing/api-mocks/PollingStationRequestMockData";
import { ElectionRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { render, screen } from "@/testing/test-utils";

import { PollingStationImportPage } from "./PollingStationImportPage";

describe("PollingStationImportPage", () => {
  beforeEach(() => {
    server.use(ElectionRequestHandler);
  });

  test("Shows form", async () => {
    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage: vi.fn(),
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });

    render(
      <ElectionProvider electionId={1}>
        <PollingStationImportPage />
      </ElectionProvider>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus importeren" })).toBeVisible();
  });

  test("Upload an incorrect file", async () => {
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage: vi.fn(),
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });

    overrideOnce("post", "/api/elections/1/polling_stations/validate-import", 400, {
      error: "Invalid XML",
      fatal: false,
      reference: "InvalidXml",
    });

    render(
      <ElectionProvider electionId={1}>
        <PollingStationImportPage />
      </ElectionProvider>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus importeren" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByText("Ongeldig stembureaubestand")).toBeInTheDocument();
  });

  test("Upload a too large file", async () => {
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage: vi.fn(),
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });

    overrideOnce("post", "/api/elections/1/polling_stations/validate-import", 413, {
      error: "12",
      fatal: false,
      reference: "RequestPayloadTooLarge",
    });

    render(
      <ElectionProvider electionId={1}>
        <PollingStationImportPage />
      </ElectionProvider>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus importeren" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    expect(screen.queryByLabelText("Geen bestand gekozen")).not.toBeInTheDocument();
    expect(screen.getAllByText(filename).length).toBe(2);
    expect(screen.getByText(/Kies een bestand van maximaal 12 Megabyte./i)).toBeInTheDocument();
  });

  test("Upload a file, show preview", async () => {
    const user = userEvent.setup();
    const filename = "foo.txt";
    const file = new File(["foo"], filename, { type: "text/plain" });

    vi.spyOn(useMessages, "useMessages").mockReturnValue({
      pushMessage: vi.fn(),
      popMessages: vi.fn(() => []),
      hasMessages: vi.fn(() => false),
    });
    overrideOnce("post", "/api/elections/1/polling_stations/validate-import", 200, {
      polling_stations: pollingStationRequestMockData,
    });

    render(
      <ElectionProvider electionId={1}>
        <PollingStationImportPage />
      </ElectionProvider>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Stembureaus importeren" })).toBeVisible();
    const input = await screen.findByLabelText("Bestand kiezen");
    expect(input).toBeVisible();
    expect(await screen.findByLabelText("Geen bestand gekozen")).toBeVisible();

    await user.upload(input, file);

    // Check the overview table
    expect(await screen.findByRole("table")).toBeVisible();
    expect(await screen.findAllByRole("row")).toHaveLength(10);
  });
});
