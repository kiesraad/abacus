import { CheckHash } from "@/components/check_hash/CheckHash";
import { t, tx } from "@/i18n/translate";
import type { RedactedEmlHash } from "@/types/generated/openapi";

export interface HashCheckProps {
  date: string;
  title: string;
  fileName: string;
  fileAuthorityName: string;
  hash: RedactedEmlHash;
  error: string | undefined;
  onSubmit: (chunks: string[]) => void;
}

export function HashCheck({ date, title, fileName, fileAuthorityName, hash, error, onSubmit }: HashCheckProps) {
  return (
    <CheckHash
      date={date}
      title={title}
      header={t("data_entry_import.hash_check.title")}
      description={tx("data_entry_import.hash_check.description", {
        file: () => <strong>{fileName}</strong>,
      })}
      instructions={t("data_entry_import.hash_check.instructions", { fileAuthorityName })}
      errorTitle={t("data_entry_import.hash_check.error.title")}
      errorDescription={t("data_entry_import.hash_check.error.description")}
      redactedHash={hash}
      error={error}
      onSubmit={onSubmit}
    />
  );
}
