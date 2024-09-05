import { Link } from "react-router-dom";

import { MockTest } from "app/component/MockTest";
import { NavBar } from "app/component/navbar/NavBar";

export function DevHomePage() {
  return (
    <div className="app-layout">
      <NavBar />
      <div style={{ padding: "2rem" }}>
        <h1>Abacus 🧮</h1>

        <ul>
          <li>
            <Link to={`/user`}>User</Link>
          </li>
          <li>
            <Link to={"/overview"}>Overview</Link>
          </li>
          <li>
            <Link to={`/1/input`}>Input</Link>
          </li>
        </ul>

        {process.env.MSW && <MockTest />}
      </div>
    </div>
  );
}
