import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";

import { AtelierApp } from "./src/navigation/AtelierApp";
import { setupPwa } from "./src/utils/pwa";

export default function App() {
  useEffect(() => {
    setupPwa();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <AtelierApp />
    </>
  );
}
