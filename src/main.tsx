import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DataSourceProvider, defaultRegistry } from "./datasources";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DataSourceProvider registry={defaultRegistry}>
      <App />
    </DataSourceProvider>
  </React.StrictMode>
);
