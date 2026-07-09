import { useState } from "react";
import { type AnyApiError, isSuccess } from "@/api/ApiResult.ts";
import { useApiClient } from "@/api/useApiClient.ts";
import { PageTitle } from "@/components/page_title/PageTitle.tsx";
import { t } from "@/i18n/translate";
import type { BackupResponse, CREATE_BACKUP_REQUEST_PATH } from "@/types/generated/openapi.ts";
import { BackupsPageContent } from "./BackupsPageContent.tsx";

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

  const errorMessage = error ? ("reference" in error ? t(`error.api_error.${error.reference}`) : error.message) : null;

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
          <BackupsPageContent
            isLoading={isLoading}
            errorMessage={errorMessage}
            lastBackupAt={lastBackupAt}
            onCreateBackup={() => void handleCreateBackup()}
          />
        </article>
      </main>
    </>
  );
}
