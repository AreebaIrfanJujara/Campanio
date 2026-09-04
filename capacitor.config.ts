import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.companio.app',
  appName: 'Companio',
  webDir: 'out',
  server: {
    // For auto-updating live app, point url to your live hosted web app or local IP address
    // e.g. url: "https://companio.vercel.app" or "http://192.168.1.100:3000"
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
