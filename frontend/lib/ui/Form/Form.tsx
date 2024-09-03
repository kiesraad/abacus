import * as React from "react";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}
export function Form({ children, ...formProps }: FormProps) {
  const ref = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    const submitButton = ref.current?.querySelector(
      "button[type=submit]",
    ) as HTMLButtonElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        if (event.shiftKey || document.activeElement === submitButton) {
          //ref.current.submit fails in testing environment (jsdom)
          ref.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        } else {
          event.preventDefault();
        }
      }
    };

    const node = ref.current;
    if (node) {
      node.addEventListener("keydown", handleKeyDown);
      return () => {
        node.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [ref]);

  return (
    <form ref={ref} {...formProps}>
      {children}
    </form>
  );
}
