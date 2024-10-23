import { useNavigate } from "react-router-dom";

import { IconArrowLeft } from "@kiesraad/icon";
import { Button } from "@kiesraad/ui";
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
        <article className={cls.error}>
          <section>
            <h1>{title}</h1>
            {children}
            <nav>
              {action === ErrorAction.Back && (
                <Button
                  size="lg"
                  variant="secondary"
                  leftIcon={<IconArrowLeft />}
                  onClick={() => {
                    navigate(-1);
                  }}
                >
                  Terug naar de vorige pagina
                </Button>
              )}
            </nav>
          </section>
          <aside>
            <img src={errorImage} alt="Error" />
          </aside>
        </article>
      </main>
      {error && isDevelopment && (
        <section className={cls.stack}>
          <h2>Foutmelding</h2>
          <code>
            <pre>{error.stack}</pre>
          </code>
        </section>
      )}
    </>
  );
}
