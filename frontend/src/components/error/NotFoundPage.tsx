import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { TranslationPath } from "@/i18n/i18n.types";
import { t, tx } from "@/i18n/translate";

import { Error } from "./Error";

export interface NotFoundPageProps {
  message: TranslationPath;
  path: string;
  vars?: Record<string, string | number>;
}

export function NotFoundPage({ message, vars, path }: NotFoundPageProps) {
  return (
    <AppLayout>
      {/* Show NavBar for / to avoid call to useElection outside ElectionProvider */}
      <NavBar location={{ pathname: "/" }} />
      <Error title={t(message, vars)}>
        {path && <p>{tx("error.page_not_found", undefined, { path })}</p>}
        <p>{t("error.not_found_feedback")}</p>
      </Error>
      <Footer />
    </AppLayout>
  );
}
