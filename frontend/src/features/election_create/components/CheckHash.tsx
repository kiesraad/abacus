import { FormEvent, ReactNode, useState } from "react";

import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { InputField } from "@/components/ui/InputField/InputField";
import { t, tx } from "@/i18n/translate";
import { RedactedEmlHash } from "@/types/generated/openapi";
import { formatDateFull } from "@/utils/format";

import { RedactedHash, Stub } from "./RedactedHash";

interface CheckHashProps {
  date: string;
  title: string;
  fileName: string;
  redactedHash: RedactedEmlHash;
  error: ReactNode | undefined;
  onSubmit: (chunks: string[]) => void;
}

export function CheckHash({ date, title, fileName, redactedHash, error, onSubmit }: CheckHashProps) {
  const [stubs, setStubs] = useState<Stub[]>(
    redactedHash.redacted_indexes.map((redacted_index: number) => ({
      selected: false,
      index: redacted_index,
      error: "",
    })),
  );

  function highlightStub(stubIndex: number, highlight: boolean) {
    const newStubs = [...stubs];
    const stub = newStubs[stubIndex];
    if (stub) {
      stub.selected = highlight;
    }
    setStubs(newStubs);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const completeHash = redactedHash.chunks;
    const formData = new FormData(event.currentTarget);
    stubs.forEach((stub, i) => {
      const value = formData.get(stub.index.toString());
      const newStubs = [...stubs];
      const newStub = newStubs[i];
      if (newStub) {
        newStub.error = "";
        if (typeof value !== "string" || value.length !== 4) {
          newStub.error = t("election.check_eml.check_hash.hint");
        } else {
          completeHash[stub.index] = value;
        }
        setStubs(newStubs);
      }
    });

    // Only submit when there a no errors
    if (stubs.every((stub) => stub.error === "")) {
      onSubmit(completeHash);
    }
  }

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
            return <strong>{fileName}</strong>;
          },
        })}
      </p>
      <Alert type="notify" variant="no-icon" margin="mb-md" small>
        <p>
          <strong>{title}</strong>
          <br />
          <span className="capitalize-first">{formatDateFull(new Date(date))}</span>
        </p>
        <div>
          <span>
            <strong>{t("digital_signature")}</strong> ({t("hashcode")}):
          </span>
          <RedactedHash hash={redactedHash.chunks} stubs={stubs} />
        </div>
      </Alert>
      <p>{t("election.check_eml.check_hash.description")}</p>
      <Form onSubmit={handleSubmit}>
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
