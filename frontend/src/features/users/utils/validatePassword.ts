import { t } from "@/utils/i18n/i18n";

export const MIN_PASSWORD_LENGTH = 12;

export function validatePassword(password: string): string | undefined {
  if (password.length === 0) {
    return t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    return t("users.temporary_password_error_min_length", { min_length: MIN_PASSWORD_LENGTH });
  }

  return undefined;
}
