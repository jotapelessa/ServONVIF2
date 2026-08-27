package com.servonvif.client.modern.ui.pip

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import androidx.cardview.widget.CardView
import com.servonvif.client.modern.R
import com.servonvif.client.modern.data.repository.ServerConfigRepository

/**
 * FloatingOverlayManager:
 * Bulletproof Non-Invasive 16:9 WindowManager Overlay for Android TV & Tablets.
 * 
 * Features:
 * 1. Zero disruption to background streaming apps (SBT, YouTube, PlutoTV, GloboPlay).
 * 2. Smart Debounce & Extension: If motion packets arrive continuously, extends the timer without flickering.
 * 3. Guaranteed Minimum Duration: Enforces at least 5s (default 10s+) with timestamp-based countdown.
 */
class FloatingOverlayManager(private val context: Context) {

    private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    private val mainHandler = Handler(Looper.getMainLooper())

    private var overlayView: View? = null
    private var isShowing = false
    private var currentCameraId: Int = -1
    private var targetDismissTimestamp: Long = 0L
    private var totalDurationMillis: Long = 10000L

    private val countdownRunnable = object : Runnable {
        override fun run() {
            if (!isShowing || overlayView == null) return

            val now = System.currentTimeMillis()
            val remainingMillis = targetDismissTimestamp - now

            if (remainingMillis <= 0) {
                Log.d("FloatingOverlay", "Countdown reached 0s. Auto-dismissing overlay.")
                hideFloatingAlert()
            } else {
                overlayView?.let { v ->
                    val pipProgressBar = v.findViewById<ProgressBar>(R.id.pipProgressBar)
                    val tvCountdown = v.findViewById<TextView>(R.id.tvCountdown)

                    pipProgressBar?.progress = remainingMillis.toInt()
                    val secondsLeft = ((remainingMillis + 999) / 1000).toInt()
                    tvCountdown?.text = "${secondsLeft}s"
                }
                mainHandler.postDelayed(this, 100)
            }
        }
    }

    fun showFloatingAlert(
        cameraId: Int,
        cameraName: String,
        mjpegUrl: String?,
        score: Float,
        durationSeconds: Int,
        siteName: String? = null
    ) {
        mainHandler.post {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                    Log.w("FloatingOverlay", "SYSTEM_ALERT_WINDOW permission not granted")
                    return@post
                }

                val configRepo = ServerConfigRepository(context)
                val effectiveDuration = maxOf(durationSeconds, configRepo.pipDurationSeconds, 5)
                totalDurationMillis = effectiveDuration * 1000L
                val sitePrefix = if (!siteName.isNullOrBlank() && siteName != "Servidor Principal" && siteName != "Servidor Local") "[$siteName] " else ""

                // If already showing on screen: simply EXTEND the timer and update text!
                if (isShowing && overlayView != null) {
                    targetDismissTimestamp = System.currentTimeMillis() + totalDurationMillis
                    overlayView?.let { v ->
                        val tvCameraTitle = v.findViewById<TextView>(R.id.tvCameraTitle)
                        val pipProgressBar = v.findViewById<ProgressBar>(R.id.pipProgressBar)
                        val scoreText = if (score > 0.0f) " (${(score * 100).toInt()}%)" else ""
                        tvCameraTitle?.text = "🔴 $sitePrefix$cameraName$scoreText"
                        pipProgressBar?.max = totalDurationMillis.toInt()
                        pipProgressBar?.progress = totalDurationMillis.toInt()
                    }
                    Log.d("FloatingOverlay", "Active overlay extended for +${effectiveDuration}s for Camera: $cameraName")
                    return@post
                }

                // If no overlay showing, construct fresh non-invasive Window
                val pipSizeSetting = configRepo.pipSize
                val pipPosSetting = configRepo.pipPosition

                val inflater = LayoutInflater.from(context)
                val view = inflater.inflate(R.layout.activity_pip_alert, null)
                overlayView = view
                currentCameraId = cameraId

                // 1. Calculate Exact 16:9 Dimensions (Micro, Mini, Compact, Large)
                val density = context.resources.displayMetrics.density
                val (widthDp, heightDp) = when (pipSizeSetting) {
                    ServerConfigRepository.SIZE_MICRO -> Pair(200, 112)
                    ServerConfigRepository.SIZE_MINI -> Pair(260, 146)
                    ServerConfigRepository.SIZE_COMPACT -> Pair(320, 180)
                    ServerConfigRepository.SIZE_MEDIUM -> Pair(380, 214)
                    ServerConfigRepository.SIZE_LARGE -> Pair(480, 270)
                    else -> Pair(260, 146)
                }

                val widthPx = (widthDp * density).toInt()
                val heightPx = (heightDp * density).toInt()
                val marginPx = (16 * density).toInt()

                // Explicitly force Dimensions on CardView container
                val pipCardContainer = view.findViewById<CardView>(R.id.pipCardContainer)
                pipCardContainer?.layoutParams = ViewGroup.LayoutParams(widthPx, heightPx)

                // 2. Setup Safe WindowManager LayoutParams
                val layoutFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                }

