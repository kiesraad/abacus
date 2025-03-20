import * as React from "react";

type Dir = "up" | "down" | "first" | "last";

export function useFormKeyboardNavigation(innerRef: React.MutableRefObject<HTMLFormElement | null>) {
  const moveFocus = React.useCallback(
    (dir: Dir) => {
      if (!innerRef.current) {
        return;
      }

      const inputs: NodeListOf<HTMLInputElement> = innerRef.current.querySelectorAll("input, select, textarea");
      const submitButton: HTMLButtonElement | null = innerRef.current.querySelector("button[type=submit]");

      const elements: HTMLElement[] = [...inputs];
      if (submitButton) {
        elements.push(submitButton);
      }

      let targetIndex = elements.findIndex((element) => document.activeElement === element);
      if (targetIndex === -1) {
        return;
      }

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
          targetIndex = inputs.length - 1;
          break;
      }

      if (targetIndex < 0 || targetIndex >= elements.length) {
        return;
      }

      const element = elements[targetIndex];
      if (element) {
        element.focus();
        if (element instanceof HTMLInputElement) {
          setTimeout(() => {
            element.select();
          }, 1);
        }
      }
    },
    [innerRef],
  );

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
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLBodyElement) {
            const submitButton: HTMLButtonElement | undefined | null =
              innerRef.current?.querySelector("button[type=submit]");

            event.preventDefault();
            if (event.shiftKey || (submitButton && document.activeElement === submitButton)) {
              //ref.current.submit fails in testing environment (jsdom)
              innerRef.current?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
            } else if (event.target instanceof HTMLInputElement && event.target.type === "radio") {
              submitButton?.focus();
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
  }, [innerRef, moveFocus]);
}
