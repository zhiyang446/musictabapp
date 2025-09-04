import { Platform } from 'react-native';

export function getOrchestratorUrl() {
  // FORCE CORRECT PORT FOR T48 TESTING
  console.log('🔧 T48 Debug - Platform:', Platform.OS);
  console.log('🔧 T48 Debug - Env URL:', process.env.EXPO_PUBLIC_ORCHESTRATOR_URL);

  // Priority 1: explicit env
  const envUrl = process.env.EXPO_PUBLIC_ORCHESTRATOR_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
    console.log('✅ T48 Debug - Using env URL:', envUrl);
    return envUrl;
  }

  // Priority 2: sensible platform fallbacks for local dev
  // Android emulator cannot reach host 127.0.0.1; it uses 10.0.2.2
  if (Platform.OS === 'android') {
    console.log('✅ T48 Debug - Using Android URL: http://10.0.2.2:8080');
    return 'http://10.0.2.2:8080';
  }

  // iOS simulator / web default
  // Use localhost for web, 127.0.0.1 for iOS simulator
  if (Platform.OS === 'web') {
    console.log('✅ T48 Debug - Using Web URL: http://localhost:8080');
    return 'http://localhost:8080';
  }

  console.log('✅ T48 Debug - Using iOS URL: http://127.0.0.1:8080');
  return 'http://127.0.0.1:8080';
}

// Environment variable configuration:
// Set EXPO_PUBLIC_ORCHESTRATOR_URL in your .env file or environment
// Examples:
// - EXPO_PUBLIC_ORCHESTRATOR_URL=http://localhost:8080 (for web)
// - EXPO_PUBLIC_ORCHESTRATOR_URL=http://192.168.1.105:8080 (for local network)
// - EXPO_PUBLIC_ORCHESTRATOR_URL=http://10.0.2.2:8080 (for Android emulator)





