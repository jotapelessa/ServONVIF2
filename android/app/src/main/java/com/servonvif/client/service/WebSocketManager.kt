package com.servonvif.client.service

import android.util.Log
import com.google.gson.Gson
import com.servonvif.client.data.model.EventPayload
import okhttp3.*
import java.util.concurrent.TimeUnit

class WebSocketManager(
    private val serverUrl: String,
    private val onEventReceived: (EventPayload) -> Unit
) {
    private val client = OkHttpClient.Builder()
        .pingInterval(15, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private var webSocket: WebSocket? = null
    private val gson = Gson()
    private var isClosed = false

    fun start() {
        isClosed = false
        val request = Request.Builder().url(serverUrl).build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "Connected to ServONVIF WS Engine: $serverUrl")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val payload = gson.fromJson(text, EventPayload::class.java)
                    if (payload.type == "MOTION_ALERT") {
                        Log.d(TAG, "Motion Alert Received for Camera: ${payload.cameraName}")
                        onEventReceived(payload)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse WS message: ${e.message}")
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket Closed: $reason")
                reconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket Failure: ${t.message}")
                reconnect()
            }
        })
    }

    private fun reconnect() {
        if (!isClosed) {
            Thread.sleep(3000)
            start()
        }
    }

    fun stop() {
        isClosed = true
        webSocket?.close(1000, "App closed")
    }

    companion object {
        private const val TAG = "WebSocketManager"
    }
}
