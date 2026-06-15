import { registerPlugin } from "@capacitor/core";

export interface ScreenSecurityPlugin {
  enableScreenSecurity(): Promise<void>;
  disableScreenSecurity(): Promise<void>;
}

/**
 * Native plugin to enable/disable FLAG_SECURE on Android.
 * On web, calls are silently no-ops (the plugin object is empty).
 */
export const ScreenSecurity = registerPlugin<ScreenSecurityPlugin>(
  "ScreenSecurity",
  {
    // Web implementation — no-op since screenshots can't be blocked on web
    web: {
      enableScreenSecurity: async () => {},
      disableScreenSecurity: async () => {},
    },
  }
);
