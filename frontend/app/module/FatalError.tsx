import { Error, ErrorAction } from "app/component/error";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

interface FatalErrorProps {
  message: string;
  code?: number;
  error?: Error;
}

export function FatalError({ message, code, error }: FatalErrorProps) {
  console.warn(error);

  return (
    <div className="app-layout">
      <NavBar />
      <Error title="Abacus is stuk" action={ErrorAction.Back} error={error}>
        <p>
          <strong>{code || 500} Interne fout</strong>
        </p>
        {message && <p>{message}</p>}
      </Error>
      <Footer />
    </div>
  );
}
