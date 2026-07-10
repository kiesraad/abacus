import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { describe, expect, test } from "vitest";

import { server } from "@/testing/server";
import { render, screen, spyOnHandler, waitFor } from "@/testing/test-utils";
import type {
  BackupResponse,
  CREATE_BACKUP_REQUEST_PARAMS,
  CREATE_BACKUP_REQUEST_PATH,
  ErrorResponse,
} from "@/types/generated/openapi";
import { formatTime } from "@/utils/dateTime";

import { BackupsPage } from "./BackupsPage.tsx";

const createdAt = new Date(2026, 6, 7, 0, 0).toISOString();

const CreateBackupRequestHandler = http.post<CREATE_BACKUP_REQUEST_PARAMS, null, BackupResponse>(
  "/api/backup" satisfies CREATE_BACKUP_REQUEST_PATH,
  () =>
    HttpResponse.json(
      {
        created_at: createdAt,
        filename: "db_backup_2026-07-07_00-00-00.sqlite",
      },
      { status: 201 },
    ),
);

describe("BackupsPage", () => {
  test("Shows page content", () => {
    render(<BackupsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Database backups" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Nu backup maken" })).toBeVisible();
  });

  test("Creates a backup: success", async () => {
    const user = userEvent.setup();
    server.use(CreateBackupRequestHandler);
    const createBackup = spyOnHandler(CreateBackupRequestHandler);

    render(<BackupsPage />);

    const button = await screen.findByRole("button", { name: "Nu backup maken" });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(screen.getByText("backup aan het maken")).toBeVisible();

    await waitFor(() => {
      expect(createBackup).toHaveBeenCalledExactlyOnceWith(null);
    });

    await waitFor(() => {
      expect(button).toBeEnabled();
    });
    expect(screen.queryByText("backup aan het maken")).not.toBeInTheDocument();
    expect(screen.getByText(`Laatste backup gemaakt om ${formatTime(new Date(createdAt))}`)).toBeVisible();
  });

  test("Creates a backup: error", async () => {
    const user = userEvent.setup();
    server.use(
      http.post<CREATE_BACKUP_REQUEST_PARAMS, null, ErrorResponse>(
        "/api/backup" satisfies CREATE_BACKUP_REQUEST_PATH,
        () =>
          HttpResponse.json(
            {
              error: "Backup already exists",
              fatal: false,
              reference: "BackupAlreadyExists",
            },
            { status: 409 },
          ),
      ),
    );

    render(<BackupsPage />);

    await user.click(await screen.findByRole("button", { name: "Nu backup maken" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "De backup met deze naam bestaat al, probeer het later opnieuw",
    );
    expect(screen.queryByText(/Laatste backup gemaakt om/)).not.toBeInTheDocument();
  });
});
