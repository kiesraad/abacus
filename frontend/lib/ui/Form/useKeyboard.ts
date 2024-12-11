import * as React from "react";

type Dir = "up" | "down" | "first" | "last";

export function useKeyboard(innerRef: React.MutableRefObject<HTMLFormElement | null>) {
  const inputList = React.useRef<HTMLInputElement[]>([]);

  const submitButton = React.useRef<HTMLButtonElement | null>(null);

  const moveFocus = React.useCallback((dir: Dir) => {
    const elements: HTMLElement[] = [...inputList.current];
    if (submitButton.current) {
      elements.push(submitButton.current);
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
        targetIndex = inputList.current.length - 1;
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
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLBodyElement) {
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
  }, [innerRef, moveFocus]);

  //cache children inputs and submit
  React.useEffect(() => {
    const inputs = innerRef.current?.querySelectorAll("input, select, textarea") as NodeListOf<HTMLInputElement>;
    inputList.current = Array.from(inputs);
    submitButton.current = innerRef.current?.querySelector("button[type=submit]") as HTMLButtonElement | null;
  }, [innerRef]);
}
