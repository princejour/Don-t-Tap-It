# Don't Tap It!

A silly premium one-tap game where the button fights back.

## Project Overview
This is a complete, publish-ready mobile game project designed as a premium hyper-casual title. The project is implemented as an HTML5 web game wrapped inside a native Android Jetpack Compose application. This satisfies the requirement to be a PWA, a mobile web game, and an APK/AAB-ready project simultaneously.

## How to Run the Game
- **Web/PWA:** Open the `index.html` file in any modern web browser or host the files on a web server.
- **Android App:** Run the project in AI Studio or open it in Android Studio to build and run on a physical device.

## How to Build as PWA
1. Serve the project directory over HTTPS.
2. The `manifest.json` provides the PWA configuration.
3. Users can "Add to Home Screen" from their mobile browsers.

## How to Convert to APK/AAB
1. Open this project in Android Studio.
2. Select **Build > Generate Signed Bundle / APK...**
3. Choose either APK (for direct sideloading) or Android App Bundle (AAB) for Google Play.
4. Follow the signing process using your developer keystore.

## Google Play Preparation Checklist
When uploading this game to the Google Play Console, ensure the following declarations match:
- **App contains ads:** Yes (if AdMob is enabled).
- **Target audience:** 13+. (Do NOT select younger ages as the game is not child-directed).
- **Accounts:** No account creation required.
- **Permissions:** No location, camera, microphone, or contacts permissions required.
- **Data Safety:** Disclose any data collected by AdMob (device identifiers, ad interaction) if ads are integrated.
- **Content Rating:** Complete the questionnaire honestly (General Audience / No Violence).
- **Privacy Policy:** Link to the hosted version of `privacy-policy.html`.

*Note: Final Play Console declarations must match the actual SDKs and permissions used in the final build. The provided code includes placeholders for AdMob integration.*
