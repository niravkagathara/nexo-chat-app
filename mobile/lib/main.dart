import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'socket_service.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
    
    // Request permission for push notifications
    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
  } catch (e) {
    // ignore
  }
  
  // Initialize local notifications
  const AndroidInitializationSettings initializationSettingsAndroid =
      AndroidInitializationSettings('@mipmap/ic_launcher');
  const DarwinInitializationSettings initializationSettingsIOS =
      DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );
  const InitializationSettings initializationSettings = InitializationSettings(
    android: initializationSettingsAndroid,
    iOS: initializationSettingsIOS,
  );
  await flutterLocalNotificationsPlugin.initialize(settings: initializationSettings);

  // Initialize background service configurations
  await initializeBackgroundService();

  // If user is already logged in, automatically start the background service
  final prefs = await SharedPreferences.getInstance();
  final String? token = prefs.getString("token");
  final int userId = prefs.getInt("userId") ?? -1;
  if (token != null && userId != -1) {
    final backgroundService = FlutterBackgroundService();
    if (!await backgroundService.isRunning()) {
      await backgroundService.startService();
    }
  }

  runApp(const NexoChatApp());
}

class NexoChatApp extends StatelessWidget {
  const NexoChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nexo Chat',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  late final WebViewController _controller;
  bool _isRefreshing = false;
  int _scrollY = 0;

  static const _speakerChannel = MethodChannel('com.nexozone.nexochat/speaker');

  @override
  void initState() {
    super.initState();
    _checkAndRequestPermissions();
    _initWebViewController();
    _registerFcmTokenIfLoggedIn();
    _setupForegroundNotifications();
  }

