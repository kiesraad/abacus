import { Error, ErrorAction } from "app/component/error";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

import { AppLayout } from "@kiesraad/ui";
import { isDevelopment } from "@kiesraad/util";

interface FatalErrorProps {
  message: string;
  code?: number;
  error?: Error;
}

export function FatalError({ message, code, error }: FatalErrorProps) {
  return (
    <AppLayout>
      <NavBar />
      <Error title="Abacus is stuk" action={ErrorAction.Back} error={error}>
        <p>
          <strong>{code || 500} Interne fout</strong>
        </p>
        {message && <p>{message}</p>}
        {isDevelopment && (
          <>
            <h4>Komt het probleem terug?</h4>
            <p>
              Neem contact op met de ontwikkelaars of rapporteer een bug via{" "}
              <a href="https://github.com/kiesraad/abacus" target="_blank">
                https://github.com/kiesraad/abacus
              </a>
            </p>
          </>
        )}
      </Error>
      <Footer />
    </AppLayout>
  );
}
