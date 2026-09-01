import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { ReactElement } from "react";
import {
  Button,
  Card,
  ErrorState,
  Input,
} from "@interestled/ui";
import { useAuth } from "../lib/auth";
import { messageOf } from "../lib/errors";

/**
 * Register and sign in on one screen. There is no onboarding tour and nothing
 * to configure: the willingness to start arrives in bursts, and every step
 * before the work spends it (A14).
 */
export function AuthScreen(): ReactElement {
  const { register, signIn } = useAuth();
  const [isNew, setIsNew] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await (isNew ? register({ email, password }) : signIn({ email, password }));
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerClassName="flex-1 justify-center gap-6 bg-surface-sunken p-6">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-ink">Interest Led</Text>
        <Text className="text-base text-ink-soft">
          Pick a topic, get a map of it, and prove you know each piece.
        </Text>
      </View>

      <Card className="gap-4">
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          hint={isNew ? "At least 10 characters. A short phrase works well." : undefined}
        />
        {error === null ? null : <ErrorState message={error} />}
        <Button label={isNew ? "Create account" : "Sign in"} onPress={() => void submit()} busy={busy} />
        <Button
          label={isNew ? "I already have an account" : "Create an account instead"}
          tone="quiet"
          onPress={() => {
            setIsNew(!isNew);
            setError(null);
          }}
        />
      </Card>
    </ScrollView>
  );
}
