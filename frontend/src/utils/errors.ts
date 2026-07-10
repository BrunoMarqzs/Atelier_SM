export function friendlyErrorMessage(caughtError: unknown, fallback: string) {
  if (!(caughtError instanceof Error) || !caughtError.message) {
    return fallback;
  }

  const networkMessages = ["Failed to fetch", "Network request failed", "Load failed"];
  if (networkMessages.some((message) => caughtError.message.includes(message))) {
    return "Não foi possível conectar ao sistema agora. Tente novamente em alguns instantes.";
  }

  return caughtError.message;
}
