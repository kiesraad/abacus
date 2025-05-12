import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { t } from "@/lib/i18n";
import { ElectionDefinitionUploadResponse } from "@/types/generated/openapi";

import { Stub } from "../components/RedactedHash";

export function useElectionCheck(data: ElectionDefinitionUploadResponse) {
  const navigate = useNavigate();
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
      const value = formData.get(stub.index.toString());
      const newStubs = [...stubs];
      const newStub = newStubs[i];
      if (newStub) {
        newStub.error = "";
        if (typeof value !== "string" || value.length !== 4) {
          newStub.error = t("election.check_eml.check_hash.hint");
        }
        setStubs(newStubs);
      }
    });

    // Only submit when there a no errors
    if (stubs.every((stub) => stub.error === "")) {
      void navigate("/elections/create/polling-station-role");
    }
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
