import type { AppState, UserProfile, UserSettings, WeeklyPlan, WorkoutLog, WorkoutRecord } from './types';

// 所有数据存储在以下 key 下：
export const STORAGE_KEYS = {
  PROFILE: 'herfit_profile',        // UserProfile
  CURRENT_PLAN: 'herfit_plan',      // WeeklyPlan
  SETTINGS: 'herfit_settings',      // UserSettings
  WORKOUT_RECORDS: 'herfit_records', // WorkoutRecord[]
  LOGS: 'herfit_logs',              // WorkoutLog[]
  STREAK: 'herfit_streak',          // number
  LAST_ACTIVE: 'herfit_last_active' // ISO date string
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export function createSettingsFromProfile(profile: UserProfile | null): UserSettings {
  return {
    lastPeriodStart: profile?.cycle.lastPeriodStart ?? new Date().toISOString().slice(0, 10),
    avgCycleLength: profile?.cycle.avgCycleLength ?? 28,
    avgPeriodLength: profile?.cycle.avgPeriodLength ?? 5,
    trainingPreference: 'standard',
  };
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getStorageItem<T>(key: StorageKey, fallback: T): T {
  if (!canUseLocalStorage()) {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorageItem<T>(key: StorageKey, value: T) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorageItem(key: StorageKey) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(key);
}

export function getProfile() {
  return getStorageItem<UserProfile | null>(STORAGE_KEYS.PROFILE, null);
}

export function saveProfile(profile: UserProfile) {
  setStorageItem(STORAGE_KEYS.PROFILE, profile);
}

export function getCurrentPlan() {
  return getStorageItem<WeeklyPlan | null>(STORAGE_KEYS.CURRENT_PLAN, null);
}

export function saveCurrentPlan(plan: WeeklyPlan) {
  setStorageItem(STORAGE_KEYS.CURRENT_PLAN, plan);
}

export function getUserSettings() {
  const settings = getStorageItem<UserSettings | null>(STORAGE_KEYS.SETTINGS, null);

  if (settings) {
    return settings;
  }

  const fallback = createSettingsFromProfile(getProfile());
  saveUserSettings(fallback);
  return fallback;
}

export function saveUserSettings(settings: UserSettings) {
  setStorageItem(STORAGE_KEYS.SETTINGS, settings);
}

export function getWorkoutRecords() {
  return getStorageItem<WorkoutRecord[]>(STORAGE_KEYS.WORKOUT_RECORDS, []);
}

export function saveWorkoutRecords(records: WorkoutRecord[]) {
  setStorageItem(STORAGE_KEYS.WORKOUT_RECORDS, records);
}

export function addWorkoutRecord(record: WorkoutRecord) {
  const records = getWorkoutRecords();
  saveWorkoutRecords([record, ...records.filter((item) => item.id !== record.id)]);
}

export function getLogs() {
  return getStorageItem<WorkoutLog[]>(STORAGE_KEYS.LOGS, []);
}

export function saveLogs(logs: WorkoutLog[]) {
  setStorageItem(STORAGE_KEYS.LOGS, logs);
}

export function getStreak() {
  return getStorageItem<number>(STORAGE_KEYS.STREAK, 0);
}

export function saveStreak(streak: number) {
  setStorageItem(STORAGE_KEYS.STREAK, streak);
}

export function getLastActive() {
  return getStorageItem<string | null>(STORAGE_KEYS.LAST_ACTIVE, null);
}

export function saveLastActive(date: string) {
  setStorageItem(STORAGE_KEYS.LAST_ACTIVE, date);
}

export function getAppState(): AppState {
  return {
    profile: getProfile(),
    currentPlan: getCurrentPlan(),
    settings: getUserSettings(),
    records: getWorkoutRecords(),
    logs: getLogs(),
    streak: getStreak(),
  };
}

export function clearAllStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => removeStorageItem(key));
}
