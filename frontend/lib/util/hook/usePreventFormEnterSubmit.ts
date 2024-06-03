import * as React from "react";

export function usePreventFormEnterSubmit(ref: React.RefObject<HTMLFormElement>) {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
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
}
