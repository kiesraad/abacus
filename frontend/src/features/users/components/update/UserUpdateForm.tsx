import { FormEvent, useState } from "react";

import { AnyApiError, ApiError, isSuccess } from "@/api/ApiResult";
import { UpdateUserRequest, User, USER_UPDATE_REQUEST_PATH } from "@/api/gen/openapi";
import { useCrud } from "@/api/useCrud";
import { Alert, Button, Form, FormLayout, InputField } from "@/components/ui";
import { t } from "@/lib/i18n";
import { IconPencil } from "@/lib/icon";

export interface UserUpdateFormProps {
  user: User;
  onSaved: (user: User) => void;
  onAbort: () => void;
}

type ValidationErrors = Partial<UpdateUserRequest>;

export function UserUpdateForm({ user, onSaved, onAbort }: UserUpdateFormProps) {
  const [editPassword, setEditPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>();
  const { update, requestState } = useCrud<User>(`/api/user/${user.id}` satisfies USER_UPDATE_REQUEST_PATH);
  const [error, setError] = useState<AnyApiError>();

  if (error && !(error instanceof ApiError)) {
    throw error;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const userUpdate: UpdateUserRequest = {};
    const errors: ValidationErrors = {};

    if (user.fullname) {
      userUpdate.fullname = (formData.get("fullname") as string).trim();
      if (userUpdate.fullname.length === 0) {
        errors.fullname = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
      }
    }

    if (editPassword) {
      userUpdate.temp_password = formData.get("temp_password") as string;
      if (userUpdate.temp_password.length === 0) {
        errors.temp_password = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
      }
    }

    const isValid = Object.keys(errors).length === 0;
    setValidationErrors(isValid ? undefined : errors);

    if (isValid) {
      void update(userUpdate).then((result) => {
        if (isSuccess(result)) {
          onSaved(result.data);
        } else if (result instanceof ApiError && result.reference === "PasswordRejection") {
          setValidationErrors({ temp_password: t("error.api_error.PasswordRejection") });
        } else {
          setError(result);
        }
      });
    }
  }

  const saving = requestState.status === "loading";

  return (
    <>
      {error && (
        <FormLayout.Alert>
          <Alert type="error">{t(`error.api_error.${error.reference}`)}</Alert>
        </FormLayout.Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <FormLayout width="medium" disabled={saving}>
          <FormLayout.Section title={t("users.details_title")}>
            <InputField
              id="username"
              name="username"
              disabled={true}
              value={user.username}
              label={t("users.username")}
              hint={t("users.username_hint_disabled")}
            />

            {user.fullname && (
              <InputField
                id="fullname"
                name="fullname"
                defaultValue={user.fullname}
                label={t("users.fullname")}
                hint={t("users.fullname_hint")}
                error={validationErrors?.fullname}
              />
            )}

            {editPassword ? (
              <InputField
                id="temp_password"
                name="temp_password"
                label={t("users.new_password")}
                hint={t("users.temporary_password_hint")}
                error={validationErrors?.temp_password}
              />
            ) : (
              <FormLayout.Field label={t("account.password")}>
                {t("users.change_password_hint")}

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setEditPassword(true);
                  }}
                >
                  <IconPencil />
                  {t("users.change_password")}
                </Button>
              </FormLayout.Field>
            )}

            <FormLayout.Field label={t("role")}>{t(user.role)}</FormLayout.Field>

            <FormLayout.Controls>
              <Button type="submit">{t("save_changes")}</Button>
              <Button type="button" variant="secondary" onClick={onAbort}>
                {t("cancel")}
              </Button>
            </FormLayout.Controls>
          </FormLayout.Section>
        </FormLayout>
      </Form>
    </>
  );
}
