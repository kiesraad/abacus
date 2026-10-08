import { useState } from "react";
import { useNavigate } from "react-router";
import { NotFoundError } from "@/api/ApiResult";
import { Footer } from "@/components/footer/Footer";
import { IconCertificate } from "@/components/generated/icons";
import { Messages } from "@/components/messages/Messages";
import { PageTitle } from "@/components/page_title/PageTitle";
import { Icon } from "@/components/ui/Icon/Icon";
import { Loader } from "@/components/ui/Loader/Loader";
import { useElection } from "@/hooks/election/useElection";
import { useMessages } from "@/hooks/messages/useMessages";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { cn } from "@/utils/classnames";
import { useSubCommitteeListRequest } from "../../hooks/useSubCommitteeListRequest";
import cls from "../ElectionManagement.module.css";
import { CertificateDeleteModal } from "./CertificateDeleteModal";
import { CertificateInformation } from "./CertificateInformation";

export function SubCommitteeKeysDetailPage() {
  const { election } = useElection();
  const navigate = useNavigate();
  const { pushMessage } = useMessages();
  const { requestState, refetch } = useSubCommitteeListRequest(election.id);
  const subCommitteeId = useNumericParam("subCommitteeId");
  const [messagesVersion, setMessagesVersion] = useState(0);
  const [certFingerprintToDelete, setCertFingerprintToDelete] = useState<string | undefined>(undefined);

  if (requestState.status === "loading") {
    return <Loader />;
  }
  if ("error" in requestState) {
    throw requestState.error;
  }
  const subCommittee = requestState.data.find((committee) => committee.id === subCommitteeId);
  if (subCommittee === undefined) {
    throw new NotFoundError("error.not_found");
  } else if (subCommittee.certificates.length === 0) {
    void navigate(`/elections/${election.id}/sub-committees`);
  }
  const committee = `${t(`committee_category.${subCommittee.category}.abbreviation`)} ${subCommittee.authority_name}`;

  function toggleDeleteModal(fingerprint: string | undefined) {
    setCertFingerprintToDelete(fingerprint);
  }

  function onDeleted() {
    if (subCommittee) {
      setCertFingerprintToDelete(undefined);
      pushMessage({
        title: t("sub_committee_keys.key_deleted", { authority_name: subCommittee.authority_name }),
        text: subCommittee.certificates.length > 1 ? t("sub_committee_keys.non_last_key_deleted") : undefined,
      });
      if (subCommittee.certificates.length > 1) {
        setMessagesVersion((version) => version + 1);
      }
      void refetch();
    }
  }

  return (
    <>
      <PageTitle title={`${t("sub_committee_keys.title")} - Abacus`} />
      <header>
        <section>
          <h1>{t("sub_committee_keys.manage")}</h1>
        </section>
      </header>

      <Messages key={messagesVersion} />

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
                  onDelete={() => {
                    toggleDeleteModal(certificate.public_key_fingerprint);
                  }}
                />
              ))}
            </section>
            {certFingerprintToDelete && (
              <CertificateDeleteModal
                electionId={election.id}
                subCommitteeId={subCommittee.id}
                fingerprint={certFingerprintToDelete}
                onDeleted={onDeleted}
                onCancel={() => {
                  toggleDeleteModal(undefined);
                }}
              />
            )}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
