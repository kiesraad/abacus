import { FormEvent, useState } from "react";

import { AnyApiError, ApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { BottomBar } from "@/components/ui/BottomBar/BottomBar";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import { ACCOUNT_UPDATE_REQUEST_PATH, AccountUpdateRequest, LoginResponse } from "@/types/generated/openapi";

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
  const [showLoginSuccess, setShowLoginSuccess] = useState(true);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors | null>(null);

  const url: ACCOUNT_UPDATE_REQUEST_PATH = "/api/user/account";
  const { update, requestState } = useCrud<LoginResponse>(url);
  const [apiError, setApiError] = useState<AnyApiError | null>(null);

  function hideLoginSuccess() {
    setShowLoginSuccess(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideLoginSuccess();

    const formData = new FormData(event.currentTarget);
    const account: Required<AccountUpdateRequest> = {
      username: user.username,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      fullname: (formData.get("fullname") as string).trim(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      password: formData.get("password") as string,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    if (!validate(account, formData.get("password_repeat") as string)) {
      return;
    }

    void update(account).then((result) => {
      if (isSuccess(result)) {
        onSaved(result.data);
      } else {
        if (result instanceof ApiError && result.reference === "PasswordRejection") {
          setValidationErrors({
            password: t("account.password_rules"),
          });
        } else {
          setApiError(result);
        }
      }
    });
  }

  function validate(accountUpdate: Required<AccountUpdateRequest>, passwordRepeat: string) {
    const errors: ValidationErrors = {};

    if (accountUpdate.fullname.length === 0) {
      errors.fullname = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
    }

    if (accountUpdate.password.length === 0) {
      errors.password = t("account.password_rules");
    }

    if (accountUpdate.password !== passwordRepeat) {
      errors.password = t("account.password_rules");
      errors.password_repeat = t("account.password_mismatch");
    }

    const isValid = Object.keys(errors).length === 0;
    setValidationErrors(isValid ? null : errors);
    return isValid;
  }

  return (
    <>
      {showLoginSuccess && (
        <FormLayout.Alert>
          <Alert type="success" onClose={hideLoginSuccess}>
            <h2>{t("account.login_success")}</h2>
            <p>{t("account.setting_up_account")}</p>
          </Alert>
        </FormLayout.Alert>
      )}

      {validationErrors && (
        <FormLayout.Alert>
          <Alert type="error">
            <h2>{t("account.not_saved")}</h2>
            <p>{t("account.check_fields")}</p>
          </Alert>
        </FormLayout.Alert>
      )}

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
              hint={t("account.password_hint")}
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
