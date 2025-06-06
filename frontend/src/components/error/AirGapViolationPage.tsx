import { ReactElement } from "react";

import { t, tx } from "@/i18n/translate";

import { Footer } from "../footer/Footer";
import navbarCls from "../navbar/NavBar.module.css";
import { AppLayout } from "../ui/AppLayout/AppLayout";
import errorImage from "./airgap-error.png";
import cls from "./Error.module.css";

export function AirGapViolationPage() {
  return (
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
  );
}
