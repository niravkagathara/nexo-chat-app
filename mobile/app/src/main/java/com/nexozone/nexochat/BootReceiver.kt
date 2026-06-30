package com.nexozone.nexochat

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
            val prefs = context?.getSharedPreferences("NexoPrefs", Context.MODE_PRIVATE)
            val token = prefs?.getString("token", null)
            val userId = prefs?.getInt("userId", -1) ?: -1
            if (token != null && userId != -1) {
                try {
                    val serviceIntent = Intent(context, NexoSocketService::class.java)
                    context.startService(serviceIntent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
}
