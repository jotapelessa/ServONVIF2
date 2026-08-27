package com.servonvif.client.ui.tv

import android.Manifest
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
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.servonvif.client.R
import com.servonvif.client.data.model.CameraModel
import com.servonvif.client.data.repository.HardwareIdHelper
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.network.ServOnvifApiClient
import com.servonvif.client.service.MonitoringForegroundService
import com.servonvif.client.service.WebSocketManager
import com.servonvif.client.ui.pip.FloatingOverlayManager
import com.servonvif.client.ui.pip.PiPAlertActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.concurrent.thread

class TvMainActivity : AppCompatActivity() {

    private lateinit var configRepo: ServerConfigRepository
    private lateinit var apiClient: ServOnvifApiClient

    // Sidebar Navigation
    private lateinit var btnNavHome: Button
    private lateinit var btnNavMosaic: Button
    private lateinit var btnNavEvents: Button
    private lateinit var btnNavTests: Button
    private lateinit var btnNavSettings: Button
    private lateinit var tvTvClock: TextView
    private lateinit var tvTvServerStatusPill: TextView

    // Hero Spotlight Views
    private lateinit var webHeroStream: WebView
    private lateinit var tvHeroTitle: TextView
    private lateinit var tvHeroSubtitle: TextView
    private lateinit var tvHeroMeta: TextView
    private lateinit var btnHeroFullscreen: Button
    private lateinit var btnHeroPip: Button
    private lateinit var btnHeroPatrol: Button

    // Horizontal Discovery Rows
    private lateinit var recyclerCamerasRow: RecyclerView
    private lateinit var recyclerEventsRow: RecyclerView
    private lateinit var cameraRowAdapter: CameraRowAdapter
    private lateinit var eventRowAdapter: EventRowAdapter

