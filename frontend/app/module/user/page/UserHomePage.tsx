import { Link } from "react-router-dom";

export function UserHomePage() {
  return (
    <div style={{ padding: "32px" }}>
      <h1>Kiesraad uitslag app work in progress</h1>
      <p>User Homepage</p>

      <ul className="link-list">
        <li>
          <Link to={`login`}>Inloggen</Link>
        </li>
      </ul>
    </div>
  );
}
