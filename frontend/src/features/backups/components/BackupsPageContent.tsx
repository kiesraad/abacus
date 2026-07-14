import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { t, tx } from "@/i18n/translate";
import { formatTime } from "@/utils/dateTime";
import cls from "./BackupsPageContent.module.css";

interface BackupsPageContentProps {
  isLoading: boolean;
  errorMessage: string | null;
  lastBackupAt: Date | null;
  onCreateBackup: () => void;
}

export function BackupsPageContent({ isLoading, errorMessage, lastBackupAt, onCreateBackup }: BackupsPageContentProps) {
  return (
    <>
      <h2>{t("backups.subtitle")}</h2>

      <div className="mb-lg">{tx("backups.description")}</div>

      {errorMessage && (
        <Alert type="error" small margin="mb-lg">
          {errorMessage}
        </Alert>
      )}

      <div className={cls.actions}>
        <Button type="button" size="xl" variant="primary" onClick={onCreateBackup} disabled={isLoading}>
          {t("backups.create_backup_button")}
        </Button>

        {isLoading && (
          <div className={cls.status}>
            <Spinner />
            <span>{t("backups.running")}</span>
          </div>
        )}

        {lastBackupAt && !isLoading && !errorMessage && (
          <div className={cls.status}>{t("backups.last", { time: formatTime(lastBackupAt) })}</div>
        )}
      </div>
    </>
  );
}
