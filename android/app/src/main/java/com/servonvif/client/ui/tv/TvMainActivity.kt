package com.servonvif.client.ui.tv

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import com.servonvif.client.R
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.service.MonitoringForegroundService

class TvMainActivity : Activity() {

    private lateinit var tvWebView: WebView
    private lateinit var tvServerStatus: TextView
    private lateinit var configRepo: ServerConfigRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_main)

        configRepo = ServerConfigRepository(this)
        tvWebView = findViewById(R.id.tvWebView)
        tvServerStatus = findViewById(R.id.tvServerStatus)

        setupWebView()
        loadDashboard()
        ensureForegroundServiceRunning()
    }

    private fun setupWebView() {
        tvWebView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            allowContentAccess = true
            allowFileAccess = true
        }

        tvWebView.webChromeClient = WebChromeClient()
        tvWebView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                tvServerStatus.text = "ServONVIF TV • Conectado a ${configRepo.serverIp} (Pressione MENU para Configurar)"
                tvServerStatus.visibility = View.VISIBLE
            }

            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                tvServerStatus.text = "⚠️ Falha ao conectar em ${configRepo.serverIp}. Pressione MENU para alterar IP."
                tvServerStatus.visibility = View.VISIBLE
            }
        }
    }

    private fun loadDashboard() {
        val targetUrl = configRepo.httpBaseUrl
        tvServerStatus.text = "Conectando ao ServONVIF em $targetUrl..."
        tvWebView.loadUrl(targetUrl)
    }

    private fun ensureForegroundServiceRunning() {
        val serviceIntent = Intent(this, MonitoringForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_SETTINGS -> {
                showServerConfigDialog()
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                if (tvWebView.canGoBack()) {
                    tvWebView.goBack()
                    return true
                }
            }
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> {
                loadDashboard()
                Toast.makeText(this, "Atualizando Mosaico de Câmeras...", Toast.LENGTH_SHORT).show()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun showServerConfigDialog() {
        val input = EditText(this).apply {
            setText(configRepo.serverIp)
            hint = "Ex: 192.168.1.96"
            setPadding(32, 24, 32, 24)
        }

        AlertDialog.Builder(this)
            .setTitle("⚙️ Configurar Servidor ServONVIF")
            .setMessage("Digite o IP do computador onde o ServONVIF está rodando:")
            .setView(input)
            .setPositiveButton("Salvar e Reconectar") { _, _ ->
                val newIp = input.text.toString().trim()
                if (newIp.isNotEmpty()) {
                    configRepo.serverIp = newIp
                    loadDashboard()
                    ensureForegroundServiceRunning()
                    Toast.makeText(this, "IP salvo: $newIp", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    override fun onDestroy() {
        super.onDestroy()
        tvWebView.destroy()
    }
}
