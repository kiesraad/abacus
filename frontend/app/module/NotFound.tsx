import { Error, ErrorAction } from "app/component/error";
import { Footer } from "app/component/footer/Footer";
import { NavBar } from "app/component/navbar/NavBar";

export function NotFound() {
  return (
    <div className="app-layout">
      <NavBar />
      <main>
        <Error title="Pagina niet gevonden" action={ErrorAction.Back}>
          <p>
            <strong>404 Pagina niet gevonden</strong>
          </p>
          <p>We kunnen de pagina die je zoekt niet vinden. Het kan zijn dat de pagina is verplaatst of verwijderd.</p>
        </Error>
      </main>
      <Footer />
    </div>
  );
}
