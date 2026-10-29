# Universal App Hub

A professional app-launching and multitasking workspace: a responsive website plus a native Android companion.

The Hub is a floating shortcut control. It does not embed other applications inside itself, and it does not claim that every app can run in a floating window.

## Folder structure

```
Universal App Hub/
  website/                 Static HTML, CSS, JavaScript dashboard
    index.html
    css/styles.css
    js/app.js
    server.js              Optional local Node static server
  android/UniversalAppHub/ Android Studio project (Kotlin, Jetpack Compose)
  docs/
    SETUP.md
    ANDROID_BUILD.md
    COMPATIBILITY_CHECKLIST.md
    FEATURES_AND_LIMITATIONS.md
```

## Quick start (website)

```bat
cd website
node server.js
```

Open `http://127.0.0.1:8765/`.

## Quick start (Android)

Open `android/UniversalAppHub` in Android Studio, sync Gradle, and run on a device. See `docs/SETUP.md` and `docs/ANDROID_BUILD.md`.

## Design

Dark navy, blue, and white interface, rounded shortcut cards, mobile-first layout, and a compact Hub menu on both the website (in-page control) and Android (system overlay when permitted).
