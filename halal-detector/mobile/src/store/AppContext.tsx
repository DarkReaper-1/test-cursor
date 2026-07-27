import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { darkColors, lightColors, type AppColors } from '../theme/colors';
import type { FavoriteItem, HistoryItem, ScholarSchool, UserProfile } from '../types/halal';
import * as api from '../services/api';

type AppContextValue = {
  colors: AppColors;
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  scale: (size: number) => number;
  localHistory: HistoryItem[];
  addLocalHistory: (item: HistoryItem) => void;
  localFavorites: FavoriteItem[];
  toggleFavorite: (item: FavoriteItem) => Promise<void>;
  ready: boolean;
};

const DEFAULT_PROFILE: UserProfile = {
  id: 'guest',
  display_name: 'Guest',
  school: 'general_sunni',
  text_scale: 1.15,
  dark_mode: false,
  color_blind_friendly: true,
  voice_reading: true,
  language: 'en',
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [localHistory, setLocalHistory] = useState<HistoryItem[]>([]);
  const [localFavorites, setLocalFavorites] = useState<FavoriteItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('halal_profile');
        if (raw) setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(raw) });
        const hist = await AsyncStorage.getItem('halal_history');
        if (hist) setLocalHistory(JSON.parse(hist));
        const fav = await AsyncStorage.getItem('halal_favorites');
        if (fav) setLocalFavorites(JSON.parse(fav));
        const remote = await api.fetchProfile();
        if (remote) setProfile((p) => ({ ...p, ...remote }));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const updateProfile = async (patch: Partial<UserProfile>) => {
    const next = { ...profile, ...patch };
    setProfile(next);
    await AsyncStorage.setItem('halal_profile', JSON.stringify(next));
    await api.saveProfile(next);
  };

  const addLocalHistory = (item: HistoryItem) => {
    setLocalHistory((prev) => {
      const next = [item, ...prev].slice(0, 200);
      AsyncStorage.setItem('halal_history', JSON.stringify(next));
      return next;
    });
  };

  const toggleFavorite = async (item: FavoriteItem) => {
    const exists = localFavorites.find((f) => f.id === item.id);
    let next: FavoriteItem[];
    if (exists) {
      next = localFavorites.filter((f) => f.id !== item.id);
    } else {
      next = [item, ...localFavorites];
      await api.saveFavorite(item);
    }
    setLocalFavorites(next);
    await AsyncStorage.setItem('halal_favorites', JSON.stringify(next));
  };

  const colors = profile.dark_mode ? darkColors : lightColors;
  const scale = (size: number) => Math.round(size * (profile.text_scale || 1));

  const value = useMemo(
    () => ({
      colors,
      profile,
      setProfile,
      updateProfile,
      scale,
      localHistory,
      addLocalHistory,
      localFavorites,
      toggleFavorite,
      ready,
    }),
    [colors, profile, localHistory, localFavorites, ready],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useSchool(): ScholarSchool {
  return useApp().profile.school;
}
