import * as React from "react";

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  skip?: string[];
}

type Dir = "up" | "down" | "first" | "last";

export const Form = React.forwardRef<HTMLFormElement, FormProps>(({ children, skip, ...formProps }, ref) => {
  const innerRef: React.MutableRefObject<HTMLFormElement | null> = React.useRef<HTMLFormElement>(null);

  const inputList = React.useRef<HTMLInputElement[]>([]);
  const submitButton = React.useRef<HTMLButtonElement | null>(null);

  const moveFocus = React.useCallback((dir: Dir) => {
    let activeIndex = inputList.current.findIndex((input) => document.activeElement === input);
    if (activeIndex === -1) {
      activeIndex = 0;
    }
    let targetIndex = activeIndex;
    switch (dir) {
      case "up":
        targetIndex = activeIndex - 1;
        break;
      case "down":
        targetIndex = activeIndex + 1;
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
      targetIndex = -1; //end of the line
    }

    if (targetIndex >= 0) {
      const next = inputList.current[targetIndex];
      if (next) {
        next.focus();
        setTimeout(() => {
          next.select();
        }, 1);
      }
    } else {
      submitButton.current?.focus();
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
          event.preventDefault();
          if (event.shiftKey || document.activeElement === submitButton.current) {
            //ref.current.submit fails in testing environment (jsdom)
            innerRef.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
          } else {
            moveFocus("down");
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

    //filter out inputs we should skip
    if (skip && skip.length) {
      inputList.current = inputList.current.filter((input) => !skip.includes(input.id));
    }
    submitButton.current = innerRef.current?.querySelector("button[type=submit]") as HTMLButtonElement | null;
  }, [children, skip]);

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
