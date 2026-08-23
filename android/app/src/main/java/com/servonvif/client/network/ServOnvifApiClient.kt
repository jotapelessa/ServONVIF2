package com.servonvif.client.network

import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.servonvif.client.data.model.CameraModel
import com.servonvif.client.data.repository.ServerConfigRepository
import okhttp3.OkHttpClient
import okhttp3.Request
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class ServOnvifApiClient(private val configRepo: ServerConfigRepository) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(3, TimeUnit.SECONDS)
        .readTimeout(6, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    fun fetchCameras(): List<CameraModel> {
        val request = Request.Builder()
            .url("${configRepo.httpBaseUrl}/api/cameras/")
            .get()
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val body = response.body?.string() ?: "[]"
                    val type = object : TypeToken<List<CameraModel>>() {}.type
                    gson.fromJson(body, type)
                } else {
                    emptyList()
                }
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun testConnection(): Boolean {
        val request = Request.Builder()
            .url("${configRepo.httpBaseUrl}/api/cameras/")
            .get()
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                response.isSuccessful
            }
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Rapid Subnet Discovery Scanner:
     * Scans local /24 subnet to find the running ServONVIF server port 8080 automatically.
     */
    fun discoverServerOnNetwork(onServerFound: (String) -> Unit, onScanComplete: (Boolean) -> Unit) {
        val executor = Executors.newFixedThreadPool(32)
        val currentIp = configRepo.serverIp
        val ipParts = currentIp.split(".")
        if (ipParts.size != 4) {
            onScanComplete(false)
            return
        }

        val subnetPrefix = "${ipParts[0]}.${ipParts[1]}.${ipParts[2]}"
        val found = AtomicBoolean(false)

        for (host in 1..254) {
            val targetIp = "$subnetPrefix.$host"
            executor.submit {
                if (found.get()) return@submit
                try {
                    val socket = Socket()
                    socket.connect(InetSocketAddress(targetIp, configRepo.serverPort), 600)
                    socket.close()

                    // Verify if it's ServONVIF API
                    val testUrl = "http://$targetIp:${configRepo.serverPort}/api/cameras/"
                    val req = Request.Builder().url(testUrl).build()
                    client.newCall(req).execute().use { resp ->
                        if (resp.isSuccessful && !found.getAndSet(true)) {
                            Log.d("ServOnvifDiscovery", "Discovered ServONVIF Server at: $targetIp")
                            onServerFound(targetIp)
                        }
                    }
                } catch (e: Exception) {
                    // Host not reachable or not ServONVIF
                }
            }
        }

        executor.shutdown()
        Thread {
            executor.awaitTermination(6, TimeUnit.SECONDS)
            onScanComplete(found.get())
        }.start()
    }
}
