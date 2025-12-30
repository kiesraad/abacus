import type { Message } from "@/hooks/messages/MessagesContext";
import { t } from "@/i18n/translate";
import type { CommitteeSessionStatus, PollingStation } from "@/types/generated/openapi";

export function getInvestigationDeletedMessage(
  pollingStation: PollingStation,
  currentCommitteeSessionStatus: CommitteeSessionStatus,
) {
  if (currentCommitteeSessionStatus === "data_entry_finished") {
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
) {
  if (currentCommitteeSessionStatus === "data_entry_finished") {
    return {
      type: "warning",
      title: t("generate_new_results"),
      text: `${t("investigations.message.investigation_updated", {
        number: pollingStation.number,
        name: pollingStation.name,
      })}. ${t("documents_are_invalidated")}`,
    } as Message;
  } else {
    return {
      title: t("investigations.message.investigation_updated", {
        number: pollingStation.number,
        name: pollingStation.name,
      }),
    } as Message;
  }
}
