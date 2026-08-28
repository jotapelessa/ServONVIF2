package com.servonvif.client.ui.tv

import android.Manifest
import android.app.AlertDialog
import android.app.NotificationChannel
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
import android.view.Gravity
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
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
import com.servonvif.client.data.model.EventPayload
import com.servonvif.client.data.repository.HardwareIdHelper
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.network.ServOnvifApiClient
import com.servonvif.client.service.MonitoringForegroundService
import com.servonvif.client.service.WebSocketManager
import com.servonvif.client.ui.pip.FloatingOverlayManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.concurrent.thread

class TvMainActivity : AppCompatActivity() {

    private lateinit var configRepo: ServerConfigRepository
    private lateinit var apiClient: ServOnvifApiClient
    private var floatingOverlayManager: FloatingOverlayManager? = null

    // Sidebar
    private lateinit var btnNavHome: Button
    private lateinit var btnNavMosaic: Button
    private lateinit var btnNavTests: Button
    private lateinit var btnNavStatus: Button
    private lateinit var btnNavSettings: Button
    private lateinit var tvTvClock: TextView
    private lateinit var tvTvServerStatusPill: TextView

    // Sections
    private lateinit var sectionStreaming: View
    private lateinit var sectionMosaic: View
    private lateinit var sectionTests: View
    private lateinit var sectionStatus: View

    // Hero Section
    private lateinit var webHeroStream: WebView
    private lateinit var tvHeroTitle: TextView
    private lateinit var tvHeroSubtitle: TextView
    private lateinit var tvHeroMeta: TextView
    private lateinit var btnHeroFullscreen: Button
    private lateinit var btnHeroPip: Button
    private lateinit var btnHeroPatrol: Button

    // Rows & Empty States
    private lateinit var recyclerCamerasRow: RecyclerView
    private lateinit var recyclerEventsRow: RecyclerView
    private lateinit var layoutEmptyState: View
    private lateinit var btnEmptyRetry: Button
    private lateinit var layoutCamerasRowContainer: View
    private lateinit var cameraRowAdapter: CameraRowAdapter
    private lateinit var eventRowAdapter: EventRowAdapter

    // Mosaic Section Controls
    private lateinit var btnMosaicLayout: Button
    private lateinit var btnMosaicPatrol: Button
    private lateinit var btnMosaicFit: Button
    private lateinit var btnMosaicOsd: Button
    private lateinit var btnMosaicReload: Button
    private lateinit var mosaicGridContainer: FrameLayout
    private lateinit var mosaicEmptyState: View
    private lateinit var btnEmptySync: Button
    private val activeCellViews = mutableListOf<View>()

    // Test Lab Section Controls
    private lateinit var btnTestPiPAlert: Button
    private lateinit var btnTestSimulateMotion: Button
    private lateinit var btnTestSoundChime: Button
    private lateinit var btnTestAutoDiscoverServer: Button
    private lateinit var btnTestServerPing: Button
    private lateinit var btnTestSyncCameras: Button
    private lateinit var btnTestHeadsUpNotification: Button
    private lateinit var btnTestOverlayPermission: Button
    private lateinit var btnClearConsole: Button
    private lateinit var tvTestConsoleOutput: TextView

    // Status Section Views
    private lateinit var tvCardServerIp: TextView
    private lateinit var tvCardServerStatus: TextView
    private lateinit var tvCardWsStatus: TextView
    private lateinit var tvCardCameraCount: TextView
    private lateinit var tvCardCameraNames: TextView

    // State & Handlers
    private val mainHandler = Handler(Looper.getMainLooper())
    private val clockHandler = Handler(Looper.getMainLooper())
    private val patrolHandler = Handler(Looper.getMainLooper())
    private val mosaicPatrolHandler = Handler(Looper.getMainLooper())
    private val heroDebounceHandler = Handler(Looper.getMainLooper())
    private var pendingHeroCamera: CameraModel? = null

