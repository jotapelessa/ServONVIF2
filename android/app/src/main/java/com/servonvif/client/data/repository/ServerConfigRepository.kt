package com.servonvif.client.data.repository

import android.content.Context
import android.content.SharedPreferences

class ServerConfigRepository(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var serverIp: String
        get() = prefs.getString(KEY_SERVER_IP, "192.168.1.96") ?: "192.168.1.96"
        set(value) = prefs.edit().putString(KEY_SERVER_IP, value.trim()).apply()

    var serverPort: Int
        get() = prefs.getInt(KEY_SERVER_PORT, 8080)
        set(value) = prefs.edit().putInt(KEY_SERVER_PORT, value).apply()

    var pipDurationSeconds: Int
        get() = prefs.getInt(KEY_PIP_DURATION, 10)
        set(value) = prefs.edit().putInt(KEY_PIP_DURATION, value).apply()

    var pipPosition: String
        get() = prefs.getString(KEY_PIP_POSITION, POSITION_TOP_RIGHT) ?: POSITION_TOP_RIGHT
        set(value) = prefs.edit().putString(KEY_PIP_POSITION, value).apply()

    var pipSize: String
        get() = prefs.getString(KEY_PIP_SIZE, SIZE_MINI) ?: SIZE_MINI
        set(value) = prefs.edit().putString(KEY_PIP_SIZE, value).apply()

    var isSoundAlertEnabled: Boolean
        get() = prefs.getBoolean(KEY_SOUND_ALERT, true)
        set(value) = prefs.edit().putBoolean(KEY_SOUND_ALERT, value).apply()

    var isAutoStartOnBoot: Boolean
        get() = prefs.getBoolean(KEY_AUTO_START, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_START, value).apply()

    // --- Mosaic Grid Personalization ---
    var mosaicLayout: String
        get() = prefs.getString(KEY_MOSAIC_LAYOUT, LAYOUT_2X2) ?: LAYOUT_2X2
        set(value) = prefs.edit().putString(KEY_MOSAIC_LAYOUT, value).apply()

    var mosaicPatrolIntervalSeconds: Int
        get() = prefs.getInt(KEY_MOSAIC_PATROL_INTERVAL, 10)
        set(value) = prefs.edit().putInt(KEY_MOSAIC_PATROL_INTERVAL, value).apply()

    var mosaicFitMode: String
        get() = prefs.getString(KEY_MOSAIC_FIT_MODE, FIT_COVER) ?: FIT_COVER
        set(value) = prefs.edit().putString(KEY_MOSAIC_FIT_MODE, value).apply()

    var isMosaicOsdEnabled: Boolean
        get() = prefs.getBoolean(KEY_MOSAIC_OSD, true)
        set(value) = prefs.edit().putBoolean(KEY_MOSAIC_OSD, value).apply()

    var isMosaicMotionGlowEnabled: Boolean
        get() = prefs.getBoolean(KEY_MOSAIC_MOTION_GLOW, true)
        set(value) = prefs.edit().putBoolean(KEY_MOSAIC_MOTION_GLOW, value).apply()

    var isMosaicNativeGrid: Boolean
        get() = prefs.getBoolean(KEY_MOSAIC_NATIVE, true)
        set(value) = prefs.edit().putBoolean(KEY_MOSAIC_NATIVE, value).apply()

    val httpBaseUrl: String
        get() = "http://$serverIp:$serverPort"

    val wsBaseUrl: String
        get() = "ws://$serverIp:$serverPort/ws/events"

    fun getMjpegStreamUrl(cameraId: Int): String {
        return "$httpBaseUrl/api/mjpeg/$cameraId"
    }

    companion object {
        private const val PREFS_NAME = "servonvif_tv_prefs"
        private const val KEY_SERVER_IP = "server_ip"
        private const val KEY_SERVER_PORT = "server_port"
        private const val KEY_PIP_DURATION = "pip_duration"
        private const val KEY_PIP_POSITION = "pip_position"
        private const val KEY_PIP_SIZE = "pip_size"
        private const val KEY_SOUND_ALERT = "sound_alert"
        private const val KEY_AUTO_START = "auto_start"

        // Mosaic Keys
        private const val KEY_MOSAIC_LAYOUT = "mosaic_layout"
        private const val KEY_MOSAIC_PATROL_INTERVAL = "mosaic_patrol_interval"
        private const val KEY_MOSAIC_FIT_MODE = "mosaic_fit_mode"
        private const val KEY_MOSAIC_OSD = "mosaic_osd"
        private const val KEY_MOSAIC_MOTION_GLOW = "mosaic_motion_glow"
        private const val KEY_MOSAIC_NATIVE = "mosaic_native"

        const val POSITION_TOP_RIGHT = "TOP_RIGHT"
        const val POSITION_TOP_LEFT = "TOP_LEFT"
        const val POSITION_BOTTOM_RIGHT = "BOTTOM_RIGHT"
        const val POSITION_BOTTOM_LEFT = "BOTTOM_LEFT"
        const val POSITION_CENTER = "CENTER"

        const val SIZE_MICRO = "MICRO"      // 220 x 124 dp (Ultra Compacto 16:9)
        const val SIZE_MINI = "MINI"        // 270 x 152 dp (Pequeno 16:9)
        const val SIZE_COMPACT = "COMPACT"  // 320 x 180 dp (Médio 16:9)
        const val SIZE_MEDIUM = "MEDIUM"    // 380 x 214 dp (Padrão 16:9)
        const val SIZE_LARGE = "LARGE"      // 480 x 270 dp (Grande 16:9)

        // Mosaic Layout Types
        const val LAYOUT_1X1 = "1X1"           // 1 Câmera em Tela Cheia
        const val LAYOUT_1X2 = "1X2"           // 2 Câmeras Lado a Lado
        const val LAYOUT_2X2 = "2X2"           // 4 Câmeras (Grade 2x2)
        const val LAYOUT_1_PLUS_3 = "1_PLUS_3" // 1 Destaque Grande + 3 Pequenas
        const val LAYOUT_2X3 = "2X3"           // 6 Câmeras (Grade 2x3)
        const val LAYOUT_PATROL = "PATROL"     // Auto-Patrulha / Carrossel

        // Fit Modes
        const val FIT_COVER = "COVER"       // Preenche toda a célula sem bordas pretas
        const val FIT_CONTAIN = "CONTAIN"   // Ajusta mantendo proporção com bordas pretas

        // Legacy compatibility aliases
        const val SIZE_SMALL = "MINI"
    }
}
