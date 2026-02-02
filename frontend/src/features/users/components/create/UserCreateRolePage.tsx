import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useUser } from "@/hooks/user/useUser";
import { t } from "@/i18n/translate";
import { StringFormData } from "@/utils/stringFormData";

import { useUserCreateContext } from "../../hooks/useUserCreateContext";

export function UserCreateRolePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");
  const { role, setRole, setType } = useUserCreateContext();
  const user = useUser();

  // If the user is not an administrator, set the role to "typist" and navigate to the type page
  useEffect(() => {
    if (user?.role === "coordinator") {
      setRole("typist");
      void navigate("/users/create/type");
    }
  }, [user, navigate, setRole]);

  if (user?.role !== "administrator") {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    const roleValue = formData.getString("role") || null;

    if (!roleValue) {
      setError(t("users.role_mandatory"));
      return;
    }

    if (roleValue === "typist") {
      setRole(roleValue);
      void navigate("/users/create/type");
    } else if (roleValue === "coordinator" || roleValue === "administrator") {
      setRole(roleValue);
      setType("fullname");
      void navigate("/users/create/details");
    }
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
          <FormLayout>
            <FormLayout.Section title={t("users.role_title")}>
              <p>{t("users.role_hint")}</p>
              <ChoiceList>
                <ChoiceList.Legend>{t("users.role_label")}</ChoiceList.Legend>
                {error && <ChoiceList.Error id="role-error">{error}</ChoiceList.Error>}
                <ChoiceList.Radio
                  id={"role-administrator"}
                  name={"role"}
                  defaultValue={"administrator"}
                  defaultChecked={role === "administrator"}
                  label={t("administrator")}
                >
                  {t("users.role_administrator_hint")}
                </ChoiceList.Radio>
                <ChoiceList.Radio
                  id={"role-coordinator"}
                  name={"role"}
                  defaultValue={"coordinator"}
                  defaultChecked={role === "coordinator"}
                  label={t("coordinator")}
                >
                  {t("users.role_coordinator_hint")}
                </ChoiceList.Radio>
                <ChoiceList.Radio
                  id={"role-typist"}
                  name={"role"}
                  defaultValue={"typist"}
                  defaultChecked={role === "typist"}
                  label={t("typist")}
                >
                  {t("users.role_typist_hint")}
                </ChoiceList.Radio>
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