                val params = WindowManager.LayoutParams(
                    widthPx,
                    heightPx,
                    layoutFlag,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                    PixelFormat.TRANSLUCENT
                )

                // 2. Set Screen Gravity Position
                when (pipPosSetting) {
                    ServerConfigRepository.POSITION_TOP_LEFT -> {
                        params.gravity = Gravity.TOP or Gravity.START
                        params.x = marginPx
                        params.y = marginPx
                    }
                    ServerConfigRepository.POSITION_BOTTOM_RIGHT -> {
                        params.gravity = Gravity.BOTTOM or Gravity.END
                        params.x = marginPx
                        params.y = marginPx
                    }
                    ServerConfigRepository.POSITION_BOTTOM_LEFT -> {
                        params.gravity = Gravity.BOTTOM or Gravity.START
                        params.x = marginPx
                        params.y = marginPx
                    }
                    ServerConfigRepository.POSITION_CENTER -> {
                        params.gravity = Gravity.CENTER
                    }
                    else -> {
                        // Default TOP_RIGHT
                        params.gravity = Gravity.TOP or Gravity.END
                        params.x = marginPx
                        params.y = marginPx
                    }
                }

                // 3. Bind Layout Views
                val tvCameraTitle = view.findViewById<TextView>(R.id.tvCameraTitle)
                val tvCountdown = view.findViewById<TextView>(R.id.tvCountdown)
                val pipProgressBar = view.findViewById<ProgressBar>(R.id.pipProgressBar)
                val pipWebView = view.findViewById<WebView>(R.id.pipWebView)
                val btnPipClose = view.findViewById<TextView>(R.id.btnPipClose)

                val scoreText = if (score > 0.0f) " (${(score * 100).toInt()}%)" else ""
                tvCameraTitle?.text = "🔴 $sitePrefix$cameraName$scoreText"
                tvCountdown?.text = "${effectiveDuration}s"

                pipProgressBar?.max = totalDurationMillis.toInt()
                pipProgressBar?.progress = totalDurationMillis.toInt()

                btnPipClose?.setOnClickListener {
                    hideFloatingAlert()
                }

                // 4. Setup Hardware-Accelerated WebView Stream
                pipWebView.settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    mediaPlaybackRequiresUserGesture = false
                    cacheMode = WebSettings.LOAD_NO_CACHE
                    useWideViewPort = true
                    loadWithOverviewMode = true
                    allowContentAccess = true
                    allowFileAccess = true
                }
                pipWebView.webChromeClient = WebChromeClient()
                pipWebView.webViewClient = WebViewClient()

                val rawStreamUrl = mjpegUrl ?: "/api/mjpeg/$cameraId"
                val streamUrl = if (rawStreamUrl.startsWith("http")) {
                    rawStreamUrl
                } else {
                    "${configRepo.httpBaseUrl}$rawStreamUrl"
                }

                val html = """
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body, html { width: 100%; height: 100%; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
                            img { width: 100%; height: 100%; object-fit: cover; }
                        </style>
                    </head>
                    <body>
                        <img src="$streamUrl" alt="Live Camera" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'50\' x=\'50\' fill=\'white\' font-size=\'10\' text-anchor=\'middle\'>Carregando Stream...</text></svg>'" />
                    </body>
                    </html>
                """.trimIndent()

                pipWebView.loadDataWithBaseURL(configRepo.httpBaseUrl, html, "text/html", "UTF-8", null)

                // 5. Add Non-Invasive View to WindowManager
                windowManager.addView(view, params)
                isShowing = true
                Log.d("FloatingOverlay", "Floating Window added with duration=${effectiveDuration}s")

                // 6. Start Timestamp-based Guaranteed Countdown
                targetDismissTimestamp = System.currentTimeMillis() + totalDurationMillis
                mainHandler.removeCallbacks(countdownRunnable)
                mainHandler.post(countdownRunnable)

            } catch (e: Exception) {
                Log.e("FloatingOverlay", "Error showing floating alert: ${e.message}")
            }
        }
    }

    fun hideFloatingAlert() {
        mainHandler.post {
            try {
                mainHandler.removeCallbacks(countdownRunnable)

                overlayView?.let { v ->
                    try {
                        val webView = v.findViewById<WebView>(R.id.pipWebView)
                        webView?.stopLoading()
                        webView?.loadUrl("about:blank")
                        webView?.destroy()
                    } catch (e: Exception) {
                        // Safe cleanup
                    }

                    if (isShowing) {
                        windowManager.removeView(v)
                        isShowing = false
                        Log.d("FloatingOverlay", "Floating Window dismissed cleanly")
                    }
                }
                overlayView = null
                currentCameraId = -1
            } catch (e: Exception) {
                Log.e("FloatingOverlay", "Error hiding floating alert: ${e.message}")
            }
        }
    }
}
