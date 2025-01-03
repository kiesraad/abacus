import { Link } from "react-router";

import { NavBar } from "app/component/navbar/NavBar";

import { t, tx } from "@kiesraad/i18n";
import { PageTitle } from "@kiesraad/ui";

interface NotAvailableInMockProps {
  title?: string;
}

export function NotAvailableInMock({ title }: NotAvailableInMockProps) {
  return (
    <>
      {title && <PageTitle title={title} />}
      <NavBar>
        <Link to={"/overview"}>{t("overview")}</Link>
      </NavBar>
      <main>
        <article>
          {tx("messages.not_available_in_mock", {
            link: (content) => <a href={"/overview"}>{content}</a>,
          })}
        </article>
      </main>
    </>
  );
}
