// import { useState } from "react";
import { NotFoundError } from "@/api/ApiResult";
import { Footer } from "@/components/footer/Footer";
import { IconCertificate } from "@/components/generated/icons";
// import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Icon } from "@/components/ui/Icon/Icon";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";
import { useSubCommitteeListRequest } from "../../hooks/useSubCommitteeListRequest";
import cls from "../ElectionManagement.module.css";
import { CertificateInformation } from "./CertificateInformation";

export function SubCommitteeKeysDetailPage() {
  const { election } = useElection();
  const { requestState } = useSubCommitteeListRequest(election.id);
  const subCommitteeId = useNumericParam("subCommitteeId");
  // const [messagesVersion, setMessagesVersion] = useState(0);

  // function _onDelete() {
  //   setMessagesVersion((version) => version + 1);
  //   void refetch();
  // }

  if (requestState.status === "loading") {
    return <Loader />;
  }
  if ("error" in requestState) {
    throw requestState.error;
  }
  const subCommittee = requestState.data.find((committee) => committee.id === subCommitteeId);
  if (subCommittee === undefined) {
    throw new NotFoundError("error.not_found");
  }
  const committee = `${t(`committee_category.${subCommittee.category}.abbreviation`)} ${subCommittee.authority_name}`;

  return (
    <>
      <PageTitle title={`${t("sub_committee_keys.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("sub_committee_keys.manage")}</h1>
        </section>
      </header>

      {/*<Messages key={messagesVersion} />*/}

      <main className={cls.backgroundBlue}>
        <article>
          <div>
            <Icon size="lg" color="default" icon={<IconCertificate />} />
          </div>
          <div>
            <h2 className="form_title">
              {t(`sub_committee_keys.public_keys_for`, {
                authority_name: subCommittee.authority_name,
              })}
            </h2>
            <section className={cn("sm", "flex-column", cls.certificateDetailSection)}>
              <p>
                {t(`sub_committee_keys.public_keys_explanation`, {
                  authority_name: subCommittee.authority_name,
                })}
              </p>

              {subCommittee.certificates.map((certificate) => (
                <CertificateInformation
                  key={certificate.public_key_fingerprint}
                  title={`${t("election_certificate.certificate")} ${committee} ${certificate.election_identifier}`}
                  certificate={certificate}
                />
              ))}
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
