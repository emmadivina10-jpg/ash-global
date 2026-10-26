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
// Android has its own registered package. Leave iOS/default sync identity intact.
const isAndroidBuild = process.env["ASH_NATIVE_PLATFORM"] === "android" || process.argv.includes("android");

const config: CapacitorConfig = {
  appId: isAndroidBuild ? "com.ashglogroup.app" : "com.ashglogroup.mobile",
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
   contentInset: "never",
    scrollEnabled: true,
    backgroundColor: "#080812",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#080812",
  },
  plugins: {
    PushNotifications: {
      // Native remote alerts are the one banner, even in the foreground.
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
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
