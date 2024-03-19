import { createRoutesFromElements, Route } from "react-router-dom";
import { RootLayout } from "./layout";
import { HomePage } from "./module/global/page/HomePage";


export const routes = createRoutesFromElements(
  <Route element={<RootLayout />}>
    <Route path="*" element={<div>Not found</div>} />
    <Route index path="/" element={<HomePage />} />
  </Route>
);
