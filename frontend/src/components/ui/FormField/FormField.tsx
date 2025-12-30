import type { ReactNode } from "react";
import { IconError, IconWarning } from "@/components/generated/icons";
import { t } from "@/i18n/translate";
import cls from "./FormField.module.css";

export interface FormFieldProps {
  id?: string;
  children: ReactNode;
  hasError?: boolean;
  hasWarning?: boolean;
}

export function FormField({ id, children, hasError, hasWarning }: FormFieldProps) {
  let icon: ReactNode | null = null;
  if (hasError) {
    icon = <IconError aria-label={t("contains_error")} className={cls.errorIcon} />;
  } else if (hasWarning) {
    icon = <IconWarning aria-label={t("contains_warning")} className={cls.warningIcon} />;
  }

  return (
    <div id={id} className={cls.formField}>
      {icon && <aside>{icon}</aside>}
      {children}
    </div>
  );
}
