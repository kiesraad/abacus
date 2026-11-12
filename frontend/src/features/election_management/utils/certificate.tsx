import type { ReactNode } from "react";
import { t } from "@/i18n/translate";
import type { Certificate, CertificateDetailsResponse } from "@/types/generated/openapi";
import { formatDateFullWithoutWeekday } from "@/utils/dateTime";

const formatDate = (date: string) => formatDateFullWithoutWeekday(new Date(date));

export function getCertificateInfo(certificate: Certificate | CertificateDetailsResponse): ReactNode {
  return (
    <>
      {t("election_certificate.election_identifier")}: {certificate.election_identifier}
      <br />
      {t("election_certificate.organizational_unit")}: {certificate.organizational_unit}
      <br />
      {t("election_certificate.common_name")}: {certificate.common_name}
      <br />
      {t("election_certificate.not_before")}: {formatDate(certificate.not_before)}
      <br />
      {t("election_certificate.not_after")}: {formatDate(certificate.not_after)}
      <br />
      {t("election_certificate.signature_algorithm")}: {certificate.signature_algorithm}
    </>
  );
}
