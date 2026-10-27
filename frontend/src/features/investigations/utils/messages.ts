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
) {
  if (currentCommitteeSessionStatus === "completed") {
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

export function withCorrigendumInstruction(message: Message): Message {
  const instruction = t("investigations.message.enter_corrigendum");
  return { ...message, text: typeof message.text === "string" ? `${message.text}\n${instruction}` : instruction };
}
