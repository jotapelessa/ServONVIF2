package com.servonvif.client.ui.pip

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Build
import android.os.Bundle
import android.os.CountDownTimer
import android.util.DisplayMetrics
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.cardview.widget.CardView
import com.servonvif.client.R
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.ui.tv.TvMainActivity

class PiPAlertActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var tvTitle: TextView
    private lateinit var tvCountdown: TextView
    private lateinit var btnPipClose: TextView
    private lateinit var pipProgressBar: ProgressBar
    private lateinit var pipCardContainer: CardView

    private lateinit var configRepo: ServerConfigRepository
    private var countdownTimer: CountDownTimer? = null
    private var cameraId: Int = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        configRepo = ServerConfigRepository(this)

        // Ensure screen wakes up and turns on over lockscreen/other apps
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // Configure Window Floating Geometry (Corner Position & Compact Size)
        applyWindowGeometry()

        setContentView(R.layout.activity_pip_alert)

        initViews()
        loadCameraStream()
        startCountdownTimer()
    }

    private fun applyWindowGeometry() {
        window.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        val displayMetrics = resources.displayMetrics
        val density = displayMetrics.density

        // 1. Determine Window Size (Strict 16:9 Aspect Ratio)
        val (widthDp, heightDp) = when (configRepo.pipSize) {
            ServerConfigRepository.SIZE_MICRO -> Pair(220, 124)
            ServerConfigRepository.SIZE_MINI -> Pair(270, 152)
            ServerConfigRepository.SIZE_COMPACT -> Pair(320, 180)
            ServerConfigRepository.SIZE_LARGE -> Pair(460, 258)
            else -> Pair(270, 152) // Default Mini / Micro
        }

        val widthPx = (widthDp * density).toInt()
        val heightPx = (heightDp * density).toInt()
        val marginPx = (20 * density).toInt()

        val layoutParams = window.attributes
        layoutParams.width = widthPx
        layoutParams.height = heightPx

        // 2. Determine Screen Position
        when (configRepo.pipPosition) {
            ServerConfigRepository.POSITION_TOP_LEFT -> {
                layoutParams.gravity = Gravity.TOP or Gravity.START
                layoutParams.x = marginPx
                layoutParams.y = marginPx
            }
            ServerConfigRepository.POSITION_BOTTOM_RIGHT -> {
                layoutParams.gravity = Gravity.BOTTOM or Gravity.END
                layoutParams.x = marginPx
                layoutParams.y = marginPx
            }
            ServerConfigRepository.POSITION_BOTTOM_LEFT -> {
                layoutParams.gravity = Gravity.BOTTOM or Gravity.START
                layoutParams.x = marginPx
                layoutParams.y = marginPx
            }
            ServerConfigRepository.POSITION_CENTER -> {
                layoutParams.gravity = Gravity.CENTER
            }
            else -> {
                // Default: Top-Right (Intercom Security Standard)
                layoutParams.gravity = Gravity.TOP or Gravity.END
                layoutParams.x = marginPx
                layoutParams.y = marginPx
            }
        }

        // Allow touches outside the window if needed and watch touch
        layoutParams.flags = layoutParams.flags or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH

        window.attributes = layoutParams
    }

    private fun initViews() {
        webView = findViewById(R.id.pipWebView)
        tvTitle = findViewById(R.id.tvCameraTitle)
        tvCountdown = findViewById(R.id.tvCountdown)
        btnPipClose = findViewById(R.id.btnPipClose)
        pipProgressBar = findViewById(R.id.pipProgressBar)
        pipCardContainer = findViewById(R.id.pipCardContainer)

        val density = resources.displayMetrics.density
        val (widthDp, heightDp) = when (configRepo.pipSize) {
            ServerConfigRepository.SIZE_MICRO -> Pair(200, 112)
            ServerConfigRepository.SIZE_MINI -> Pair(260, 146)
            ServerConfigRepository.SIZE_COMPACT -> Pair(320, 180)
            ServerConfigRepository.SIZE_LARGE -> Pair(420, 236)
            else -> Pair(260, 146)
        }
        val widthPx = (widthDp * density).toInt()
        val heightPx = (heightDp * density).toInt()
        pipCardContainer.layoutParams = ViewGroup.LayoutParams(widthPx, heightPx)

        cameraId = intent.getIntExtra("EXTRA_CAMERA_ID", 1)
        val cameraName = intent.getStringExtra("EXTRA_CAMERA_NAME") ?: "Câmera de Segurança"
        val score = intent.getDoubleExtra("EXTRA_SCORE", 0.0)

        val scoreBadge = if (score > 0.0) " (${(score * 100).toInt()}%)" else ""
        tvTitle.text = "🔴 $cameraName$scoreBadge"

        btnPipClose.setOnClickListener {
            finish()
        }

        pipCardContainer.setOnClickListener {
            openFullScreenDashboard()
        }
    }

    private fun loadCameraStream() {
        val mjpegUrl = intent.getStringExtra("EXTRA_MJPEG_URL") ?: "/api/mjpeg/$cameraId"
        val fullStreamUrl = if (mjpegUrl.startsWith("http")) mjpegUrl else "${configRepo.httpBaseUrl}$mjpegUrl"

        webView.settings.apply {
            javaScriptEnabled = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        val htmlContent = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <style>
                    body { margin: 0; padding: 0; background-color: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                    img { width: 100%; height: 100%; object-fit: cover; }
                </style>
            </head>
            <body>
                <img src="$fullStreamUrl" alt="Live Feed" />
            </body>
            </html>
        """.trimIndent()

        webView.loadDataWithBaseURL(configRepo.httpBaseUrl, htmlContent, "text/html", "UTF-8", null)
    }

    private fun startCountdownTimer() {
        val durationSeconds = intent.getIntExtra("EXTRA_DURATION", configRepo.pipDurationSeconds)
        val totalMillis = durationSeconds * 1000L

        pipProgressBar.max = totalMillis.toInt()
        pipProgressBar.progress = totalMillis.toInt()

        countdownTimer = object : CountDownTimer(totalMillis, 100) {
            override fun onTick(millisUntilFinished: Long) {
                val secondsRemaining = (millisUntilFinished / 1000) + 1
                tvCountdown.text = "${secondsRemaining}s"
                pipProgressBar.progress = millisUntilFinished.toInt()
            }

            override fun onFinish() {
                if (!isFinishing) {
                    finish()
                }
            }
        }.start()
    }

    private fun openFullScreenDashboard() {
        val intent = Intent(this, TvMainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_FOCUS_CAMERA_ID", cameraId)
        }
        startActivity(intent)
        finish()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // When user clicks OK/Center on the TV remote while in PiP, expand to full dashboard
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER) {
            openFullScreenDashboard()
            return true
        } else if (keyCode == KeyEvent.KEYCODE_BACK) {
            finish()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        countdownTimer?.cancel()
        try {
            webView.destroy()
        } catch (e: Exception) {
            // Safe cleanup
        }
    }
}
