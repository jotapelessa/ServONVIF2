package com.servonvif.client.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.servonvif.client.data.model.EventPayload
import com.servonvif.client.ui.pip.PiPAlertActivity

class MonitoringForegroundService : Service() {

    private var wsManager: WebSocketManager? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification("Monitoramento ativo"))
        
        // Connect to local or configured IP engine
        val serverUrl = "ws://192.168.1.100:8080/ws/events"
        wsManager = WebSocketManager(serverUrl) { event ->
            triggerPiPAlert(event)
        }
        wsManager?.start()
    }

    private fun triggerPiPAlert(event: EventPayload) {
        val intent = Intent(this, PiPAlertActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_CAMERA_ID", event.cameraId)
            putExtra("EXTRA_CAMERA_NAME", event.cameraName)
            putExtra("EXTRA_MJPEG_URL", event.mjpegUrl)
            putExtra("EXTRA_SCORE", event.score)
        }
        startActivity(intent)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ServONVIF Monitor Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(contentText: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ServONVIF Core")
            .setContentText(contentText)
            .setSmallIcon(android.R.drawable.ic_menu_camera)
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
