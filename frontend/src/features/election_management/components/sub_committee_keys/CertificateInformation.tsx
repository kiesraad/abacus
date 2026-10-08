import { Button } from "@/components/ui/Button/Button";
import { t } from "@/i18n/translate";
import type { Certificate } from "@/types/generated/openapi";
import { getCertificateInfo } from "../../utils/certificate";
import cls from "../ElectionManagement.module.css";

export interface CertificateInformationProps {
  certificate: Certificate;
  title: string;
  onDelete?: (fingerprint: string) => void;
}

export function CertificateInformation({ certificate, title, onDelete }: CertificateInformationProps) {
  return (
    <div className={cls.certificateInformation}>
      <div id={`certificate-info-${certificate.public_key_fingerprint}`} className={cls.certificateSection}>
        {getCertificateInfo(certificate)}
      </div>
      <div className={cls.titleSection}>
        <span>
          <span id={`certificate-title-${certificate.public_key_fingerprint}`} className={cls.title}>
            {title}
          </span>
          {onDelete && (
            <Button
              variant="underlined"
              size="md"
              onClick={() => {
                onDelete(certificate.public_key_fingerprint);
              }}
            >
              {t("delete")}
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}
