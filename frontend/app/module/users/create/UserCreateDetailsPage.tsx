import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { t } from "@kiesraad/i18n";
import { Button, Form, FormLayout, InputField, PageTitle } from "@kiesraad/ui";

import { useUserCreateContext } from "./useUserCreateContext";

interface UserDetails {
  username: string;
  fullname?: string;
  password: string;
}

type ValidationErrors = Partial<UserDetails>;

const MIN_PASSWORD_LENGTH = 12;

export function UserCreateDetailsPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useUserCreateContext();
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);

  if (!user.role || !user.type) {
    return <Navigate to="/users/create" />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const details: UserDetails = {
      username: (formData.get("username") as string).trim(),
      fullname: (formData.get("fullname") as string | undefined)?.trim(),
      password: (formData.get("password") as string).trim(),
    };

    if (!validate(details)) {
      return;
    }

    updateUser(details);

    void navigate(`/users`);
  }

  function validate(details: UserDetails): boolean {
    const errors: ValidationErrors = {};

    const required = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");

    if (details.username.length === 0) {
      errors.username = required;
    }

    if (details.fullname !== undefined && details.fullname.length === 0) {
      errors.fullname = required;
    }

    if (details.password.length === 0) {
      errors.password = required;
    } else if (details.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = t("users.temporary_password_error_min_length", { min_length: MIN_PASSWORD_LENGTH });
    }

    const isValid = Object.keys(errors).length === 0;
    setValidationErrors(isValid ? null : errors);
    return isValid;
  }

  return (
    <>
      <PageTitle title={`${t("users.add")} - Abacus`} />
      <header>
        <section>
          <h1>{t("users.add_role", { role: t(user.role) })}</h1>
        </section>
      </header>
      <main>
        <Form onSubmit={handleSubmit}>
          <FormLayout width="medium">
            <FormLayout.Section title={t("users.details_title")}>
              <InputField
                id="username"
                name="username"
                label={t("users.username")}
                hint={t("users.username_hint")}
                error={validationErrors?.username}
              />

              {user.type === "fullname" && (
                <InputField
                  id="fullname"
                  name="fullname"
                  label={t("users.fullname")}
                  hint={t("users.fullname_hint")}
                  error={validationErrors?.fullname}
                />
              )}

              <InputField
                id="password"
                name="password"
                label={t("users.temporary_password")}
                hint={t("users.temporary_password_hint", { min_length: MIN_PASSWORD_LENGTH })}
                error={validationErrors?.password}
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
