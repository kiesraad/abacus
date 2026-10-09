import { type ReactElement, useState } from "react";
import { useNavigate } from "react-router";

import { type AnyError, ApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { t, tx } from "@/i18n/translate";
import type {
  CSBDataEntryImportResponse,
  CSBDataEntryImportValidateResponse,
  ELECTION_DATA_ENTRY_IMPORT_REQUEST_PATH,
  ELECTION_DATA_ENTRY_IMPORT_VALIDATE_REQUEST_PATH,
  RedactedEmlHash,
  SubCommitteeFirstSession,
} from "@/types/generated/openapi";

export type ImportState =
  | {
      status: "idle";
      error?: FileImportError;
    }
  | {
      status: "hash_check";
      file: File;
      subCommittee: SubCommitteeFirstSession;
      hash: RedactedEmlHash;
      electionName: string;
      electionDate: string;
      error?: string;
    }
  | {
      status: "check_and_save";
      file: File;
      subCommittee: SubCommitteeFirstSession;
      electionName: string;
      hash: string[];
    };

export interface UseDataEntryImport {
  state: ImportState;
  onFileChange: (file: File | undefined) => Promise<void>;
  onHashSubmit: (chunks: string[]) => Promise<void>;
  onFinalSubmit: () => Promise<void>;
  onAbort: () => void;
}

export interface FileImportError {
  title: string;
  message: ReactElement;
}

export type FileErrorCase =
  | "file_too_large"
  | "invalid_zip"
  | "invalid_510b"
  | "data_entry_already_imported"
  | "data_entry_already_started"
  | "election_mismatch"
  | "contains_errors"
  | "unknown";

export function fileError(fileErrorCase: FileErrorCase, vars?: Record<string, string | number>): FileImportError {
  return {
    title: t(`data_entry_import.file_error.${fileErrorCase}.title`),
    message: tx(`data_entry_import.file_error.${fileErrorCase}.description`, {}, vars),
  };
}

function importError(error: AnyError, electionName: string): FileImportError {
  if (!(error instanceof ApiError)) {
    return fileError("unknown");
  }

  // ZIP too large; EML too large.
  // Note: both use different limits and the backend response does not indicate which one was hit.
  // Displaying the `max_size`, as `file_too_large` in `generic.json` does, is hence not very useful.
  if (error.code === 413) {
    return fileError("file_too_large");
  }

  // Unreadable ZIP; ZIP with more than 1 EML.
  if (error.reference === "ZipError") {
    return fileError("invalid_zip");
  }

  // EML is not a 510b.
  if (error.reference === "InvalidCountType") {
    return fileError("invalid_510b");
  }

  if (error.reference === "EmlImportError" || error.reference === "UnknownCommittee") {
    return fileError("election_mismatch", { electionName });
  }

  if (error.reference === "DataEntryAlreadyImported") {
    return fileError("data_entry_already_imported");
  }

  if (error.reference === "DataEntryNotAllowed") {
    return fileError("data_entry_already_started");
  }

  // EmlError (e.g. unreadable EML).
  if (error.reference === "DataEntryValidationErrors" || error.reference === "EmlError") {
    return fileError("contains_errors");
  }

  // Not handled separately: InvalidCommitteeSessionStatus.
  return fileError("unknown");
}

export function importRequestBody(file: File, hash?: string[]): FormData {
  const body = new FormData();
  body.append("data", file);
  if (hash) {
    body.append("hash", JSON.stringify(hash));
  }
  return body;
}

export function useDataEntryImport(): UseDataEntryImport {
  const { election } = useElection();
  const { pushMessage } = useMessages();
  const navigate = useNavigate();
  const [state, setState] = useState<ImportState>({ status: "idle" });

  const validatePath: ELECTION_DATA_ENTRY_IMPORT_VALIDATE_REQUEST_PATH = `/api/elections/${election.id}/data_entry/import/validate`;
  const importPath: ELECTION_DATA_ENTRY_IMPORT_REQUEST_PATH = `/api/elections/${election.id}/data_entry/import`;
  const { create: postValidate } = useCrud<CSBDataEntryImportValidateResponse>({ createPath: validatePath });
  const { create: postImport } = useCrud<CSBDataEntryImportResponse>({ createPath: importPath });

  async function onFileChange(selectedFile: File | undefined) {
    if (selectedFile === undefined) {
      setState({ status: "idle" });
      return;
    }

    const response = await postValidate(importRequestBody(selectedFile));
    if (isSuccess(response)) {
      setState({
        status: "hash_check",
        file: selectedFile,
        subCommittee: response.data.sub_committee,
        hash: response.data.hash,
        electionName: response.data.election_name,
        electionDate: response.data.election_date,
      });
    } else {
      setState({ status: "idle", error: importError(response, election.name) });
    }
  }

  async function onHashSubmit(chunks: string[]) {
    if (state.status !== "hash_check") {
      return;
    }

    const response = await postValidate(importRequestBody(state.file, chunks));

    if (isSuccess(response)) {
      setState({
        status: "check_and_save",
        file: state.file,
        subCommittee: state.subCommittee,
        electionName: state.electionName,
        hash: chunks,
      });
    } else if (response instanceof ApiError && response.reference === "InvalidHash") {
      setState({ ...state, error: response.message });
    } else {
      setState({ status: "idle", error: importError(response, election.name) });
    }
  }

  async function onFinalSubmit() {
    if (state.status !== "check_and_save") {
      return;
    }

    const response = await postImport(importRequestBody(state.file, state.hash));
    if (isSuccess(response)) {
      pushMessage({
        title: t("data_entry_import.success", { fileAuthorityName: state.subCommittee.authority_name }),
      });
      void navigate(`/elections/${election.id}/status`);
    } else {
      const { title, message } = importError(response, election.name);
      pushMessage({ type: "error", title, text: message });
      void navigate(`/elections/${election.id}/status`);
    }
  }

  function onAbort() {
    void navigate(`/elections/${election.id}/status`);
  }

  return { state, onFileChange, onHashSubmit, onFinalSubmit, onAbort };
}
