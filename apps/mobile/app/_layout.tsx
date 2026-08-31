import "../global.css";
import type { ReactElement, ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApiProvider, createAppQueryClient } from "@interestled/api";
import { LoadingState } from "@interestled/ui";
import { AuthProvider, useAuth } from "../lib/auth";
import { backHeader } from "../lib/nav";
import { AuthScreen } from "../components/AuthScreen";

const queryClient = createAppQueryClient();

function Gate({ children }: { children: ReactNode }): ReactElement {
  const { ready, user, client } = useAuth();
  if (!ready) {
    return <LoadingState label="Signing you in…" />;
  }
  if (user === null) {
    return <AuthScreen />;
  }
  return <ApiProvider client={client}>{children}</ApiProvider>;
}

/**
 * Every screen has the same bar. Titles are set here where they are fixed, and
 * on the screen itself where they name something the screen had to load — the
 * bar is the one thing the learner can rely on being in the same place, so it is
 * never conditionally absent.
 */
export default function RootLayout(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Gate>
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerBackVisible: false,
              headerTintColor: "#111827",
              headerStyle: { backgroundColor: "#f3f4f6" },
              contentStyle: { backgroundColor: "#f3f4f6" },
            }}
          >
            <Stack.Screen name="index" options={{ title: "Your topics" }} />
            <Stack.Screen
              name="profile"
              options={{ title: "Your profile", headerLeft: backHeader("/") }}
            />
            <Stack.Screen
              name="topic/new"
              options={{ title: "New topic", presentation: "modal", headerLeft: backHeader("/") }}
            />
            {/* Titles for these three come from the topic they load. */}
            <Stack.Screen name="topic/[topic]/index" options={{ title: "Map" }} />
            <Stack.Screen name="topic/[topic]/edit" options={{ title: "Edit the map" }} />
            <Stack.Screen name="topic/[topic]/[...path]" options={{ title: "" }} />
            <Stack.Screen name="review" options={{ title: "Review", headerLeft: backHeader("/") }} />
          </Stack>
        </Gate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
