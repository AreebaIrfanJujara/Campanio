import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.companio.app',
  appName: 'Companio',
  webDir: 'out',
  server: {
    url: 'https://campanio.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
