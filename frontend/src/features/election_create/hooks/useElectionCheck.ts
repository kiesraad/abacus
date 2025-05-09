import { FormEvent, useState } from "react";

import { t } from "@/lib/i18n";
import { ElectionDefinitionUploadResponse } from "@/types/generated/openapi";

import { Stub } from "../components/RedactedHash";

export function useElectionCheck(data: ElectionDefinitionUploadResponse) {
  const [stubs, setStubs] = useState<Stub[]>(
    data.hash.redacted_indexes.map((redacted_index: number) => ({
      selected: false,
      index: redacted_index,
      error: "",
    })),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    stubs.forEach((stub, i) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      const value = formData.get(stub.index.toString()) as string;
      const newStubs = [...stubs];
      const newStub = newStubs[i];
      if (newStub) {
        newStub.error = "";
        if (value.length !== 4) {
          newStub.error = t("election.check_eml.check_hash.hint");
        }
        setStubs(newStubs);
      }
    });
  }

  function highlightStub(stubIndex: number, highlight: boolean) {
    const newStubs = [...stubs];
    const stub = newStubs[stubIndex];
    if (stub) {
      stub.selected = highlight;
    }
    setStubs(newStubs);
  }

  return {
    stubs,
    highlightStub,
    handleSubmit,
  };
}
