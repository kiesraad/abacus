import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { Alert, Button, Form, FormLayout, InputField, PageTitle } from "@kiesraad/ui";

import { isSuccess } from "@/api";
import { t } from "@/lib/i18n";
import { CreateUserRequest, Role } from "@/types/generated/openapi";

import { useUserCreateContext } from "../../hooks/useUserCreateContext";
import { MIN_PASSWORD_LENGTH, validatePassword } from "../../utils/validatePassword";

type ValidationErrors = Partial<CreateUserRequest>;

export function UserCreateDetailsPage() {
  const navigate = useNavigate();
  const { role, type, username, createUser, apiError, saving } = useUserCreateContext();
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);

  if (!role || !type) {
    return <Navigate to="/users/create" />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const user: CreateUserRequest = {
      role: role as Role,
      username: (formData.get("username") as string).trim(),
      fullname: (formData.get("fullname") as string | undefined)?.trim(),
      temp_password: (formData.get("temp_password") as string).trim(),
    };

    if (!validate(user)) {
      return;
    }

    void createUser(user).then((result) => {
      if (isSuccess(result)) {
        const { username, role } = result.data;
        const createdMessage = t("users.user_created_details", { username, role: t(role) });
        void navigate(`/users?created=${encodeURIComponent(createdMessage)}`);
      } else {
        window.scrollTo(0, 0);
      }
    });
  }

  function validate(user: CreateUserRequest): boolean {
    const errors: ValidationErrors = {};

    const required = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");

    if (user.username.length === 0) {
      errors.username = required;
    }

    if (user.fullname !== undefined && user.fullname.length === 0) {
      errors.fullname = required;
    }

    const passwordError = validatePassword(user.temp_password);
    if (passwordError) {
      errors.temp_password = passwordError;
    }

    const isValid = Object.keys(errors).length === 0;
    setValidationErrors(isValid ? null : errors);
    return isValid;
  }

  const usernameUniqueError =
    !validationErrors && apiError?.reference === "EntryNotUnique"
      ? t("users.username_not_unique_error", { username: username ?? "" })
      : undefined;

  return (
    <>
      <PageTitle title={`${t("users.add")} - Abacus`} />
      <header>
        <section>
          <h1>{t("users.add_role", { role: t(role) })}</h1>
        </section>
      </header>
      <main>
        <article>
          {!validationErrors && apiError && (
            <FormLayout.Alert>
              {usernameUniqueError ? (
                <Alert type="error">
                  <h2>{usernameUniqueError}</h2>
                  <p>{t("users.username_unique")}</p>
                </Alert>
              ) : (
                <Alert type="error">
                  {apiError.code}: {apiError.message}
                </Alert>
              )}
            </FormLayout.Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <FormLayout width="medium" disabled={saving}>
              <FormLayout.Section title={t("users.details_title")}>
                <InputField
                  id="username"
                  name="username"
                  label={t("users.username")}
                  hint={t("users.username_hint")}
                  error={validationErrors?.username || usernameUniqueError}
                />

                {type === "fullname" && (
                  <InputField
                    id="fullname"
                    name="fullname"
                    label={t("users.fullname")}
                    hint={t("users.fullname_hint")}
                    error={validationErrors?.fullname}
                  />
                )}

                <InputField
                  id="temp_password"
                  name="temp_password"
                  label={t("users.temporary_password")}
                  hint={t("users.temporary_password_hint", { min_length: MIN_PASSWORD_LENGTH })}
                  error={validationErrors?.temp_password}
                />
              </FormLayout.Section>
              <FormLayout.Controls>
                <Button size="xl" type="submit">
                  {t("save")}
                </Button>
              </FormLayout.Controls>
            </FormLayout>
          </Form>
        </article>
      </main>
    </>
  );
}
