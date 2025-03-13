import { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { Button, ChoiceList, Form, FormLayout, PageTitle } from "@kiesraad/ui";

import { UserType } from "@/features/users/components/create/UserCreateContext";
import { useUserCreateContext } from "@/features/users/hooks/useUserCreateContext";
import { t } from "@/utils/i18n/i18n";

export function UserCreateTypePage() {
  const navigate = useNavigate();
  const { role, type, setType } = useUserCreateContext();

  if (!role) {
    return <Navigate to="/users/create" />;
  }

  // Preselect fullname if there was nothing selected yet
  const fullnameChecked = type ? type === "fullname" : true;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const type = formData.get("type") as UserType;

    setType(type);
    void navigate("/users/create/details");
  }

  return (
    <>
      <PageTitle title={`${t("users.add")} - Abacus`} />
      <header>
        <section>
          <h1>{t("users.add_role", { role: t(role) })}</h1>
        </section>
      </header>
      <main>
        <Form onSubmit={handleSubmit}>
          <FormLayout width="medium">
            <FormLayout.Section>
              <ChoiceList>
                <ChoiceList.Title>{t("users.type_title")}</ChoiceList.Title>
                <ChoiceList.Radio
                  id={"role-fullname"}
                  name={"type"}
                  defaultValue={"fullname"}
                  defaultChecked={fullnameChecked}
                  label={t("users.type_fullname")}
                />
                <ChoiceList.Radio
                  id={"role-anonymous"}
                  name={"type"}
                  defaultValue={"anonymous"}
                  defaultChecked={!fullnameChecked}
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
