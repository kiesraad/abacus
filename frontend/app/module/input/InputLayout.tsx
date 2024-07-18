import { Outlet } from "react-router-dom";

import { Footer } from "app/component/footer/Footer";

export function InputLayout() {
  return (
    <div className="app-layout">
      <nav>Hello world</nav>

      <Outlet />

      <Footer />
    </div>
  );
}
