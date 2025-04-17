import { useState } from "react";

import { Election, RetractedEmlHash } from "@/api/gen/openapi";
import { Alert, Button, InputField } from "@/components/ui";
import { t, tx } from "@/lib/i18n";
import { formatDateFull } from "@/lib/util/format";

import { RetractedHash, Stub } from "./RetractedHash";

interface CheckElectionDefinitionProps {
  file: File;
  election: Election;
  hash: RetractedEmlHash;
}

export function CheckElectionDefinition({ file, election, hash }: CheckElectionDefinitionProps) {
  const [stubs, setStubs] = useState<Stub[]>(
    hash.retracted_indexes.map((retracted_index) => ({
      selected: false,
      index: retracted_index,
    })),
  );

  return (
    <>
      <h2>{t("election.check_eml.title")}</h2>
      <p>
        {tx("election.check_eml.description", {
          file: () => {
            return <b>{file.name}</b>;
          },
        })}
      </p>
      <Alert type="notify" variant="no-icon" margin="mb-md" small>
        <p>
          <strong>{election.category}</strong>
          <br />
          <span className="capitalize">{formatDateFull(new Date(election.election_date))}</span>
        </p>
        <p>
          <strong>Digitale vingerafdruk</strong> (hashcode):
          <RetractedHash hash={hash.chunks} stubs={stubs} />
        </p>
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
            newStubs[stubIndex]!.selected = true;
            setStubs(newStubs);
          }}
          onBlur={() => {
            const newStubs = [...stubs];
            newStubs[stubIndex]!.selected = false;
            setStubs(newStubs);
          }}
          autoFocus={stubIndex === 0}
        />
      ))}
      <div className="mt-lg">
        <Button>{t("next")}</Button>
      </div>
    </>
  );
}
