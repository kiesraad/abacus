import { FormEvent, useState } from "react";

import { AnyApiError, ApiError, isSuccess } from "@/api/ApiResult";
import { CreateUserRequest, Role, User, USER_CREATE_REQUEST_PATH } from "@/api/gen/openapi";
import { useCrud } from "@/api/useCrud";
import { Alert, Button, Form, FormLayout, InputField } from "@/components/ui";
import { t } from "@/lib/i18n";

export interface UserCreateDetailsFormProps {
  role: Role;
  showFullname: boolean;
  onSubmitted: (user: User) => void;
}

type ValidationErrors = Partial<CreateUserRequest>;

export function UserCreateDetailsForm({ role, showFullname, onSubmitted }: UserCreateDetailsFormProps) {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);

  const { create, requestState } = useCrud<User>("/api/user" satisfies USER_CREATE_REQUEST_PATH);
  const [usernameUniqueError, setUsernameUniqueError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<AnyApiError>();

  if (error && !(error instanceof ApiError)) {
    throw error;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameUniqueError(undefined);

    const formData = new FormData(event.currentTarget);

    const user: CreateUserRequest = {
      role: role,
      username: (formData.get("username") as string).trim(),
      fullname: (formData.get("fullname") as string | undefined)?.trim(),
      temp_password: (formData.get("temp_password") as string).trim(),
    };

    if (!validate(user)) {
      return;
    }

    void create(user).then((result) => {
      if (isSuccess(result)) {
        onSubmitted(result.data);
      } else if (result instanceof ApiError && result.reference === "UsernameNotUnique") {
        setUsernameUniqueError(t("users.username_not_unique_error", { username: user.username }));
        setValidationErrors({ username: t("users.username_unique") });
      } else if (result instanceof ApiError && result.reference === "PasswordRejection") {
        setValidationErrors({ temp_password: t("error.api_error.PasswordRejection") });
      } else {
        setError(result);
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

    if (user.temp_password.length === 0) {
      errors.temp_password = required;
    }

    const isValid = Object.keys(errors).length === 0;
    setValidationErrors(isValid ? null : errors);
    return isValid;
  }

  const saving = requestState.status === "loading";

  return (
    <>
      {error && (
        <FormLayout.Alert>
          <Alert type="error">{t(`error.api_error.${error.reference}`)}</Alert>
        </FormLayout.Alert>
      )}

      {usernameUniqueError && (
        <FormLayout.Alert>
          <Alert type="error">
            <h2>{usernameUniqueError}</h2>
            <p>{t("users.username_unique")}</p>
          </Alert>
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
              error={validationErrors?.username}
            />

            {showFullname && (
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
              hint={t("users.temporary_password_hint")}
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
    </>
  );
}
