import { Button } from "@/components/ui/Button/Button";
import { t } from "@/i18n/translate";
import type { SubCommitteeFirstSession } from "@/types/generated/openapi";
import { getAreaDesignation } from "@/utils/election";

export interface CheckAndSaveProps {
  electionName: string;
  subCommittee: SubCommitteeFirstSession;
  onSubmit: () => void;
  isLoading: boolean;
}

export function CheckAndSave({ electionName, subCommittee, onSubmit, isLoading }: CheckAndSaveProps) {
  return (
    <section className="md">
      <h2>{t("data_entry_import.check_and_save.title")}</h2>
      <p className="mt-lg">{t("data_entry_import.check_and_save.description")}</p>

      <ul>
        <li id="election-name">
          <strong>{t("election.title.singular")}:</strong> {electionName}
        </li>
        <li id="committee-category">
          <strong>{t("election.committee_category.title")}:</strong>{" "}
          {t(`committee_category.${subCommittee.category}.short`)}
        </li>
        <li id="area-designation">
          <strong>{t("area_designation")}:</strong> {getAreaDesignation(subCommittee)}
        </li>
      </ul>

      <div className="mt-xl">
        <Button type="button" onClick={onSubmit} isLoading={isLoading}>
          {t("save")}
        </Button>
      </div>
    </section>
  );
}
