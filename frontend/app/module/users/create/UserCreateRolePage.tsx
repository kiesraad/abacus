import { FormEvent } from "react";
import { useNavigate } from "react-router";

import { t } from "@kiesraad/i18n";
import { Button, ChoiceList, Form, FormLayout, PageTitle } from "@kiesraad/ui";

export function UserCreateRolePage() {
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void navigate("/users/create/type");
  }

  return (
    <>
      <PageTitle title={`${t("users.add")} - Abacus`} />
      <header>
        <section>
          <h1>{t("users.add")}</h1>
        </section>
      </header>
      <main>
        <Form onSubmit={handleSubmit}>
          <FormLayout width="medium">
            <FormLayout.Section>
              <ChoiceList>
                <ChoiceList.Title>{t("users.role_title")}</ChoiceList.Title>
                <ChoiceList.Radio
                  id={`role-administrator`}
                  name={"role"}
                  defaultValue={"administrator"}
                  label={t("administrator")}
                >
                  {t("users.role_administrator_hint")}
                </ChoiceList.Radio>
                <ChoiceList.Radio
                  id={`role-coordinator`}
                  name={"role"}
                  defaultValue={"coordinator"}
                  label={t("coordinator")}
                >
                  {t("users.role_coordinator_hint")}
                </ChoiceList.Radio>
                <ChoiceList.Radio id={`role-typist`} name={"role"} defaultValue={"typist"} label={t("typist")}>
                  {t("users.role_typist_hint")}
                </ChoiceList.Radio>
              </ChoiceList>
            </FormLayout.Section>
            <FormLayout.Section>{t("users.role_hint")}</FormLayout.Section>
          </FormLayout>
          <FormLayout.Controls>
            <Button size="xl" type="submit">
              {t("continue")}
            </Button>
          </FormLayout.Controls>
        </Form>
      </main>
    </>
  );
}
