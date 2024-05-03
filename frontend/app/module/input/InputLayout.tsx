import { AppLayout } from "@kiesraad/ui";
import { Footer } from "app/component/footer/Footer";
import { Outlet } from "react-router-dom";

export function InputLayout() {
  return (
    <AppLayout>
      <nav>Hello world</nav>

      <Outlet />

      <Footer />
    </AppLayout>
  );
}
