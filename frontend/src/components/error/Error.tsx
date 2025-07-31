import { ReactNode } from "react";
import { useNavigate } from "react-router";

import errorImage from "@/assets/images/error.webp";
import { IconArrowLeft } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { t } from "@/i18n/translate";
import { isDevelopment } from "@/utils/env";

import cls from "./Error.module.css";

interface ErrorProps {
  title: string;
  children: ReactNode;
  error?: Error;
}

export function Error({ title, error, children }: ErrorProps) {
  const navigate = useNavigate();

  return (
    <>
      <main>
        <article className={cls.error}>
          <section>
            <h1>{title}</h1>
            {children}
            <nav>
              <Button
                size="lg"
                variant="secondary"
                leftIcon={<IconArrowLeft />}
                onClick={() => {
                  void navigate(-1);
                }}
              >
                {t("history_back")}
              </Button>
            </nav>
          </section>
          <aside>
            <img src={errorImage} alt={t("error.label")} />
          </aside>
        </article>
      </main>
      {error && isDevelopment && (
        <section className={cls.stack}>
          <h2>{t("stack_trace")}</h2>
          <code>
            <pre>{error.stack}</pre>
          </code>
        </section>
      )}
    </>
  );
}
