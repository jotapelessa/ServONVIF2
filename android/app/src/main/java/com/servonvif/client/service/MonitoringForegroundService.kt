package com.servonvif.client.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.servonvif.client.R
import com.servonvif.client.data.model.EventPayload
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.ui.pip.PiPAlertActivity

class MonitoringForegroundService : Service() {

    private var wsManager: WebSocketManager? = null
    private lateinit var configRepo: ServerConfigRepository

    override fun onCreate() {
        super.onCreate()
        configRepo = ServerConfigRepository(this)
        createNotificationChannel()

        val notification = buildForegroundNotification("Monitorando eventos em tempo real")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
                } else {
                    0
                }
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        startWebSocketMonitoring()
    }

    private fun startWebSocketMonitoring() {
        wsManager?.stop()
        val serverUrl = configRepo.wsBaseUrl
        wsManager = WebSocketManager(serverUrl) { event ->
            handleIncomingAlert(event)
        }
        wsManager?.start()
    }

    private fun handleIncomingAlert(event: EventPayload) {
        // 1. Play subtle audio chime if enabled
        if (configRepo.isSoundAlertEnabled) {
            try {
                val notificationUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val ringtone = RingtoneManager.getRingtone(applicationContext, notificationUri)
                ringtone?.play()
            } catch (e: Exception) {
                // Ignore audio errors on quiet TV profiles
            }
        }

        // 2. Trigger Picture-in-Picture Floating Alert
        val intent = Intent(this, PiPAlertActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_CAMERA_ID", event.cameraId)
            putExtra("EXTRA_CAMERA_NAME", event.cameraName)
            putExtra("EXTRA_MJPEG_URL", event.mjpegUrl)
            putExtra("EXTRA_SCORE", event.score)
            putExtra("EXTRA_DURATION", configRepo.pipDurationSeconds)
        }
        startActivity(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ServONVIF Alertas de Câmeras",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notificações prioritárias de detecção de movimento em Smart TVs"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ServONVIF Monitor TV")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.app_icon)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        wsManager?.stop()
    }

    companion object {
        const val CHANNEL_ID = "servonvif_monitoring_channel"
        const val NOTIFICATION_ID = 1001
    }
}
