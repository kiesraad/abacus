import { useEffect, useState } from "react";

import { t } from "@/i18n/translate";

import cls from "./Loader.module.css";

// the first 2.5 seconds this will render a blank screen, after that it will show a loading message
export function Loader() {
  const [showMessage, setShowMessage] = useState(false);

  // only show loader after 2.5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowMessage(true);
    }, 2500);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (!showMessage) {
    return null;
  }

  return <div className={cls["loader"]}>{t("loading")}</div>;
}
