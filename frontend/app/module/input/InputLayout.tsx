import { Footer } from "app/component/footer/Footer";
import { PollingStationProvider } from "@kiesraad/api";
import { Outlet, useParams } from "react-router-dom";

export function InputLayout() {
  const { electionId } = useParams();
  return (
    <PollingStationProvider electionId={parseInt(electionId ?? "", 10)}>
      <div className="app-layout">
        <nav>Hello world</nav>

        <Outlet />

        <Footer />
      </div>
    </PollingStationProvider>
  );
}
