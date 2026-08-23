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

    var isSoundAlertEnabled: Boolean
        get() = prefs.getBoolean(KEY_SOUND_ALERT, true)
        set(value) = prefs.edit().putBoolean(KEY_SOUND_ALERT, value).apply()

    var isAutoStartOnBoot: Boolean
        get() = prefs.getBoolean(KEY_AUTO_START, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_START, value).apply()

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
        private const val KEY_SOUND_ALERT = "sound_alert"
        private const val KEY_AUTO_START = "auto_start"
    }
}
