import { Button } from "@/components/ui/Button/Button";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useUserRole } from "@/hooks/user/useUserRole";
import { t, tx } from "@/i18n/translate";

export function AddFirstElection() {
  const { isAdministrator } = useUserRole();

  return (
    <FormLayout>
      <FormLayout.Section>
        <h2 className="mb-0">{t("election.no_elections_added")}</h2>
        <div>{tx("election.add_first_election")}</div>
      </FormLayout.Section>
      <FormLayout.Controls>
        {isAdministrator && <Button.Link to={"./create"}>{t("election.create")}</Button.Link>}
      </FormLayout.Controls>
    </FormLayout>
  );
}
