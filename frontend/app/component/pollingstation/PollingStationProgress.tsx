import * as React from "react";
import { Link, useParams } from "react-router";

import { useElection } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { MenuStatus, ProgressList } from "@kiesraad/ui";

import { isFormSectionEmpty } from "../form/data_entry/state/dataEntryUtils";
import { FormSection, FormSectionId } from "../form/data_entry/state/types";
import { useDataEntryContext } from "../form/data_entry/state/useDataEntryContext";

export function PollingStationProgress() {
  const { pollingStationId } = useParams();
  const { election } = useElection();

  const { formState, pollingStationResults, entryNumber } = useDataEntryContext();

  const menuStatusForFormSection = React.useCallback(
    (formSection?: FormSection): MenuStatus => {
      if (!formSection) return "idle";

      if (formSection.errors.length > 0) {
        return "error";
      }
      if (formSection.warnings.length > 0 && !formSection.acceptWarnings) {
        return "warning";
      }

      if (formSection.id === formState.furthest) {
        return "unsaved";
      }
      const currentSection = formState.sections[formState.furthest];
      if (currentSection) {
        //check if section has been left empty
        if (formSection.index < currentSection.index) {
          if (isFormSectionEmpty(formSection, pollingStationResults)) {
            return "empty";
          }
        }
      }

      if (formSection.errors.length === 0 && formSection.isSaved) {
        return "accept";
      }

      return "idle";
    },
    [formState, pollingStationResults],
  );

  const lists = election.political_groups;
  const currentIndex = formState.sections[formState.furthest]?.index || 0;

  return (
    <ProgressList>
      <ProgressList.Fixed>
        <ProgressList.Item
          id="list-item-recounted"
          key="recounted"
          status="accept"
          active={formState.current === "recounted"}
        >
          {formState.current !== "recounted" ? (
            <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}/recounted`}>
              <span>{t("polling_station.recounted_question")}</span>
            </Link>
          ) : (
            <span>{t("polling_station.recounted_question")}</span>
          )}
        </ProgressList.Item>
        <ProgressList.Item
          key="voters-and-votes"
          id="list-item-voters-and-votes"
          status={menuStatusForFormSection(formState.sections.voters_votes_counts)}
          disabled={formState.sections.voters_votes_counts.index > currentIndex}
          active={formState.current === "voters_votes_counts"}
        >
          {formState.current !== "voters_votes_counts" &&
          formState.sections.voters_votes_counts.index <= currentIndex ? (
            <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}/voters-and-votes`}>
              <span>{t("polling_station.voters_and_vote_count")}</span>
            </Link>
          ) : (
            <span>{t("polling_station.voters_and_vote_count")}</span>
          )}
        </ProgressList.Item>
        <ProgressList.Item
          key="differences"
          id="list-item-differences"
          disabled={formState.sections.differences_counts.index > currentIndex}
          status={menuStatusForFormSection(formState.sections.differences_counts)}
          active={formState.current === "differences_counts"}
        >
          {formState.current !== "differences_counts" && formState.sections.differences_counts.index <= currentIndex ? (
            <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}/differences`}>
              <span>{t("differences.title")}</span>
            </Link>
          ) : (
            <span>{t("differences.title")}</span>
          )}
        </ProgressList.Item>
      </ProgressList.Fixed>

      <ProgressList.Scroll>
        {lists.map((list, index) => {
          const listId = `${index + 1}`;
          const formSection = formState.sections[`political_group_votes_${listId}` as FormSectionId];
          if (!formSection) return null;
          return (
            <ProgressList.Item
              key={`list${listId}`}
              id={`list-item-pg-${listId}`}
              disabled={formSection.index > currentIndex}
              status={menuStatusForFormSection(formSection)}
              active={formState.current === formSection.id}
              scrollIntoView
            >
              {formState.current !== formSection.id && formSection.index <= currentIndex ? (
                <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}/list/${listId}`}>
                  <span>
                    {t("list")} {list.number} - {list.name}
                  </span>
                </Link>
              ) : (
                <span>
                  {t("list")} {list.number} - {list.name}
                </span>
              )}
            </ProgressList.Item>
          );
        })}
      </ProgressList.Scroll>
      <ProgressList.Fixed>
        <ProgressList.Item
          key="save"
          id="list-item-save"
          status={menuStatusForFormSection(formState.sections.save)}
          active={formState.current === "save"}
          disabled={formState.furthest !== "save"}
        >
          {formState.current !== "save" && formState.furthest === "save" ? (
            <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/${entryNumber}/save`}>
              <span>{t("check_and_save.title")}</span>
            </Link>
          ) : (
            <span>{t("check_and_save.title")}</span>
          )}
        </ProgressList.Item>
      </ProgressList.Fixed>
    </ProgressList>
  );
}
