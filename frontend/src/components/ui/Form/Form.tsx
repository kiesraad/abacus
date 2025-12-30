import { type FormHTMLAttributes, forwardRef, type ReactNode } from "react";

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  title?: string;
  children: ReactNode;
}

export const Form = forwardRef<HTMLFormElement, FormProps>(({ title, children, ...formProps }, ref) => {
  return (
    <form ref={ref} {...formProps}>
      <fieldset>
        {title && (
          <legend>
            <h2>{title}</h2>
          </legend>
        )}
        {children}
      </fieldset>
    </form>
  );
});
