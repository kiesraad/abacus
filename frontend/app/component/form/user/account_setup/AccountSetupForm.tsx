import { FormEvent } from "react";
import { useNavigate } from "react-router";

import { t } from "@kiesraad/i18n";
import { BottomBar, Button, InputField } from "@kiesraad/ui";

interface FormElements extends HTMLFormControlsCollection {
  username: HTMLInputElement;
  password: HTMLInputElement;
}

interface AccountSetupFormElement extends HTMLFormElement {
  readonly elements: FormElements;
}

export function AccountSetupForm() {
  const navigate = useNavigate();
  function handleSubmit(event: FormEvent<AccountSetupFormElement>) {
    event.preventDefault();
    void navigate("/elections#new-account");
  }

  return (
    <form className="no_footer" onSubmit={handleSubmit}>
      <div>
        <h2 className="mb-lg">{t("account.personalize_account")}</h2>
        <InputField
          name="username"
          label={t("account.username")}
          hint={t("account.username_hint")}
          value={t("account.username_default")}
          disabled
        />
        <InputField
          name="name"
          label={t("account.name")}
          subtext={t("account.name_subtext")}
          hint={t("account.name_hint")}
        />
        <InputField
          name="new_password1"
          label={t("account.password_new")}
          hint={t("account.password_hint")}
          type="password"
        />
        <InputField name="new_password2" label={t("account.password_repeat")} type="password" />
      </div>
      <BottomBar type="footer">
        <BottomBar.Row>
          <Button type="submit" size="lg">
            {t("save")}
          </Button>
        </BottomBar.Row>
      </BottomBar>
    </form>
  );
}
