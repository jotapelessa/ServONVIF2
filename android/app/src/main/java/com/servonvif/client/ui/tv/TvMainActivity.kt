package com.servonvif.client.ui.tv

import android.Manifest
import android.app.Activity
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
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.servonvif.client.R
import com.servonvif.client.data.model.CameraModel
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

class TvMainActivity : Activity() {

    private lateinit var configRepo: ServerConfigRepository
    private lateinit var apiClient: ServOnvifApiClient

    // Top Navigation Buttons
    private lateinit var btnNavCameras: Button
    private lateinit var btnNavStatus: Button
    private lateinit var btnNavTests: Button
    private lateinit var btnNavSettings: Button

    // Content Sections
    private lateinit var sectionCameras: View
    private lateinit var sectionStatus: View
    private lateinit var sectionTests: View

    // Mosaic Toolbar Controls
    private lateinit var btnMosaicLayout: Button
    private lateinit var btnMosaicPatrol: Button
    private lateinit var btnMosaicFit: Button
    private lateinit var btnMosaicOsd: Button
    private lateinit var btnMosaicReload: Button
    private lateinit var btnMosaicViewMode: Button

    // Mosaic Containers
    private lateinit var mosaicGridContainer: FrameLayout
    private lateinit var mosaicEmptyState: View
    private lateinit var btnEmptySync: Button
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
    private lateinit var btnTestSimulateMotion: Button
    private lateinit var btnTestAutoDiscoverServer: Button
    private lateinit var btnTestPiPAlert: Button
    private lateinit var btnTestSoundChime: Button
    private lateinit var btnTestServerPing: Button
    private lateinit var btnTestSyncCameras: Button
    private lateinit var btnTestHeadsUpNotification: Button
    private lateinit var btnTestOverlayPermission: Button
    private lateinit var btnClearConsole: Button
    private lateinit var tvTestConsoleOutput: TextView

