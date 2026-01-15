import { type FormEvent, type ReactNode, useState } from "react";

import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import type { RedactedEmlHash } from "@/types/generated/openapi";
import { formatDateFull } from "@/utils/dateTime";
import cls from "./CheckHash.module.css";
import { RedactedHash, type Stub } from "./RedactedHash";

interface CheckHashProps {
  date: string;
  title: string;
  header: string;
  description: ReactNode;
  redactedHash: RedactedEmlHash;
  error: ReactNode | undefined;
  onSubmit: (chunks: string[]) => void;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: TODO function should be refactored
export function CheckHash({ date, title, header, description, redactedHash, error, onSubmit }: CheckHashProps) {
  const [changed, setChanged] = useState<boolean>(true);
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
    setChanged(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let stubsAreValid = true;

    // make a copy of the redacted hash chunks to fill in the stubs
    const completeHash = redactedHash.chunks.slice(0);
    const formData = new FormData(event.currentTarget);

    for (const [i, stub] of stubs.entries()) {
      const value = formData.get(stub.index.toString());
      const newStubs = [...stubs];
      const newStub = newStubs[i];

      if (newStub) {
        newStub.error = "";
        if (typeof value !== "string" || value.length !== 4) {
          newStub.error = t("election.check_eml.check_hash.hint");
          stubsAreValid = false;
        } else {
          completeHash[stub.index] = value.toLowerCase();
        }
        setStubs(newStubs);
      }
    }

    // Only allow form submit when a field has been focussed or blurred
    // and both values are the correct length and type
    if (changed && stubsAreValid) {
      onSubmit(completeHash);
    }
    setChanged(false);
  }

  return (
    <section className="md">
      <Form title={header} onSubmit={handleSubmit}>
        <FormLayout>
          <FormLayout.Section>
            {(stubs.some((stub) => stub.error.length > 0) || error) && (
              <Alert type="error" title={t("election.check_eml.error.title")} inline>
                <p> {t("election.check_eml.error.description")} </p>
              </Alert>
            )}
            <p>{description}</p>
            <div className={cls.checkHash}>
              <section>
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
              </section>
            </div>
            <p>{t("election.check_eml.check_hash.description")}</p>

            {stubs.map((stub, stubIndex) => (
              <InputField
                className="font-number-slashed-0"
                id={stub.index.toString()}
                key={stub.index}
                name={stub.index.toString()}
                type="text"
                label={t("election.check_eml.check_hash.label", { stub: stubIndex + 1 })}
                hint={t("election.check_eml.check_hash.hint")}
                error={stub.error}
                fieldSize="medium"
                fieldWidth="full-field-with-narrow-input"
                onFocus={() => {
                  highlightStub(stubIndex, true);
                }}
                onBlur={() => {
                  highlightStub(stubIndex, false);
                }}
                autoFocus={stubIndex === 0}
              />
            ))}
          </FormLayout.Section>
          <FormLayout.Controls>
            <Button type="submit">{t("next")}</Button>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </section>
  );
}
