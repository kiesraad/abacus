import { FormEvent } from "react";
import { useNavigate } from "react-router";

import { t } from "@kiesraad/i18n";
import { Button, ChoiceList, Form, FormLayout, PageTitle } from "@kiesraad/ui";

export function UserCreateTypePage() {
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void navigate("/users/create/details");
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
                <ChoiceList.Title>{t("users.type_title")}</ChoiceList.Title>
                <ChoiceList.Radio
                  id={`type-fullname`}
                  name={"type"}
                  defaultValue={"type-fullname"}
                  label={t("users.type_fullname")}
                />
                <ChoiceList.Radio
                  id={`type-anonymous`}
                  name={"type"}
                  defaultValue={"type-anonymous"}
                  label={t("users.type_anonymous")}
                />
              </ChoiceList>
            </FormLayout.Section>
            <FormLayout.Section>{t("users.type_hint")}</FormLayout.Section>
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
