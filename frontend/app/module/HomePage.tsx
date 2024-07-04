import { MockTest } from "app/component/MockTest";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div style={{ padding: "32px" }}>
      <h1>Abacus 🧮</h1>
      <h2>🚧 Work in progress 🚧</h2>

      <ul className="link-list">
        <li>
          <Link to={`/user`}>User module</Link>
        </li>
        <li>
          <Link to={"/overview"}>Overzicht module</Link>
        </li>
        <li>
          <Link to={`/input`}>Input module</Link>
        </li>
      </ul>

      {process.env.MSW && <MockTest />}
    </div>
  );
}
