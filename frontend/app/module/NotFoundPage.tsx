import { Error } from "app/component/error";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import { t, TranslationPath, tx } from "@kiesraad/i18n";
import { AppLayout } from "@kiesraad/ui";

export interface NotFoundPageProps {
  message: TranslationPath;
  path: string;
}

export function NotFoundPage({ message, path }: NotFoundPageProps) {
  return (
    <AppLayout>
      <NavBar />
      <Error title={t(message)}>
        {path && <p>{tx("error.page_not_found", undefined, { path })}</p>}
        <p>{t("error.not_found_feedback")}</p>
      </Error>
      <Footer />
    </AppLayout>
  );
}
