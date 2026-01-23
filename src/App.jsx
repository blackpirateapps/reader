import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import LibraryView from "./views/LibraryView.jsx";
import ReaderView from "./views/ReaderView.jsx";
import FeedsView from "./views/FeedsView.jsx";
import HighlightsView from "./views/HighlightsView.jsx";
import SettingsView from "./views/SettingsView.jsx";
import { applySettings, readSetting, writeSetting } from "./utils/settings.js";

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) {
    return { path: "/", query: new URLSearchParams() };
  }
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  return { path, query: new URLSearchParams(queryPart || "") };
}

function useHashRoute() {
  const [route, setRoute] = useState(parseHash());

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = "#/";
    }
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  function navigate(path, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    window.location.hash = queryString ? `#${path}?${queryString}` : `#${path}`;
  }

  return [route, navigate];
}

function useSettings() {
  const [settings, setSettings] = useState(() => ({
    theme: readSetting("theme", "light"),
    font: readSetting("font", "serif"),
    weight: readSetting("weight", "400"),
    size: Number(readSetting("size", "18")),
  }));

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  function updateSetting(key, value) {
    writeSetting(key, value);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return [settings, updateSetting];
}

export default function App() {
  const [route, navigate] = useHashRoute();
  const [authKey, setAuthKey] = useState(
    localStorage.getItem("clean_reader_key") || ""
  );
  const [settings, updateSetting] = useSettings();

  function login(key) {
    localStorage.setItem("clean_reader_key", key);
    setAuthKey(key);
  }

  function logout() {
    localStorage.removeItem("clean_reader_key");
    setAuthKey("");
    navigate("/");
  }

  if (!authKey) {
    return <LoginScreen onSubmit={login} />;
  }

  return (
    <div className="app">
      <Sidebar routePath={route.path} navigate={navigate} onLogout={logout} />
      <main className="main">
        {route.path === "/reader" ? (
          <ReaderView
            route={route}
            authKey={authKey}
            navigate={navigate}
            onAuthFail={logout}
          />
        ) : null}
        {route.path === "/feeds" ? (
          <FeedsView authKey={authKey} onAuthFail={logout} />
        ) : null}
        {route.path === "/highlights" ? (
          <HighlightsView
            authKey={authKey}
            onAuthFail={logout}
            navigate={navigate}
          />
        ) : null}
        {route.path === "/settings" ? (
          <SettingsView settings={settings} updateSetting={updateSetting} />
        ) : null}
        {route.path === "/" ? (
          <LibraryView authKey={authKey} onAuthFail={logout} navigate={navigate} />
        ) : null}
      </main>
    </div>
  );
}
