import { FormEvent, useState } from "react";

import { MIN_PASSWORD_LENGTH, validatePassword } from "app/module/users/validatePassword";

import {
  ACCOUNT_UPDATE_REQUEST_PATH,
  AccountUpdateRequest,
  AnyApiError,
  ApiError,
  isSuccess,
  LoginResponse,
  useCrud,
} from "@kiesraad/api";
import { t } from "@kiesraad/i18n";
import { Alert, BottomBar, Button, Form, FormLayout, InputField } from "@kiesraad/ui";

type ValidationErrors = {
  fullname?: string;
  password?: string;
  password_repeat?: string;
};

interface AccountSetupFormProps {
  user: LoginResponse;
  onSaved: (user: LoginResponse) => void;
}

export function AccountSetupForm({ user, onSaved }: AccountSetupFormProps) {
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);

  const url: ACCOUNT_UPDATE_REQUEST_PATH = "/api/user/account";
  const { update, requestState } = useCrud<LoginResponse>(url);
  const [apiError, setApiError] = useState<AnyApiError | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const account: AccountUpdateRequest = {
      username: user.username,
      fullname: (formData.get("fullname") as string).trim(),
      password: formData.get("password") as string,
    };

    if (!validate(account, formData.get("password_repeat") as string)) {
      return;
    }

    void update(account).then((result) => {
      if (isSuccess(result)) {
        onSaved(result.data);
      } else {
        if (result instanceof ApiError && result.reference === "PasswordRejection") {
          setValidationErrors({
            password: t("error.api_error.PasswordRejection"),
          });
        } else {
          setApiError(result);
        }
      }
    });
  }

  function validate(accountUpdate: AccountUpdateRequest, passwordRepeat: string) {
    const errors: ValidationErrors = {};

    if (accountUpdate.fullname !== undefined && accountUpdate.fullname.length === 0) {
      errors.fullname = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
    }

    if (accountUpdate.password !== passwordRepeat) {
      errors.password_repeat = t("account.password_mismatch");
    }

    const passwordValidationError = validatePassword(accountUpdate.password);
    if (passwordValidationError) {
      errors.password = passwordValidationError;
    }

    const isValid = Object.keys(errors).length === 0;
    setValidationErrors(isValid ? null : errors);
    return isValid;
  }

  return (
    <>
      {apiError && (
        <FormLayout.Alert>
          <Alert type="error">{apiError.message}</Alert>
        </FormLayout.Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <FormLayout disabled={requestState.status === "loading"}>
          <FormLayout.Section title={t("account.personalize_account")}>
            <InputField
              name="username"
              label={t("account.username")}
              hint={t("account.username_hint")}
              value={user.username}
              disabled
            />
            <InputField
              name="fullname"
              label={t("account.fullname")}
              subtext={t("account.fullname_subtext")}
              hint={t("account.fullname_hint")}
              error={validationErrors?.fullname}
              defaultValue={user.fullname}
            />
            <InputField
              name="password"
              label={t("account.password_new")}
              hint={t("account.password_hint", { min_length: MIN_PASSWORD_LENGTH })}
              type="password"
              error={validationErrors?.password}
            />
            <InputField
              name="password_repeat"
              label={t("account.password_repeat")}
              type="password"
              error={validationErrors?.password_repeat}
            />
          </FormLayout.Section>
          <BottomBar type="footer">
            <BottomBar.Row>
              <Button type="submit" size="lg">
                {t("next")}
              </Button>
            </BottomBar.Row>
          </BottomBar>
        </FormLayout>
      </Form>
    </>
  );
}
