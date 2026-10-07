import { t } from "@/i18n/translate";
import type { Certificate } from "@/types/generated/openapi";
import { getCertificateInfo } from "../../utils/certificate";
import cls from "../ElectionManagement.module.css";

export interface CertificateInformationProps {
  certificate: Certificate;
  title: string;
  deleteHref?: string;
}

export function CertificateInformation({ certificate, title, deleteHref }: CertificateInformationProps) {
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
          {deleteHref && (
            <a className={cls.deleteHref} href={deleteHref}>
              {t("delete")}
            </a>
          )}
        </span>
      </div>
    </div>
  );
}
