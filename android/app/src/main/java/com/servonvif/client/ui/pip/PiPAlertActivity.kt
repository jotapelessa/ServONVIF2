package com.servonvif.client.ui.pip

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Rational
import android.view.KeyEvent
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.TextView
import com.servonvif.client.R
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.ui.tv.TvMainActivity

class PiPAlertActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var tvTitle: TextView
    private val handler = Handler(Looper.getMainLooper())
    private var autoDismissRunnable: Runnable? = null
    private var cameraId: Int = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pip_alert)

        webView = findViewById(R.id.pipWebView)
        tvTitle = findViewById(R.id.tvCameraTitle)

        val configRepo = ServerConfigRepository(this)
        cameraId = intent.getIntExtra("EXTRA_CAMERA_ID", 1)
        val cameraName = intent.getStringExtra("EXTRA_CAMERA_NAME") ?: "Câmera de Segurança"
        val mjpegUrl = intent.getStringExtra("EXTRA_MJPEG_URL") ?: "/api/mjpeg/$cameraId"
        val durationSeconds = intent.getIntExtra("EXTRA_DURATION", configRepo.pipDurationSeconds)

        tvTitle.text = "🔴 $cameraName - Movimento Detectado"

        // Configure WebView for high-speed live stream
        webView.settings.apply {
            javaScriptEnabled = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        val fullStreamUrl = "${configRepo.httpBaseUrl}$mjpegUrl"
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

        // Automatically trigger 16:9 Picture-in-Picture mode on Android TV
        enterPiPMode()

        // Auto-dismiss after duration (e.g. 10s)
        autoDismissRunnable = Runnable {
            if (!isFinishing) {
                finish()
            }
        }
        handler.postDelayed(autoDismissRunnable!!, durationSeconds * 1000L)
    }

    private fun enterPiPMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
                .build()
            enterPictureInPictureMode(params)
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        // When user clicks OK/Center on the TV remote while in PiP, open full TV Dashboard
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER) {
            val intent = Intent(this, TvMainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("EXTRA_FOCUS_CAMERA_ID", cameraId)
            }
            startActivity(intent)
            finish()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        if (isInPictureInPictureMode) {
            tvTitle.visibility = View.GONE
        } else {
            tvTitle.visibility = View.VISIBLE
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        autoDismissRunnable?.let { handler.removeCallbacks(it) }
        webView.destroy()
    }
}
