import { AppLayout } from "@kiesraad/ui";

import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { t, tx } from "@/utils/i18n/i18n";
import { TranslationPath } from "@/utils/i18n/i18n.types";

import { Error } from "./Error";

export interface NotFoundPageProps {
  message: TranslationPath;
  path: string;
}

export function NotFoundPage({ message, path }: NotFoundPageProps) {
  return (
    <AppLayout>
      {/* Show NavBar for / to avoid call to useElection outside ElectionProvider */}
      <NavBar location={{ pathname: "/" }} />
      <Error title={t(message)}>
        {path && <p>{tx("error.page_not_found", undefined, { path })}</p>}
        <p>{t("error.not_found_feedback")}</p>
      </Error>
      <Footer />
    </AppLayout>
  );
}
