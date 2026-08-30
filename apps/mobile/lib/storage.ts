import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "learnloop.token";

export async function readToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function writeToken(token: string | null): Promise<void> {
  if (token === null) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
