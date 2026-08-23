package com.servonvif.client.ui.tv

import android.Manifest
import android.app.Activity
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
import android.util.Log
import android.view.KeyEvent
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.TextView
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.servonvif.client.R
import com.servonvif.client.data.model.CameraModel
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.network.ServOnvifApiClient
import com.servonvif.client.service.MonitoringForegroundService
import com.servonvif.client.ui.pip.PiPAlertActivity
import kotlin.concurrent.thread

class TvMainActivity : Activity() {

    private lateinit var configRepo: ServerConfigRepository
    private lateinit var apiClient: ServOnvifApiClient

    // Navigation Buttons
    private lateinit var btnNavCameras: Button
    private lateinit var btnNavStatus: Button
    private lateinit var btnNavTests: Button
    private lateinit var btnNavSettings: Button

    // Content Sections
    private lateinit var sectionCameras: View
    private lateinit var sectionStatus: View
    private lateinit var sectionTests: View
    private lateinit var tvMainWebView: WebView

    // Status Cards Views
    private lateinit var tvCardServerStatus: TextView
    private lateinit var tvCardServerIp: TextView
    private lateinit var tvCardWsStatus: TextView
    private lateinit var tvCardEventCount: TextView
    private lateinit var tvCardCameraCount: TextView
    private lateinit var tvCardCameraNames: TextView
    private lateinit var tvCardLastEvent: TextView

