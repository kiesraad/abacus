import { CheckHash } from "@/components/check_hash/CheckHash";
import { t, tx } from "@/i18n/translate";
import type { RedactedEmlHash, SubCommitteeFirstSession } from "@/types/generated/openapi";

export interface HashCheckProps {
  date: string;
  title: string;
  fileName: string;
  subCommittee: SubCommitteeFirstSession;
  hash: RedactedEmlHash;
  error: string | undefined;
  onSubmit: (chunks: string[]) => void;
}

export function HashCheck({ date, title, fileName, subCommittee, hash, error, onSubmit }: HashCheckProps) {
  return (
    <CheckHash
      date={date}
      title={title}
      header={t("data_entry_import.hash_check.title")}
      description={tx("data_entry_import.hash_check.description", {
        file: () => <strong>{fileName}</strong>,
      })}
      instructions={t("data_entry_import.hash_check.instructions", { authorityName: subCommittee.authority_name })}
      signatureDescription={t("data_entry_import.hash_check.signature", {
        number: subCommittee.authority_id,
        name: subCommittee.name,
      })}
      errorTitle={t("data_entry_import.hash_check.error.title")}
      errorDescription={t("data_entry_import.hash_check.error.description")}
      redactedHash={hash}
      error={error}
      onSubmit={onSubmit}
    />
  );
}
