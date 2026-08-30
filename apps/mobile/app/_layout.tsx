import "../global.css";
import type { ReactElement, ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApiProvider, createAppQueryClient } from "@learnloop/api";
import { LoadingState } from "@learnloop/ui";
import { AuthProvider, useAuth } from "../lib/auth";
import { AuthScreen } from "../components/AuthScreen";

const queryClient = createAppQueryClient();

function Gate({ children }: { children: ReactNode }): ReactElement {
  const { ready, user, client } = useAuth();
  if (!ready) {
    return <LoadingState />;
  }
  if (user === null) {
    return <AuthScreen />;
  }
  return <ApiProvider client={client}>{children}</ApiProvider>;
}

export default function RootLayout(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate>
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerTintColor: "#111827",
              headerStyle: { backgroundColor: "#f3f4f6" },
              contentStyle: { backgroundColor: "#f3f4f6" },
            }}
          >
            <Stack.Screen name="index" options={{ title: "Your topics" }} />
            <Stack.Screen name="topic/new" options={{ title: "New topic", presentation: "modal" }} />
            <Stack.Screen name="topic/[id]" options={{ title: "Map" }} />
            <Stack.Screen name="node/[id]/index" options={{ title: "" }} />
            <Stack.Screen name="node/[id]/drill" options={{ title: "" }} />
            <Stack.Screen name="review" options={{ title: "Review" }} />
          </Stack>
        </Gate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
