import { Error, ErrorAction } from "app/component/error";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import { t, TranslationPath, tx } from "@kiesraad/i18n";
import { AppLayout } from "@kiesraad/ui";

export interface NotFoundProps {
  message: TranslationPath;
  path: string;
}

export function NotFound({ message, path }: NotFoundProps) {
  return (
    <AppLayout>
      <NavBar />
      <Error title={t(message)} action={ErrorAction.Back}>
        {path && <p>{tx("error.page_not_found", undefined, { path })}</p>}
        <p>{t("error.not_found_feedback")}</p>
      </Error>
      <Footer />
    </AppLayout>
  );
}
