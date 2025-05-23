import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { t } from "@/i18n/translate";
import {
  ELECTION_IMPORT_VALIDATE_REQUEST_PATH,
  ElectionDefinitionUploadRequest,
  ElectionDefinitionUploadResponse,
} from "@/types/generated/openapi";

import { Stub } from "../components/RedactedHash";

export function useElectionCheck(file: File, data: ElectionDefinitionUploadResponse, setError: any) {
  const navigate = useNavigate();
  const url: ELECTION_IMPORT_VALIDATE_REQUEST_PATH = "/api/elections/validate";
  const { create } = useCrud<ElectionDefinitionUploadRequest>(url);

  const [stubs, setStubs] = useState<Stub[]>(
    data.hash.redacted_indexes.map((redacted_index: number) => ({
      selected: false,
      index: redacted_index,
      error: "",
    })),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    const formData = new FormData(event.currentTarget);
    let completeHash = data.hash.chunks;
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
      void create({ data: await file.text(), hash: completeHash }).then((response) => {
        if (isSuccess(response)) {
          void navigate("/elections/create/check-and-save");
        } else if (isError(response) && response instanceof ApiError && response.reference === "InvalidHash") {
          setError(response.message);
        }
      });
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
