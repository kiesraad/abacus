import { FormEvent, useState } from "react";

import { UpdateUserRequest, User } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { IconPencil } from "@kiesraad/icon";
import { Button, Form, FormLayout, InputField } from "@kiesraad/ui";

import { MIN_PASSWORD_LENGTH, validatePassword } from "../validatePassword";

export interface UserUpdateFormProps {
  user: User;
  onSave: (userUpdate: UpdateUserRequest) => void;
  onAbort: () => void;
  saving: boolean;
}

type ValidationErrors = Partial<UpdateUserRequest>;

export function UserUpdateForm({ user, onSave, onAbort, saving }: UserUpdateFormProps) {
  const [editPassword, setEditPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>();

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
      const passwordError = validatePassword(userUpdate.temp_password);
      if (passwordError) {
        errors.temp_password = passwordError;
      }
    }

    const isValid = Object.keys(errors).length === 0;
    setValidationErrors(isValid ? undefined : errors);

    if (isValid) {
      onSave(userUpdate);
    }
  }

  return (
    <>
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
                hint={t("users.temporary_password_hint", { min_length: MIN_PASSWORD_LENGTH })}
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
