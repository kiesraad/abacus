import { Error, ErrorAction } from "app/component/error";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

export interface NotFoundProps {
  message?: string;
  path?: string;
}

export function NotFound({ message, path }: NotFoundProps) {
  return (
    <div className="app-layout">
      <NavBar />
      <Error title={message || "Pagina niet gevonden"} action={ErrorAction.Back}>
        {path && (
          <p>
            De pagina <code>{path}</code> is niet gevonden.
          </p>
        )}
        <p>We kunnen de pagina die je zoekt niet vinden. Het kan zijn dat de pagina is verplaatst of verwijderd.</p>
      </Error>
      <Footer />
    </div>
  );
}
