import { useState } from "react";
import { type AnyApiError, isSuccess } from "@/api/ApiResult.ts";
import { useApiClient } from "@/api/useApiClient.ts";
import { PageTitle } from "@/components/page_title/PageTitle.tsx";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button.tsx";
import { Spinner } from "@/components/ui/Spinner/Spinner.tsx";
import { t, tx } from "@/i18n/translate";
import type { BackupResponse, CREATE_BACKUP_REQUEST_PATH } from "@/types/generated/openapi.ts";
import { formatTime } from "@/utils/dateTime.ts";
import cls from "./BackupsPage.module.css";

const MIN_LOADING_MS = 1000; // Time the loading state should at least remain visible
const BACKUP_PATH: CREATE_BACKUP_REQUEST_PATH = `/api/backup`;

export function BackupsPage() {
  const client = useApiClient();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AnyApiError | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<Date | null>(null);

  async function handleCreateBackup() {
    setIsLoading(true);
    setError(null);

    const [response] = await Promise.all([
      client.postRequest<BackupResponse>(BACKUP_PATH),
      new Promise<void>((resolve) => setTimeout(resolve, MIN_LOADING_MS)),
    ]);

    setIsLoading(false);

    if (isSuccess(response)) {
      setLastBackupAt(new Date(response.data.created_at));
    } else {
      setError(response);
    }
  }

  return (
    <>
      <PageTitle title={`${t("backups.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("backups.title")}</h1>
        </section>
      </header>

      <main>
        <article>
          <h2>{t("backups.subtitle")}</h2>

          <div className="mb-lg">{tx("backups.description")}</div>

          {error && (
            <Alert type="error" small margin="mb-lg">
              {"reference" in error ? t(`error.api_error.${error.reference}`) : error.message}
            </Alert>
          )}

          <div className={cls.actions}>
            <Button
              type="button"
              size="xl"
              variant="primary"
              onClick={() => void handleCreateBackup()}
              disabled={isLoading}
            >
              {t("backups.create_backup_button")}
            </Button>

            {isLoading && (
              <div className={cls.status}>
                <Spinner />
                <span>{t("backups.running")}</span>
              </div>
            )}

            {lastBackupAt && !isLoading && !error && (
              <div className={cls.status}>{t("backups.last", { time: formatTime(lastBackupAt) })}</div>
            )}
          </div>
        </article>
      </main>
    </>
  );
}
