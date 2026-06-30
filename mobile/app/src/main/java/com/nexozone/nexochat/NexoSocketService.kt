package com.nexozone.nexochat

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONArray
import org.json.JSONObject
import okhttp3.*
import java.io.IOException

class NexoSocketService : Service() {

    private var socket: Socket? = null
    private val channelId = "nexo_chat_notifications"
    private val channelName = "Nexo Chat Notifications"
    private val apiUrl = "https://api.nexochat.in"
    private val socketUrl = "https://api.nexochat.in"

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences("NexoPrefs", Context.MODE_PRIVATE)
        val token = prefs.getString("token", null)
        val userId = prefs.getInt("userId", -1)
        val userName = prefs.getString("userName", "User") ?: "User"

        if (token != null && userId != -1) {
            connectSocket(token, userId, userName)
        }

        return START_STICKY
    }

    private fun connectSocket(token: String, userId: Int, userName: String) {
        if (socket?.connected() == true) return

        try {
            val opts = IO.Options()
            opts.forceNew = true
            opts.reconnection = true
            
            socket = IO.socket(socketUrl, opts)

            socket?.on(Socket.EVENT_CONNECT) {
                val registerObj = JSONObject()
                registerObj.put("userId", userId)
                registerObj.put("userName", userName)
                socket?.emit("registerUser", registerObj)

                fetchAndJoinRooms(token, userId, userName)
            }

            socket?.on("newMessage") { args ->
                if (args.isNotEmpty()) {
                    try {
                        val data = args[0] as JSONObject
                        val senderId = data.getInt("userId")
                        if (senderId != userId) {
                            val userObj = data.getJSONObject("user")
                            val senderName = userObj.getString("name")
                            val content = data.getString("content")
                            showNotification("Nexo Chat - $senderName", content)
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }

            socket?.on("videoCallSignal") { args ->
                if (args.isNotEmpty()) {
                    try {
                        val data = args[0] as JSONObject
                        val senderId = data.getInt("senderId")
                        if (senderId != userId) {
                            val type = data.getString("type")
                            if (type == "offer") {
                                val senderName = data.getString("senderName")
                                val callType = data.optString("callType", "video")
                                showNotification("Nexo Chat", "Incoming $callType call from $senderName")
                            }
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }

            socket?.connect()

        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun fetchAndJoinRooms(token: String, userId: Int, userName: String) {
        val client = OkHttpClient()
        val request = Request.Builder()
            .url("$apiUrl/rooms")
            .header("Authorization", "Bearer $token")
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                e.printStackTrace()
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!response.isSuccessful) return
                    val bodyStr = response.body?.string() ?: return
                    try {
                        val rooms = JSONArray(bodyStr)
                        for (i in 0 until rooms.length()) {
                            val room = rooms.getJSONObject(i)
                            val roomId = room.getInt("id")
                            val joinObj = JSONObject()
                            joinObj.put("roomId", roomId)
                            joinObj.put("userId", userId)
                            joinObj.put("userName", userName)
                            socket?.emit("joinRoom", joinObj)
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        })
    }

    private fun showNotification(title: String, body: String) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH)
            notificationManager.createNotificationChannel(channel)
        }

        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
    }

    override fun onDestroy() {
        super.onDestroy()
        socket?.disconnect()
        socket = null
    }
}
