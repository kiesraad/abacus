import { useState } from "react";

import { NotFoundError } from "@/api/ApiResult";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { InputField } from "@/components/ui/InputField/InputField";
import { t, tx } from "@/lib/i18n";
import { formatDateFull } from "@/utils/format";

import { useElectionCreateContext } from "../hooks/useElectionCreateContext";
import { RedactedHash, Stub } from "./RedactedHash";

export function CheckElectionDefinition() {
  const { file, data } = useElectionCreateContext();

  if (!data) {
    throw new NotFoundError("error.not_found_feedback");
  }

  const [stubs, setStubs] = useState<Stub[]>(
    data.hash.redacted_indexes.map((redacted_index) => ({
      selected: false,
      index: redacted_index,
    })),
  );

  return (
    <section className="md">
      <h2>{t("election.check_eml.title")}</h2>
      <p>
        {tx("election.check_eml.description", {
          file: () => {
            return <strong>{file?.name}</strong>;
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
      {stubs.map((stub, stubIndex) => (
        <InputField
          key={stub.index}
          name={stub.index.toString()}
          type="text"
          label={t("election.check_eml.check_hash.label", { stub: stubIndex + 1 })}
          hint={t("election.check_eml.check_hash.hint")}
          fieldSize="medium"
          fieldWidth="narrow"
          margin="mb-md"
          onFocus={() => {
            const newStubs = [...stubs];
            const stub = newStubs[stubIndex];
            if (stub) {
              stub.selected = true;
            }
            setStubs(newStubs);
          }}
          onBlur={() => {
            const newStubs = [...stubs];
            const stub = newStubs[stubIndex];
            if (stub) {
              stub.selected = false;
            }
            setStubs(newStubs);
          }}
          autoFocus={stubIndex === 0}
        />
      ))}
      <div className="mt-lg">
        <Button>{t("next")}</Button>
      </div>
    </section>
  );
}
