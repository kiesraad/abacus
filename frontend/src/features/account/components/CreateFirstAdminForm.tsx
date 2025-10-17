import { FormEvent, useState } from "react";

import { AnyApiError, ApiError, isSuccess } from "@/api/ApiResult";
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
  const createPath: CREATE_FIRST_ADMIN_REQUEST_PATH = "/api/initialise/first-admin";
  const { create, isLoading } = useCrud<LoginResponse>({ createPath });
  const [apiError, setApiError] = useState<AnyApiError | null>(null);

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

    void create(account).then((result) => {
      if (isSuccess(result)) {
        next();
      } else if (result instanceof ApiError && result.reference === "PasswordRejection") {
        setValidationErrors({
          password: t("initialise.password_rules"),
        });
      } else if (result instanceof ApiError) {
        setApiError(result);
      }
    });
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

          {apiError instanceof ApiError && (
            <FormLayout.Alert>
              <Alert type="error">
                <p>{t(`error.api_error.${apiError.reference}`)}</p>
              </Alert>
            </FormLayout.Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <FormLayout disabled={isLoading}>
              <FormLayout.Section title={t("initialise.account_details")}>
                <p>
                  {t("initialise.store_in_safe_place")} {t("initialise.other_accounts")}
                </p>
                <InputField
                  name="username"
                  label={t("account.username")}
                  hint={t("account.choose_username_hint")}
                  error={validationErrors?.username}
                />
                <InputField
                  name="fullname"
                  label={t("account.fullname")}
                  subtext={t("account.fullname_subtext")}
                  hint={t("initialise.fullname_hint")}
                  error={validationErrors?.fullname}
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
