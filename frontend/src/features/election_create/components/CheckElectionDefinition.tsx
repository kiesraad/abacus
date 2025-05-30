import { useState } from "react";

import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { InputField } from "@/components/ui/InputField/InputField";
import { t, tx } from "@/i18n/translate";
import { ElectionDefinitionValidateResponse } from "@/types/generated/openapi";
import { formatDateFull } from "@/utils/format";

import { useElectionCheck } from "../hooks/useElectionCheck";
import { RedactedHash } from "./RedactedHash";

interface CheckElectionDefinitionProps {
  file: File;
  data: ElectionDefinitionValidateResponse;
}

export function CheckElectionDefinition({ file, data }: CheckElectionDefinitionProps) {
  const [error, setError] = useState<string | undefined>();
  const { stubs, highlightStub, handleSubmit } = useElectionCheck(file, data, setError);

  return (
    <section className="md">
      <h2>{t("election.check_eml.title")}</h2>
      {(stubs.some((stub) => stub.error.length > 0) || error) && (
        <Alert type="error" title={t("election.check_eml.error.title")} inline>
          <p> {t("election.check_eml.error.description")} </p>
        </Alert>
      )}
      <p className="mt-lg">
        {tx("election.check_eml.description", {
          file: () => {
            return <strong>{file.name}</strong>;
          },
        })}
      </p>
      <Alert type="notify" variant="no-icon" margin="mb-md" small>
        <p>
          <strong>{data.election.name}</strong>
          <br />
          <span className="capitalize-first">{formatDateFull(new Date(data.election.election_date))}</span>
        </p>
        <div>
          <span>
            <strong>{t("digital_signature")}</strong> ({t("hashcode")}):
          </span>
          <RedactedHash hash={data.hash.chunks} stubs={stubs} />
        </div>
      </Alert>
      <p>{t("election.check_eml.check_hash.description")}</p>
      <Form onSubmit={(e) => void handleSubmit(e)}>
        {stubs.map((stub, stubIndex) => (
          <InputField
            key={stub.index}
            name={stub.index.toString()}
            type="text"
            label={t("election.check_eml.check_hash.label", { stub: stubIndex + 1 })}
            hint={t("election.check_eml.check_hash.hint")}
            error={stub.error}
            fieldSize="medium"
            fieldWidth="narrow"
            margin="mb-md"
            onFocus={() => {
              highlightStub(stubIndex, true);
            }}
            onBlur={() => {
              highlightStub(stubIndex, false);
            }}
            autoFocus={stubIndex === 0}
          />
        ))}
        <div className="mt-lg">
          <Button type="submit">{t("next")}</Button>
        </div>
      </Form>
    </section>
  );
}
