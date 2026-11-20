import { IconCheckmark } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { t } from "@/i18n/translate";
import type { SubCommitteeFirstSession } from "@/types/generated/openapi";
import { formatAreaDesignation } from "@/utils/election";
import cls from "./CheckAndSave.module.css";

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
      <p>{t("data_entry_import.check_and_save.description")}</p>

      <ul>
        <li id="election-name">
          <strong>{t("election.title.singular")}:</strong> {electionName}
        </li>
        <li id="committee-category">
          <strong>{t("election.committee_category.title")}:</strong>{" "}
          {t(`committee_category.${subCommittee.category}.short`)}
        </li>
        <li id="area-designation">
          <strong>{t("area_designation")}:</strong>{" "}
          {formatAreaDesignation(subCommittee.authority_id, subCommittee.authority_name)}
        </li>
      </ul>

      <div className={cls.confirmations}>
        <strong>
          <Icon color="accept" size="md" icon={<IconCheckmark />} />
          {t("data_entry_import.check_and_save.file_signed_by", {
            area_designation: formatAreaDesignation(
              subCommittee.authority_id,
              subCommittee.authority_name,
              subCommittee.category,
            ),
          })}
        </strong>
        <strong>
          <Icon color="accept" size="md" icon={<IconCheckmark />} />
          {t("data_entry_import.check_and_save.signature_matches")}
        </strong>
      </div>

      <div className="mt-xl">
        <Button type="button" onClick={onSubmit} isLoading={isLoading}>
          {t("save")}
        </Button>
      </div>
    </section>
  );
}
