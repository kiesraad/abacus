import { useNavigate } from "react-router-dom";

import { IconArrowLeft } from "@kiesraad/icon";
import { Button, Icon } from "@kiesraad/ui";
import { isDevelopment } from "@kiesraad/util";

import cls from "./Error.module.css";
import errorImage from "./error.png";
import { ErrorAction } from "./Error.types";

interface ErrorProps {
  title: string;
  children: React.ReactNode;
  action: ErrorAction;
  error?: Error;
}

export function Error({ title, error, action = ErrorAction.Back, children }: ErrorProps) {
  const navigate = useNavigate();

  return (
    <>
      <main>
        <article className={cls.errorContainer}>
          <section>
            <h1>{title}</h1>
            {children}
            {action === ErrorAction.Back && (
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  navigate(-1);
                }}
              >
                <Icon icon={<IconArrowLeft />} size="sm" color="primary" />
                Terug naar de vorige pagina
              </Button>
            )}
          </section>
          <aside>
            <img src={errorImage} alt="Error" />
          </aside>
        </article>
      </main>
      {error && isDevelopment && (
        <section className={cls.errorStack}>
          <h2>Foutmelding</h2>
          <code>
            <pre>{error.stack}</pre>
          </code>
        </section>
      )}
    </>
  );
}
