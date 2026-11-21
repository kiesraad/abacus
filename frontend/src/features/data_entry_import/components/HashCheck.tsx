import { CheckHash } from "@/components/check_hash/CheckHash";
import { t, tx } from "@/i18n/translate";
import type { RedactedEmlHash, SubCommitteeFirstSession } from "@/types/generated/openapi";
import { getAreaDesignation } from "@/utils/election";

export interface HashCheckProps {
  title: string;
  fileName: string;
  subCommittee: SubCommitteeFirstSession;
  hash: RedactedEmlHash;
  error: string | undefined;
  onSubmit: (chunks: string[]) => void;
}

export function HashCheck({ title, fileName, subCommittee, hash, error, onSubmit }: HashCheckProps) {
  return (
    <CheckHash
      title={title}
      subtitle={getAreaDesignation(subCommittee, true)}
      header={t("data_entry_import.hash_check.title")}
      description={tx("data_entry_import.hash_check.description", {
        file: () => <strong>{fileName}</strong>,
      })}
      instructions={t("data_entry_import.hash_check.instructions", { authorityName: subCommittee.authority_name })}
      signatureCorrect={true}
      errorTitle={t("data_entry_import.hash_check.error.title")}
      errorDescription={t("data_entry_import.hash_check.error.description")}
      redactedHash={hash}
      error={error}
      onSubmit={onSubmit}
    />
  );
}