    private var activeCameras = listOf<CameraModel>()
    private var selectedHeroCamera: CameraModel? = null
    private var isHeroPatrolRunning = false
    private var isMosaicPatrolRunning = false
    private var currentHeroPatrolIndex = 0
    private var currentMosaicPatrolIndex = 0
    private var liveWsManager: WebSocketManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_dashboard)

        configRepo = ServerConfigRepository(this)
        apiClient = ServOnvifApiClient(configRepo)
        floatingOverlayManager = FloatingOverlayManager(this)

        initViews()
        setupSidebarNavigation()
        setupHeroControls()
        setupRecyclerViews()
        setupHeroWebView()
        setupMosaicControls()
        setupTestLab()
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
        btnNavHome     = findViewById(R.id.btnNavHome)
        btnNavMosaic   = findViewById(R.id.btnNavMosaic)
        btnNavTests    = findViewById(R.id.btnNavTests)
        btnNavStatus   = findViewById(R.id.btnNavStatus)
        btnNavSettings = findViewById(R.id.btnNavSettings)
        tvTvClock             = findViewById(R.id.tvTvClock)
        tvTvServerStatusPill  = findViewById(R.id.tvTvServerStatusPill)

        sectionStreaming = findViewById(R.id.sectionStreaming)
        sectionMosaic    = findViewById(R.id.sectionMosaic)
        sectionTests     = findViewById(R.id.sectionTests)
        sectionStatus    = findViewById(R.id.sectionStatus)

        webHeroStream   = findViewById(R.id.webHeroStream)
        tvHeroTitle     = findViewById(R.id.tvHeroTitle)
        tvHeroSubtitle  = findViewById(R.id.tvHeroSubtitle)
        tvHeroMeta      = findViewById(R.id.tvHeroMeta)
        btnHeroFullscreen = findViewById(R.id.btnHeroFullscreen)
        btnHeroPip        = findViewById(R.id.btnHeroPip)
        btnHeroPatrol     = findViewById(R.id.btnHeroPatrol)

        recyclerCamerasRow = findViewById(R.id.recyclerCamerasRow)
        recyclerEventsRow  = findViewById(R.id.recyclerEventsRow)
        layoutEmptyState   = findViewById(R.id.layoutEmptyState)
        btnEmptyRetry      = findViewById(R.id.btnEmptyRetry)
        layoutCamerasRowContainer = findViewById(R.id.layoutCamerasRowContainer)

        btnMosaicLayout   = findViewById(R.id.btnMosaicLayout)
        btnMosaicPatrol   = findViewById(R.id.btnMosaicPatrol)
        btnMosaicFit      = findViewById(R.id.btnMosaicFit)
        btnMosaicOsd      = findViewById(R.id.btnMosaicOsd)
        btnMosaicReload   = findViewById(R.id.btnMosaicReload)
        mosaicGridContainer = findViewById(R.id.mosaicGridContainer)
        mosaicEmptyState  = findViewById(R.id.mosaicEmptyState)
        btnEmptySync      = findViewById(R.id.btnEmptySync)

        btnTestPiPAlert          = findViewById(R.id.btnTestPiPAlert)
        btnTestSimulateMotion    = findViewById(R.id.btnTestSimulateMotion)
        btnTestSoundChime        = findViewById(R.id.btnTestSoundChime)
        btnTestAutoDiscoverServer = findViewById(R.id.btnTestAutoDiscoverServer)
        btnTestServerPing        = findViewById(R.id.btnTestServerPing)
        btnTestSyncCameras       = findViewById(R.id.btnTestSyncCameras)
        btnTestHeadsUpNotification = findViewById(R.id.btnTestHeadsUpNotification)
        btnTestOverlayPermission = findViewById(R.id.btnTestOverlayPermission)
        btnClearConsole          = findViewById(R.id.btnClearConsole)
        tvTestConsoleOutput      = findViewById(R.id.tvTestConsoleOutput)

        tvCardServerIp     = findViewById(R.id.tvCardServerIp)
        tvCardServerStatus = findViewById(R.id.tvCardServerStatus)
        tvCardWsStatus     = findViewById(R.id.tvCardWsStatus)
        tvCardCameraCount  = findViewById(R.id.tvCardCameraCount)
        tvCardCameraNames  = findViewById(R.id.tvCardCameraNames)

        btnEmptyRetry.setOnClickListener { refreshServerData() }
        btnEmptySync.setOnClickListener { refreshServerData() }
        updateMosaicToolbarLabels()
    }

    private fun setupSidebarNavigation() {
        btnNavHome.setOnClickListener { switchSection(1) }
        btnNavMosaic.setOnClickListener { switchSection(2) }
        btnNavTests.setOnClickListener { switchSection(3) }
        btnNavStatus.setOnClickListener { switchSection(4) }
        btnNavSettings.setOnClickListener {
            startActivity(Intent(this, TvSettingsActivity::class.java))
        }
    }

    private fun switchSection(sectionIndex: Int) {
        sectionStreaming.visibility = if (sectionIndex == 1) View.VISIBLE else View.GONE
        sectionMosaic.visibility    = if (sectionIndex == 2) View.VISIBLE else View.GONE
        sectionTests.visibility     = if (sectionIndex == 3) View.VISIBLE else View.GONE
        sectionStatus.visibility    = if (sectionIndex == 4) View.VISIBLE else View.GONE

        btnNavHome.setBackgroundResource(if (sectionIndex == 1) R.drawable.bg_tv_hero_btn_selector else R.drawable.bg_tv_hero_btn_secondary_selector)
        btnNavMosaic.setBackgroundResource(if (sectionIndex == 2) R.drawable.bg_tv_hero_btn_selector else R.drawable.bg_tv_hero_btn_secondary_selector)
        btnNavTests.setBackgroundResource(if (sectionIndex == 3) R.drawable.bg_tv_hero_btn_selector else R.drawable.bg_tv_hero_btn_secondary_selector)
        btnNavStatus.setBackgroundResource(if (sectionIndex == 4) R.drawable.bg_tv_hero_btn_selector else R.drawable.bg_tv_hero_btn_secondary_selector)

        if (sectionIndex == 2) {
            renderMosaicGrid()
        }
    }

    // =========================================================================
    // 🏠 STREAMING SECTION (HERO + FILEIRAS)
    // =========================================================================

    private fun setupHeroControls() {
        btnHeroFullscreen.setOnClickListener {
            val cam = selectedHeroCamera ?: activeCameras.firstOrNull()
            if (cam != null) {
                val intent = Intent(this, TvPlayerActivity::class.java).apply {
                    putExtra("EXTRA_CAMERA_ID", cam.id)
                    putExtra("EXTRA_CAMERA_NAME", cam.name)
                    putExtra("EXTRA_CAMERA_URL", cam.rtspUrl)
                }
                startActivity(intent)
            } else {
                Toast.makeText(this, "Nenhuma câmera disponível", Toast.LENGTH_SHORT).show()
            }
        }

        btnHeroPip.setOnClickListener {
            val cam = selectedHeroCamera ?: activeCameras.firstOrNull()
            if (cam != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                    startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
                    Toast.makeText(this, "Conceda permissão de Sobreposição de Tela", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                }
                val mjpegUrl = "${configRepo.httpBaseUrl}/api/mjpeg/${cam.id}"
                floatingOverlayManager?.showFloatingAlert(
                    cameraId = cam.id,
                    cameraName = cam.name,
                    mjpegUrl = mjpegUrl,
                    score = 0f,
                    durationSeconds = 15
                )
                Toast.makeText(this, "Modo PiP para ${cam.name}", Toast.LENGTH_SHORT).show()
            }
        }

        btnHeroPatrol.setOnClickListener { toggleHeroPatrol() }
    }

    private fun setupRecyclerViews() {
        recyclerCamerasRow.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        cameraRowAdapter = CameraRowAdapter(
            cameras = emptyList(),
            serverBaseUrl = configRepo.httpBaseUrl,
            onCameraFocused = { camera -> scheduleDebouncedHeroUpdate(camera) },
            onCameraClicked = { camera ->
                val intent = Intent(this, TvPlayerActivity::class.java).apply {
                    putExtra("EXTRA_CAMERA_ID", camera.id)
                    putExtra("EXTRA_CAMERA_NAME", camera.name)
                    putExtra("EXTRA_CAMERA_URL", camera.rtspUrl)
                }
                startActivity(intent)
            }
        )
        recyclerCamerasRow.adapter = cameraRowAdapter

        recyclerEventsRow.layoutManager = LinearLayoutManager(this, LinearLayoutManager.HORIZONTAL, false)
        val initialEvents = listOf(
            TvEventItem("1", "Veículo Detectado • Placa BRA2E19", "Há 2 min", "LPR / PLACA"),
            TvEventItem("2", "Movimento Detectado • Portão Principal", "Há 12 min", "MOVIMENTO"),
            TvEventItem("3", "Câmera 5MP ONVIF Ativada", "Há 25 min", "SENSOR 5MP"),
            TvEventItem("4", "Pessoa Detectada • Calçada", "Há 40 min", "IA DETECÇÃO")
        )
        eventRowAdapter = EventRowAdapter(initialEvents) { event ->
            Toast.makeText(this, "Evento: ${event.title}", Toast.LENGTH_SHORT).show()
        }
        recyclerEventsRow.adapter = eventRowAdapter
    }

    private fun setupHeroWebView() {
        webHeroStream.apply {
            settings.apply {
                javaScriptEnabled = false
                cacheMode = WebSettings.LOAD_NO_CACHE
                useWideViewPort = true
                loadWithOverviewMode = true
            }
            webChromeClient = WebChromeClient()
            webViewClient = WebViewClient()
            setBackgroundColor(0xFF0A101D.toInt())
        }
    }

    private fun scheduleDebouncedHeroUpdate(camera: CameraModel) {
        pendingHeroCamera = camera
        heroDebounceHandler.removeCallbacksAndMessages(null)
        heroDebounceHandler.postDelayed({
            pendingHeroCamera?.let { cam ->
                updateHeroSpotlight(cam)
            }
        }, 350)
    }

    private fun updateHeroSpotlight(camera: CameraModel) {
        selectedHeroCamera = camera
        tvHeroTitle.text = camera.name
        tvHeroMeta.text = "Sensor 5MP Ultra-HD • 2880x1620 • 25 FPS • ONVIF RTSP"
        tvHeroSubtitle.text = "IP: ${camera.ipAddress ?: configRepo.serverIp} • ONVIF Profile 000 • Transmissão Ativa"

        val streamUrl = "${configRepo.httpBaseUrl}/api/mjpeg/${camera.id}"
        val html = """<!DOCTYPE html><html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
            <style>body{margin:0;background:#080C14;overflow:hidden;display:flex;align-items:center;justify-content:center;height:100vh;}
            img{width:100%;height:100%;object-fit:cover;}</style></head>
            <body><img src="$streamUrl" onerror="this.src='about:blank';"/></body></html>""".trimIndent()
        webHeroStream.loadDataWithBaseURL(configRepo.httpBaseUrl, html, "text/html", "UTF-8", null)
    }

    private fun toggleHeroPatrol() {
        isHeroPatrolRunning = !isHeroPatrolRunning
        if (isHeroPatrolRunning) {
            btnHeroPatrol.text = "⏹ Parar Patrulha"
            Toast.makeText(this, "Patrulha Automática Iniciada (10s por câmera)", Toast.LENGTH_SHORT).show()
            runHeroPatrolLoop()
        } else {
            btnHeroPatrol.text = "🔄 Patrulha Auto"
            patrolHandler.removeCallbacksAndMessages(null)
            Toast.makeText(this, "Patrulha Pausada", Toast.LENGTH_SHORT).show()
        }
    }

    private fun runHeroPatrolLoop() {
        if (!isHeroPatrolRunning || activeCameras.isEmpty()) return
        currentHeroPatrolIndex = (currentHeroPatrolIndex + 1) % activeCameras.size
        updateHeroSpotlight(activeCameras[currentHeroPatrolIndex])
        recyclerCamerasRow.smoothScrollToPosition(currentHeroPatrolIndex)
        patrolHandler.postDelayed({ runHeroPatrolLoop() }, 10000)
    }

    // =========================================================================
    // 🪟 NATIVE MOSAIC GRID SECTION
    // =========================================================================

    private fun setupMosaicControls() {
        btnMosaicLayout.setOnClickListener { showMosaicLayoutDialog() }
        btnMosaicPatrol.setOnClickListener { showMosaicPatrolDialog() }
        btnMosaicFit.setOnClickListener {
            configRepo.mosaicFitMode = if (configRepo.mosaicFitMode == ServerConfigRepository.FIT_COVER) {
                ServerConfigRepository.FIT_CONTAIN
            } else {
                ServerConfigRepository.FIT_COVER
            }
            updateMosaicToolbarLabels()
            renderMosaicGrid()
        }
        btnMosaicOsd.setOnClickListener {
            configRepo.isMosaicOsdEnabled = !configRepo.isMosaicOsdEnabled
            updateMosaicToolbarLabels()
            renderMosaicGrid()
        }
        btnMosaicReload.setOnClickListener {
            renderMosaicGrid()
            Toast.makeText(this, "Mosaico recarregado", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateMosaicToolbarLabels() {
        val layoutName = when (configRepo.mosaicLayout) {
            ServerConfigRepository.LAYOUT_1X1 -> "1x1 Full"
            ServerConfigRepository.LAYOUT_1X2 -> "1x2 Dividido"
            ServerConfigRepository.LAYOUT_2X2 -> "2x2 Quad"
            ServerConfigRepository.LAYOUT_1_PLUS_3 -> "1+3 Destaque"
            ServerConfigRepository.LAYOUT_2X3 -> "2x3 Grade"
            ServerConfigRepository.LAYOUT_PATROL -> "🔄 Auto-Patrulha"
            else -> "2x2 Quad"
        }
        btnMosaicLayout.text = "🔲 Grade: $layoutName"
        btnMosaicPatrol.text = "⏱️ Patrulha: ${configRepo.mosaicPatrolIntervalSeconds}s"
        btnMosaicFit.text = if (configRepo.mosaicFitMode == ServerConfigRepository.FIT_COVER) "📐 Preencher" else "📐 Ajustar"
        btnMosaicOsd.text = if (configRepo.isMosaicOsdEnabled) "👁️ OSD: ON" else "👁️ OSD: OFF"
    }

    private fun showMosaicLayoutDialog() {
        val options = arrayOf("2x2 Quad (4 Câmeras)", "1+3 Destaque Principal", "1x1 Tela Cheia", "2x3 Grade (6 Câmeras)", "Auto-Patrulha")
        AlertDialog.Builder(this)
            .setTitle("Selecione o Formato da Grade")
            .setItems(options) { _, which ->
                configRepo.mosaicLayout = when (which) {
                    0 -> ServerConfigRepository.LAYOUT_2X2
                    1 -> ServerConfigRepository.LAYOUT_1_PLUS_3
                    2 -> ServerConfigRepository.LAYOUT_1X1
                    3 -> ServerConfigRepository.LAYOUT_2X3
                    4 -> ServerConfigRepository.LAYOUT_PATROL
                    else -> ServerConfigRepository.LAYOUT_2X2
                }
                updateMosaicToolbarLabels()
                renderMosaicGrid()
            }
            .show()
    }

    private fun showMosaicPatrolDialog() {
        val intervals = arrayOf("5 Segundos", "10 Segundos", "15 Segundos", "30 Segundos")
        AlertDialog.Builder(this)
            .setTitle("Intervalo de Troca da Patrulha")
            .setItems(intervals) { _, which ->
                configRepo.mosaicPatrolIntervalSeconds = when (which) {
                    0 -> 5
                    1 -> 10
                    2 -> 15
                    3 -> 30
                    else -> 10
                }
                updateMosaicToolbarLabels()
                if (configRepo.mosaicLayout == ServerConfigRepository.LAYOUT_PATROL) {
                    renderMosaicGrid()
                }
            }
            .show()
    }

    private fun renderMosaicGrid() {
        stopMosaicPatrol()
        mosaicGridContainer.removeAllViews()
        activeCellViews.clear()

        if (activeCameras.isEmpty()) {
            mosaicGridContainer.visibility = View.GONE
            mosaicEmptyState.visibility = View.VISIBLE
            return
        }

        mosaicEmptyState.visibility = View.GONE
        mosaicGridContainer.visibility = View.VISIBLE

        when (configRepo.mosaicLayout) {
            ServerConfigRepository.LAYOUT_1X1 -> render1x1Layout()
            ServerConfigRepository.LAYOUT_2X2 -> render2x2Layout()
            ServerConfigRepository.LAYOUT_1_PLUS_3 -> render1Plus3Layout()
            ServerConfigRepository.LAYOUT_2X3 -> render2x3Layout()
            ServerConfigRepository.LAYOUT_PATROL -> renderPatrolMosaicLayout()
            else -> render2x2Layout()
        }
    }

    private fun render1x1Layout() {
        val camera = activeCameras.firstOrNull() ?: return
        val cellView = createCameraCell(camera)
        mosaicGridContainer.addView(cellView, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
    }

    private fun render2x2Layout() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }

        val row1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f).apply {
                bottomMargin = dpToPx(8)
            }
        }
        val row2 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f)
        }

        val cam0 = activeCameras.getOrNull(0)
        val cam1 = activeCameras.getOrNull(1)
        val cam2 = activeCameras.getOrNull(2)
        val cam3 = activeCameras.getOrNull(3)

        if (cam0 != null) row1.addView(createCameraCell(cam0), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply { marginEnd = dpToPx(8) })
        if (cam1 != null) row1.addView(createCameraCell(cam1), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f))
        if (cam2 != null) row2.addView(createCameraCell(cam2), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply { marginEnd = dpToPx(8) })
        if (cam3 != null) row2.addView(createCameraCell(cam3), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f))

        root.addView(row1)
        root.addView(row2)
        mosaicGridContainer.addView(root)
    }

    private fun render1Plus3Layout() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }

        val mainCam = activeCameras.firstOrNull() ?: return
        root.addView(createCameraCell(mainCam), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 2.0f).apply { marginEnd = dpToPx(8) })

        val sideCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f)
        }

        for (i in 1..3) {
            val sideCam = activeCameras.getOrNull(i)
            if (sideCam != null) {
                sideCol.addView(createCameraCell(sideCam), LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f).apply {
                    if (i < 3) bottomMargin = dpToPx(6)
                })
            }
        }
        root.addView(sideCol)
        mosaicGridContainer.addView(root)
    }

    private fun render2x3Layout() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }

        val row1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f).apply { bottomMargin = dpToPx(6) }
        }
        val row2 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f)
        }

        for (i in 0..2) {
            val cam = activeCameras.getOrNull(i)
            if (cam != null) {
                row1.addView(createCameraCell(cam), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply {
                    if (i < 2) marginEnd = dpToPx(6)
                })
            }
        }
        for (i in 3..5) {
            val cam = activeCameras.getOrNull(i)
            if (cam != null) {
                row2.addView(createCameraCell(cam), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply {
                    if (i < 5) marginEnd = dpToPx(6)
                })
            }
        }

        root.addView(row1)
        root.addView(row2)
        mosaicGridContainer.addView(root)
    }

    private fun renderPatrolMosaicLayout() {
        isMosaicPatrolRunning = true
        runMosaicPatrolStep()
    }

    private fun runMosaicPatrolStep() {
        if (!isMosaicPatrolRunning || activeCameras.isEmpty()) return
        mosaicGridContainer.removeAllViews()
        activeCellViews.clear()

        val cam = activeCameras[currentMosaicPatrolIndex % activeCameras.size]
        mosaicGridContainer.addView(createCameraCell(cam), FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        currentMosaicPatrolIndex++

        val intervalMs = (configRepo.mosaicPatrolIntervalSeconds * 1000L).coerceAtLeast(4000L)
        mosaicPatrolHandler.postDelayed({ runMosaicPatrolStep() }, intervalMs)
    }

    private fun stopMosaicPatrol() {
        isMosaicPatrolRunning = false
        mosaicPatrolHandler.removeCallbacksAndMessages(null)
    }

    private fun createCameraCell(camera: CameraModel): View {
        val cellView = LayoutInflater.from(this).inflate(R.layout.item_mosaic_camera, null)
        cellView.tag = camera.id

        val cellWebView: WebView = cellView.findViewById(R.id.cellWebView)
        val tvCellName: TextView = cellView.findViewById(R.id.tvCellName)
        val tvCellInfo: TextView = cellView.findViewById(R.id.tvCellInfo)
        val layoutTopOsd: View   = cellView.findViewById(R.id.layoutTopOsd)
        val layoutBottomOsd: View = cellView.findViewById(R.id.layoutBottomOsd)
        val tvCellClock: TextView = cellView.findViewById(R.id.tvCellClock)

        tvCellName.text = camera.name
        tvCellInfo.text = "Sens: ${(camera.sensitivity * 100).toInt()}% • 5MP"
        tvCellClock.text = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())

        layoutTopOsd.visibility = if (configRepo.isMosaicOsdEnabled) View.VISIBLE else View.GONE
        layoutBottomOsd.visibility = if (configRepo.isMosaicOsdEnabled) View.VISIBLE else View.GONE

        cellWebView.settings.apply {
            javaScriptEnabled = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        val fitCss = if (configRepo.mosaicFitMode == ServerConfigRepository.FIT_COVER) "cover" else "contain"
        val streamUrl = "${configRepo.httpBaseUrl}/api/mjpeg/${camera.id}"
        val html = """<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"></head>
            <body style="margin:0;padding:0;background-color:#000;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;">
                <img src="$streamUrl" style="width:100%;height:100%;object-fit:$fitCss;display:block;" onerror="this.style.display='none'" />
            </body></html>""".trimIndent()
        cellWebView.loadDataWithBaseURL(configRepo.httpBaseUrl, html, "text/html", "UTF-8", null)

        cellView.isFocusable = true
        cellView.isClickable = true
        cellView.setOnFocusChangeListener { v, hasFocus ->
            val scale = if (hasFocus) 1.04f else 1.0f
            v.animate().scaleX(scale).scaleY(scale).setDuration(120).start()
        }

        cellView.setOnClickListener {
            val intent = Intent(this, TvPlayerActivity::class.java).apply {
                putExtra("EXTRA_CAMERA_ID", camera.id)
                putExtra("EXTRA_CAMERA_NAME", camera.name)
                putExtra("EXTRA_CAMERA_URL", camera.rtspUrl)
            }
            startActivity(intent)
        }

        activeCellViews.add(cellView)
        return cellView
    }

    // =========================================================================
    // 🧪 TEST LAB SECTION (COMPLETO & FUNCIONAL)
    // =========================================================================

    private fun setupTestLab() {
        btnTestPiPAlert.setOnClickListener {
            logTest("🗔 Disparando Janela Picture-in-Picture (PiP) de Teste por 10s...")
            try {
                floatingOverlayManager?.showFloatingAlert(
                    cameraId = 1,
                    cameraName = "Câmera de Teste",
                    mjpegUrl = "/api/mjpeg/1",
                    score = 0.95f,
                    durationSeconds = 10
                )
                logTest("✅ Janela PiP aberta com sucesso!")
            } catch (e: Exception) {
                logTest("❌ Falha ao abrir PiP: ${e.message}")
            }
        }

        btnTestSimulateMotion.setOnClickListener {
            logTest("🔴 Simulando Alerta de Movimento (Câmera 1)...")
            cameraRowAdapter.setMotion(1, true)
            mainHandler.postDelayed({ cameraRowAdapter.setMotion(1, false) }, 6000)
            logTest("✅ Badge de movimento disparado por 6s nas fileiras!")
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

        btnTestAutoDiscoverServer.setOnClickListener {
            logTest("🔍 Iniciando varredura na sub-rede para localizar o servidor ServONVIF...")
            apiClient.discoverServerOnNetwork(
                onServerFound = { ip ->
                    mainHandler.post {
                        logTest("🎉 Servidor ServONVIF ENCONTRADO no IP: $ip")
                        configRepo.serverIp = ip
                        refreshServerData()
                    }
                },
                onScanComplete = { found ->
                    mainHandler.post {
                        if (!found) logTest("⚠️ Varredura concluída. Nenhum outro servidor encontrado.")
                    }
                }
            )
        }

        btnTestServerPing.setOnClickListener {
            val startTime = System.currentTimeMillis()
            val hwId = HardwareIdHelper.getPersistentDeviceId(this)
            logTest("📡 Enviando ping com ID [$hwId] para http://${configRepo.serverIp}:${configRepo.serverPort}...")
            thread {
                try {
                    val isSuccess = apiClient.pingServer(this)
                    val latency = System.currentTimeMillis() - startTime
                    mainHandler.post {
                        if (isSuccess) {
                            logTest("✅ Servidor identificou o dispositivo em ${latency}ms! Hardware: $hwId")
                        } else {
                            logTest("❌ Falha de comunicação! Verifique IP ou Wi-Fi.")
                        }
                        refreshServerData()
                    }
                } catch (e: Exception) {
                    mainHandler.post { logTest("❌ Exceção de rede: ${e.message}") }
                }
            }
        }

        btnTestSyncCameras.setOnClickListener {
            logTest("🔄 Sincronizando câmeras com o servidor...")
            refreshServerData()
        }

        btnTestHeadsUpNotification.setOnClickListener {
            logTest("🚨 Disparando notificação prioritária Heads-Up...")
            try {
                val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val channelId = "servonvif_alerts"
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val channel = NotificationChannel(channelId, "Alertas ServONVIF", NotificationManager.IMPORTANCE_HIGH)
                    notificationManager.createNotificationChannel(channel)
                }

                val notification = NotificationCompat.Builder(this, channelId)
                    .setSmallIcon(R.drawable.app_icon)
                    .setContentTitle("🔴 Alarme Teste de Movimento")
                    .setContentText("Disparo forçado de teste na TV")
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true)
                    .build()

                notificationManager.notify(9999, notification)
                logTest("✅ Notificação Heads-Up enviada com sucesso!")
            } catch (e: Exception) {
                logTest("❌ Erro ao enviar notificação: ${e.message}")
            }
        }

        btnTestOverlayPermission.setOnClickListener {
            logTest("🔑 Verificando permissão de sobreposição de tela (PiP Overlay)...")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(this)) {
                    logTest("✅ Permissão de sobreposição CONCEDIDA!")
                } else {
                    logTest("⚠️ Permissão NÃO concedida. Abrindo tela de configurações...")
                    startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
                }
            } else {
                logTest("✅ Android < 6.0 não necessita de permissão explícita.")
            }
        }

        btnClearConsole.setOnClickListener {
            tvTestConsoleOutput.text = "• Logs limpos. Pronto para novos testes."
        }
    }

    private fun logTest(msg: String) {
        val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val current = tvTestConsoleOutput.text.toString()
        tvTestConsoleOutput.text = "[$time] $msg\n$current"
    }

    // =========================================================================
    // 🌐 DATA SYNC & WEBSOCKET ENGINE
    // =========================================================================

    private fun refreshServerData() {
        tvCardServerIp.text = "${configRepo.serverIp}:${configRepo.serverPort}"
        thread {
            try {
                val pingOk = apiClient.pingServer(this)
                val cameras = apiClient.fetchCameras()
                mainHandler.post {
                    if (pingOk) {
                        tvTvServerStatusPill.text = "● Servidor Online (${cameras.size} Câmeras)"
                        tvTvServerStatusPill.setTextColor(0xFF10B981.toInt())
                        tvCardServerStatus.text = "🟢 Online"
                        tvCardServerStatus.setTextColor(0xFF10B981.toInt())
                        tvCardWsStatus.text = "🟢 Ativo e Escutando"
                        tvCardWsStatus.setTextColor(0xFF10B981.toInt())
                        tvCardCameraCount.text = "${cameras.size} Câmeras"
                        tvCardCameraNames.text = if (cameras.isNotEmpty()) cameras.joinToString(", ") { it.name } else "Nenhuma câmera cadastrada"
                    } else {
                        tvTvServerStatusPill.text = "● Servidor Offline"
                        tvTvServerStatusPill.setTextColor(0xFFEF4444.toInt())
                        tvCardServerStatus.text = "🔴 Desconectado"
                        tvCardServerStatus.setTextColor(0xFFEF4444.toInt())
                        tvCardWsStatus.text = "⚠️ Reconectando..."
                        tvCardWsStatus.setTextColor(0xFFF59E0B.toInt())
                        tvCardCameraCount.text = "--"
                        tvCardCameraNames.text = "Servidor inacessível em ${configRepo.serverIp}"
                    }

                    if (cameras.isNotEmpty()) {
                        activeCameras = cameras
                        layoutEmptyState.visibility = View.GONE
                        layoutCamerasRowContainer.visibility = View.VISIBLE
                        cameraRowAdapter.updateData(cameras, configRepo.httpBaseUrl)
                        if (selectedHeroCamera == null) updateHeroSpotlight(cameras.first())
                        if (sectionMosaic.visibility == View.VISIBLE) renderMosaicGrid()
                    } else {
                        layoutEmptyState.visibility = View.VISIBLE
                        layoutCamerasRowContainer.visibility = View.GONE
                    }
                }
            } catch (e: Exception) {
                Log.e("TvMainActivity", "Erro ao carregar dados: ${e.message}")
            }
        }
    }

    private fun ensureForegroundServiceRunning() {
        try {
            val intent = Intent(this, MonitoringForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startForegroundService(intent) else startService(intent)
        } catch (e: Exception) {
            Log.e("TvMainActivity", "Erro foreground service: ${e.message}")
        }
    }

    private fun startLiveWebSocketListener() {
        liveWsManager = WebSocketManager(this) { event: EventPayload ->
            mainHandler.post {
                event.cameraId?.let { camId ->
                    cameraRowAdapter.setMotion(camId, true)
                    mainHandler.postDelayed({ cameraRowAdapter.setMotion(camId, false) }, 5000)
                }
            }
        }.also { it.start() }
    }

    private fun startClockTicker() {
        val ticker = object : Runnable {
            override fun run() {
                tvTvClock.text = SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date())
                clockHandler.postDelayed(this, 1000)
            }
        }
        clockHandler.post(ticker)
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_SETTINGS -> {
                startActivity(Intent(this, TvSettingsActivity::class.java))
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                if (sectionStreaming.visibility != View.VISIBLE) {
                    switchSection(1)
                    return true
                }
                AlertDialog.Builder(this)
                    .setTitle("Sair do ServONVIF TV?")
                    .setMessage("O monitoramento em segundo plano e os alertas PiP continuarão ativos.")
                    .setPositiveButton("Sair") { _, _ -> finish() }
                    .setNegativeButton("Cancelar", null)
                    .show()
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        heroDebounceHandler.removeCallbacksAndMessages(null)
        patrolHandler.removeCallbacksAndMessages(null)
        mosaicPatrolHandler.removeCallbacksAndMessages(null)
        clockHandler.removeCallbacksAndMessages(null)
        liveWsManager?.stop()
        webHeroStream.destroy()
    }
}
