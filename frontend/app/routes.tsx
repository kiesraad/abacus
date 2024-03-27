import { createRoutesFromElements, Route } from "react-router-dom";
import { RootLayout } from "./module/RootLayout";
import { HomePage } from "./module/HomePage";
import { InputLayout, InputHomePage, PollingStationPage } from "./module/input";

export const routes = createRoutesFromElements(
  <Route element={<RootLayout />}>
    <Route path="*" element={<div>Not found</div>} />
    <Route index path="/" element={<HomePage />} />

    <Route path="input" element={<InputLayout />}>
      <Route index element={<InputHomePage />} />
      <Route path=":id/:section?" element={<PollingStationPage />} />
    </Route>
  </Route>
);
