import * as React from "react";

import cls from "./FormLayout.module.css";

export interface FormLayoutProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export function FormLayout({ children, disabled }: FormLayoutProps) {
  return (
    <div className={cls.formLayout}>
      <fieldset disabled={disabled} className={cls.rootFieldset}>
        {children}
      </fieldset>
    </div>
  );
}

function FormSection({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <section className={cls.formSection}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className={cls.formRow}>{children}</div>;
}

function FormField({ label, children }: { children: React.ReactNode; label?: string }) {
  return (
    <div className={cls.formField}>
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

function FormControls({ children }: { children: React.ReactNode }) {
  return <div className={cls.formControls}>{children}</div>;
}

function FormAlert({ children }: { children: React.ReactNode }) {
  return <div className={cls.formAlert}>{children}</div>;
}

FormLayout.Section = FormSection;
FormLayout.Row = FormRow;
FormLayout.Field = FormField;
FormLayout.Controls = FormControls;

FormLayout.Alert = FormAlert;
