import { Footer } from "app/component/footer/Footer";
import { Outlet } from "react-router-dom";

export function LoginLayout() {
  return (
    <div className="app-layout">
      <nav></nav>

      <Outlet />

      <Footer />
    </div>
  );
}
