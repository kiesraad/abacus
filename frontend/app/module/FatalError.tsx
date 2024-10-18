import { Error, ErrorAction } from "app/component/error";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

interface FatalErrorProps {
  message: string;
  code?: number;
}

export function FatalError({ message, code }: FatalErrorProps) {
  return (
    <div className="app-layout">
      <NavBar />
      <main>
        <Error title="Abacus is stuk" action={ErrorAction.Back}>
          <p>
            <strong>{code || 500} Interne fout</strong>
          </p>
          {message && <p>{message}</p>}
        </Error>
      </main>
      <Footer />
    </div>
  );
}
