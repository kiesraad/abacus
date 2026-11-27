import { useId, useState } from "react";

import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { Table } from "@/components/ui/Table/Table";
import { useElectionStatus } from "@/hooks/election/useElectionStatus";
import { t, tx } from "@/i18n/translate";
import type { ElectionStatusResponseEntry, SubCommitteeFirstSession } from "@/types/generated/openapi";
import type { FileImportError } from "../hooks/useDataEntryImport";
import cls from "./DataEntryImport.module.css";

export interface ImportFileFormProps {
  error: FileImportError | undefined;
  onFileChange: (file: File | undefined) => void;
  isLoading: boolean;
}

function getSubCommitteesToBeImported(statuses: ElectionStatusResponseEntry[]): SubCommitteeFirstSession[] {
  const toBeImported = statuses.filter((status) => status.status === "empty");
  const subCommitteesToBeImported: SubCommitteeFirstSession[] = [];
  toBeImported.forEach((status) => {
    if (status.source.type === "SubCommittee") {
      subCommitteesToBeImported.push(status.source);
    }
  });
  return subCommitteesToBeImported;
}

export function ImportFileForm({ error, onFileChange, isLoading }: ImportFileFormProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | undefined>();
  const { statuses } = useElectionStatus();
  const subCommitteesToBeImported = getSubCommitteesToBeImported(statuses);

  return (
    <section className="md">
      {subCommitteesToBeImported.length > 0 && subCommitteesToBeImported[0] ? (
        <Form title={t("data_entry_import.import_for_entry", { entry: t("data_entry.first_entry") })}>
          <FormLayout disabled={isLoading}>
            <FormLayout.Section>
              {error && (
                <Alert type="error" title={error.title} inline>
                  {error.message}
                </Alert>
              )}
              {tx("data_entry_import.instructions")}
              <FileInput
                id={inputId}
                file={file}
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  setFile(selectedFile);
                  onFileChange(selectedFile);
                }}
              >
                {t("select_file")}
              </FileInput>
            </FormLayout.Section>
            <FormLayout.Section title={`${t("data_entry_import.still_to_import")}:`}>
              <Table id="sub_committees_to_be_imported">
                <Table.Header>
                  <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
                  <Table.HeaderCell>
                    {t(`committee_category.${subCommitteesToBeImported[0].category}.short`)}
                  </Table.HeaderCell>
                </Table.Header>
                <Table.Body className="fs-md">
                  {subCommitteesToBeImported.map((subcommittee) => (
                    <Table.Row key={subcommittee.id}>
                      <Table.NumberCell className="bold">{subcommittee.authority_id}</Table.NumberCell>
                      <Table.Cell className="break-word">{subcommittee.authority_name}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </FormLayout.Section>
          </FormLayout>
        </Form>
      ) : (
        <div>
          <h2>{t("data_entry_import.all_files_imported.title")}</h2>
          <p className={cls.all_files_imported}>
            <span>{t("data_entry_import.all_files_imported.description")}</span>
            <Button.Link size="md" to={`../../status`}>
              {t("data_entry_import.all_files_imported.to_status_overview")}
            </Button.Link>
          </p>
        </div>
      )}
    </section>
  );
}
