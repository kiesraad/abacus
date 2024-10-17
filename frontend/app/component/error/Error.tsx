import { useNavigate } from "react-router-dom";

import { IconArrowLeft } from "@kiesraad/icon";

import { Button } from "../../../lib/ui/Button/Button";
import cls from "./Error.module.css";
import errorImage from "./error.png";
import { ErrorAction } from "./Error.types";

interface ErrorProps {
  title: string;
  children: React.ReactNode;
  action: ErrorAction;
}

export function Error({ title, action = ErrorAction.Back, children }: ErrorProps) {
  const navigate = useNavigate();

  return (
    <article className={cls.errorContainer}>
      <section>
        <h2>{title}</h2>
        {children}
        {action === ErrorAction.Back && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              navigate(-1);
            }}
          >
            <IconArrowLeft />
            Terug naar de vorige pagina
          </Button>
        )}
      </section>
      <aside>
        <img src={errorImage} alt="Error" />
      </aside>
    </article>
  );
}