    // State & Timers
    private val mainHandler = Handler(Looper.getMainLooper())
    private val clockHandler = Handler(Looper.getMainLooper())
    private val patrolHandler = Handler(Looper.getMainLooper())
    private var activeCameras = listOf<CameraModel>()
    private var selectedHeroCamera: CameraModel? = null
    private var isPatrolRunning = false
    private var currentPatrolIndex = 0
    private var liveWsManager: WebSocketManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_dashboard)

        configRepo = ServerConfigRepository(this)
        apiClient = ServOnvifApiClient(configRepo)

        initViews()
        setupSidebar()
        setupHeroControls()
        setupRecyclerViews()
        setupHeroWebView()
        requestNotificationPermission()
        ensureForegroundServiceRunning()
        startLiveWebSocketListener()
        startClockTicker()

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
        btnNavHome = findViewById(R.id.btnNavHome)
        btnNavMosaic = findViewById(R.id.btnNavMosaic)
        btnNavEvents = findViewById(R.id.btnNavEvents)
        btnNavTests = findViewById(R.id.btnNavTests)
        btnNavSettings = findViewById(R.id.btnNavSettings)
        tvTvClock = findViewById(R.id.tvTvClock)
        tvTvServerStatusPill = findViewById(R.id.tvTvServerStatusPill)

        webHeroStream = findViewById(R.id.webHeroStream)
        tvHeroTitle = findViewById(R.id.tvHeroTitle)
        tvHeroSubtitle = findViewById(R.id.tvHeroSubtitle)
        tvHeroMeta = findViewById(R.id.tvHeroMeta)
        btnHeroFullscreen = findViewById(R.id.btnHeroFullscreen)
        btnHeroPip = findViewById(R.id.btnHeroPip)
        btnHeroPatrol = findViewById(R.id.btnHeroPatrol)

        recyclerCamerasRow = findViewById(R.id.recyclerCamerasRow)
        recyclerEventsRow = findViewById(R.id.recyclerEventsRow)
    }

    private fun setupSidebar() {
        btnNavHome.setOnClickListener {
            // Scroll to top / home
            findViewById<View>(R.id.mainScrollView)?.scrollTo(0, 0)
            btnHeroFullscreen.requestFocus()
        }

        btnNavMosaic.setOnClickListener {
            Toast.makeText(this, "Modo Mosaico Ativado", Toast.LENGTH_SHORT).show()
        }

        btnNavEvents.setOnClickListener {
            recyclerEventsRow.requestFocus()
        }

        btnNavTests.setOnClickListener {
            showDiagnosticDialog()
        }

        btnNavSettings.setOnClickListener {
            startActivity(Intent(this, TvSettingsActivity::class.java))
        }
    }

    private fun setupHeroControls() {
        btnHeroFullscreen.setOnClickListener {
            val cam = selectedHeroCamera ?: activeCameras.firstOrNull()
            if (cam != null) {
                val intent = Intent(this, TvPlayerActivity::class.java).apply {
                    putExtra("CAMERA_ID", cam.id)
                    putExtra("CAMERA_NAME", cam.name)
                    putExtra("CAMERA_URL", cam.rtspUrl)
                }
                startActivity(intent)
            } else {
                Toast.makeText(this, "Nenhuma câmera selecionada", Toast.LENGTH_SHORT).show()
            }
        }

        btnHeroPip.setOnClickListener {
            val cam = selectedHeroCamera ?: activeCameras.firstOrNull()
            if (cam != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                    val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
                    startActivity(intent)
                    Toast.makeText(this, "Conceda permissão de Sobreposição de Tela", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                }
                FloatingOverlayManager.showOverlay(
                    this,
                    "Alerta de Segurança (Spotlight)",
                    "Monitorando ${cam.name} em modo PiP",
                    cam.rtspUrl
                )
                Toast.makeText(this, "Modo PiP Ativado para ${cam.name}", Toast.LENGTH_SHORT).show()
            }
        }

        btnHeroPatrol.setOnClickListener {
            togglePatrol()
        }
    }

    private fun setupRecyclerViews() {
        // Horizontal Cameras Row
        recyclerCamerasRow.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        cameraRowAdapter = CameraRowAdapter(
            cameras = activeCameras,
            onCameraFocused = { camera ->
                updateHeroSpotlight(camera)
            },
            onCameraClicked = { camera ->
                val intent = Intent(this, TvPlayerActivity::class.java).apply {
                    putExtra("CAMERA_ID", camera.id)
                    putExtra("CAMERA_NAME", camera.name)
                    putExtra("CAMERA_URL", camera.rtspUrl)
                }
                startActivity(intent)
            }
        )
        recyclerCamerasRow.adapter = cameraRowAdapter

        // Horizontal Events Row
        recyclerEventsRow.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        val initialEvents = listOf(
            TvEventItem("1", "Veículo Detectado • Placa BRA2E19", "Há 2 min", "LPR / PLACA"),
            TvEventItem("2", "Movimento • Portão Principal", "Há 12 min", "MOVIMENTO"),
            TvEventItem("3", "Sensor 5MP Ativado • Entrada", "Há 25 min", "SENSOR 5MP"),
            TvEventItem("4", "Pessoa Detectada • Calçada", "Há 40 min", "IA DETECÇÃO")
        )
        eventRowAdapter = EventRowAdapter(initialEvents) { event ->
            Toast.makeText(this, "Evento: ${event.title}", Toast.LENGTH_SHORT).show()
        }
        recyclerEventsRow.adapter = eventRowAdapter
    }

    private fun setupHeroWebView() {
        webHeroStream.apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.cacheMode = WebSettings.LOAD_NO_CACHE
            webChromeClient = WebChromeClient()
            webViewClient = WebViewClient()
            setBackgroundColor(0xFF0A101D.toInt())
        }
    }

    private fun updateHeroSpotlight(camera: CameraModel) {
        selectedHeroCamera = camera
        tvHeroTitle.text = camera.name
        val resText = if (camera.width > 0) "${camera.width}x${camera.height}" else "2880x1620 (5MP)"
        val fpsText = "${camera.fps.takeIf { it > 0 } ?: 25} FPS"
        tvHeroMeta.text = "Sensor 5MP Ultra-HD • $resText • $fpsText • ONVIF RTSP"
        tvHeroSubtitle.text = "IP: ${configRepo.serverIp} • ONVIF Profile 000 • Transmissão Contínua Estável"

        // Carregar visualização WebRTC / MJPEG / HLS no Hero
        val streamUrl = "http://${configRepo.serverIp}:${configRepo.serverPort}/stream/cam_${camera.id}.mjpg"
        val htmlContent = """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { margin: 0; padding: 0; background: #080C14; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100vh; }
                    img { width: 100%; height: 100%; object-fit: cover; }
                </style>
            </head>
            <body>
                <img src="$streamUrl" onerror="this.src='about:blank';" />
            </body>
            </html>
        """.trimIndent()
        webHeroStream.loadDataWithBaseURL("http://${configRepo.serverIp}:${configRepo.serverPort}", htmlContent, "text/html", "UTF-8", null)
    }

    private fun togglePatrol() {
        isPatrolRunning = !isPatrolRunning
        if (isPatrolRunning) {
            btnHeroPatrol.text = "⏹ Parar Patrulha"
            btnHeroPatrol.setBackgroundResource(R.drawable.btn_tv_action_blue_selector)
            Toast.makeText(this, "Patrulha Automática Iniciada (10s por câmera)", Toast.LENGTH_SHORT).show()
            runPatrolLoop()
        } else {
            btnHeroPatrol.text = "🔄 Patrulha Auto"
            btnHeroPatrol.setBackgroundResource(R.drawable.bg_tv_hero_btn_secondary_selector)
            patrolHandler.removeCallbacksAndMessages(null)
            Toast.makeText(this, "Patrulha Pausada", Toast.LENGTH_SHORT).show()
        }
    }

    private fun runPatrolLoop() {
        if (!isPatrolRunning || activeCameras.isEmpty()) return
        currentPatrolIndex = (currentPatrolIndex + 1) % activeCameras.size
        val nextCam = activeCameras[currentPatrolIndex]
        updateHeroSpotlight(nextCam)
        recyclerCamerasRow.smoothScrollToPosition(currentPatrolIndex)

        patrolHandler.postDelayed({
            runPatrolLoop()
        }, 10000) // 10 segundos por câmera
    }

    private fun refreshServerData() {
        thread {
            try {
                val pingOk = apiClient.pingServer()
                val cameras = apiClient.fetchCameras()
                mainHandler.post {
                    if (pingOk) {
                        tvTvServerStatusPill.text = "● Servidor Online (${cameras.size} Câmeras)"
                        tvTvServerStatusPill.setTextColor(0xFF10B981.toInt())
                    } else {
                        tvTvServerStatusPill.text = "● Servidor Offline"
                        tvTvServerStatusPill.setTextColor(0xFFEF4444.toInt())
                    }

                    if (cameras.isNotEmpty()) {
                        activeCameras = cameras
                        cameraRowAdapter.updateCameras(cameras)
                        if (selectedHeroCamera == null) {
                            updateHeroSpotlight(cameras.first())
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e("TvMainActivity", "Erro ao carregar dados do servidor: ${e.message}")
            }
        }
    }

    private fun showDiagnosticDialog() {
        val msg = """
            📡 Servidor: ${configRepo.serverIp}:${configRepo.serverPort}
            🎥 Câmeras Ativas: ${activeCameras.size}
            🛡️ Hardware ID: ${HardwareIdHelper.getHardwareId(this)}
            🌐 WebSocket: Conectado
            📺 Resolução TV: 1920x1080 (Safe Area Ativa)
        """.trimIndent()

        AlertDialog.Builder(this)
            .setTitle("🧪 Diagnóstico do Sistema")
            .setMessage(msg)
            .setPositiveButton("OK", null)
            .setNeutralButton("Testar Alerta PiP") { _, _ ->
                FloatingOverlayManager.showOverlay(this, "Teste de Segurança", "Detecção de Movimento Teste", "")
            }
            .show()
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
            Log.e("TvMainActivity", "Erro ao iniciar foreground service: ${e.message}")
        }
    }

    private fun startLiveWebSocketListener() {
        liveWsManager = WebSocketManager(configRepo).apply {
            setOnEventReceivedListener { event ->
                mainHandler.post {
                    event.cameraId?.let { camId ->
                        cameraRowAdapter.setMotion(camId, true)
                        mainHandler.postDelayed({
                            cameraRowAdapter.setMotion(camId, false)
                        }, 5000)
                    }
                }
            }
            connect()
        }
    }

    private fun startClockTicker() {
        val ticker = object : Runnable {
            override fun run() {
                val sdf = SimpleDateFormat("HH:mm", Locale.getDefault())
                tvTvClock.text = sdf.format(Date())
                clockHandler.postDelayed(this, 1000)
            }
        }
        clockHandler.post(ticker)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            AlertDialog.Builder(this)
                .setTitle("Sair do ServONVIF TV?")
                .setMessage("O monitoramento em segundo plano e os alertas PiP continuarão ativos.")
                .setPositiveButton("Sair") { _, _ -> finish() }
                .setNegativeButton("Cancelar", null)
                .show()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        patrolHandler.removeCallbacksAndMessages(null)
        clockHandler.removeCallbacksAndMessages(null)
        liveWsManager?.disconnect()
    }
}
