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
        <PageTitle title="Dev Homepage - Abacus" />
        <header>
          <section>
            <h1>{t("privacy_statement.title")} Abacus</h1>
          </section>
        </header>
        <main>
          <article>
            <div className={cls.section}>
              <p className="bold">{t("version")} 18-11-2025</p>
              {t("privacy_statement.introduction")}
            </div>
            <div className={cls.section}>
              <p>
                <h2>{t("privacy_statement.how_is_abacus_used")}</h2>
                {t("privacy_statement.use_on_local_server")}
              </p>
              {t("privacy_statement.account_information")}
            </div>
            <div className={cls.section}>
              <p>
                <h2>{t("privacy_statement.what_data_does_abacus_use")}</h2>
                {t("privacy_statement.abacus_gathers_these_data")}
              </p>
              <p>
                <h3>{t("privacy_statement.user_data")}</h3>
                <ul>
                  <li>{t("privacy_statement.your_login_name")}</li>
                  <li>{t("privacy_statement.your_ip_address")}</li>
                  <li>{t("privacy_statement.your_actions")}</li>
                </ul>
              </p>
              <p>
                <h3>{t("privacy_statement.data_entry_of_documents")}</h3>
                <ul>
                  <li>{t("privacy_statement.documents_you_enter")}</li>
                  <li>{t("privacy_statement.details_and_explanations_you_enter")}</li>
                </ul>
              </p>
            </div>
            <div className={cls.section}>
              <p>
                <h2>{t("privacy_statement.what_are_these_data_used_for")}</h2>
                {t("privacy_statement.abacus_uses_these_data")}
              </p>
              <p>{t("privacy_statement.data_not_automatically_shared")}</p>
              <p>{t("privacy_statement.no_automated_decision_making")}</p>
            </div>
            <div className={cls.section}>
              <p>
                <h2>{t("privacy_statement.what_is_the_basis_for_data_usage")}</h2>
                {t("privacy_statement.execution_of_result_determination")}
              </p>
            </div>
            <div className={cls.section}>
              <p>
                <h2>{t("privacy_statement.know_more")}</h2>
                {t("privacy_statement.more_information_on_data_protection")}
              </p>
              <p>{t("privacy_statement.more_information_on_abacus_usage")}</p>
              <p>{t("privacy_statement.more_information_on_abacus")}</p>
              <p>
                <h3>Kiesraad</h3>
                <ul>
                  <li className="mb-md">{tx("privacy_statement.information_point_elections")}</li>
                  <li>{tx("privacy_statement.view_source_code")}</li>
                </ul>
              </p>
            </div>
          </article>
        </main>
        <Footer />
      </AppLayout>
    </AppFrame>
  );
}
