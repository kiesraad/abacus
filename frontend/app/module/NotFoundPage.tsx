import { Error } from "@/component/error";
import { Footer } from "@/component/footer/Footer";
import { NavBar } from "@/component/navbar/NavBar";

import { t, TranslationPath, tx } from "@kiesraad/i18n";
import { AppLayout } from "@kiesraad/ui";

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
