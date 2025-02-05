import { FormEvent } from "react";
import { useNavigate } from "react-router";

import { t } from "@kiesraad/i18n";
import { Button, Form, FormLayout, InputField, PageTitle } from "@kiesraad/ui";

export function UserCreateDetailsPage() {
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void navigate("/users");
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
            <FormLayout.Section title={t("users.details_title")}>
              <InputField id="username" name="username" label={t("users.username")} hint={t("users.username_hint")} />
              <InputField id="fullname" name="fullname" label={t("users.fullname")} hint={t("users.fullname_hint")} />
              <InputField
                id="password"
                name="password"
                label={t("users.temporary_password")}
                hint={t("users.temporary_password_hint")}
              />
            </FormLayout.Section>
          </FormLayout>
          <FormLayout.Controls>
            <Button size="xl" type="submit">
              {t("save")}
            </Button>
          </FormLayout.Controls>
        </Form>
      </main>
    </>
  );
}
