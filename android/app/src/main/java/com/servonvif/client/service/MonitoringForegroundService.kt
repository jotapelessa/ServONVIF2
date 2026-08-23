package com.servonvif.client.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.servonvif.client.R
import com.servonvif.client.data.model.EventPayload
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.ui.pip.PiPAlertActivity

class MonitoringForegroundService : Service() {

    private var wsManager: WebSocketManager? = null
    private lateinit var configRepo: ServerConfigRepository
    private lateinit var notificationManager: NotificationManager

    override fun onCreate() {
        super.onCreate()
        configRepo = ServerConfigRepository(this)
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannels()

        val notification = buildForegroundNotification("Monitorando eventos de segurança em tempo real")
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                // Android 14+ safe dataSync type
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e("MonitoringService", "Foreground service fallback: ${e.message}")
            try {
                startForeground(NOTIFICATION_ID, notification)
            } catch (fallbackEx: Exception) {
                Log.e("MonitoringService", "Failed to startForeground: ${fallbackEx.message}")
            }
        }

        startWebSocketMonitoring()
    }

    private fun startWebSocketMonitoring() {
        try {
            wsManager?.stop()
            val serverUrl = configRepo.wsBaseUrl
            wsManager = WebSocketManager(serverUrl) { event ->
                handleIncomingAlert(event)
            }
            wsManager?.start()
        } catch (e: Exception) {
            Log.e("MonitoringService", "WebSocket monitoring init error: ${e.message}")
        }
    }

    private fun handleIncomingAlert(event: EventPayload) {
        // 1. Play audible chime if enabled
        if (configRepo.isSoundAlertEnabled) {
            try {
                val notificationUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val ringtone = RingtoneManager.getRingtone(applicationContext, notificationUri)
                ringtone?.play()
            } catch (e: Exception) {
                // Safe ignore audio error
            }
        }

        // 2. Build Intent for PiP / Spotlight Overlay
        val alertIntent = Intent(this, PiPAlertActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            putExtra("EXTRA_CAMERA_ID", event.cameraId)
            putExtra("EXTRA_CAMERA_NAME", event.cameraName)
            putExtra("EXTRA_MJPEG_URL", event.mjpegUrl)
            putExtra("EXTRA_SCORE", event.score)
            putExtra("EXTRA_DURATION", configRepo.pipDurationSeconds)
        }

        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            alertIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 3. High-Priority Heads-Up Notification with FullScreenIntent (Essential for Android 10+ TV/Tablets)
        try {
            val alertNotification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setSmallIcon(R.drawable.app_icon)
                .setContentTitle("🔴 Movimento Detectado: ${event.cameraName}")
                .setContentText("Clique para visualizar a câmera ao vivo")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(fullScreenPendingIntent)
                .build()

            notificationManager.notify(ALERT_NOTIFICATION_ID, alertNotification)
        } catch (e: Exception) {
            Log.e("MonitoringService", "Failed to show alert notification: ${e.message}")
        }

        // Also attempt direct start for devices allowing background starts
        try {
            startActivity(alertIntent)
        } catch (e: Exception) {
            // Handled via fullScreenPendingIntent
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                // Channel for Silent Persistent Service
                val serviceChannel = NotificationChannel(
                    CHANNEL_ID,
                    "ServONVIF Serviço em 2º Plano",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Mantém a conexão ativa em segundo plano na Smart TV e Tablets"
                }

                // Channel for High-Priority Heads-Up Emergency Alerts
                val alertChannel = NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "ServONVIF Alertas de Movimento (PiP)",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Dispara janela de vídeo instantânea ao detectar movimento"
                    enableVibration(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }

                notificationManager.createNotificationChannel(serviceChannel)
                notificationManager.createNotificationChannel(alertChannel)
            } catch (e: Exception) {
                Log.e("MonitoringService", "Error creating notification channels: ${e.message}")
            }
        }
    }

    private fun buildForegroundNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ServONVIF Sentinela")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.app_icon)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        try {
            wsManager?.stop()
        } catch (e: Exception) {
            // Safe cleanup
        }
    }

    companion object {
        const val CHANNEL_ID = "servonvif_monitoring_channel"
        const val ALERT_CHANNEL_ID = "servonvif_alert_channel"
        const val NOTIFICATION_ID = 1001
        const val ALERT_NOTIFICATION_ID = 2002
    }
}
