import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { PageTitle } from "@/components/page_title/PageTitle";
import { Button } from "@/components/ui/Button/Button";
import { ChoiceList } from "@/components/ui/CheckboxAndRadio/ChoiceList";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { useUser } from "@/hooks/user/useUser";
import { t } from "@/i18n/translate";
import { isCoordinator } from "@/utils/role";
import { StringFormData } from "@/utils/stringFormData";
import { type CommitteeCategory, isRoleWithoutCommitteeCategory } from "../../hooks/UserCreateContext";
import { useUserCreateContext } from "../../hooks/useUserCreateContext";

function committeeCategoryFromRole(role: "coordinator_csb" | "coordinator_gsb"): CommitteeCategory {
  switch (role) {
    case "coordinator_csb":
      return "csb";
    case "coordinator_gsb":
      return "gsb";
  }
}

export function UserCreateRolePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string>("");
  const { role, setRole, setCommitteeCategory, setType } = useUserCreateContext();
  const loggedInUser = useUser();

  // If the user is a coordinator, set role and committee category, and navigate to the type page
  useEffect(() => {
    if (isCoordinator(loggedInUser?.role)) {
      setRole("typist");
      setCommitteeCategory(committeeCategoryFromRole(loggedInUser.role));
      void navigate("/users/create/type", { replace: true });
    }
  }, [loggedInUser, navigate, setRole, setCommitteeCategory]);

  if (loggedInUser?.role !== "administrator") {
    // Do not show page content while navigating away for the coordinator
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);
    const roleValue = formData.getString("role") || null;

    if (!roleValue || !isRoleWithoutCommitteeCategory(roleValue)) {
      setError(t("users.mandatory"));
      return;
    }

    if (roleValue === "administrator") {
      setRole("administrator");
      setType("fullname");
      void navigate("/users/create/details");
    } else {
      setRole(roleValue);
      void navigate("/users/create/committee");
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
                  id="role-administrator"
                  name="role"
                  defaultValue="administrator"
                  defaultChecked={role === "administrator"}
                  label={t("users.administrator")}
                >
                  {t("users.role_administrator_hint")}
                </ChoiceList.Radio>
                <ChoiceList.Radio
                  id="role-coordinator"
                  name="role"
                  defaultValue="coordinator"
                  defaultChecked={role === "coordinator"}
                  label={t("users.coordinator")}
                >
                  {t("users.role_coordinator_hint")}
                </ChoiceList.Radio>
                <ChoiceList.Radio
                  id="role-typist"
                  name="role"
                  defaultValue="typist"
                  defaultChecked={role === "typist"}
                  label={t("users.typist")}
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
