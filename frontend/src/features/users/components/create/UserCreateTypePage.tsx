import { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/i18n/translate";
import { StringFormData } from "@/utils/stringFormData";

import { UserType } from "../../hooks/UserCreateContext";
import { useUserCreateContext } from "../../hooks/useUserCreateContext";

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
    const formData = new StringFormData(event.currentTarget);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const type = formData.getString("type") as UserType;

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
          <FormLayout>
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
                {t("users.type_hint")}
              </ChoiceList>
            </FormLayout.Section>
          </FormLayout>
          <FormLayout.Controls>
            <Button type="submit">{t("continue")}</Button>
          </FormLayout.Controls>
        </Form>
      </main>
    </>
  );
}
