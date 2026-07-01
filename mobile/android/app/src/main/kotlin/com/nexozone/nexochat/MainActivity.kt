package com.nexozone.nexochat

import android.content.Context
import android.media.AudioManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.nexozone.nexochat/speaker"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "toggleSpeaker") {
                val useLoudspeaker = call.argument<Boolean>("useLoudspeaker") ?: false
                try {
                    val audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                    audioManager.isSpeakerphoneOn = useLoudspeaker
                    result.success(null)
                } catch (e: Exception) {
                    result.error("ERROR", "Failed to toggle speaker: ${e.message}", null)
                }
            } else {
                result.notImplemented()
            }
        }
    }
}
