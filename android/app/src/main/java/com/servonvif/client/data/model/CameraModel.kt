package com.servonvif.client.data.model

import com.google.gson.annotations.SerializedName

data class CameraModel(
    @SerializedName("id")
    val id: Int,

    @SerializedName("name")
    val name: String,

    @SerializedName("rtsp_url")
    val rtspUrl: String,

    @SerializedName("ip_address")
    val ipAddress: String?,

    @SerializedName("is_active")
    val isActive: Boolean,

    @SerializedName("sensitivity")
    val sensitivity: Float,

    @SerializedName("roi_polygon")
    val roiPolygon: List<List<Float>>?
)
