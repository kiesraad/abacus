import { useEffect } from "react";

export const PageTitle = ({ title }: { title: string }) => {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
};
