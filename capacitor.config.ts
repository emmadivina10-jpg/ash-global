import type { CapacitorConfig } from "@capacitor/cli";

/**
 * ASH Glo REFER — native shell configuration.
 *
 * The app is a server-rendered application with server functions, payments and
 * auth callbacks, so the native builds load the live deployment instead of a
 * frozen static bundle. Point `server.url` at a build you control:
*   - production : https://ashglogroup.company
 *   - staging    : https://project--27f7580a-d6af-45a7-9546-ba56b1916cbe-dev.lovable.app
 *
 * Set CAP_SERVER_URL when building to override without editing this file.
 */
const serverUrl = process.env["CAP_SERVER_URL"] ?? "https://ashglogroup.company";

const config: CapacitorConfig = {
  appId: "com.ashglogroup.app",
  appName: "ASH Glo",
  // Local bootstrap page shipped inside the binary (used offline / before the
  // remote URL responds). `npx cap sync` copies this folder into each platform.
  webDir: "native/www",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: [
"ashglogroup.company",
      "www.ashglogroup.company",
      "*.lovable.app",
      "*.supabase.co",
      "checkout.stripe.com",
      "*.stripe.com",
      "connect.tchokopay.com",
      "accounts.google.com",
      "appleid.apple.com",
    ],
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false,
      backgroundColor: "#080812",
      androidSplashResourceName: "splash",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#080812",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
    },
  },
};

export default config;
