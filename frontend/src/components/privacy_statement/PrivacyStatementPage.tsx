import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { AppFrame } from "@/components/ui/AppFrame/AppFrame";
import { AppLayout } from "@/components/ui/AppLayout/AppLayout";
import { t, tx } from "@/i18n/translate";
import cls from "./PrivacyStatement.module.css";

export function PrivacyStatementPage() {
  return (
    <AppFrame>
      <AppLayout>
        <NavBar />
        <PageTitle title={`${t("privacy_statement.title")} - Abacus`} />
        <header>
          <section>
            <h1>{t("privacy_statement.title")} Abacus</h1>
          </section>
        </header>
        <main>
          <article className={cls.privacy_statement}>{tx("privacy_statement.content")}</article>
        </main>
        <Footer />
      </AppLayout>
    </AppFrame>
  );
}
