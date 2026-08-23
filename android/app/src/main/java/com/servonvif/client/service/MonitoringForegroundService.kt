package com.servonvif.client.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.RingtoneManager
import android.net.Uri
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
    private lateinit var notificationManager: NotificationManager

    override fun onCreate() {
        super.onCreate()
        configRepo = ServerConfigRepository(this)
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannels()

        val notification = buildForegroundNotification("Monitorando eventos de segurança")
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

        // 3. High-Priority Heads-Up Notification with FullScreenIntent (Essential for Android 10+ TV)
        val alertNotification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
            .setSmallIcon(R.drawable.app_icon)
            .setContentTitle("🔴 Movimento Detectado: ${event.cameraName}")
            .setContentText("Clique ou aguarde para visualizar a câmera ao vivo")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .build()

        notificationManager.notify(ALERT_NOTIFICATION_ID, alertNotification)

        // Also attempt direct start for devices allowing background starts
        try {
            startActivity(alertIntent)
        } catch (e: Exception) {
            // Android 10+ will handle via fullScreenPendingIntent
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Channel for Silent Persistent Service
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "ServONVIF Serviço em 2º Plano",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Mantém a conexão ativa em segundo plano na Smart TV"
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
        }
    }

    private fun buildForegroundNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ServONVIF TV Sentinela")
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
        const val ALERT_CHANNEL_ID = "servonvif_alert_channel"
        const val NOTIFICATION_ID = 1001
        const val ALERT_NOTIFICATION_ID = 2002
    }
}
