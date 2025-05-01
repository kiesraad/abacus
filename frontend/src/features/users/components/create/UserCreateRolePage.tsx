import { FormEvent, useState } from "react";
import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { t } from "@/lib/i18n";
import { Role } from "@/types/generated/openapi";

import { useUserCreateContext } from "../../hooks/useUserCreateContext";

export function UserCreateRolePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");
  const { role, setRole, setType } = useUserCreateContext();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    const roleValue = formData.get("role") as Role | null;

    if (!roleValue) {
      setError(t("users.role_mandatory"));
      return;
    }

    if (roleValue === "typist") {
      setRole(roleValue);
      void navigate("/users/create/type");
    } else {
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
          <FormLayout width="medium">
            <FormLayout.Section>
              <ChoiceList>
                <ChoiceList.Title>{t("users.role_title")}</ChoiceList.Title>
                {error && <ChoiceList.Error>{error}</ChoiceList.Error>}
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
