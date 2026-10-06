import { useId, useState } from "react";

import { Alert } from "@/components/ui/Alert/Alert";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t, tx } from "@/i18n/translate";

import type { FileImportError } from "../hooks/useDataEntryImport";

export interface ImportFileFormProps {
  error: FileImportError | undefined;
  onFileChange: (file: File | undefined) => void;
}

export function ImportFileForm({ error, onFileChange }: ImportFileFormProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | undefined>();

  return (
    <section className="md">
      <Form title={t("data_entry_import.import_for_entry", { entry: t("data_entry.first_entry") })}>
        <FormLayout>
          <FormLayout.Section>
            {error && (
              <Alert type="error" title={error.title} inline>
                <p>{error.message}</p>
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
        </FormLayout>
      </Form>
    </section>
  );
}
