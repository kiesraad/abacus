import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div style={{ padding: "32px" }}>
      <h1>Kiesraad uitslag app work in progress</h1>
      <p>Home page</p>

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
    </div>
  );
}
