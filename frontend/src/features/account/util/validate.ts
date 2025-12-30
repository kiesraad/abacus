import { t } from "@/i18n/translate";
import type { AccountUpdateRequest, CreateUserRequest } from "@/types/generated/openapi";

export type UserValidationErrors = {
  fullname?: string;
  password?: string;
  username?: string;
  password_repeat?: string;
};

export function validateUpdateUser(
  accountUpdate: Required<AccountUpdateRequest>,
  passwordRepeat: string,
): UserValidationErrors {
  const errors: UserValidationErrors = {};

  if (accountUpdate.fullname.length === 0) {
    errors.fullname = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
  }

  if (accountUpdate.password.length === 0) {
    errors.password = t("account.password_rules");
  }

  if (accountUpdate.password !== passwordRepeat) {
    errors.password_repeat = t("account.password_mismatch");
  }

  return errors;
}

export function validateCreateUser(
  accountCreate: Required<CreateUserRequest>,
  passwordRepeat: string,
): UserValidationErrors {
  const errors: UserValidationErrors = {};

  if (accountCreate.fullname.length === 0) {
    errors.fullname = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
  }

  if (accountCreate.username.length === 0) {
    errors.username = t("form_errors.FORM_VALIDATION_RESULT_REQUIRED");
  }

  if (accountCreate.temp_password.length === 0) {
    errors.password = t("initialise.password_rules");
  }

  if (accountCreate.temp_password !== passwordRepeat) {
    errors.password_repeat = t("account.password_mismatch");
  }

  return errors;
}
