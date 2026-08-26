package com.servonvif.client.data.model

import com.google.gson.annotations.SerializedName

data class EventPayload(
    @SerializedName("type")
    val type: String,

    @SerializedName("camera_id")
    val cameraId: Int,

    @SerializedName("camera_name")
    val cameraName: String,

    @SerializedName("timestamp")
    val timestamp: String,

    @SerializedName("score")
    val score: Float,

    @SerializedName("thumbnail_url")
    val thumbnailUrl: String?,

    @SerializedName("mjpeg_url")
    val mjpegUrl: String?,

    @SerializedName("site_name")
    var siteName: String? = null,

    @SerializedName("server_base_url")
    var serverBaseUrl: String? = null
)
