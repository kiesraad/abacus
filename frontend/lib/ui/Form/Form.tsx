import * as React from "react";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}
export const Form = React.forwardRef<HTMLFormElement, FormProps>(({ children, ...formProps }, ref) => {
  const innerRef: React.MutableRefObject<HTMLFormElement | null> = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    const submitButton = innerRef.current?.querySelector("button[type=submit]") as HTMLButtonElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        if (event.shiftKey || document.activeElement === submitButton) {
          event.preventDefault();
          event.stopPropagation();
          //ref.current.submit fails in testing environment (jsdom)
          innerRef.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        } else {
          event.preventDefault();
        }
      }
    };

    const node = innerRef.current;
    if (node) {
      node.addEventListener("keydown", handleKeyDown);
      return () => {
        node.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, []);

  return (
    <form
      ref={(node) => {
        if (node) innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      {...formProps}
    >
      {children}
    </form>
  );
});
