import { Button } from "@/components/ui/Button/Button";
import { t } from "@/i18n/translate";
import type { SubCommitteeFirstSession } from "@/types/generated/openapi";

export interface CheckAndSaveProps {
  electionName: string;
  subCommittee: SubCommitteeFirstSession;
  onSubmit: () => void;
}

export function CheckAndSave({ electionName, subCommittee, onSubmit }: CheckAndSaveProps) {
  return (
    <section className="md">
      <h2>{t("data_entry_import.check_and_save.title")}</h2>
      <p className="mt-lg">{t("data_entry_import.check_and_save.description")}</p>

      <ul>
        <li id="election-name">
          <strong>{t("election.singular")}:</strong> {electionName}
        </li>
        <li id="committee-category">
          <strong>{t("election.committee_category.title").toLowerCase()}:</strong> {t("committee_category.GSB.short")}
        </li>
        <li id="area-designation">
          <strong>{t("area_designation")}:</strong> {subCommittee.authority_name} ({subCommittee.authority_id})
        </li>
      </ul>

      <div className="mt-xl">
        <Button type="submit" onClick={onSubmit}>
          {t("save")}
        </Button>
      </div>
    </section>
  );
}
