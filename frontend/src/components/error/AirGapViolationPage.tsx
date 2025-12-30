import type { ReactElement } from "react";

import errorImage from "@/assets/images/airgap-error.webp";
import { Footer } from "@/components/footer/Footer";
import navbarCls from "@/components/navbar/NavBar.module.css";
import { AppFrame } from "@/components/ui/AppFrame/AppFrame";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { t, tx } from "@/i18n/translate";

import cls from "./ErrorMessage.module.css";

export function AirGapViolationPage() {
  return (
    <AppFrame>
      <AppLayout>
        <nav aria-label="primary-navigation" className={navbarCls.navBar} />
        <main>
          <article className={cls.error}>
            <section>
              <h1 id="error-title">{t("error.airgap_violation.title")}</h1>
              {tx("error.airgap_violation.content", {
                reload: (content: ReactElement) => (
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.reload();
                    }}
                  >
                    {content}
                  </a>
                ),
              })}
            </section>
            <aside>
              <img src={errorImage} alt={t("error.label")} />
            </aside>
          </article>
        </main>
        <Footer />
      </AppLayout>
    </AppFrame>
  );
}
