# Nexo Chat Mobile App (Flutter WebView Wrapper)

This directory contains the cross-platform Flutter WebView application for Nexo Chat.

## Features
1. **WebView Wrapper**: Integrates the Nexo Chat Next.js web application directly inside a responsive Flutter WebView container.
2. **WebRTC Integration**: Automatically requests and grants camera/microphone permissions for voice & video call capabilities.
3. **Background Socket Service**: Leverages `flutter_background_service` and `socket_io_client` to connect to the backend socket, listen for messages and calls, and trigger native notifications even when the app is in the background.
4. **App Launcher Icon**: Preserves original custom circular and square launcher icons (`ic_launcher.png` and `ic_launcher_round.png`).
5. **Back Navigation**: Intercepts physical back button presses using `PopScope` to navigate backward inside the WebView history.
6. **Pull to Refresh**: Includes a gesture-controlled refresh indicator that triggers `controller.reload()` when swiped at the top of the page.

---

## Getting Started

### Prerequisites
- [Flutter SDK (3.0.0 or newer)](https://docs.flutter.dev/get-started/install)
- [Android Studio](https://developer.android.com/studio) or VS Code with Flutter Extension installed.
- Android SDK 34 (API level 34)

### Running the Project
1. Open a terminal in this directory (`d:\projects\mobile`).
2. Run `flutter pub get` to fetch the dependencies.
3. Connect an Android Device via USB (with Developer Options & USB Debugging enabled) or start an Android Emulator.
4. Run the application:
   ```bash
   flutter run
   ```

### Development Configuration
By default, the WebView is configured to load the production URL:
`https://www.nexochat.in`

If you are running the app on a local emulator, make sure your local backend dev server is running and update the URL configuration in `lib/main.dart` or `lib/socket_service.dart` if needed.
