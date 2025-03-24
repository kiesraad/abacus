import { useLocation } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { FileInput, PageTitle } from "@/components/ui";

import { t } from "@kiesraad/i18n";

export function ElectionCreatePage() {
  const location = useLocation();

  return (
    <>
      <PageTitle title={`${t("election.create")} - Abacus`} />
      <NavBar location={location} />
      <header>
        <section>
          <h1>{t("election.create")}</h1>
        </section>
      </header>
      <main>
        <article>
          <h2>Importeer verkiezingsdefinitie</h2>
          <p className="mt-lg mb-lg">
            Je hebt van de Kiesraad instructies gekregen waarmee je de verkiezingsdefinitie kunt downloaden. Zet het
            bestand op deze computer en importeer het.
          </p>
          <FileInput id="upload-eml">{t("select_file")}</FileInput>
        </article>
      </main>
      <Footer />
    </>
  );
}
