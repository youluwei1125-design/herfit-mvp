import type { AppState, EnergyLevel, UserProfile, UserSettings, WeeklyPlan, WorkoutLog, WorkoutRecord } from './types';

export const USER_SETTINGS_KEY = 'herfit_user_settings';

// 所有数据存储在以下 key 下：
export const STORAGE_KEYS = {
  PROFILE: 'herfit_profile',        // UserProfile
  CURRENT_PLAN: 'herfit_plan',      // WeeklyPlan
  CURRENT_WORKOUT: 'herfit_current_workout',
  SETTINGS: USER_SETTINGS_KEY,      // UserSettings
  WORKOUT_RECORDS: 'herfit_records', // WorkoutRecord[]
  LOGS: 'herfit_logs',              // WorkoutLog[]
  STREAK: 'herfit_streak',          // number
  LAST_ACTIVE: 'herfit_last_active', // ISO date string
  SELECTED_ENERGY: 'herfit_selected_energy' // EnergyLevel
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export interface WorkoutCache {
  signature: string;
  plan: WeeklyPlan;
}
type LegacySettings = Partial<UserSettings> & {
  lastPeriodStart?: string;
  avgCycleLength?: number;
  avgPeriodLength?: number;
  onboardingCompleted?: boolean;
};

const LEGACY_SETTINGS_KEYS = ['herfit_settings', 'userSettings', 'cycleSettings'] as const;

function getLocalTodayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeISODate(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  const rawValue = value.trim();
  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeSettings(settings: LegacySettings | null | undefined, profile?: UserProfile | null): UserSettings | null {
  if (!settings && !profile) {
    return null;
  }

  const lastPeriodStartDate =
    normalizeISODate(settings?.lastPeriodStartDate) ||
    normalizeISODate(settings?.lastPeriodStart) ||
    normalizeISODate(profile?.cycle.lastPeriodStart);

  if (!lastPeriodStartDate) {
    return null;
  }

  return {
    lastPeriodStartDate,
    cycleLength: Number(settings?.cycleLength ?? settings?.avgCycleLength ?? profile?.cycle.avgCycleLength ?? 28),
    periodLength: Number(settings?.periodLength ?? settings?.avgPeriodLength ?? profile?.cycle.avgPeriodLength ?? 5),
    trainingPreference: settings?.trainingPreference ?? 'standard',
    onboardingCompleted: Boolean(settings?.onboardingCompleted ?? profile?.onboardingCompleted),
  };
}

export function createSettingsFromProfile(profile: UserProfile | null): UserSettings {
  return {
    lastPeriodStartDate: profile?.cycle.lastPeriodStart ?? getLocalTodayISO(),
    cycleLength: profile?.cycle.avgCycleLength ?? 28,
    periodLength: profile?.cycle.avgPeriodLength ?? 5,
    trainingPreference: 'standard',
    onboardingCompleted: Boolean(profile?.onboardingCompleted),
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

export function getCurrentWorkoutCache() {
  return getStorageItem<WorkoutCache | null>(STORAGE_KEYS.CURRENT_WORKOUT, null);
}

export function saveCurrentWorkoutCache(cache: WorkoutCache) {
  setStorageItem(STORAGE_KEYS.CURRENT_WORKOUT, cache);
}

export function clearCurrentWorkoutCache() {
  removeStorageItem(STORAGE_KEYS.CURRENT_WORKOUT);
  removeStorageItem(STORAGE_KEYS.CURRENT_PLAN);
}

export function getUserSettings() {
  if (!canUseLocalStorage()) {
    return createSettingsFromProfile(null);
  }

  const rawSettings = window.localStorage.getItem(USER_SETTINGS_KEY);

  if (process.env.NODE_ENV === 'development') {
    console.log('HerFit raw settings from localStorage:', rawSettings);
  }

  const settings = getStorageItem<LegacySettings | null>(STORAGE_KEYS.SETTINGS, null);
  const profile = getProfile();
  const normalized = normalizeSettings(settings, profile);

  if (normalized) {
    setStorageItem(STORAGE_KEYS.SETTINGS, normalized);
    cleanupLegacySettings();

    if (process.env.NODE_ENV === 'development') {
      console.log('HerFit parsed settings:', normalized);
    }

    return normalized;
  }

  for (const legacyKey of LEGACY_SETTINGS_KEYS) {
    const legacyRaw = window.localStorage.getItem(legacyKey);
    if (!legacyRaw) {
      continue;
    }

    try {
      const legacyNormalized = normalizeSettings(JSON.parse(legacyRaw) as LegacySettings, profile);
      if (legacyNormalized) {
        setStorageItem(STORAGE_KEYS.SETTINGS, legacyNormalized);
        cleanupLegacySettings();
        return legacyNormalized;
      }
    } catch {
      window.localStorage.removeItem(legacyKey);
    }
  }

  const fallback = createSettingsFromProfile(profile);
  setStorageItem(STORAGE_KEYS.SETTINGS, fallback);
  return fallback;
}

export function saveUserSettings(settings: UserSettings) {
  setStorageItem(STORAGE_KEYS.SETTINGS, settings);
  clearCurrentWorkoutCache();
}

function cleanupLegacySettings() {
  if (!canUseLocalStorage()) {
    return;
  }

  LEGACY_SETTINGS_KEYS.forEach((key) => window.localStorage.removeItem(key));
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

export function getSelectedEnergyLevel() {
  return getStorageItem<EnergyLevel | null>(STORAGE_KEYS.SELECTED_ENERGY, null);
}

export function saveSelectedEnergyLevel(energyLevel: EnergyLevel) {
  setStorageItem(STORAGE_KEYS.SELECTED_ENERGY, energyLevel);
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
  cleanupLegacySettings();
}
