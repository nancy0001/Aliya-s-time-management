import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import NavalGoalsApp from "./NavalGoalsApp";
import SlimSupervisorApp from "./SlimSupervisorApp";
import TimeManagerApp from "./TimeManagerApp";
import "./styles.css";

if (window.location.hostname === "127.0.0.1") {
  const redirectUrl = `${window.location.protocol}//localhost:${window.location.port}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(redirectUrl);
}

const pathname = window.location.pathname.replace(/\/$/, "");
const appMode = import.meta.env.VITE_APP_MODE;
const isSlimMode = appMode === "slim";
const isNavalGoals = pathname === "/naval-goals";
const isTimeManager = pathname === "/time-manager";

if (isSlimMode) {
  document.title = "减肥监督机";
} else {
  document.title = "Aliya's life OS";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isSlimMode ? <SlimSupervisorApp /> : isNavalGoals ? <NavalGoalsApp /> : isTimeManager ? <TimeManagerApp /> : <App />}
  </React.StrictMode>
);