  void _setupForegroundNotifications() {
    FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notification = message.notification;
      if (notification != null) {
        _showLocalNotification(
          notification.title ?? 'New Message',
          notification.body ?? '',
        );
      }
    });
  }

  Future<void> _checkAndRequestPermissions() async {
    await [
      Permission.camera,
      Permission.microphone,
      Permission.notification,
    ].request();
  }

  void _initWebViewController() {
    _controller = WebViewController(
      onPermissionRequest: (WebViewPermissionRequest request) async {
        await request.grant();
      },
    )
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            _injectJavascriptBridge();
          },
          onPageFinished: (String url) {
            setState(() {
              _isRefreshing = false;
            });
            _injectJavascriptBridge();
          },
          onWebResourceError: (WebResourceError error) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Nexo Connection Error: ${error.description}')),
            );
          },
        ),
      );

    // Overriding User Agent to bypass Google's OAuth block on webviews and identify as mobile application
    final String customUserAgent = Platform.isIOS
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 NexoChatMobile"
        : "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 NexoChatMobile";
    _controller.setUserAgent(customUserAgent);

    // Enable debugging on Android if applicable
    if (_controller.platform is AndroidWebViewController) {
      AndroidWebViewController.enableDebugging(true);
    }



    // Set scroll change listener to allow pull-to-refresh only when at the top
    _controller.setOnScrollPositionChange((ScrollPositionChange change) {
      setState(() {
        _scrollY = change.y.toInt();
      });
    });

    // Add JavaScript Channel
    _controller.addJavaScriptChannel(
      'AndroidBridgeChannel',
      onMessageReceived: (JavaScriptMessage message) {
        _handleJsBridgeMessage(message.message);
      },
    );

    // Load initial WebApp URL
    _controller.loadRequest(Uri.parse('https://www.nexochat.in'));
  }

  // Inject a compatibility layer that exposes `window.AndroidBridge` exactly as expected
  void _injectJavascriptBridge() {
    const String jsCode = '''
      window.AndroidBridge = {
        toggleSpeaker: function(useLoudspeaker) {
          AndroidBridgeChannel.postMessage(JSON.stringify({action: 'toggleSpeaker', value: useLoudspeaker}));
        },
        showNotification: function(title, body) {
          AndroidBridgeChannel.postMessage(JSON.stringify({action: 'showNotification', title: title, body: body}));
        },
        saveAuthData: function(token, userId, userName) {
          AndroidBridgeChannel.postMessage(JSON.stringify({action: 'saveAuthData', token: token, userId: userId, userName: userName}));
        },
        clearAuthData: function() {
          AndroidBridgeChannel.postMessage(JSON.stringify({action: 'clearAuthData'}));
        }
      };
    ''';
    _controller.runJavaScript(jsCode);
  }

  Future<void> _handleJsBridgeMessage(String jsonStr) async {
    try {
      final Map<String, dynamic> data = jsonDecode(jsonStr);
      final String action = data['action'];

      switch (action) {
        case 'toggleSpeaker':
          final bool useLoudspeaker = data['value'] ?? false;
          try {
            await _speakerChannel.invokeMethod('toggleSpeaker', {'useLoudspeaker': useLoudspeaker});
          } catch (e) {
            // ignore
          }
          break;
        case 'showNotification':
          final String title = data['title'] ?? '';
          final String body = data['body'] ?? '';
          _showLocalNotification(title, body);
          break;
        case 'saveAuthData':
          final String token = data['token'] ?? '';
          final int userId = data['userId'] ?? -1;
          final String userName = data['userName'] ?? 'User';

          final prefs = await SharedPreferences.getInstance();
          await prefs.setString("token", token);
          await prefs.setInt("userId", userId);
          await prefs.setString("userName", userName);

          // Fetch and register FCM Token
          try {
            final String? fcmToken = await FirebaseMessaging.instance.getToken();
            if (fcmToken != null) {
              await prefs.setString("fcmToken", fcmToken);
              _sendFcmTokenToBackend(fcmToken, token);
            }
          } catch (e) {
            // ignore
          }

          // Start the background socket service
          final backgroundService = FlutterBackgroundService();
          if (!await backgroundService.isRunning()) {
            await backgroundService.startService();
          }
          break;
        case 'clearAuthData':
          final prefs = await SharedPreferences.getInstance();
          await prefs.clear();

          // Stop the background socket service
          final backgroundService = FlutterBackgroundService();
          backgroundService.invoke('stopService');
          break;
      }
    } catch (e) {
      // ignore
    }
  }

  Future<void> _showLocalNotification(String title, String body) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      channelId,
      channelName,
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );
    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    const NotificationDetails platformDetails =
        NotificationDetails(android: androidDetails, iOS: iosDetails);
    
    await flutterLocalNotificationsPlugin.show(
      id: DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title: title,
      body: body,
      notificationDetails: platformDetails,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: PopScope(
          canPop: false,
          onPopInvokedWithResult: (bool didPop, dynamic result) async {
            if (didPop) return;
            if (await _controller.canGoBack()) {
              await _controller.goBack();
            } else {
              SystemNavigator.pop();
            }
          },
          child: RefreshIndicator(
            onRefresh: () async {
              setState(() {
                _isRefreshing = true;
              });
              await _controller.reload();
            },
            notificationPredicate: (ScrollNotification notification) {
              return _scrollY == 0;
            },
            child: Stack(
              children: [
                WebViewWidget(controller: _controller),
                if (_isRefreshing)
                  const Positioned(
                    top: 10,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: CircularProgressIndicator(),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _registerFcmTokenIfLoggedIn() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? token = prefs.getString("token");
      if (token != null) {
        final String? fcmToken = await FirebaseMessaging.instance.getToken();
        if (fcmToken != null) {
          _sendFcmTokenToBackend(fcmToken, token);
        }
      }
    } catch (e) {
      // ignore
    }
  }

  Future<void> _sendFcmTokenToBackend(String fcmToken, String authToken) async {
    try {
      final response = await http.post(
        Uri.parse('https://api.nexochat.in/auth/fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'fcmToken': fcmToken,
        }),
      );
      if (response.statusCode == 201 || response.statusCode == 200) {
        debugPrint('[Success] Registered FCM Token on server');
      } else {
        debugPrint('[Error] Failed to register FCM Token: ${response.statusCode} — ${response.body}');
      }
    } catch (e) {
      // ignore
    }
  }
}
