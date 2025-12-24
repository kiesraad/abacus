import { FormEvent, useState } from "react";

import { AnyApiError, ApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import { CreateUserRequest, Role, USER_CREATE_REQUEST_PATH, User } from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

export interface UserCreateDetailsFormProps {
  role: Role;
  showFullname: boolean;
  onSubmitted: (user: User) => void;
}

type ValidationErrors = Partial<CreateUserRequest>;

export function UserCreateDetailsForm({ role, showFullname, onSubmitted }: UserCreateDetailsFormProps) {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);
  const createPath: USER_CREATE_REQUEST_PATH = "/api/users";
  const { create, isLoading } = useCrud<User>({ createPath });
  const [usernameUniqueError, setUsernameUniqueError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<AnyApiError>();

  if (error && !(error instanceof ApiError)) {
    throw error;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameUniqueError(undefined);

    const formData = new StringFormData(event.currentTarget);

    const user: CreateUserRequest = {
      role,
      username: formData.getString("username"),
      fullname: formData.has("fullname") ? formData.getString("fullname") : undefined,
      temp_password: formData.getString("temp_password"),
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

  return (
    <>
      {error && (
        <FormLayout.Alert>
          <Alert type="error">
            <strong className="heading-md">{t(`error.api_error.${error.reference}`)}</strong>
          </Alert>
        </FormLayout.Alert>
      )}

      {usernameUniqueError && (
        <FormLayout.Alert>
          <Alert type="error">
            <strong className="heading-md">{usernameUniqueError}</strong>
            <p>{t("users.username_unique")}</p>
          </Alert>
        </FormLayout.Alert>
      )}

      <Form title={t("users.details_title")} onSubmit={handleSubmit}>
        <FormLayout disabled={isLoading}>
          <FormLayout.Section>
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
              id="username"
              name="username"
              label={t("users.username")}
              hint={t("users.username_hint")}
              error={validationErrors?.username}
            />

            <InputField
              id="temp_password"
              name="temp_password"
              label={t("users.temporary_password")}
              hint={t("users.temporary_password_hint")}
              error={validationErrors?.temp_password}
              margin="mb-0"
            />
          </FormLayout.Section>
          <FormLayout.Controls>
            <Button type="submit">{t("save")}</Button>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </>
  );
}
