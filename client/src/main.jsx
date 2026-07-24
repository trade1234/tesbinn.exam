import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import App from "./App.jsx";
import "./styles.css";

document.title = "Tessbin Online Examination";

if (window.location.pathname.startsWith("/verify/")) {
  const verificationRoute = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", `/#${verificationRoute}`);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);





