import { RefObject, useCallback, useEffect, useRef } from "react";

type Dir = "up" | "down" | "first" | "last";

export function useFormKeyboardNavigation(): RefObject<HTMLFormElement> {
  const innerRef = useRef<HTMLFormElement>(null);

  const moveFocus = useCallback(
    (dir: Dir) => {
      if (!innerRef.current) {
        return;
      }

      // check whether the activeElement is inside the form
      if (!innerRef.current.contains(document.activeElement)) {
        return;
      }

      const inputs: NodeListOf<HTMLInputElement> = innerRef.current.querySelectorAll("input, select, textarea");
      const submitButton: HTMLButtonElement | null = innerRef.current.querySelector("button[type=submit]");

      const elements: HTMLElement[] = [...inputs];
      if (submitButton) {
        elements.push(submitButton);
      }

      // Note that targetIndex might be -1 if the active element is not in the list
      // (e.g. if the user is focused on a button or link outside of the input elements, but within the form)
      // In this case, the down button will focus to the first input element
      let targetIndex = elements.findIndex((element) => document.activeElement === element);

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

  useEffect(() => {
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
          // only handle events from inside the form or the body
          if (
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
            (event.target && innerRef.current?.contains(event.target as Node)) ||
            event.target instanceof HTMLBodyElement
          ) {
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

  return innerRef;
}