    // State & Timers
    private val mainHandler = Handler(Looper.getMainLooper())
    private val patrolHandler = Handler(Looper.getMainLooper())
    private val clockHandler = Handler(Looper.getMainLooper())
    private var activeCameras = listOf<CameraModel>()
    private var currentPatrolIndex = 0
    private var isPatrolRunning = false
    private val activeCellViews = mutableListOf<View>()
    private val motionResetRunnables = mutableMapOf<Int, Runnable>()
    private var liveWsManager: WebSocketManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_dashboard)

        configRepo = ServerConfigRepository(this)
        apiClient = ServOnvifApiClient(configRepo)

        initViews()
        setupNavigation()
        setupMosaicControls()
        setupWebView()
        setupTestLab()
        setupFocusEffects()
        requestNotificationPermission()
        ensureForegroundServiceRunning()
        startLiveWebSocketListener()
        startClockTicker()

        // Initial Data Fetch & Grid Render
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

        btnMosaicLayout = findViewById(R.id.btnMosaicLayout)
        btnMosaicPatrol = findViewById(R.id.btnMosaicPatrol)
        btnMosaicFit = findViewById(R.id.btnMosaicFit)
        btnMosaicOsd = findViewById(R.id.btnMosaicOsd)
        btnMosaicReload = findViewById(R.id.btnMosaicReload)
        btnMosaicViewMode = findViewById(R.id.btnMosaicViewMode)

        mosaicGridContainer = findViewById(R.id.mosaicGridContainer)
        mosaicEmptyState = findViewById(R.id.mosaicEmptyState)
        btnEmptySync = findViewById(R.id.btnEmptySync)
        tvMainWebView = findViewById(R.id.tvMainWebView)

        tvCardServerStatus = findViewById(R.id.tvCardServerStatus)
        tvCardServerIp = findViewById(R.id.tvCardServerIp)
        tvCardWsStatus = findViewById(R.id.tvCardWsStatus)
        tvCardEventCount = findViewById(R.id.tvCardEventCount)
        tvCardCameraCount = findViewById(R.id.tvCardCameraCount)
        tvCardCameraNames = findViewById(R.id.tvCardCameraNames)
        tvCardLastEvent = findViewById(R.id.tvCardLastEvent)

        btnTestSimulateMotion = findViewById(R.id.btnTestSimulateMotion)
        btnTestAutoDiscoverServer = findViewById(R.id.btnTestAutoDiscoverServer)
        btnTestPiPAlert = findViewById(R.id.btnTestPiPAlert)
        btnTestSoundChime = findViewById(R.id.btnTestSoundChime)
        btnTestServerPing = findViewById(R.id.btnTestServerPing)
        btnTestSyncCameras = findViewById(R.id.btnTestSyncCameras)
        btnTestHeadsUpNotification = findViewById(R.id.btnTestHeadsUpNotification)
        btnTestOverlayPermission = findViewById(R.id.btnTestOverlayPermission)
        btnClearConsole = findViewById(R.id.btnClearConsole)
        tvTestConsoleOutput = findViewById(R.id.tvTestConsoleOutput)

        tvCardServerIp.text = "${configRepo.serverIp}:${configRepo.serverPort}"
        updateToolbarLabels()
    }

    private fun setupFocusEffects() {
        val allTvButtons = listOf(
            btnNavCameras, btnNavStatus, btnNavTests, btnNavSettings,
            btnMosaicLayout, btnMosaicPatrol, btnMosaicFit, btnMosaicOsd,
            btnMosaicReload, btnMosaicViewMode, btnEmptySync,
            btnTestSimulateMotion, btnTestAutoDiscoverServer,
            btnTestPiPAlert, btnTestSoundChime, btnTestServerPing,
            btnTestSyncCameras, btnTestHeadsUpNotification, btnTestOverlayPermission,
            btnClearConsole
        )

        for (btn in allTvButtons) {
            btn.setOnFocusChangeListener { v, hasFocus ->
                if (hasFocus) {
                    v.animate().scaleX(1.06f).scaleY(1.06f).setDuration(150).start()
                } else {
                    v.animate().scaleX(1.0f).scaleY(1.0f).setDuration(150).start()
                }
            }
        }
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
        btnEmptySync.setOnClickListener {
            refreshServerData()
        }
    }

    private fun switchSection(sectionId: Int) {
        sectionCameras.visibility = if (sectionId == 1) View.VISIBLE else View.GONE
        sectionStatus.visibility = if (sectionId == 2) View.VISIBLE else View.GONE
        sectionTests.visibility = if (sectionId == 3) View.VISIBLE else View.GONE

        // Update Nav button active indicators
        btnNavCameras.setBackgroundResource(if (sectionId == 1) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnNavStatus.setBackgroundResource(if (sectionId == 2) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnNavTests.setBackgroundResource(if (sectionId == 3) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)

        if (sectionId == 1) {
            renderMosaicGrid()
        }
    }

    // =========================================================================
    // 🔲 MOSAIC TOOLBAR & PERSONALIZATION CONTROLS
    // =========================================================================

    private fun setupMosaicControls() {
        btnMosaicLayout.setOnClickListener {
            showLayoutSelectionDialog()
        }

        btnMosaicPatrol.setOnClickListener {
            showPatrolIntervalDialog()
        }

        btnMosaicFit.setOnClickListener {
            configRepo.mosaicFitMode = if (configRepo.mosaicFitMode == ServerConfigRepository.FIT_COVER) {
                ServerConfigRepository.FIT_CONTAIN
            } else {
                ServerConfigRepository.FIT_COVER
            }
            updateToolbarLabels()
            renderMosaicGrid()
            Toast.makeText(this, "Ajuste de Imagem: ${if (configRepo.mosaicFitMode == ServerConfigRepository.FIT_COVER) "Preencher" else "Ajustar Proporção"}", Toast.LENGTH_SHORT).show()
        }

        btnMosaicOsd.setOnClickListener {
            configRepo.isMosaicOsdEnabled = !configRepo.isMosaicOsdEnabled
            updateToolbarLabels()
            renderMosaicGrid()
            Toast.makeText(this, "Informações na Tela (OSD): ${if (configRepo.isMosaicOsdEnabled) "ATIVADO" else "DESATIVADO"}", Toast.LENGTH_SHORT).show()
        }

        btnMosaicReload.setOnClickListener {
            Toast.makeText(this, "Recarregando transmissões ao vivo...", Toast.LENGTH_SHORT).show()
            renderMosaicGrid()
        }

        btnMosaicViewMode.setOnClickListener {
            configRepo.isMosaicNativeGrid = !configRepo.isMosaicNativeGrid
            updateToolbarLabels()
            applyViewMode()
        }
    }

    private fun updateToolbarLabels() {
        val layoutName = when (configRepo.mosaicLayout) {
            ServerConfigRepository.LAYOUT_1X1 -> "1x1 Fullscreen"
            ServerConfigRepository.LAYOUT_1X2 -> "1x2 Dividido"
            ServerConfigRepository.LAYOUT_2X2 -> "2x2 Quad (4x)"
            ServerConfigRepository.LAYOUT_1_PLUS_3 -> "1+3 Destaque"
            ServerConfigRepository.LAYOUT_2X3 -> "2x3 Grade (6x)"
            ServerConfigRepository.LAYOUT_PATROL -> "🔄 Auto-Patrulha"
            else -> "2x2 Quad"
        }
        btnMosaicLayout.text = "🔲 Grade: $layoutName"
        btnMosaicPatrol.text = "⏱️ Patrulha: ${configRepo.mosaicPatrolIntervalSeconds}s"
        btnMosaicFit.text = if (configRepo.mosaicFitMode == ServerConfigRepository.FIT_COVER) "📐 Ajuste: Preencher" else "📐 Ajuste: Ajustar"
        btnMosaicOsd.text = if (configRepo.isMosaicOsdEnabled) "👁️ OSD: ON" else "👁️ OSD: OFF"
        btnMosaicViewMode.text = if (configRepo.isMosaicNativeGrid) "⚡ Modo: Nativo" else "🌐 Modo: Web"
    }

    private fun applyViewMode() {
        if (configRepo.isMosaicNativeGrid) {
            mosaicGridContainer.visibility = View.VISIBLE
            tvMainWebView.visibility = View.GONE
            renderMosaicGrid()
        } else {
            mosaicGridContainer.visibility = View.GONE
            mosaicEmptyState.visibility = View.GONE
            tvMainWebView.visibility = View.VISIBLE
            loadDashboardWebView()
        }
    }

    private fun showLayoutSelectionDialog() {
        val options = arrayOf(
            "🔲 1x1 Fullscreen (1 Câmera em Tela Cheia)",
            "🔲 1x2 Dividido (2 Câmeras Lado a Lado)",
            "🔲 2x2 Quad (4 Câmeras em Grade - Padrão)",
            "🔲 1+3 Destaque (1 Principal + 3 Laterais)",
            "🔲 2x3 Grade (6 Câmeras)",
            "🔄 Auto-Patrulha (Carrossel Automático)"
        )
        val layoutKeys = arrayOf(
            ServerConfigRepository.LAYOUT_1X1,
            ServerConfigRepository.LAYOUT_1X2,
            ServerConfigRepository.LAYOUT_2X2,
            ServerConfigRepository.LAYOUT_1_PLUS_3,
            ServerConfigRepository.LAYOUT_2X3,
            ServerConfigRepository.LAYOUT_PATROL
        )

        AlertDialog.Builder(this)
            .setTitle("Selecione o Layout do Mosaico")
            .setItems(options) { _, which ->
                configRepo.mosaicLayout = layoutKeys[which]
                updateToolbarLabels()
                renderMosaicGrid()
            }
            .show()
    }

    private fun showPatrolIntervalDialog() {
        val intervals = arrayOf(5, 10, 15, 30)
        val labels = arrayOf("5 Segundos", "10 Segundos (Recomendado)", "15 Segundos", "30 Segundos")

        AlertDialog.Builder(this)
            .setTitle("Tempo de Troca da Auto-Patrulha")
            .setItems(labels) { _, which ->
                configRepo.mosaicPatrolIntervalSeconds = intervals[which]
                updateToolbarLabels()
                if (configRepo.mosaicLayout == ServerConfigRepository.LAYOUT_PATROL) {
                    startPatrolTimer()
                }
            }
            .show()
    }

    // =========================================================================
    // 📺 DYNAMIC NATIVE MOSAIC RENDERING ENGINE
    // =========================================================================

    private fun renderMosaicGrid() {
        if (!configRepo.isMosaicNativeGrid) {
            applyViewMode()
            return
        }

        stopPatrolTimer()
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
            ServerConfigRepository.LAYOUT_1X2 -> render1x2Layout()
            ServerConfigRepository.LAYOUT_2X2 -> render2x2Layout()
            ServerConfigRepository.LAYOUT_1_PLUS_3 -> render1Plus3Layout()
            ServerConfigRepository.LAYOUT_2X3 -> render2x3Layout()
            ServerConfigRepository.LAYOUT_PATROL -> renderPatrolLayout()
            else -> render2x2Layout()
        }
    }

    private fun render1x1Layout() {
        val camera = activeCameras.getOrNull(currentPatrolIndex % activeCameras.size) ?: activeCameras.first()
        val cellView = createCameraCell(camera, 0)
        mosaicGridContainer.addView(
            cellView,
            FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        )
    }

    private fun render1x2Layout() {
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }

        val cams = activeCameras.take(2)
        for ((idx, cam) in cams.withIndex()) {
            val cellView = createCameraCell(cam, idx)
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply {
                if (idx == 0 && cams.size > 1) marginEnd = dpToPx(8)
            }
            rootLayout.addView(cellView, lp)
        }

        mosaicGridContainer.addView(rootLayout)
    }

    private fun render2x2Layout() {
        val rootLayout = LinearLayout(this).apply {
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

        val cams = activeCameras.take(4)
        for ((idx, cam) in cams.withIndex()) {
            val cellView = createCameraCell(cam, idx)
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply {
                if (idx % 2 == 0) marginEnd = dpToPx(8)
            }

            if (idx < 2) {
                row1.addView(cellView, lp)
            } else {
                row2.addView(cellView, lp)
            }
        }

        // Fill remaining cells if less than 4 cameras
        if (cams.size == 1) {
            row1.addView(createEmptyPlaceholderCell("Espaço Livre #2"), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f))
            row2.addView(createEmptyPlaceholderCell("Espaço Livre #3"), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply { marginEnd = dpToPx(8) })
            row2.addView(createEmptyPlaceholderCell("Espaço Livre #4"), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f))
        } else if (cams.size == 2) {
            row2.addView(createEmptyPlaceholderCell("Espaço Livre #3"), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply { marginEnd = dpToPx(8) })
            row2.addView(createEmptyPlaceholderCell("Espaço Livre #4"), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f))
        } else if (cams.size == 3) {
            row2.addView(createEmptyPlaceholderCell("Espaço Livre #4"), LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f))
        }

        rootLayout.addView(row1)
        rootLayout.addView(row2)
        mosaicGridContainer.addView(rootLayout)
    }

    private fun render1Plus3Layout() {
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        }

        // Main Focal Camera (Left)
        val mainCam = activeCameras.first()
        val mainCell = createCameraCell(mainCam, 0)
        val mainLp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.8f).apply {
            marginEnd = dpToPx(8)
        }
        rootLayout.addView(mainCell, mainLp)

        // 3 Secondary Cameras Stacked (Right)
        val sideColumn = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f)
        }

        val sideCams = activeCameras.drop(1).take(3)
        for (i in 0 until 3) {
            val cam = sideCams.getOrNull(i)
            val sideView = if (cam != null) {
                createCameraCell(cam, i + 1)
            } else {
                createEmptyPlaceholderCell("Canal #${i + 2}")
            }
            val sideLp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f).apply {
                if (i < 2) bottomMargin = dpToPx(6)
            }
            sideColumn.addView(sideView, sideLp)
        }

        rootLayout.addView(sideColumn)
        mosaicGridContainer.addView(rootLayout)
    }

    private fun render2x3Layout() {
        val rootLayout = LinearLayout(this).apply {
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

        val cams = activeCameras.take(6)
        for ((idx, cam) in cams.withIndex()) {
            val cellView = createCameraCell(cam, idx)
            val lp = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1.0f).apply {
                if ((idx + 1) % 3 != 0) marginEnd = dpToPx(8)
            }

            if (idx < 3) {
                row1.addView(cellView, lp)
            } else {
                row2.addView(cellView, lp)
            }
        }

        rootLayout.addView(row1)
        rootLayout.addView(row2)
        mosaicGridContainer.addView(rootLayout)
    }

    private fun renderPatrolLayout() {
        render1x1Layout()
        startPatrolTimer()
    }

    private fun startPatrolTimer() {
        stopPatrolTimer()
        if (activeCameras.size <= 1) return

        isPatrolRunning = true
        patrolHandler.postDelayed(object : Runnable {
            override fun run() {
                if (!isPatrolRunning) return
                currentPatrolIndex = (currentPatrolIndex + 1) % activeCameras.size
                if (configRepo.mosaicLayout == ServerConfigRepository.LAYOUT_PATROL || configRepo.mosaicLayout == ServerConfigRepository.LAYOUT_1X1) {
                    render1x1Layout()
                }
                patrolHandler.postDelayed(this, (configRepo.mosaicPatrolIntervalSeconds * 1000).toLong())
            }
        }, (configRepo.mosaicPatrolIntervalSeconds * 1000).toLong())
    }

    private fun stopPatrolTimer() {
        isPatrolRunning = false
        patrolHandler.removeCallbacksAndMessages(null)
    }

    private fun createCameraCell(camera: CameraModel, index: Int): View {
        val cellView = LayoutInflater.from(this).inflate(R.layout.item_mosaic_camera, null)
        cellView.tag = camera.id

        val cellWebView: WebView = cellView.findViewById(R.id.cellWebView)
        val tvCellName: TextView = cellView.findViewById(R.id.tvCellName)
        val tvCellInfo: TextView = cellView.findViewById(R.id.tvCellInfo)
        val layoutTopOsd: View = cellView.findViewById(R.id.layoutTopOsd)
        val layoutBottomOsd: View = cellView.findViewById(R.id.layoutBottomOsd)
        val tvCellClock: TextView = cellView.findViewById(R.id.tvCellClock)

        tvCellName.text = camera.name
        tvCellInfo.text = "Sens: ${(camera.sensitivity * 100).toInt()}% • 5MP"
        tvCellClock.text = getCurrentTimeFormatted()

        // OSD Visibility
        layoutTopOsd.visibility = if (configRepo.isMosaicOsdEnabled) View.VISIBLE else View.GONE
        layoutBottomOsd.visibility = if (configRepo.isMosaicOsdEnabled) View.VISIBLE else View.GONE

        // Setup MJPEG Stream via Hardware-Accelerated WebView
        cellWebView.settings.apply {
            javaScriptEnabled = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        val fitCss = if (configRepo.mosaicFitMode == ServerConfigRepository.FIT_COVER) "cover" else "contain"
        val streamUrl = "${configRepo.httpBaseUrl}/api/mjpeg/${camera.id}"
        val html = """
            <!DOCTYPE html>
            <html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"></head>
            <body style="margin:0;padding:0;background-color:#000;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;">
                <img src="$streamUrl" style="width:100%;height:100%;object-fit:$fitCss;display:block;" onerror="this.style.display='none'" />
            </body>
            </html>
        """.trimIndent()

        cellWebView.loadDataWithBaseURL(configRepo.httpBaseUrl, html, "text/html", "UTF-8", null)

        // TV Focus & Click Handling
        cellView.isFocusable = true
        cellView.isClickable = true
        cellView.setOnFocusChangeListener { v, hasFocus ->
            if (hasFocus) {
                v.animate().scaleX(1.03f).scaleY(1.03f).setDuration(150).start()
            } else {
                v.animate().scaleX(1.0f).scaleY(1.0f).setDuration(150).start()
            }
        }

        cellView.setOnClickListener {
            // Open 1080p Fullscreen Player for this Camera
            val intent = Intent(this, TvPlayerActivity::class.java).apply {
                putExtra("EXTRA_CAMERA_ID", camera.id)
                putExtra("EXTRA_CAMERA_NAME", camera.name)
            }
            startActivity(intent)
        }

        activeCellViews.add(cellView)
        return cellView
    }

    private fun createEmptyPlaceholderCell(title: String): View {
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundResource(R.drawable.bg_camera_cell)
            setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16))
            isFocusable = false

            val tvIcon = TextView(context).apply {
                text = "➕"
                textSize = 24f
            }
            val tvText = TextView(context).apply {
                text = title
                setTextColor(ContextCompat.getColor(context, R.color.white))
                textSize = 12f
                alpha = 0.6f
                setPadding(0, dpToPx(4), 0, 0)
            }
            addView(tvIcon)
            addView(tvText)
        }
    }

    // =========================================================================
    // 🚨 REAL-TIME MOTION GLOW & WEBSOCKET SENTINEL
    // =========================================================================

    private fun startLiveWebSocketListener() {
        try {
            liveWsManager?.stop()
            val wsUrl = configRepo.getWsUrlWithDeviceIdentity(this)
            liveWsManager = WebSocketManager(wsUrl) { event ->
                mainHandler.post {
                    if (event.type == "MOTION_ALERT") {
                        triggerMotionOnCamera(event.cameraId, event.cameraName)
                    }
                }
            }
            liveWsManager?.start()
        } catch (e: Exception) {
            Log.e("TvMainActivity", "Failed to start live WS: ${e.message}")
        }
    }

    fun triggerMotionOnCamera(cameraId: Int, cameraName: String) {
        tvCardLastEvent.text = "🔴 $cameraName • Movimento Detectado • Agora"

        for (cell in activeCellViews) {
            val cellCamId = cell.tag as? Int ?: continue
            if (cellCamId == cameraId) {
                val motionBanner: View = cell.findViewById(R.id.layoutCellMotionBanner)
                val cellRoot: FrameLayout = cell.findViewById(R.id.cellRoot)

                motionBanner.visibility = View.VISIBLE
                cellRoot.setBackgroundResource(R.drawable.bg_camera_cell_motion)

                // Cancel previous timer if any
                motionResetRunnables[cameraId]?.let { mainHandler.removeCallbacks(it) }

                val resetRunnable = Runnable {
                    motionBanner.visibility = View.GONE
                    cellRoot.setBackgroundResource(R.drawable.selector_camera_cell)
                }
                motionResetRunnables[cameraId] = resetRunnable
                mainHandler.postDelayed(resetRunnable, 6000)
                break
            }
        }
    }

    private fun startClockTicker() {
        clockHandler.post(object : Runnable {
            override fun run() {
                val currentTime = getCurrentTimeFormatted()
                for (cell in activeCellViews) {
                    val tvClock: TextView? = cell.findViewById(R.id.tvCellClock)
                    tvClock?.text = currentTime
                }
                clockHandler.postDelayed(this, 1000)
            }
        })
    }

    private fun getCurrentTimeFormatted(): String {
        return SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }

    // =========================================================================
    // 🌐 WEB DASHBOARD & STATUS DATA REFRESH
    // =========================================================================

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

        if (!configRepo.isMosaicNativeGrid) {
            loadDashboardWebView()
        }
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
                    activeCameras = cameras
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

                    if (sectionCameras.visibility == View.VISIBLE) {
                        renderMosaicGrid()
                    }
                }
            } catch (e: Exception) {
                Log.e("TvMainActivity", "Data refresh error: ${e.message}")
            }
        }
    }

    // =========================================================================
    // 🧪 TEST LAB ACTIONS
    // =========================================================================

    private fun setupTestLab() {
        btnTestSimulateMotion.setOnClickListener {
            logTest("🎯 Disparando Simulação de Detecção de Movimento...")
            try {
                // 1. Play Sound Chime
                val notificationUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val ringtone = RingtoneManager.getRingtone(applicationContext, notificationUri)
                ringtone?.play()

                // 2. Trigger Motion Glow on Mosaic
                triggerMotionOnCamera(1, "Câmera Portão (Simulação)")

                // 3. Open Pure Non-Invasive Window Overlay
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) {
                    FloatingOverlayManager(this).showFloatingAlert(
                        cameraId = 1,
                        cameraName = "Câmera Portão (Simulação)",
                        mjpegUrl = "/api/mjpeg/1",
                        score = 0.98f,
                        durationSeconds = configRepo.pipDurationSeconds
                    )
                } else {
                    val intent = Intent(this, PiPAlertActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("EXTRA_CAMERA_ID", 1)
                        putExtra("EXTRA_CAMERA_NAME", "Câmera Portão (Simulação)")
                        putExtra("EXTRA_MJPEG_URL", "/api/mjpeg/1")
                        putExtra("EXTRA_SCORE", 0.98)
                        putExtra("EXTRA_DURATION", configRepo.pipDurationSeconds)
                    }
                    startActivity(intent)
                }

                logTest("✅ Simulação concluída com sucesso! Janela Flutuante e Borda do Mosaico ativadas.")
            } catch (e: Exception) {
                logTest("❌ Falha na simulação: ${e.message}")
            }
        }

        btnTestAutoDiscoverServer.setOnClickListener {
            logTest("🔍 Varrendo a rede local para encontrar o ServONVIF Mac/PC...")
            Toast.makeText(this, "Buscando servidor ServONVIF na rede...", Toast.LENGTH_SHORT).show()
            apiClient.discoverServerOnNetwork(
                onServerFound = { discoveredIp ->
                    mainHandler.post {
                        configRepo.serverIp = discoveredIp
                        logTest("🎉 SERVIDOR ENCONTRADO NA REDE: $discoveredIp!")
                        Toast.makeText(this, "Servidor conectado: $discoveredIp", Toast.LENGTH_LONG).show()
                        refreshServerData()
                        startLiveWebSocketListener()
                    }
                },
                onScanComplete = { wasFound ->
                    mainHandler.post {
                        if (!wasFound) {
                            logTest("⚠️ Varredura concluída. Nenhum outro servidor encontrado além de ${configRepo.serverIp}.")
                        }
                    }
                }
            )
        }

        btnTestPiPAlert.setOnClickListener {
            logTest("🧪 Disparando Janela Picture-in-Picture (PiP) de Teste por 10s...")
            try {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)) {
                    FloatingOverlayManager(this).showFloatingAlert(
                        cameraId = 1,
                        cameraName = "Câmera de Teste",
                        mjpegUrl = "/api/mjpeg/1",
                        score = 0.95f,
                        durationSeconds = 10
                    )
                } else {
                    val intent = Intent(this, PiPAlertActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        putExtra("EXTRA_CAMERA_ID", 1)
                        putExtra("EXTRA_CAMERA_NAME", "Câmera de Teste")
                        putExtra("EXTRA_MJPEG_URL", "/api/mjpeg/1")
                        putExtra("EXTRA_SCORE", 0.95)
                        putExtra("EXTRA_DURATION", 10)
                    }
                    startActivity(intent)
                }
                logTest("✅ Janela PiP aberta com sucesso!")
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
            logTest("📡 Enviando ping com identidade de hardware para http://${configRepo.serverIp}:${configRepo.serverPort}...")
            thread {
                try {
                    val isSuccess = apiClient.pingServer(this)
                    val latency = System.currentTimeMillis() - startTime
                    mainHandler.post {
                        if (isSuccess) {
                            logTest("✅ Servidor identificou este dispositivo em ${latency}ms! Veja no painel Web.")
                        } else {
                            logTest("❌ Falha de comunicação! Verifique o IP ou a rede Wi-Fi.")
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
            logTest("🔄 Sincronizando lista de câmeras com o servidor...")
            refreshServerData()
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

        btnTestOverlayPermission.setOnClickListener {
            logTest("🔑 Verificando permissão de sobreposição (Janela Flutuante)...")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(this)) {
                    logTest("✅ Permissão de sobreposição já está CONCEDIDA!")
                } else {
                    logTest("⚠️ Permissão NÃO concedida. Abrindo tela de configurações do Android...")
                    try {
                        val intent = Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:$packageName")
                        )
                        startActivity(intent)
                    } catch (e: Exception) {
                        logTest("❌ Não foi possível abrir configurações de sobreposição: ${e.message}")
                    }
                }
            } else {
                logTest("✅ Android < 6.0 não necessita de permissão explícita de sobreposição.")
            }
        }

        btnClearConsole.setOnClickListener {
            tvTestConsoleOutput.text = "Logs limpos. Pronto para novos testes."
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
        updateToolbarLabels()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_SETTINGS -> {
                startActivity(Intent(this, TvSettingsActivity::class.java))
                return true
            }
            KeyEvent.KEYCODE_BACK -> {
                if (sectionCameras.visibility == View.VISIBLE && !configRepo.isMosaicNativeGrid && tvMainWebView.canGoBack()) {
                    tvMainWebView.goBack()
                    return true
                }
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopPatrolTimer()
        clockHandler.removeCallbacksAndMessages(null)
        liveWsManager?.stop()
        try {
            tvMainWebView.destroy()
        } catch (e: Exception) {
            // Safe cleanup
        }
    }
}
