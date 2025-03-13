import { PageTitle } from "@kiesraad/ui";

import { tx } from "@/utils/i18n/i18n";

interface NotAvailableInMockProps {
  title?: string;
}

export function NotAvailableInMock({ title }: NotAvailableInMockProps) {
  return (
    <>
      {title && <PageTitle title={title} />}
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
