import * as React from "react";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  title?: string;
  children: React.ReactNode;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(({ title, children, ...formProps }, ref) => {
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
