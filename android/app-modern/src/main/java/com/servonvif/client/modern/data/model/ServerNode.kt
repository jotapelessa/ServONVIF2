package com.servonvif.client.modern.data.model

import com.google.gson.annotations.SerializedName

/**
 * Represents a ServONVIF Server Node in a Multi-Site or Tailscale Mesh topology.
 * e.g. "Casa", "Empresa", "Sítio", "Servidor Tailscale"
 */
data class ServerNode(
    @SerializedName("id")
    val id: String,

    @SerializedName("name")
    val name: String,

    @SerializedName("ip")
    val ip: String,

    @SerializedName("port")
    val port: Int = 8080,

    @SerializedName("is_enabled")
    val isEnabled: Boolean = true
) {
    val httpBaseUrl: String
        get() = "http://$ip:$port"

    val isTailscale: Boolean
        get() = ip.trim().startsWith("100.") || ip.contains(".ts.net")
}
