import type { Message } from "@/hooks/messages/MessagesContext";
import { t } from "@/i18n/translate";
import type { CommitteeSessionStatus, PollingStation } from "@/types/generated/openapi";

export function getInvestigationDeletedMessage(
  pollingStation: PollingStation,
  currentCommitteeSessionStatus: CommitteeSessionStatus,
) {
  if (currentCommitteeSessionStatus === "completed") {
    return {
      type: "warning",
      title: t("generate_new_results"),
      text: `${t("investigations.message.investigation_deleted", {
        number: pollingStation.number,
        name: pollingStation.name,
      })}. ${t("documents_are_invalidated")}`,
    } as Message;
  } else {
    return {
      title: t("investigations.message.investigation_deleted", {
        number: pollingStation.number,
        name: pollingStation.name,
      }),
    } as Message;
  }
}

export function getInvestigationUpdatedMessage(
  pollingStation: PollingStation,
  currentCommitteeSessionStatus: CommitteeSessionStatus,
  correctedResults = false,
) {
  const enterCorrigendum = correctedResults ? t("investigations.message.enter_corrigendum") : undefined;

  if (currentCommitteeSessionStatus === "completed") {
    const text = `${t("investigations.message.investigation_updated", {
      number: pollingStation.number,
      name: pollingStation.name,
    })}. ${t("documents_are_invalidated")}`;
    return {
      type: "warning",
      title: t("generate_new_results"),
      text: enterCorrigendum ? `${text}\n${enterCorrigendum}` : text,
    } as Message;
  } else {
    return {
      title: t("investigations.message.investigation_updated", {
        number: pollingStation.number,
        name: pollingStation.name,
      }),
      text: enterCorrigendum,
    } as Message;
  }
}
