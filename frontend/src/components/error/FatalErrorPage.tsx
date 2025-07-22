import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { TranslationPath } from "@/i18n/i18n.types";
import { t, tx } from "@/i18n/translate";
import { ErrorReference } from "@/types/generated/openapi";
import { isDevelopment } from "@/utils/env";

import { Error } from "./Error";

interface FatalErrorPageProps {
  title?: TranslationPath;
  message?: string;
  reference?: ErrorReference;
  code?: number;
  error?: Error;
}

export function FatalErrorPage({ title = "error.title", message, code, reference, error }: FatalErrorPageProps) {
  return (
    <AppLayout>
      {/* Show NavBar for / to avoid call to useElection outside ElectionProvider */}
      <NavBar location={{ pathname: "/" }} />
      <Error title={t(title)} error={error}>
        {(code || reference) && (
          <p>
            {code && <strong>{code}</strong>}
            &nbsp;
            {reference && <strong>{t(`error.api_error.${reference}`)}</strong>}
          </p>
        )}
        {message && <p>{message}</p>}
        {isDevelopment && (
          <>
            <h4>{t("error.instruction.title")}</h4>
            <p>
              {tx("error.instruction.content", {
                link: (content) => (
                  <a href="https://github.com/kiesraad/abacus" target="_blank">
                    {content}
                  </a>
                ),
              })}
            </p>
          </>
        )}
      </Error>
      <Footer />
    </AppLayout>
  );
}
