import { useEffect, useState } from "react";
import { Platform } from "react-native";

export function useNetworkStatus() {
  const [online, setOnline] = useState(() => {
    if (Platform.OS !== "web" || typeof navigator === "undefined") {
      return true;
    }
    return navigator.onLine;
  });

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return undefined;
    }
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { online };
}

