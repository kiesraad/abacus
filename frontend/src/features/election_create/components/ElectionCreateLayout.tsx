import { Outlet } from "react-router";

import { Footer } from "@/components/footer/Footer";
import { NavBar } from "@/components/navbar/NavBar";
import { PageTitle } from "@/components/page_title/PageTitle";
import { StickyNav } from "@/components/ui/AppLayout/StickyNav";
import { t } from "@/i18n/translate";
import { AbortModal } from "./AbortModal";
import { ElectionCreateContextProvider } from "./ElectionCreateContextProvider";
import cls from "./ElectionCreateLayout.module.css";
import { ElectionHeader } from "./ElectionHeader";
import { ElectionNav } from "./ElectionNav";

export function ElectionCreateLayout() {
  return (
    <ElectionCreateContextProvider>
      <PageTitle title={`${t("election.create")} - Abacus`} />
      <NavBar />
      <ElectionHeader />
      <AbortModal />
      <main>
        <StickyNav>
          <ElectionNav />
        </StickyNav>
        <article className={cls.container}>
          <Outlet />
        </article>
      </main>
      <Footer />
    </ElectionCreateContextProvider>
  );
}
