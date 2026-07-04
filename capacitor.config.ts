import type { CapacitorConfig } from '@capacitor/cli';

const isDev = process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.accafr.app',
  appName: 'ACCA FR Mastery',
  webDir: 'dist/client',
  // Dev server is only used locally; removed in production builds
  ...(isDev && {
    server: {
      url: 'http://172.20.52.84:3000',
      cleartext: true,
    },
  }),
};

export default config;
