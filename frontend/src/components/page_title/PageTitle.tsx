import { useEffect } from "react";
import { useLocation } from "react-router";

export const PageTitle = ({ title }: { title: string }) => {
  const location = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies(location): page title needs to update when the location changes
  useEffect(() => {
    document.title = title;
  }, [location, title]);

  return null;
};
