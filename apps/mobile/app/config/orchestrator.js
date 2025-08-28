import { Platform } from 'react-native';

export function getOrchestratorUrl() {
  // Priority 1: explicit env
  const envUrl = process.env.EXPO_PUBLIC_ORCHESTRATOR_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
    return envUrl;
  }

  // Priority 2: sensible platform fallbacks for local dev
  // Android emulator cannot reach host 127.0.0.1; it uses 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  // iOS simulator / web default
  return 'http://127.0.0.1:8000';
}



