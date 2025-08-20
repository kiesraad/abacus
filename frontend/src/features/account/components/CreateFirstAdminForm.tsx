import { FormEvent, useEffect, useState } from "react";

import { ApiError } from "@/api/ApiResult";
import { useCrud } from "@/api/useCrud";
import { Alert } from "@/components/ui/Alert/Alert";
import { Button } from "@/components/ui/Button/Button";
import { Form } from "@/components/ui/Form/Form";
import { FormLayout } from "@/components/ui/Form/FormLayout";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";
import { CREATE_FIRST_ADMIN_REQUEST_PATH, CreateUserRequest, LoginResponse } from "@/types/generated/openapi";
import { StringFormData } from "@/utils/stringFormData";

import { UserValidationErrors, validateCreateUser } from "../util/validate";

interface CreateFirstAdminFormProps {
  next: () => void;
}

export function CreateFirstAdminForm({ next }: CreateFirstAdminFormProps) {
  const [validationErrors, setValidationErrors] = useState<UserValidationErrors | null>(null);

  const url: CREATE_FIRST_ADMIN_REQUEST_PATH = "/api/initialise/first-admin";
  const { create, requestState } = useCrud<LoginResponse>(url);
  const [apiError, setApiError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (requestState.status === "success") {
      next();
    } else if (requestState.status === "api-error") {
      if (requestState.error.reference === "PasswordRejection") {
        setValidationErrors({
          password: t("initialise.password_rules"),
        });
      } else {
        setApiError(requestState.error);
      }
    }
  }, [requestState, next]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new StringFormData(event.currentTarget);

    const account: Required<CreateUserRequest> = {
      username: formData.getString("username"),
      fullname: formData.getString("fullname"),
      temp_password: formData.getString("password"),
      role: "administrator",
    };

    const passwordRepeat = formData.getString("password_repeat");
    const errors = validateCreateUser(account, passwordRepeat);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors(null);

    void create(account);
  }

  return (
    <>
      <header>
        <section>
          <h1>{t("initialise.create_admin_account")}</h1>
        </section>
      </header>
      <main>
        <article className="no_footer">
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
                <p>{t(`error.api_error.${apiError.reference}`)}</p>
              </Alert>
            </FormLayout.Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <FormLayout disabled={requestState.status === "loading"}>
              <FormLayout.Section title={t("initialise.account_details")}>
                <p>{t("initialise.store_in_safe_place")}</p>
                <InputField
                  name="fullname"
                  label={t("account.fullname")}
                  subtext={t("account.fullname_subtext")}
                  hint={t("initialise.fullname_hint")}
                  error={validationErrors?.fullname}
                />
                <InputField
                  name="username"
                  label={t("account.username")}
                  hint={t("account.choose_username_hint")}
                  error={validationErrors?.username}
                />
                <InputField
                  name="password"
                  label={t("initialise.password")}
                  hint={t("initialise.password_hint")}
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
        </article>
      </main>
    </>
  );
}
