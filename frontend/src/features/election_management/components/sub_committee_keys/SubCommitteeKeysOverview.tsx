import { type ChangeEvent, type ReactNode, useState } from "react";
import { type AnyError, ApiError, isError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { FileInput } from "@/components/ui/FileInput/FileInput";
import { Table } from "@/components/ui/Table/Table";
import { useMessages } from "@/hooks/messages/useMessages";
import { t, tx } from "@/i18n/translate";
import type {
  AddSubCommitteeCertificateResponse,
  ElectionId,
  SUB_COMMITTEE_CERTIFICATE_ADD_REQUEST_PATH,
  SubCommittee,
} from "@/types/generated/openapi";
import { formatDateFullWithoutWeekday } from "@/utils/dateTime";
import { sortList } from "@/utils/sorting";
import { fileTooLargeError, isFileTooLarge } from "@/utils/uploadFileSize";
import cls from "../ElectionManagement.module.css";

interface SubCommitteeKeysTableProps {
  subCommittees: SubCommittee[];
}

function PendingKeysTable({ subCommittees }: SubCommitteeKeysTableProps) {
  return (
    <section>
      <h3 className="mb-md">{t("sub_committee_keys.pending")}</h3>
      <Table id="pending_sub_committee_keys" className={cls.keysTable}>
        <Table.Header>
          <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
          <Table.HeaderCell>{t("committee_category.GSB.short")}</Table.HeaderCell>
        </Table.Header>
        <Table.Body className="fs-md">
          {subCommittees.map((subCommittee) => (
            <Table.Row key={subCommittee.id}>
              <Table.NumberCell>{subCommittee.authority_id}</Table.NumberCell>
              <Table.Cell className="break-word">{subCommittee.authority_name}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </section>
  );
}

function ImportedKeysTable({ subCommittees }: SubCommitteeKeysTableProps) {
  return (
    <section>
      <h3 className="mb-md">{t("sub_committee_keys.imported")}</h3>
      <Table id="imported_sub_committee_keys" className={cls.keysTable}>
        <Table.Header>
          <Table.HeaderCell className="text-align-r">{t("number")}</Table.HeaderCell>
          <Table.HeaderCell>{t("committee_category.GSB.short")}</Table.HeaderCell>
          <Table.HeaderCell className="text-align-r link-cell-padding">{t("sub_committee_keys.keys")}</Table.HeaderCell>
        </Table.Header>
        <Table.Body className="fs-md">
          {subCommittees.map((subCommittee) => (
            <Table.Row key={subCommittee.id} to={`${subCommittee.id}`}>
              <Table.NumberCell>{subCommittee.authority_id}</Table.NumberCell>
              <Table.Cell className="break-word">{subCommittee.authority_name}</Table.Cell>
              <Table.NumberCell>{subCommittee.certificates.length}</Table.NumberCell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </section>
  );
}

interface AlertDetails {
  title: string;
  message: ReactNode;
  type: "error" | "success";
}

function processError(response: AnyError, currentFile: File): AlertDetails | undefined {
  // Response code 413 indicates that the file is too large
  if (response instanceof ApiError && response.code === 413) {
    return {
      title: t("sub_committee_keys.invalid_public_key"),
      message: fileTooLargeError(currentFile),
      type: "error",
    };
  } else if (response instanceof ApiError && response.reference === "InvalidCertificate") {
    return {
      title: t("sub_committee_keys.no_public_key"),
      message: t("error.api_error.InvalidCertificate"),
      type: "error",
    };
  } else if (response instanceof ApiError && response.reference === "CertificateWrongElection") {
    return {
      title: t("sub_committee_keys.key_wrong_election"),
      message: t("error.api_error.CertificateWrongElection"),
      type: "error",
    };
  } else if (response instanceof ApiError && response.reference === "CertificateUnknownSubCommittee") {
    return {
      title: t("sub_committee_keys.key_unknown_subcommittee"),
      message: t("error.api_error.CertificateUnknownSubCommittee"),
      type: "error",
    };
  } else if (response instanceof ApiError && response.reference === "CertificateAlreadyAdded") {
    return {
      title: t("sub_committee_keys.key_already_added"),
      message: t("error.api_error.CertificateAlreadyAdded"),
      type: "success",
    };
  }
  return undefined;
}

interface SubCommitteeKeysOverviewProps {
  subCommittees: SubCommittee[];
  electionId: ElectionId;
  onSuccess: () => void;
}

export function SubCommitteeKeysOverview({ subCommittees, electionId, onSuccess }: SubCommitteeKeysOverviewProps) {
  const { pushMessage } = useMessages();
  const [alert, setAlert] = useState<AlertDetails | undefined>();
  const [file, setFile] = useState<File | undefined>();
  const createPath: SUB_COMMITTEE_CERTIFICATE_ADD_REQUEST_PATH = `/api/elections/${electionId}/sub_committee_certificates`;
  const { create } = useCrud<AddSubCommitteeCertificateResponse>({ createPath });
  const sorted = sortList(subCommittees, (subCommittee) => ({ name: subCommittee.authority_name }));
  const pending = sorted.filter((subCommittee) => subCommittee.certificates.length === 0);
  const imported = sorted.filter((subCommittee) => subCommittee.certificates.length > 0);

  function processSuccess(response: AddSubCommitteeCertificateResponse) {
    setAlert(undefined);
    pushMessage({
      type: response.expired ? "warning" : "success",
      title: t("sub_committee_keys.key_added", { authority_name: response.authority_name }),
      text: response.expired
        ? tx("sub_committee_keys.key_expired", undefined, {
            date: formatDateFullWithoutWeekday(new Date(response.certificate.not_after)),
            authority_name: response.authority_name,
          })
        : undefined,
    });
    onSuccess();
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const currentFile = e.target.files ? e.target.files[0] : undefined;
    if (currentFile !== undefined) {
      if (await isFileTooLarge(currentFile)) {
        setAlert({
          title: t("sub_committee_keys.invalid_public_key"),
          message: fileTooLargeError(currentFile),
          type: "error",
        });
        return;
      }

      setFile(currentFile);
      const data = await currentFile.text();
      const response = await create({ data });

      if (isSuccess(response)) {
        processSuccess(response.data);
        setFile(undefined);
      } else if (isError(response)) {
        setAlert(processError(response, currentFile));
      }
    } else {
      setFile(undefined);
    }
  }

  return (
    <article className={cls.subCommitteeKeys}>
      <section>
        <h2 className="form_title">{t("sub_committee_keys.add_all.title")}</h2>
        <div>
          {alert && (
            <Alert type={alert.type} title={alert.title} inline>
              <p>{alert.message}</p>
            </Alert>
          )}
          <p className="w-32">{t("sub_committee_keys.add_all.description")}</p>
          <FileInput id="upload-key" file={file} onChange={(e) => void onFileChange(e)}>
            {t("select_file")}
          </FileInput>
        </div>
      </section>

      {pending.length > 0 && <PendingKeysTable subCommittees={pending} />}
      {imported.length > 0 && <ImportedKeysTable subCommittees={imported} />}
    </article>
  );
}
