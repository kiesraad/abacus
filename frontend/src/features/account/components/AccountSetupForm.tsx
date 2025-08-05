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

import { StringFormData } from "../../../utils/stringFormData";
import { UserValidationErrors, validateUpdateUser } from "../util/validate";

interface AccountSetupFormProps {
  user: LoginResponse;
  onSaved: (user: LoginResponse) => void;
}

export function AccountSetupForm({ user, onSaved }: AccountSetupFormProps) {
  const [showLoginSuccess, setShowLoginSuccess] = useState(true);
  const [validationErrors, setValidationErrors] = useState<UserValidationErrors | null>(null);

  const url: ACCOUNT_UPDATE_REQUEST_PATH = "/api/user/account";
  const { update, requestState } = useCrud<LoginResponse>(url);
  const [apiError, setApiError] = useState<AnyApiError | null>(null);

  function hideLoginSuccess() {
    setShowLoginSuccess(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    hideLoginSuccess();

    const formData = new StringFormData(event.currentTarget);
    const account: Required<AccountUpdateRequest> = {
      username: user.username,
      fullname: formData.getString("fullname"),
      password: formData.getString("password"),
    };

    const passwordRepeat = formData.getString("password_repeat");
    const errors = validateUpdateUser(account, passwordRepeat);
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
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
              <Button type="submit">{t("next")}</Button>
            </BottomBar.Row>
          </BottomBar>
        </FormLayout>
      </Form>
    </>
  );
}
