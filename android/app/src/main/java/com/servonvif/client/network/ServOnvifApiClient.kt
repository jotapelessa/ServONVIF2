package com.servonvif.client.network

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.servonvif.client.data.model.CameraModel
import com.servonvif.client.data.repository.ServerConfigRepository
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

class ServOnvifApiClient(private val configRepo: ServerConfigRepository) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(4, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
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
}
