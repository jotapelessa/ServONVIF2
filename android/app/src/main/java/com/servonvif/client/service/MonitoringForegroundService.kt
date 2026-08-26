package com.servonvif.client.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.util.Log
import androidx.core.app.NotificationCompat
import com.servonvif.client.R
import com.servonvif.client.data.model.EventPayload
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.ui.pip.FloatingOverlayManager
import com.servonvif.client.ui.pip.PiPAlertActivity

class MonitoringForegroundService : Service() {

    private var wsManager: WebSocketManager? = null
    private lateinit var configRepo: ServerConfigRepository
    private lateinit var notificationManager: NotificationManager
    private lateinit var floatingOverlayManager: FloatingOverlayManager

    override fun onCreate() {
        super.onCreate()
        configRepo = ServerConfigRepository(this)
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        floatingOverlayManager = FloatingOverlayManager(this)
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
            wsManager = WebSocketManager(this) { event ->
                handleIncomingAlert(event)
            }
            wsManager?.start()
        } catch (e: Exception) {
            Log.e("MonitoringService", "WebSocket monitoring init error: ${e.message}")
        }
    }

    private var lastSoundChimeTimestamp = 0L

    private fun handleIncomingAlert(event: EventPayload) {
        // 1. Play audible chime if enabled (throttled to at most once every 5 seconds)
        if (configRepo.isSoundAlertEnabled) {
            val now = System.currentTimeMillis()
            if (now - lastSoundChimeTimestamp > 5000L) {
                lastSoundChimeTimestamp = now
                try {
                    val notificationUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    val ringtone = RingtoneManager.getRingtone(applicationContext, notificationUri)
                    ringtone?.play()
                } catch (e: Exception) {
                    // Safe ignore audio error
                }
            }
        }

        val effectiveMjpegUrl = if (!event.mjpegUrl.isNullOrBlank() && event.mjpegUrl.startsWith("http")) {
            event.mjpegUrl
        } else if (!event.serverBaseUrl.isNullOrBlank()) {
            "${event.serverBaseUrl}/api/mjpeg/${event.cameraId}"
        } else {
            configRepo.getMjpegStreamUrl(event.cameraId)
        }

        // 2. Pure WindowManager Floating Overlay (Non-Invasive, Zero Disruption to Third-Party Apps like SBT)
        val hasOverlayPermission = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(this)
        if (hasOverlayPermission) {
            Log.d("MonitoringService", "Displaying Non-Invasive Floating Window via WindowManager")
            floatingOverlayManager.showFloatingAlert(
                cameraId = event.cameraId,
                cameraName = event.cameraName,
                mjpegUrl = effectiveMjpegUrl,
                score = event.score,
                durationSeconds = configRepo.pipDurationSeconds,
                siteName = event.siteName
            )
            return
        }

        // 3. Fallback: High-Priority Heads-Up Notification if overlay permission is not granted
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

        // Vibrate smartphone if available
        try {
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? android.os.Vibrator
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(android.os.VibrationEffect.createOneShot(350, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(350)
                }
            }
        } catch (e: Exception) {
            // Ignore vibration errors
        }

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
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val serviceChannel = NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "ServONVIF Monitor de Segurança",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "Serviço sentinela de segundo plano"
                    setShowBadge(false)
                }

                val alertChannel = NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "ServONVIF Alertas de Movimento",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alertas de detecção de movimento em tempo real"
                    enableVibration(true)
                    setShowBadge(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }

                notificationManager.createNotificationChannel(serviceChannel)
                notificationManager.createNotificationChannel(alertChannel)
            } catch (e: Exception) {
                Log.e("MonitoringService", "Channel creation error: ${e.message}")
            }
        }
    }

    private fun buildForegroundNotification(contentText: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.app_icon)
            .setContentTitle("🛡️ ServONVIF Monitor Ativo")
            .setContentText(contentText)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == ACTION_RESTART_WS) {
            startWebSocketMonitoring()
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        floatingOverlayManager.hideFloatingAlert()
        wsManager?.stop()
    }

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "servonvif_monitoring_channel"
        const val ALERT_CHANNEL_ID = "servonvif_alert_channel"
        const val NOTIFICATION_ID = 1001
        const val ALERT_NOTIFICATION_ID = 2002
        const val ACTION_RESTART_WS = "com.servonvif.client.ACTION_RESTART_WS"
    }
}
