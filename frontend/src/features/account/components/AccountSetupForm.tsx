import { FormEvent, useState } from "react";

import { AnyApiError, ApiError, isSuccess } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import { ACCOUNT_UPDATE_REQUEST_PATH, AccountUpdateRequest, LoginResponse } from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

import { UserValidationErrors, validateUpdateUser } from "../util/validate";

interface AccountSetupFormProps {
  user: LoginResponse;
  onSaved: (user: LoginResponse) => void;
}

export function AccountSetupForm({ user, onSaved }: AccountSetupFormProps) {
  const [showLoginSuccess, setShowLoginSuccess] = useState(true);
  const [validationErrors, setValidationErrors] = useState<UserValidationErrors | null>(null);

  const updatePath: ACCOUNT_UPDATE_REQUEST_PATH = "/api/account";
  const { update, isLoading } = useCrud<LoginResponse>({ updatePath });
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

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors(null);

    void update(account).then((result) => {
      if (isSuccess(result)) {
        onSaved(result.data);
      } else if (result instanceof ApiError && result.reference === "PasswordRejection") {
        setValidationErrors({
          password: t("account.password_rules"),
        });
      } else if (result instanceof ApiError) {
        setApiError(result);
      }
    });
  }

  return (
    <>
      {showLoginSuccess && (
        <FormLayout.Alert>
          <Alert type="success" onClose={hideLoginSuccess}>
            <strong className="heading-md">{t("account.login_success")}</strong>
            <p>{t("account.setting_up_account")}</p>
          </Alert>
        </FormLayout.Alert>
      )}
      {validationErrors && (
        <FormLayout.Alert>
          <Alert type="error">
            <strong className="heading-md">{t("account.not_saved")}</strong>
            <p>{t("account.check_fields")}</p>
          </Alert>
        </FormLayout.Alert>
      )}
      {apiError && (
        <FormLayout.Alert>
          <Alert type="error">
            <strong className="heading-md">{apiError.message}</strong>
          </Alert>
        </FormLayout.Alert>
      )}
      <Form title={t("account.personalize_account")} onSubmit={handleSubmit}>
        <FormLayout disabled={isLoading}>
          <FormLayout.Section>
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
          <FormLayout.Controls>
            <Button type="submit">{t("save")}</Button>
          </FormLayout.Controls>
        </FormLayout>
      </Form>
    </>
  );
}
