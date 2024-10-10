import { Link } from "react-router-dom";

import { MockTest } from "app/component/MockTest";
import { NavBar } from "app/component/navbar/NavBar";

export function ElectionHomePage() {
  return (
    <div className="app-layout">
      <NavBar />
      <div style={{ padding: "2rem" }}>
        <h2>Verkiezing configureren</h2>

        <ul>
          <li>Proces-verbaal maken</li>
          <li>
            <Link to={`polling-stations`}>Polling stations configureren</Link>
          </li>
        </ul>

        {__API_MSW__ && <MockTest />}
      </div>
    </div>
  );
}
