import { FormEvent, useState } from "react";

import { ApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { IconEdit } from "@/components/generated/icons";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import { ErrorReference, UpdateUserRequest, User, USER_UPDATE_REQUEST_PATH } from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

export interface UserUpdateFormProps {
  user: User;
  onSaved: (user: User) => void;
  onAbort: () => void;
}

type ValidationErrors = Partial<UpdateUserRequest>;

export function UserUpdateForm({ user, onSaved, onAbort }: UserUpdateFormProps) {
  const [editPassword, setEditPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>();
  const updatePath: USER_UPDATE_REQUEST_PATH = `/api/user/${user.id}`;
  const { update, isLoading } = useCrud<User>({ updatePath });
  const [error, setError] = useState<ErrorReference | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new StringFormData(event.currentTarget);

    const userUpdate: UpdateUserRequest = {};
    const errors: ValidationErrors = {};

    if (user.fullname) {
      userUpdate.fullname = formData.getString("fullname");
      if (userUpdate.fullname.length === 0) {
        errors.fullname = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
      }
    }

    if (editPassword) {
      userUpdate.temp_password = formData.getString("temp_password");
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
        } else if (result instanceof ApiError) {
          setError(result.reference);
        }
      });
    }
  }

  return (
    <>
      {error && (
        <FormLayout.Alert>
          <Alert type="error">
            <strong className="heading-md">{t(`error.api_error.${error}`)}</strong>
          </Alert>
        </FormLayout.Alert>
      )}

      <Form title={t("users.details_title")} onSubmit={handleSubmit}>
        <FormLayout disabled={isLoading}>
          <FormLayout.Section>
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
                <p>{t("users.change_password_hint")}</p>

                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setEditPassword(true);
                  }}
                >
                  <IconEdit />
                  {t("users.change_password")}
                </Button>
              </FormLayout.Field>
            )}
            <FormLayout.Field label={t("role")}>{t(user.role)}</FormLayout.Field>
          </FormLayout.Section>
          <FormLayout.Controls>
            <Button type="submit">{t("save_changes")}</Button>
            <Button type="button" variant="secondary" onClick={onAbort}>
              {t("cancel")}
            </Button>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </>
  );
}
