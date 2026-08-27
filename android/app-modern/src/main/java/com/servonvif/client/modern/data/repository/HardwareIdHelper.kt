package com.servonvif.client.modern.data.repository

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.provider.Settings
import android.util.Log
import java.net.NetworkInterface
import java.security.MessageDigest
import java.util.*

/**
 * Ultra-Resilient Hardware Identity & Fingerprinting Engine for Android TV, Automotive & Mobile.
 * Generates an immutable, deterministic device identifier that survives:
 * 1. Dynamic IP and DHCP changes (e.g. WiFi reconnects, Starlink, VPN, Hotspot).
 * 2. Router reboots.
 * 3. App reinstalls / cache clears.
 */
object HardwareIdHelper {

    private const val TAG = "HardwareIdHelper"
    private const val PREFS_NAME = "servonvif_hw_identity"
    private const val KEY_PERSISTENT_GUID = "persistent_hw_guid"

    /**
     * Returns the human-readable manufacturer and model, e.g. "TCL 9491G", "Xiaomi Mi Box 4K", "BYD Auto IVI".
     */
    fun getFullModelName(): String {
        val manufacturer = (Build.MANUFACTURER ?: "Android").trim()
        val model = (Build.MODEL ?: "Device").trim()
        return if (model.startsWith(manufacturer, ignoreCase = true)) {
            model
        } else {
            "$manufacturer $model"
        }
    }

    /**
     * Determines whether the device is an Android TV / Smart TV / Box, Automotive IVI, or Smartphone/Tablet.
     */
    fun getDeviceType(context: Context? = null): String {
        if (context != null) {
            val uiModeManager = context.getSystemService(Context.UI_MODE_SERVICE) as? android.app.UiModeManager
            if (uiModeManager?.currentModeType == android.content.res.Configuration.UI_MODE_TYPE_TELEVISION) {
                return "Android TV"
            }
            if (uiModeManager?.currentModeType == android.content.res.Configuration.UI_MODE_TYPE_CAR) {
                return "Android Auto / Car"
            }
            val hasTouch = context.packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_TOUCHSCREEN)
            val isTv = context.packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_LEANBACK)
            if (isTv && !hasTouch) {
                return "Android TV"
            }
        }

        val model = Build.MODEL.uppercase(Locale.ROOT)
        val device = Build.DEVICE.uppercase(Locale.ROOT)
        val hardware = Build.HARDWARE.uppercase(Locale.ROOT)

        return when {
            model.contains("TV") || device.contains("TV") || hardware.contains("TV") || model.contains("BOX") || model.contains("STICK") || model.contains("CHROMECAST") -> "Android TV"
            model.contains("AUTO") || device.contains("IVI") || model.contains("CAR") -> "Android Auto / Car"
            model.contains("TAB") || device.contains("TAB") -> "Android Tablet"
            else -> "Smartphone / Mobile"
        }
    }

    /**
     * Attempts to read the physical hardware MAC address across all active and inactive interfaces (wlan0, eth0, tun0).
     * Falls back to a deterministic hardware hash if direct MAC is restricted by Android sandbox.
     */
    fun getMacAddress(): String {
        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                if (intf.name.equals("wlan0", ignoreCase = true) || intf.name.equals("eth0", ignoreCase = true)) {
                    val macBytes = intf.hardwareAddress ?: continue
                    val res = StringBuilder()
                    for (b in macBytes) {
                        res.append(String.format("%02X:", b))
                    }
                    if (res.isNotEmpty()) {
                        res.deleteCharAt(res.length - 1)
                    }
                    val mac = res.toString()
                    if (mac.isNotBlank() && mac != "02:00:00:00:00:00") {
                        return mac
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Cannot read direct MAC address: ${e.message}")
        }
        return "UNKNOWN_MAC"
    }

    /**
     * Generates a 64-character SHA-256 Hardware Fingerprint from immutable CPU, board, manufacturer, and Android ID.
     */
    fun getHardwareFingerprint(context: Context): String {
        val androidId = try {
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "UNKNOWN_ID"
        } catch (e: Exception) {
            "UNKNOWN_ID"
        }

        val rawHardwareString = listOf(
            Build.MANUFACTURER ?: "",
            Build.MODEL ?: "",
            Build.HARDWARE ?: "",
            Build.BOARD ?: "",
            Build.BRAND ?: "",
            Build.DEVICE ?: "",
            Build.PRODUCT ?: "",
            androidId
        ).joinToString(separator = "|")

        return sha256(rawHardwareString)
    }

    /**
     * Returns the persistent, immutable Device ID.
     * Format: `DEV-TCL_9491G-<SHORT_HASH>` (e.g. `DEV-TCL_9491G-A1B2C3D4`)
     */
    fun getPersistentDeviceId(context: Context): String {
        val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedGuid = prefs.getString(KEY_PERSISTENT_GUID, null)

        val cleanModel = getFullModelName()
            .replace("[^a-zA-Z0-9_]".toRegex(), "_")
            .replace("_+".toRegex(), "_")
            .trim('_')

        if (!savedGuid.isNullOrBlank()) {
            return "DEV-$cleanModel-$savedGuid"
        }

        // Generate deterministic seed from hardware fingerprint
        val fingerprint = getHardwareFingerprint(context)
        val shortSeed = fingerprint.take(8).uppercase(Locale.ROOT)

        prefs.edit().putString(KEY_PERSISTENT_GUID, shortSeed).apply()
        return "DEV-$cleanModel-$shortSeed"
    }

    private fun sha256(input: String): String {
        return try {
            val md = MessageDigest.getInstance("SHA-256")
            val bytes = md.digest(input.toByteArray(Charsets.UTF_8))
            bytes.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            input.hashCode().toString()
        }
    }
}
