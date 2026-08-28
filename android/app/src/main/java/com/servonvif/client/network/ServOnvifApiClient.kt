package com.servonvif.client.network

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.servonvif.client.data.model.CameraModel
import com.servonvif.client.data.repository.HardwareIdHelper
import com.servonvif.client.data.repository.ServerConfigRepository
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.net.InetSocketAddress
import java.net.Socket
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class ServOnvifApiClient(private val configRepo: ServerConfigRepository) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
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

    fun testConnection(context: Context? = null): Boolean {
        return pingServer(context)
    }

    /**
     * Sends a rich ping to /api/devices/ping with device hardware identity and model
     * so that the administrator web panel can immediately highlight the exact device that tested.
     */
    fun pingServer(context: Context? = null): Boolean {
        val fullModel = HardwareIdHelper.getFullModelName()
        val deviceType = HardwareIdHelper.getDeviceType()
        val mac = HardwareIdHelper.getMacAddress()
        val deviceId = if (context != null) {
            HardwareIdHelper.getPersistentDeviceId(context)
        } else {
            "DEV-${fullModel.replace(" ", "_")}"
        }
        val fingerprint = if (context != null) {
            HardwareIdHelper.getHardwareFingerprint(context)
        } else {
            "UNKNOWN_FP"
        }

        val jsonPayload = mapOf(
            "device_id" to deviceId,
            "device_name" to "$deviceType ($fullModel)",
            "device_type" to deviceType,
            "manufacturer_model" to fullModel,
            "mac_address" to mac,
            "hardware_fingerprint" to fingerprint,
            "app_version" to "002.002.126"
        )

        val jsonString = gson.toJson(jsonPayload)
        val body = jsonString.toRequestBody("application/json; charset=utf-8".toMediaType())

        val request = Request.Builder()
            .url("${configRepo.httpBaseUrl}/api/devices/ping")
            .post(body)
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Log.d("ServOnvifApiClient", "Ping successfully registered on server for device $deviceId ($fullModel)")
                    true
                } else {
                    // Fallback to basic /api/cameras/ test
                    val fallbackReq = Request.Builder().url("${configRepo.httpBaseUrl}/api/cameras/").get().build()
                    client.newCall(fallbackReq).execute().use { it.isSuccessful }
                }
            }
        } catch (e: Exception) {
            Log.w("ServOnvifApiClient", "Ping exception: ${e.message}")
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
