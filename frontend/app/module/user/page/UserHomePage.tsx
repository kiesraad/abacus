import { Link } from "react-router-dom";

export function UserHomePage() {
  return (
    <div style={{ padding: "32px" }}>
      <h1>Abacus 🧮</h1>
      <p>User Homepage</p>

      <ul>
        <li>
          <Link to={`login`}>Inloggen</Link>
        </li>
      </ul>
    </div>
  );
}
