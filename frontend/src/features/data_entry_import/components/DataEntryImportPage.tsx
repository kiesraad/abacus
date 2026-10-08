import type { ReactElement } from "react";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { useDataEntryImport } from "@/features/data_entry_import/hooks/useDataEntryImport";
import { t } from "@/i18n/translate";
import { CheckAndSave } from "./CheckAndSave";
import { HashCheck } from "./HashCheck";
import { ImportFileForm } from "./ImportFileForm";

export function DataEntryImportPage() {
  const { state, onFileChange, onHashSubmit, onFinalSubmit, onAbort } = useDataEntryImport();

  function getContent(): ReactElement {
    switch (state.status) {
      case "idle":
        return <ImportFileForm error={state.error} onFileChange={(file) => void onFileChange(file)} />;
      case "hash_check":
        return (
          <HashCheck
            date={state.electionDate}
            title={state.electionName}
            fileName={state.file.name}
            fileAuthorityName={state.subCommittee.authority_name}
            hash={state.hash}
            error={state.error}
            onSubmit={(chunks) => void onHashSubmit(chunks)}
          />
        );
      case "check_and_save":
        return (
          <CheckAndSave
            electionName={state.electionName}
            subCommittee={state.subCommittee}
            onSubmit={() => void onFinalSubmit()}
          />
        );
    }
  }

  return (
    <>
      <PageTitle title={`${t("data_entry_import.title")} - Abacus`} />
      <header>
        <section className="smaller-gap">
          <h1>{t("data_entry_import.title")}</h1>
        </section>
        <section>
          <Button variant="secondary" size="sm" onClick={onAbort}>
            {t("data_entry_import.abort")}
          </Button>
        </section>
      </header>

      <main>
        <article>{getContent()}</article>
      </main>
    </>
  );
}
