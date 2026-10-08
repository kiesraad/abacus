import { isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconTrash } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";
import { t } from "@/i18n/translate";
import type {
  ElectionId,
  SUB_COMMITTEE_CERTIFICATE_DELETE_REQUEST_PATH,
  SubCommitteeId,
} from "@/types/generated/openapi";

export interface CertificateDeleteModalProps {
  electionId: ElectionId;
  subCommitteeId: SubCommitteeId;
  fingerprint: string;
  onDeleted: () => void;
  onCancel: () => void;
}

export function CertificateDeleteModal({
  electionId,
  subCommitteeId,
  fingerprint,
  onDeleted,
  onCancel,
}: CertificateDeleteModalProps) {
  const removePath: SUB_COMMITTEE_CERTIFICATE_DELETE_REQUEST_PATH = `/api/elections/${electionId}/sub_committees/${subCommitteeId}/certificates/${fingerprint}`;
  const { remove, isLoading } = useCrud({ removePath, throwAllErrors: true });

  function handleDelete() {
    void remove().then((result) => {
      if (isSuccess(result)) {
        onDeleted();
      }
    });
  }

  return (
    <Modal title={`${t("sub_committee_keys.delete_public_key")}?`} onClose={onCancel}>
      <p>{t("sub_committee_keys.delete_are_you_sure")}</p>
      <nav>
        <Button
          leftIcon={<IconTrash />}
          variant="primary-destructive"
          size="xl"
          onClick={handleDelete}
          disabled={isLoading}
        >
          {t("sub_committee_keys.delete_key")}
        </Button>
        <Button variant="secondary" size="xl" onClick={onCancel} disabled={isLoading}>
          {t("cancel")}
        </Button>
      </nav>
    </Modal>
  );
}
