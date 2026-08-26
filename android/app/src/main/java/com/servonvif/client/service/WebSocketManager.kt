package com.servonvif.client.service

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.servonvif.client.data.model.EventPayload
import com.servonvif.client.data.model.ServerNode
import com.servonvif.client.data.repository.ServerConfigRepository
import okhttp3.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * Multi-Server WebSocket Manager:
 * Maintains parallel, resilient connections across multiple ServONVIF server nodes
 * (Local LAN, Tailscale Remote, Casa, Empresa, Sítio) and tags incoming alerts with their origin site.
 */
class WebSocketManager(
    private val context: Context,
    private val onEventReceived: (EventPayload) -> Unit
) {
    private val client = OkHttpClient.Builder()
        .pingInterval(15, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private val sockets = ConcurrentHashMap<String, WebSocket>()
    private val gson = Gson()
    private var isClosed = false
    private val configRepo = ServerConfigRepository(context)

    fun start() {
        isClosed = false
        val nodes = configRepo.serverNodes.filter { it.isEnabled }
        if (nodes.isEmpty()) {
            val defaultNode = ServerNode(
                id = "default",
                name = if (configRepo.isTailscaleIp(configRepo.serverIp)) "Tailscale Remoto" else "Servidor Local",
                ip = configRepo.serverIp,
                port = configRepo.serverPort
            )
            connectNode(defaultNode)
        } else {
            nodes.forEach { node ->
                connectNode(node)
            }
        }
    }

    private fun connectNode(node: ServerNode) {
        val wsUrl = configRepo.getWsUrlWithDeviceIdentity(context, node.ip, node.port)
        val request = Request.Builder().url(wsUrl).build()

        val ws = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "Connected to [${node.name}] WS: ${node.ip}:${node.port}")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val payload = gson.fromJson(text, EventPayload::class.java)
                    if (payload.type == "MOTION_ALERT" || payload.type == "LPR_ALERT") {
                        payload.siteName = node.name
                        payload.serverBaseUrl = node.httpBaseUrl
                        Log.d(TAG, "Alert Received from [${node.name}] for Camera: ${payload.cameraName}")
                        onEventReceived(payload)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse WS message from [${node.name}]: ${e.message}")
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket Closed for [${node.name}]: $reason")
                reconnectNode(node)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket Failure for [${node.name}]: ${t.message}")
                reconnectNode(node)
            }
        })
        sockets[node.id] = ws
    }

    private fun reconnectNode(node: ServerNode) {
        if (!isClosed) {
            Thread {
                try {
                    Thread.sleep(4000)
                    if (!isClosed) {
                        connectNode(node)
                    }
                } catch (e: Exception) {
                    // Safe ignore
                }
            }.start()
        }
    }

    fun stop() {
        isClosed = true
        sockets.values.forEach { ws ->
            try {
                ws.close(1000, "App closed")
            } catch (e: Exception) {
                // Safe ignore
            }
        }
        sockets.clear()
    }

    companion object {
        private const val TAG = "WebSocketManager"
    }
}
