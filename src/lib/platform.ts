import { Capacitor } from "@capacitor/core";

/** True when running inside a Capacitor native shell (iOS/Android). */
export function isMobileApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** True when running in a browser (not the Capacitor app). */
export function isWeb(): boolean {
  try {
    return !Capacitor.isNativePlatform();
  } catch {
    return true;
  }
}