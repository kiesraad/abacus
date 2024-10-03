import * as React from "react";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

type Dir = "up" | "down" | "first" | "last";

export const Form = React.forwardRef<HTMLFormElement, FormProps>(({ children, ...formProps }, ref) => {
  const innerRef: React.MutableRefObject<HTMLFormElement | null> = React.useRef<HTMLFormElement>(null);

  const inputList = React.useRef<HTMLInputElement[]>([]);
  const submitButton = React.useRef<HTMLButtonElement | null>(null);

  const moveFocus = React.useCallback((dir: Dir) => {
    let targetIndex = inputList.current.findIndex((input) => document.activeElement === input);
    switch (dir) {
      case "up":
        targetIndex -= 1;
        break;
      case "down":
        targetIndex += 1;
        break;
      case "first":
        targetIndex = 0;
        break;
      case "last":
        targetIndex = inputList.current.length - 1;
        break;
    }
    if (targetIndex < 0) {
      targetIndex = inputList.current.length - 1;
    } else if (targetIndex >= inputList.current.length) {
      submitButton.current?.focus();
      return;
    }

    const next = inputList.current[targetIndex];
    if (next) {
      next.focus();
      setTimeout(() => {
        next.select();
      }, 1);
    }
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
          if (event.shiftKey) {
            moveFocus("first");
          } else {
            moveFocus("up");
          }
          break;
        case "ArrowDown":
          if (event.shiftKey) {
            moveFocus("last");
          } else {
            moveFocus("down");
          }
          break;
        case "Enter":
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLHeadingElement) {
            event.preventDefault();
            if (event.shiftKey || document.activeElement === submitButton.current) {
              //ref.current.submit fails in testing environment (jsdom)
              innerRef.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
            } else if (event.target instanceof HTMLInputElement && event.target.type === "radio") {
              submitButton.current?.focus();
            } else {
              moveFocus("down");
            }
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveFocus]);

  //cache children inputs and submit
  React.useEffect(() => {
    const inputs = innerRef.current?.querySelectorAll("input, select, textarea") as NodeListOf<HTMLInputElement>;
    inputList.current = Array.from(inputs);
    submitButton.current = innerRef.current?.querySelector("button[type=submit]") as HTMLButtonElement | null;
  }, [children]);

  React.useEffect(() => {
    document.getElementById("form-title")?.focus();
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
