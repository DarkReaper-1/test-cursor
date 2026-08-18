import { Platform } from "react-native";

const TOKEN_KEY = "helix.accessToken";

let memoryToken: string | null = null;

type TokenStorage = {
  get: () => Promise<string | null>;
  set: (value: string) => Promise<void>;
  clear: () => Promise<void>;
};

function memoryStorage(): TokenStorage {
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

function webStorage(): TokenStorage {
  return {
    get: async () => {
      try {
        return globalThis.localStorage?.getItem(TOKEN_KEY) ?? memoryToken;
      } catch {
        return memoryToken;
      }
    },
    set: async (value: string) => {
      memoryToken = value;
      try {
        globalThis.localStorage?.setItem(TOKEN_KEY, value);
      } catch {
        // Private mode or missing localStorage — keep the in-memory token.
      }
    },
    clear: async () => {
      memoryToken = null;
      try {
        globalThis.localStorage?.removeItem(TOKEN_KEY);
      } catch {
        // ignore
      }
    },
  };
}

async function nativeStorage(): Promise<TokenStorage> {
  try {
    const SecureStore = await import("expo-secure-store");
    return {
      get: () => SecureStore.getItemAsync(TOKEN_KEY),
      set: (value: string) => SecureStore.setItemAsync(TOKEN_KEY, value),
      clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
    };
  } catch {
    return memoryStorage();
  }
}

async function storage(): Promise<TokenStorage> {
  if (Platform.OS === "web") {
    return webStorage();
  }
  return nativeStorage();
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
