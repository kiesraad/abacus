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
            <Link to={`/account`}>Account</Link>
          </li>
          <li>
            <Link to={"/elections"}>Verkiezingen</Link>
          </li>
          <li>
            <Link to={`/elections/1/data-entry`}>Verkiezing 1 invoeren</Link>
          </li>
          <li>
            <Link to={"/elections#administrator"}>Verkiezingen beheren</Link>
          </li>
          <li>
            <Link to={`/users#administrator`}>Gebruikers beheren</Link>
          </li>
          <li>
            <Link to={`/workstations#administrator`}>Werkplekken beheren</Link>
          </li>
          <li>
            <Link to={`/logs#administrator`}>Activiteitenlog</Link>
          </li>
        </ul>

        {__API_MSW__ && <MockTest />}
      </div>
    </div>
  );
}
