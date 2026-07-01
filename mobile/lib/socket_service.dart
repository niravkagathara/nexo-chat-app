import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

const String channelId = "nexo_chat_notifications";
const String channelName = "Nexo Chat Notifications";
const String apiUrl = "https://api.nexochat.in";
const String socketUrl = "https://api.nexochat.in";

final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
    FlutterLocalNotificationsPlugin();

Future<void> initializeBackgroundService() async {
  final service = FlutterBackgroundService();

  // Configure Notification Channel for Android
  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    channelId,
    channelName,
    description: 'Nexo Chat background push notifications',
    importance: Importance.high,
  );

  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);

  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      autoStart: true, // Auto start on boot to check login status
      isForegroundMode: true,
      notificationChannelId: channelId,
      initialNotificationTitle: 'Nexo Chat',
      initialNotificationContent: 'Connecting to server...',
      foregroundServiceNotificationId: 888,
    ),
    iosConfiguration: IosConfiguration(
      autoStart: false,
      onForeground: onStart,
      onBackground: onIosBackground,
    ),
  );
}

@pragma('vm:entry-point')
bool onIosBackground(ServiceInstance service) {
  WidgetsFlutterBinding.ensureInitialized();
  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();

  io.Socket? socket;

  // Function to show local notification
  Future<void> showNotification(String title, String body) async {
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

  // Fetch rooms via API and join them
  Future<void> fetchAndJoinRooms(String token, int userId, String userName) async {
    try {
      final response = await http.get(
        Uri.parse('$apiUrl/rooms'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final List<dynamic> rooms = jsonDecode(response.body);
        for (var room in rooms) {
          final int roomId = room['id'];
          socket?.emit('joinRoom', {
            'roomId': roomId,
            'userId': userId,
            'userName': userName,
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Connect to the socket server
  void connectSocket(String token, int userId, String userName) {
    if (socket != null && socket!.connected) return;

    socket = io.io(socketUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'forceNew': true,
    });

    socket!.onConnect((_) {
      socket!.emit('registerUser', {
        'userId': userId,
        'userName': userName,
      });

      fetchAndJoinRooms(token, userId, userName);

      if (service is AndroidServiceInstance) {
        service.setForegroundNotificationInfo(
          title: "Nexo Chat",
          content: "Online - Connected",
        );
      }
    });

    socket!.onDisconnect((_) {
      if (service is AndroidServiceInstance) {
        service.setForegroundNotificationInfo(
          title: "Nexo Chat",
          content: "Connecting to server...",
        );
      }
    });

    socket!.on('newMessage', (data) {
      try {
        final Map<String, dynamic> msg = Map<String, dynamic>.from(data);
        final int senderId = msg['userId'];
        if (senderId != userId) {
          final Map<String, dynamic> user = Map<String, dynamic>.from(msg['user']);
          final String senderName = user['name'];
          final String content = msg['content'];
          showNotification("Nexo Chat - $senderName", content);
        }
      } catch (e) {
        // ignore
      }
    });

    socket!.on('videoCallSignal', (data) {
      try {
        final Map<String, dynamic> signal = Map<String, dynamic>.from(data);
        final int senderId = signal['senderId'];
        if (senderId != userId) {
          final String type = signal['type'];
          if (type == 'offer') {
            final String senderName = signal['senderName'];
            final String callType = signal['callType'] ?? 'video';
            showNotification("Nexo Chat", "Incoming $callType call from $senderName");
          }
        }
      } catch (e) {
        // ignore
      }
    });

    socket!.connect();
  }

  // Load preferences and start connection
  final prefs = await SharedPreferences.getInstance();
  final String? token = prefs.getString("token");
  final int userId = prefs.getInt("userId") ?? -1;
  final String userName = prefs.getString("userName") ?? "User";

  if (token != null && userId != -1) {
    connectSocket(token, userId, userName);
  } else {
    // If user is not logged in, stop the service to save battery/resources
    service.stopSelf();
  }

  service.on('stopService').listen((event) {
    socket?.disconnect();
    socket = null;
    service.stopSelf();
  });
}
