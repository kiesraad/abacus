import { FormEvent, ReactNode, useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { KeyboardKeys } from "@/components/ui/KeyboardKeys/KeyboardKeys";
import { t } from "@/i18n/translate";
import { RedactedEmlHash } from "@/types/generated/openapi";
import { KeyboardKey } from "@/types/ui";
import { formatFullDateWithoutTimezone } from "@/utils/dateTime";

import { RedactedHash, Stub } from "./RedactedHash";

interface CheckHashProps {
  date: string;
  title: string;
  header: string;
  description: ReactNode;
  redactedHash: RedactedEmlHash;
  error: ReactNode | undefined;
  setError: (error: string | undefined) => void;
  onSubmit: (chunks: string[]) => void;
}

export function CheckHash({
  date,
  title,
  header,
  description,
  redactedHash,
  error,
  setError,
  onSubmit,
}: CheckHashProps) {
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
      stub.error = "";
    }
    setStubs(newStubs);
    if (!highlight) {
      setError(undefined);
    }
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
        } else if (error) {
          newStub.error = t("error.api_error.InvalidHash");
        } else {
          completeHash[stub.index] = value;
        }
        setStubs(newStubs);
      }
    });

    // Only submit when there are no errors
    if (stubs.every((stub) => stub.error === "")) {
      onSubmit(completeHash);
    }
  }

  // If there is an error, add error to stubs
  useEffect(() => {
    setStubs((prevStubs) =>
      prevStubs.map((stub) => {
        stub.error = error ? t("error.api_error.InvalidHash") : "";
        return stub;
      }),
    );
  }, [error]);

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
            <Alert type="notify" variant="no-icon" small>
              <p>
                <strong>{title}</strong>
                <br />
                <span className="capitalize-first">{formatFullDateWithoutTimezone(new Date(date))}</span>
              </p>
              <div>
                <span>
                  <strong>{t("digital_signature")}</strong> ({t("hashcode")}):
                </span>
                <RedactedHash hash={redactedHash.chunks} stubs={stubs} />
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
            <KeyboardKeys keys={[KeyboardKey.Shift, KeyboardKey.Enter]} />
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </section>
  );
}
