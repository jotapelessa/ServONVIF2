package com.servonvif.client.modern.ui.tv

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.webkit.*
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.servonvif.client.modern.R
import com.servonvif.client.modern.data.repository.ServerConfigRepository
import com.servonvif.client.modern.network.ServOnvifApiClient
import com.servonvif.client.modern.service.MonitoringForegroundService
import com.servonvif.client.modern.service.WebSocketManager
import com.servonvif.client.modern.ui.pip.FloatingOverlayManager
import com.servonvif.client.modern.ui.pip.PiPAlertActivity
import org.json.JSONObject
import kotlin.concurrent.thread

class TvMainActivity : AppCompatActivity() {

    private lateinit var configRepo: ServerConfigRepository
    private lateinit var apiClient: ServOnvifApiClient
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar

    private val mainHandler = Handler(Looper.getMainLooper())
    private var liveWsManager: WebSocketManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_dashboard)

        configRepo = ServerConfigRepository(this)
        apiClient = ServOnvifApiClient(configRepo)

        webView = findViewById(R.id.tvMainWebView)
        progressBar = findViewById(R.id.tvLoadingProgress)

        setupHardwareAcceleratedWebView()
        requestNotificationPermission()
        ensureForegroundServiceRunning()
        startLiveWebSocketListener()

        loadNetflixTvInterface()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupHardwareAcceleratedWebView() {
        // WebViewAssetLoader: maps https://appassets.androidplatform.net/* to app assets
        // URL pattern:  /assets/tv-netflix/index.html         → assets/tv-netflix/index.html  ✅
        //               /assets/tv-netflix/assets/index-XYZ.js → assets/tv-netflix/assets/XYZ ✅
        val assetLoader = androidx.webkit.WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", androidx.webkit.WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView.apply {
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            isFocusable = true
            isFocusableInTouchMode = true
            requestFocus()

            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                mediaPlaybackRequiresUserGesture = false
                allowFileAccess = true
                allowContentAccess = true
                @Suppress("DEPRECATION")
                allowFileAccessFromFileURLs = true
                @Suppress("DEPRECATION")
                allowUniversalAccessFromFileURLs = true
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                cacheMode = WebSettings.LOAD_NO_CACHE
                useWideViewPort = true
                loadWithOverviewMode = true
                setSupportZoom(false)
            }

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    Log.d("ServOnvifNetflixTV", "[JS Console] ${consoleMessage?.message()} -- From line ${consoleMessage?.lineNumber()}")
                    return true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    val intercepted = request?.url?.let { assetLoader.shouldInterceptRequest(it) }
                    if (intercepted != null) return intercepted
                    return null
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    progressBar.visibility = View.GONE
                    Log.i("ServOnvifNetflixTV", "Netflix Smart TV Interface loaded: $url")
                    // Inject server base URL into the JS context immediately
                    val httpBase = configRepo.httpBaseUrl
                    webView.evaluateJavascript(
                        "window.__SERVONVIF_BASE_URL = '$httpBase';",
                        null
                    )
                }

                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                    val isMainFrame = request?.isForMainFrame == true
                    Log.w("ServOnvifNetflixTV", "WebView Error [mainFrame=$isMainFrame] on ${request?.url}: ${error?.description}")
                }

                override fun onReceivedHttpError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    errorResponse: android.webkit.WebResourceResponse?
                ) {
                    Log.w("ServOnvifNetflixTV", "HTTP Error ${errorResponse?.statusCode} for ${request?.url}")
                }
            }

            addJavascriptInterface(AndroidNativeBridge(), "AndroidNative")
        }
    }

    private fun loadNetflixTvInterface() {
        progressBar.visibility = View.VISIBLE
        val localAssetUrl = "https://appassets.androidplatform.net/assets/tv-netflix/index.html"
        Log.i("ServOnvifNetflixTV", "Loading bundled Netflix UI directly: $localAssetUrl")
        webView.loadUrl(localAssetUrl)
    }

    // =========================================================================
    // 🌉 JAVASCRIPT TO ANDROID NATIVE BRIDGE
    // =========================================================================
    inner class AndroidNativeBridge {

        @JavascriptInterface
        fun getServerBaseUrl(): String {
            return configRepo.httpBaseUrl
        }

        @JavascriptInterface
        fun setServerConfig(ip: String, port: Int) {
            configRepo.serverIp = ip
            configRepo.serverPort = port
            mainHandler.post {
                Toast.makeText(this@TvMainActivity, "Servidor atualizado: $ip:$port", Toast.LENGTH_SHORT).show()
                loadNetflixTvInterface()
            }
        }

        @JavascriptInterface
        fun triggerPiP(cameraId: String, cameraName: String) {
            mainHandler.post {
                Log.i("ServOnvifNetflixTV", "Native bridge triggerPiP: $cameraId - $cameraName")
                try {
                    val streamUrl = "${configRepo.httpBaseUrl}/api/mjpeg/$cameraId"
                    val camIdInt = cameraId.toIntOrNull() ?: cameraId.hashCode()
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this@TvMainActivity)) {
                        val floatingManager = FloatingOverlayManager(this@TvMainActivity)
                        floatingManager.showFloatingAlert(
                            cameraId = camIdInt,
                            cameraName = cameraName,
                            mjpegUrl = streamUrl,
                            score = 0.95f,
                            durationSeconds = configRepo.pipDurationSeconds
                        )
                    } else {
                        val intent = Intent(this@TvMainActivity, PiPAlertActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                            putExtra("EXTRA_CAMERA_NAME", cameraName)
                            putExtra("EXTRA_CAMERA_ID", camIdInt)
                            putExtra("EXTRA_MJPEG_URL", streamUrl)
                            putExtra("EXTRA_DURATION", configRepo.pipDurationSeconds)
                        }
                        startActivity(intent)
                    }
                } catch (e: Exception) {
                    Log.e("ServOnvifNetflixTV", "Error launching PiP: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun playSoundChime(tone: String) {
            mainHandler.post {
                try {
                    val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    val ringtone = RingtoneManager.getRingtone(this@TvMainActivity, uri)
                    ringtone.play()
                } catch (e: Exception) {
                    Log.w("ServOnvifNetflixTV", "Failed to play ringtone: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun showHeadsUp(title: String, message: String) {
            mainHandler.post {
                triggerNativeNotification(title, message)
            }
        }

        @JavascriptInterface
        fun requestOverlayPermission() {
            mainHandler.post {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this@TvMainActivity)) {
                    val intent = Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:$packageName")
                    )
                    startActivity(intent)
                } else {
                    Toast.makeText(this@TvMainActivity, "Permissão de Sobreposição já concedida!", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun checkPermissions(): String {
            val hasOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(this@TvMainActivity) else true
            val hasNotif = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ContextCompat.checkSelfPermission(this@TvMainActivity, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            } else true

            val json = JSONObject().apply {
                put("overlay", hasOverlay)
                put("notifications", hasNotif)
                put("wakeLock", true)
            }
            return json.toString()
        }

        @JavascriptInterface
        fun copyToClipboard(text: String) {
            mainHandler.post {
                try {
                    val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                    val clip = android.content.ClipData.newPlainText("ServONVIF_Logs", text)
                    clipboard.setPrimaryClip(clip)
                    Toast.makeText(this@TvMainActivity, "Logs copiados para a área de transferência!", Toast.LENGTH_SHORT).show()
                } catch (e: Exception) {
                    Log.e("ServOnvifNetflixTV", "Failed to copy to clipboard: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun pingServer(targetUrl: String): String {
            val startTime = System.currentTimeMillis()
            return try {
                val url = if (targetUrl.startsWith("http")) targetUrl else "${configRepo.httpBaseUrl}$targetUrl"
                val request = okhttp3.Request.Builder().url(url).build()
                val client = okhttp3.OkHttpClient.Builder()
                    .connectTimeout(3, java.util.concurrent.TimeUnit.SECONDS)
                    .readTimeout(3, java.util.concurrent.TimeUnit.SECONDS)
                    .build()
                val response = client.newCall(request).execute()
                val latency = System.currentTimeMillis() - startTime
                val code = response.code
                response.close()
                JSONObject().apply {
                    put("ok", response.isSuccessful)
                    put("status", code)
                    put("latency_ms", latency)
                    put("url", url)
                }.toString()
            } catch (e: Exception) {
                val latency = System.currentTimeMillis() - startTime
                JSONObject().apply {
                    put("ok", false)
                    put("error", e.message ?: "Network error")
                    put("latency_ms", latency)
                    put("url", targetUrl)
                }.toString()
            }
        }

        @JavascriptInterface
        fun updatePipConfig(size: String, position: String, durationSeconds: Int) {
            mainHandler.post {
                try {
                    configRepo.pipSize = size.uppercase()
                    configRepo.pipPosition = position.uppercase()
                    configRepo.pipDurationSeconds = durationSeconds
                    Log.i("ServOnvifNetflixTV", "PiP Config Updated: size=$size, pos=$position, duration=${durationSeconds}s")
                } catch (e: Exception) {
                    Log.e("ServOnvifNetflixTV", "Failed to update PiP config: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun getPipConfig(): String {
            val json = JSONObject().apply {
                put("size", configRepo.pipSize.lowercase())
                put("position", configRepo.pipPosition.lowercase())
                put("durationSeconds", configRepo.pipDurationSeconds)
            }
            return json.toString()
        }
    }

    private fun triggerNativeNotification(title: String, message: String) {
        try {
            val channelId = "servonvif_tv_alerts"
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = android.app.NotificationChannel(
                    channelId,
                    "Alertas ServONVIF TV",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notificações de segurança e movimento"
                    enableVibration(true)
                }
                notificationManager.createNotificationChannel(channel)
            }

            val intent = Intent(this, TvMainActivity::class.java)
            val pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val notification = NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.drawable.app_icon)
                .setContentTitle(title)
                .setContentText(message)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            notificationManager.notify(1001, notification)
        } catch (e: Exception) {
            Log.e("ServOnvifNetflixTV", "Error triggering native notification: ${e.message}")
        }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 101)
            }
        }
    }

    private fun ensureForegroundServiceRunning() {
        try {
            val serviceIntent = Intent(this, MonitoringForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(this, serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e("ServOnvifNetflixTV", "Failed to start MonitoringForegroundService: ${e.message}")
        }
    }

    private fun startLiveWebSocketListener() {
        try {
            liveWsManager?.stop()
            liveWsManager = WebSocketManager(this) { event ->
                mainHandler.post {
                    val eventObj = JSONObject().apply {
                        put("type", event.type)
                        put("camera_id", event.cameraId)
                        put("camera_name", event.cameraName)
                        put("score", event.score)
                        put("timestamp", event.timestamp)
                        put("thumbnail_url", event.thumbnailUrl ?: "")
                    }
                    val jsCode = "if (window.__onNativeWsEvent) { window.__onNativeWsEvent($eventObj); }"
                    webView.evaluateJavascript(jsCode, null)
                }
            }
            liveWsManager?.start()
        } catch (e: Exception) {
            Log.e("ServOnvifNetflixTV", "WebSocket setup failed: ${e.message}")
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER -> {
                webView.dispatchKeyEvent(event)
            }
            KeyEvent.KEYCODE_BACK -> {
                if (webView.canGoBack()) {
                    webView.goBack()
                    true
                } else {
                    super.onKeyDown(keyCode, event)
                }
            }
            else -> super.onKeyDown(keyCode, event)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        liveWsManager?.stop()
    }
}
