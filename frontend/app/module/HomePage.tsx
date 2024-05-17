import { MockTest } from "app/component/MockTest";
import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div style={{ padding: "32px" }}>
      <h1>Kiesraad uitslag app work in progress</h1>
      <p>Home page</p>

      <ul className="link-list">
        <li>
          <Link to={`/input`}>Input module</Link>
        </li>
      </ul>

      <MockTest />
    </div>
  );
}
