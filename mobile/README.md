# Nexo Chat Mobile App (Android WebView)

This directory contains the native Android WebView application for Nexo Chat.

## Features
1. **WebView wrapper**: Integrates the Nexo Chat Next.js web application directly inside a native WebView container.
2. **WebRTC Integration**: Automatically checks, requests, and grants camera/microphone permissions for voice & video call capabilities.
3. **Notification Support**: Automatically requests push and local notification permission permissions.
4. **App Launcher Icon**: Configured with professional square and circular launchers (`ic_launcher.png` and `ic_launcher_round.png`) generated directly from the company's brand logo.
5. **Back Navigation**: Intercepts physical back button presses to navigate backward inside the WebView history.

---

## Getting Started

### Prerequisites
- [Android Studio (Hedgehog or newer)](https://developer.android.com/studio)
- Android SDK 34 (API level 34) installed

### Opening & Running the Project
1. Open **Android Studio**.
2. Select **File > Open** and select this directory (`d:\projects\mobile`).
3. Allow Gradle to sync and download the dependencies.
4. Run the project on an **Android Emulator** or a real device connected via USB.

### Development Configuration
By default, the WebView is configured to load:
```kotlin
val appUrl = "http://10.0.2.2:3000" // Emulator accessing localhost
```
If you are running the app on a real Android device, make sure your device is connected to the same Wi-Fi network and change this IP address to your computer's local IP address (e.g., `http://192.168.1.100:3000`). For production, replace it with your public URL.
