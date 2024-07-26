import { createContext, useMemo, useState } from "react";

export interface iNotFoundContext {
  notFound: boolean;
  setNotFound: (notFound: boolean) => void;
}

export const NotFoundContext = createContext<iNotFoundContext>({
  notFound: false,
  setNotFound: (notFound: boolean) => {
    notFound;
  },
});

export const NotFoundProvider = (props: object) => {
  const [state, setState] = useState({ notFound: false });

  const value = useMemo(
    () => ({
      ...state,
      setNotFound: (notFound: boolean) => {
        setState((state) => ({ ...state, notFound }));
      },
    }),
    [state],
  );

  return <NotFoundContext.Provider value={value} {...props} />;
};
