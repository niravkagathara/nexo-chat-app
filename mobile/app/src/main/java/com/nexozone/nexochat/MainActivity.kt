package com.nexozone.nexochat

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private var uploadMessage: ValueCallback<Array<Uri>>? = null
    private val fileChooserRequestCode = 1002
    private val channelId = "nexo_chat_notifications"
    private val channelName = "Nexo Chat Notifications"

    private val permissionRequestCode = 1001

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Setup SwipeRefreshLayout and WebView programmatically
        swipeRefreshLayout = SwipeRefreshLayout(this)
        swipeRefreshLayout.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )

        webView = WebView(this)
        webView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        
        swipeRefreshLayout.addView(webView)
        setContentView(swipeRefreshLayout)

        // Configure SwipeRefreshLayout
        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }

        // Prevent SwipeRefreshLayout from triggering while scrolling up inside WebView
        swipeRefreshLayout.setOnChildScrollUpCallback { _, _ ->
            webView.scrollY > 0
        }

        // Request permissions on startup
        checkAndRequestPermissions()

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false

        // Expose JavaScript bridge
        webView.addJavascriptInterface(WebAppInterface(this), "AndroidBridge")

        // Override User-Agent to bypass Google's "disallowed_useragent" policy in WebViews
        val defaultUserAgent = webView.settings.userAgentString
        val customUserAgent = defaultUserAgent
            .replace("; wv)", ")")
            .replace("Version/\\d+\\.\\d+\\s+".toRegex(), "")
        webView.settings.userAgentString = customUserAgent

        webView.webViewClient = object : WebViewClient() {
            @Deprecated("Deprecated in Java")
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null && (url.startsWith("http://") || url.startsWith("https://"))) {
                    return false // Open in WebView
                }
                return true
            }

            @Deprecated("Deprecated in Java")
            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                super.onReceivedError(view, errorCode, description, failingUrl)
                android.widget.Toast.makeText(
                    this@MainActivity,
                    "Nexo Connection Error: $description",
                    android.widget.Toast.LENGTH_LONG
                ).show()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                swipeRefreshLayout.isRefreshing = false
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // Automatically grant WebRTC camera/mic permissions inside the WebView
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }

            // File upload selector support inside native WebView
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                if (uploadMessage != null) {
                    uploadMessage?.onReceiveValue(null)
                    uploadMessage = null
                }
                uploadMessage = filePathCallback

                val intent = fileChooserParams?.createIntent()
                if (intent == null) {
                    uploadMessage = null
                    return false
                }
                try {
                    startActivityForResult(intent, fileChooserRequestCode)
                } catch (e: ActivityNotFoundException) {
                    uploadMessage = null
                    return false
                }
                return true
            }
        }

        // Load Nexo Chat URL
        val appUrl = "https://www.nexochat.in"
        webView.loadUrl(appUrl)
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val permissionsToRequest = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (permissionsToRequest.isNotEmpty()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                ActivityCompat.requestPermissions(
                    this,
                    permissionsToRequest.toTypedArray(),
                    permissionRequestCode
                )
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == fileChooserRequestCode) {
            if (uploadMessage == null) return
            val result = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            uploadMessage?.onReceiveValue(result)
            uploadMessage = null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    // Native features triggered from JS WebApp
    class WebAppInterface(private val activity: MainActivity) {
        
        @JavascriptInterface
        fun toggleSpeaker(useLoudspeaker: Boolean) {
            activity.runOnUiThread {
                try {
                    val audioManager = activity.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                    audioManager.isSpeakerphoneOn = useLoudspeaker
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        @JavascriptInterface
        fun showNotification(title: String, body: String) {
            activity.runOnUiThread {
                try {
                    activity.showNativeNotification(title, body)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    fun showNativeNotification(title: String, body: String) {
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
}
