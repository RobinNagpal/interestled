import { createContext, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ApiClient } from "./client";

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: ReactNode;
}): ReactElement {
  return <ApiContext.Provider value={client}>{children}</ApiContext.Provider>;
}

export function useApi(): ApiClient {
  const client = useContext(ApiContext);
  if (client === null) {
    throw new Error("useApi must be used inside an ApiProvider");
  }
  return client;
}
