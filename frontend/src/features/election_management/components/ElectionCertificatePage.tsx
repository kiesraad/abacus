import { useInitialApiGet } from "@/api/useInitialApiGet";
import { Footer } from "@/components/footer/Footer";
import { IconCertificate } from "@/components/generated/icons";
import { PageTitle } from "@/components/page_title/PageTitle";
import { DownloadButton } from "@/components/ui/DownloadButton/DownloadButton";
import { Icon } from "@/components/ui/Icon/Icon";
import cls from "@/features/election_management/components/ElectionManagement.module.css";
import { useElection } from "@/hooks/election/useElection";
import { t } from "@/i18n/translate";
import type {
  CERTIFICATE_DETAILS_REQUEST_PATH,
  CERTIFICATE_REQUEST_PATH,
  CertificateDetailsResponse,
} from "@/types/generated/openapi";
import { formatDateFullWithoutWeekday } from "@/utils/dateTime";

const formatDate = (date: string) => formatDateFullWithoutWeekday(new Date(date));

export function ElectionCertificatePage() {
  const { election } = useElection();

  const detailsUrl: CERTIFICATE_DETAILS_REQUEST_PATH = `/api/elections/${election.id}/certificate_details`;
  const downloadUrl: CERTIFICATE_REQUEST_PATH = `/api/elections/${election.id}/certificate`;

  const { requestState } = useInitialApiGet<CertificateDetailsResponse>(detailsUrl);
  const certificate = requestState.status === "success" && requestState.data;

  const pageTitle = t("election_certificate.certificate");

  const category = t(`committee_category.${election.committee_category}.abbreviation`);
  const committee = `${category} ${election.location}`;

  return (
    <>
      <PageTitle title={`${pageTitle} - Abacus`} />
      <header>
        <section>
          <h1>{pageTitle}</h1>
        </section>
      </header>
      <main className={cls.backgroundBlue}>
        <article>
          <div>
            <Icon size="lg" color="default" icon={<IconCertificate />} />
          </div>
          <div>
            <h2 className="form_title">{t("election_certificate.subtitle", { committee })}</h2>
            <section className="sm flex-column">
              <p>{t("election_certificate.explanation")}</p>
              <h3>{t("election_certificate.certificate")}</h3>

              {certificate ? (
                <DownloadButton
                  icon="download"
                  href={downloadUrl}
                  title={`${t("election_certificate.certificate")} ${committee} ${certificate.election_identifier}`}
                  subtitle={t("election_certificate.download_file")}
                >
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
                </DownloadButton>
              ) : (
                t("loading")
              )}
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
