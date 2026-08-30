import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createApiClient } from "@learnloop/api";
import type { ApiClient } from "@learnloop/api";
import type { LoginInputT, RegisterInputT, UserT } from "@learnloop/schemas";
import { API_URL } from "./config";
import { readToken, writeToken } from "./storage";

interface AuthState {
  ready: boolean;
  user: UserT | null;
  client: ApiClient;
  register: (input: RegisterInputT) => Promise<void>;
  signIn: (input: LoginInputT) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserT | null>(null);
  const queryClient = useQueryClient();
  // A ref, not state: the client reads the token on every request and must not
  // be rebuilt (and so invalidate every query) each time it changes.
  const token = useRef<string | null>(null);

  const clearSession = useCallback((): void => {
    token.current = null;
    setUser(null);
    void writeToken(null);
    // The QueryClient outlives the session, so without this the next person to
    // sign in on this device sees the previous one's cached topics and answers.
    queryClient.clear();
  }, [queryClient]);

  const client = useMemo(
    () =>
      createApiClient({
        baseUrl: API_URL,
        getToken: () => token.current,
        onUnauthorized: clearSession,
      }),
    [clearSession],
  );

  useEffect(() => {
    void (async () => {
      const stored = await readToken();
      if (stored !== null) {
        token.current = stored;
        // A token the server has forgotten resolves to signed-out via
        // onUnauthorized, so a stale one never strands the app on a spinner.
        await client
          .me()
          .then(setUser)
          .catch(() => undefined);
      }
      setReady(true);
    })();
  }, [client]);

  const adopt = useCallback(async (result: { token: string; user: UserT }): Promise<void> => {
    token.current = result.token;
    await writeToken(result.token);
    setUser(result.user);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      user,
      client,
      register: async (input) => adopt(await client.register(input)),
      signIn: async (input) => adopt(await client.login(input)),
      signOut: async () => {
        await client.logout().catch(() => undefined);
        clearSession();
      },
    }),
    [ready, user, client, adopt, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (value === null) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return value;
}
