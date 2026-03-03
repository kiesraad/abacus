import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";
import { StringFormData } from "@/utils/stringFormData";

import { useUserCreateContext } from "../../hooks/useUserCreateContext";

export function UserCreateCommitteeCategoryPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");
  const { role, committeeCategory, setCommitteeCategory, setType } = useUserCreateContext();

  if (role !== "coordinator" && role !== "typist") {
    return <Navigate to="/users/create" />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    const committeeCategoryValue = formData.getString("committee-category");
    if (committeeCategoryValue !== "csb" && committeeCategoryValue !== "gsb") {
      setError(t("users.mandatory"));
      return;
    }

    setCommitteeCategory(committeeCategoryValue);

    if (role === "typist") {
      void navigate("/users/create/type");
    } else {
      setType("fullname");
      void navigate("/users/create/details");
    }
  }

  return (
    <>
      <PageTitle title={`${t("users.add")} - Abacus`} />
      <header>
        <section>
          <h1>{t("users.add_role", { role: t(`users.${role}`) })}</h1>
        </section>
      </header>
      <main>
        <Form
          title={t("users.committee_category_title", { role: t(`users.${role}`).toLowerCase() })}
          onSubmit={handleSubmit}
        >
          <FormLayout>
            <FormLayout.Section>
              <p>{t("users.committee_category_hint")}</p>
              <ChoiceList>
                <ChoiceList.Legend>{t("users.committee_category_label")}</ChoiceList.Legend>
                {error && <ChoiceList.Error id="committee-category-error">{error}</ChoiceList.Error>}
                <ChoiceList.Radio
                  id="committee-category-gsb"
                  name="committee-category"
                  defaultValue="gsb"
                  defaultChecked={committeeCategory === "gsb"}
                  label={t("users.committee_category_gsb")}
                />
                <ChoiceList.Radio
                  id="committee-category-csb"
                  name="committee-category"
                  defaultValue="csb"
                  defaultChecked={committeeCategory === "csb"}
                  label={t("users.committee_category_csb")}
                />
              </ChoiceList>
            </FormLayout.Section>
            <FormLayout.Controls>
              <Button type="submit">{t("continue")}</Button>
            </FormLayout.Controls>
          </FormLayout>
        </Form>
      </main>
    </>
  );
}
