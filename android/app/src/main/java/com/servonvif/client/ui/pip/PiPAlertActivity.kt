package com.servonvif.client.ui.pip

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.TextView
import com.servonvif.client.R

class PiPAlertActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var tvTitle: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pip_alert)

        webView = findViewById(R.id.pipWebView)
        tvTitle = findViewById(R.id.tvCameraTitle)

        val cameraName = intent.getStringExtra("EXTRA_CAMERA_NAME") ?: "Câmera"
        val mjpegUrl = intent.getStringExtra("EXTRA_MJPEG_URL") ?: ""

        tvTitle.text = cameraName

        // Configure WebView for low-latency MJPEG rendering
        webView.settings.apply {
            javaScriptEnabled = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        val htmlContent = """
            <html>
            <body style="margin:0;padding:0;background-color:black;display:flex;align-items:center;justify-content:center;height:100vh;">
                <img src="http://192.168.1.100:8080$mjpegUrl" style="width:100%;height:100%;object-fit:cover;" />
            </body>
            </html>
        """.trimIndent()

        webView.loadDataWithBaseURL("http://192.168.1.100:8080", htmlContent, "text/html", "UTF-8", null)

        // Instant PiP trigger
        enterPiPMode()
    }

    private fun enterPiPMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val params = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(16, 9))
                .build()
            enterPictureInPictureMode(params)
        }
    }

    override fun onPictureInPictureModeChanged(isInPictureInPictureMode: Boolean, newConfig: Configuration?) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        if (isInPictureInPictureMode) {
            tvTitle.visibility = View.GONE
        } else {
            tvTitle.visibility = View.VISIBLE
        }
    }
}
