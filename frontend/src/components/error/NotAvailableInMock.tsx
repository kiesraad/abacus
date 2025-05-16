import { PageTitle } from "@/components/page_title/PageTitle";
import { tx } from "@/i18n/translate";

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
