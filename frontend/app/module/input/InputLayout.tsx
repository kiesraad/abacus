import { Footer } from "app/component/footer/Footer";
import { Outlet } from "react-router-dom";

export function InputLayout() {
  return (
    <div className="app-layout">
      <nav>Hello world</nav>

      <Outlet />

      <Footer />
    </div>
  );
}
