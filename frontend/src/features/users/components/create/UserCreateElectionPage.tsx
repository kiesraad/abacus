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

export function UserCreateElectionPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");
  const { role, election, setElection, setType } = useUserCreateContext();

  if (role !== "coordinator" && role !== "typist") {
    return <Navigate to="/users/create" />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    const electionValue = formData.getString("election");
    if (electionValue !== "csb" && electionValue !== "gsb") {
      setError(t("users.mandatory"));
      return;
    }

    setElection(electionValue);

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
        <Form title={t("users.election_title", { role: t(`users.${role}`).toLowerCase() })} onSubmit={handleSubmit}>
          <FormLayout>
            <FormLayout.Section>
              <p>{t("users.election_hint")}</p>
              <ChoiceList>
                <ChoiceList.Legend>{t("users.election_label")}</ChoiceList.Legend>
                {error && <ChoiceList.Error id="election-error">{error}</ChoiceList.Error>}
                <ChoiceList.Radio
                  id="election-gsb"
                  name="election"
                  defaultValue="gsb"
                  defaultChecked={election === "gsb"}
                  label={t("users.election_gsb")}
                />
                <ChoiceList.Radio
                  id="election-csb"
                  name="election"
                  defaultValue="csb"
                  defaultChecked={election === "csb"}
                  label={t("users.election_csb")}
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
