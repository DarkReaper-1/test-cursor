const TOKEN_KEY = "helix.accessToken";

let memoryToken: string | null = null;

async function storage() {
  try {
    const SecureStore = await import("expo-secure-store");
    return {
      get: () => SecureStore.getItemAsync(TOKEN_KEY),
      set: (value: string) => SecureStore.setItemAsync(TOKEN_KEY, value),
      clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
    };
  } catch {
    return {
      get: async () => memoryToken,
      set: async (value: string) => {
        memoryToken = value;
      },
      clear: async () => {
        memoryToken = null;
      },
    };
  }
}

export async function loadToken(): Promise<string | null> {
  return (await storage()).get();
}

export async function saveToken(token: string): Promise<void> {
  await (await storage()).set(token);
}

export async function clearToken(): Promise<void> {
  await (await storage()).clear();
}
