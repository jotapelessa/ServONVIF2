package com.servonvif.client.ui.tv

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.TextView
import android.widget.Toast
import com.servonvif.client.R
import com.servonvif.client.data.repository.ServerConfigRepository

class TvPlayerActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var tvCameraInfo: TextView
    private lateinit var configRepo: ServerConfigRepository
    private var cameraId: Int = 1
    private var cameraName: String = "Câmera ao Vivo"
    private val hideOsdHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_player)

        configRepo = ServerConfigRepository(this)
        webView = findViewById(R.id.playerWebView)
        tvCameraInfo = findViewById(R.id.tvPlayerCameraInfo)

        cameraId = intent.getIntExtra("EXTRA_CAMERA_ID", 1)
        cameraName = intent.getStringExtra("EXTRA_CAMERA_NAME") ?: "Câmera ao Vivo"

        setupPlayer()
        loadCameraStream(cameraId, cameraName)
    }

    private fun setupPlayer() {
        webView.settings.apply {
            javaScriptEnabled = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            useWideViewPort = true
            loadWithOverviewMode = true
        }
    }

    private fun loadCameraStream(id: Int, name: String) {
        cameraId = id
        cameraName = name
        tvCameraInfo.text = "🔴 $name • 1080p Live Stream (Use ▲ ▼ no controle para trocar de câmera)"
        tvCameraInfo.visibility = View.VISIBLE

        val streamUrl = "${configRepo.httpBaseUrl}/api/mjpeg/$id"
        val htmlContent = """
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background-color:#000;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;">
                <img src="$streamUrl" style="width:100%;height:100%;object-fit:contain;" />
            </body>
            </html>
        """.trimIndent()

        webView.loadDataWithBaseURL(configRepo.httpBaseUrl, htmlContent, "text/html", "UTF-8", null)

        hideOsdHandler.removeCallbacksAndMessages(null)
        hideOsdHandler.postDelayed({
            tvCameraInfo.visibility = View.GONE
        }, 5000)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_DPAD_UP, KeyEvent.KEYCODE_CHANNEL_UP -> {
                val nextId = if (cameraId > 1) cameraId - 1 else 4
                loadCameraStream(nextId, "Câmera $nextId")
                return true
            }
            KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_CHANNEL_DOWN -> {
                val nextId = cameraId + 1
                loadCameraStream(nextId, "Câmera $nextId")
                return true
            }
            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER -> {
                tvCameraInfo.visibility = if (tvCameraInfo.visibility == View.VISIBLE) View.GONE else View.VISIBLE
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                finish()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        hideOsdHandler.removeCallbacksAndMessages(null)
        webView.destroy()
    }
}