    // Test Lab Views
    private lateinit var btnTestPiPAlert: Button
    private lateinit var btnTestSoundChime: Button
    private lateinit var btnTestServerPing: Button
    private lateinit var btnTestSyncCameras: Button
    private lateinit var btnTestHeadsUpNotification: Button
    private lateinit var tvTestConsoleOutput: TextView

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_dashboard)

        configRepo = ServerConfigRepository(this)
        apiClient = ServOnvifApiClient(configRepo)

        initViews()
        setupNavigation()
        setupWebView()
        setupTestLab()
        requestNotificationPermission()
        ensureForegroundServiceRunning()

        // Initial Data Fetch
        refreshServerData()
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 101)
            }
        }
    }

    private fun initViews() {
        btnNavCameras = findViewById(R.id.btnNavCameras)
        btnNavStatus = findViewById(R.id.btnNavStatus)
        btnNavTests = findViewById(R.id.btnNavTests)
        btnNavSettings = findViewById(R.id.btnNavSettings)

        sectionCameras = findViewById(R.id.sectionCameras)
        sectionStatus = findViewById(R.id.sectionStatus)
        sectionTests = findViewById(R.id.sectionTests)
        tvMainWebView = findViewById(R.id.tvMainWebView)

        tvCardServerStatus = findViewById(R.id.tvCardServerStatus)
        tvCardServerIp = findViewById(R.id.tvCardServerIp)
        tvCardWsStatus = findViewById(R.id.tvCardWsStatus)
        tvCardEventCount = findViewById(R.id.tvCardEventCount)
        tvCardCameraCount = findViewById(R.id.tvCardCameraCount)
        tvCardCameraNames = findViewById(R.id.tvCardCameraNames)
        tvCardLastEvent = findViewById(R.id.tvCardLastEvent)

        btnTestPiPAlert = findViewById(R.id.btnTestPiPAlert)
        btnTestSoundChime = findViewById(R.id.btnTestSoundChime)
        btnTestServerPing = findViewById(R.id.btnTestServerPing)
        btnTestSyncCameras = findViewById(R.id.btnTestSyncCameras)
        btnTestHeadsUpNotification = findViewById(R.id.btnTestHeadsUpNotification)
        tvTestConsoleOutput = findViewById(R.id.tvTestConsoleOutput)

        tvCardServerIp.text = "${configRepo.serverIp}:${configRepo.serverPort}"
    }

    private fun setupNavigation() {
        btnNavCameras.setOnClickListener { switchSection(1) }
        btnNavStatus.setOnClickListener {
            switchSection(2)
            refreshServerData()
        }
        btnNavTests.setOnClickListener { switchSection(3) }
        btnNavSettings.setOnClickListener {
            startActivity(Intent(this, TvSettingsActivity::class.java))
        }
    }

    private fun switchSection(sectionId: Int) {
        sectionCameras.visibility = if (sectionId == 1) View.VISIBLE else View.GONE
        sectionStatus.visibility = if (sectionId == 2) View.VISIBLE else View.GONE
        sectionTests.visibility = if (sectionId == 3) View.VISIBLE else View.GONE

        // Update Nav button background tints
        btnNavCameras.setBackgroundColor(ContextCompat.getColor(this, if (sectionId == 1) R.color.blue_primary else R.color.card_bg))
        btnNavStatus.setBackgroundColor(ContextCompat.getColor(this, if (sectionId == 2) R.color.blue_primary else R.color.card_bg))
        btnNavTests.setBackgroundColor(ContextCompat.getColor(this, if (sectionId == 3) R.color.blue_primary else R.color.card_bg))
    }

    private fun setupWebView() {
        tvMainWebView.settings.apply {
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

        tvMainWebView.webChromeClient = WebChromeClient()
        tvMainWebView.webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView?, errorCode: Int, description: String?, failingUrl: String?) {
                tvCardServerStatus.text = "🔴 Desconectado"
                tvCardServerStatus.setTextColor(ContextCompat.getColor(this@TvMainActivity, R.color.red_alert))
            }
        }

        loadDashboardWebView()
    }

    private fun loadDashboardWebView() {
        try {
            tvMainWebView.loadUrl(configRepo.httpBaseUrl)
        } catch (e: Exception) {
            Log.e("TvMainActivity", "WebView load error: ${e.message}")
        }
    }

    private fun refreshServerData() {
        tvCardServerIp.text = "${configRepo.serverIp}:${configRepo.serverPort}"
        thread {
            try {
                val isOnline = apiClient.testConnection()
                val cameras: List<CameraModel> = if (isOnline) apiClient.fetchCameras() else emptyList()

                mainHandler.post {
                    if (isOnline) {
                        tvCardServerStatus.text = "🟢 Online"
                        tvCardServerStatus.setTextColor(ContextCompat.getColor(this, R.color.green_online))
                        tvCardWsStatus.text = "🟢 Ativo e Escutando"
                        tvCardWsStatus.setTextColor(ContextCompat.getColor(this, R.color.green_online))
                        tvCardCameraCount.text = "${cameras.size} Câmeras"
                        tvCardCameraNames.text = if (cameras.isNotEmpty()) {
                            cameras.joinToString(", ") { it.name }
                        } else {
                            "Nenhuma câmera cadastrada"
                        }
                    } else {
                        tvCardServerStatus.text = "🔴 Desconectado"
                        tvCardServerStatus.setTextColor(ContextCompat.getColor(this, R.color.red_alert))
                        tvCardWsStatus.text = "⚠️ Reconectando..."
                        tvCardWsStatus.setTextColor(ContextCompat.getColor(this, R.color.yellow_warning))
                        tvCardCameraCount.text = "--"
                        tvCardCameraNames.text = "Servidor inacessível em ${configRepo.serverIp}"
                    }
                }
            } catch (e: Exception) {
                Log.e("TvMainActivity", "Data refresh error: ${e.message}")
            }
        }
    }

    private fun setupTestLab() {
        btnTestPiPAlert.setOnClickListener {
            logTest("🧪 Disparando Janela Picture-in-Picture (PiP) de Teste por 10s...")
            try {
                val intent = Intent(this, PiPAlertActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("EXTRA_CAMERA_ID", 1)
                    putExtra("EXTRA_CAMERA_NAME", "Câmera de Teste (Portão)")
                    putExtra("EXTRA_MJPEG_URL", "/api/mjpeg/1")
                    putExtra("EXTRA_SCORE", 0.95)
                    putExtra("EXTRA_DURATION", 10)
                }
                startActivity(intent)
                logTest("✅ Janela PiP aberta com sucesso! Se você vir o vídeo flutuante, o dispositivo está 100% pronto.")
            } catch (e: Exception) {
                logTest("❌ Falha ao abrir PiP: ${e.message}")
            }
        }

        btnTestSoundChime.setOnClickListener {
            logTest("🔔 Testando aviso sonoro (Chime) no alto-falante...")
            try {
                val notificationUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val ringtone = RingtoneManager.getRingtone(applicationContext, notificationUri)
                ringtone?.play()
                logTest("✅ Som reproduzido com sucesso!")
            } catch (e: Exception) {
                logTest("❌ Erro ao reproduzir som: ${e.message}")
            }
        }

        btnTestServerPing.setOnClickListener {
            val startTime = System.currentTimeMillis()
            logTest("📡 Enviando ping HTTP para http://${configRepo.serverIp}:${configRepo.serverPort}...")
            thread {
                try {
                    val isSuccess = apiClient.testConnection()
                    val latency = System.currentTimeMillis() - startTime
                    mainHandler.post {
                        if (isSuccess) {
                            logTest("✅ Servidor respondeu em ${latency}ms! Comunicação de rede perfeita.")
                        } else {
                            logTest("❌ Falha de comunicação! Verifique se o Mac está ligado e no mesmo Wi-Fi.")
                        }
                        refreshServerData()
                    }
                } catch (e: Exception) {
                    mainHandler.post {
                        logTest("❌ Exceção de rede: ${e.message}")
                    }
                }
            }
        }

        btnTestSyncCameras.setOnClickListener {
            logTest("🔄 Sincronizando lista de câmeras com o servidor Mac...")
            thread {
                try {
                    val cameras: List<CameraModel> = apiClient.fetchCameras()
                    mainHandler.post {
                        if (cameras.isNotEmpty()) {
                            logTest("✅ ${cameras.size} câmeras sincronizadas: ${cameras.joinToString { it.name }}")
                        } else {
                            logTest("⚠️ Nenhuma câmera retornada ou servidor desconectado.")
                        }
                        loadDashboardWebView()
                        refreshServerData()
                    }
                } catch (e: Exception) {
                    mainHandler.post {
                        logTest("❌ Erro de sincronização: ${e.message}")
                    }
                }
            }
        }

        btnTestHeadsUpNotification.setOnClickListener {
            logTest("🚨 Disparando notificação prioritária Heads-Up no sistema...")
            try {
                val alertIntent = Intent(this, PiPAlertActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("EXTRA_CAMERA_NAME", "Alarme Teste")
                }
                val pendingIntent = PendingIntent.getActivity(
                    this,
                    9999,
                    alertIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val notification = NotificationCompat.Builder(this, MonitoringForegroundService.ALERT_CHANNEL_ID)
                    .setSmallIcon(R.drawable.app_icon)
                    .setContentTitle("🔴 Alarme Teste de Movimento")
                    .setContentText("Disparo forçado de teste")
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setFullScreenIntent(pendingIntent, true)
                    .setAutoCancel(true)
                    .build()

                notificationManager.notify(9999, notification)
                logTest("✅ Notificação Heads-Up enviada com sucesso!")
            } catch (e: Exception) {
                logTest("❌ Erro ao enviar notificação: ${e.message}")
            }
        }
    }

    private fun logTest(message: String) {
        val current = tvTestConsoleOutput.text.toString()
        tvTestConsoleOutput.text = "• $message\n$current"
    }

    private fun ensureForegroundServiceRunning() {
        try {
            val serviceIntent = Intent(this, MonitoringForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e("TvMainActivity", "Safe startForegroundService fallback: ${e.message}")
        }
    }

    override fun onResume() {
        super.onResume()
        refreshServerData()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_SETTINGS -> {
                startActivity(Intent(this, TvSettingsActivity::class.java))
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                if (sectionCameras.visibility == View.VISIBLE && tvMainWebView.canGoBack()) {
                    tvMainWebView.goBack()
                    return true
                }
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            tvMainWebView.destroy()
        } catch (e: Exception) {
            // Safe cleanup
        }
    }
}
