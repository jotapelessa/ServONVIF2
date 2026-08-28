package com.servonvif.client.data.repository

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ConcurrentLinkedQueue

object AppLogger {

    private const val MAX_LOGS = 500
    private val logQueue = ConcurrentLinkedQueue<String>()
    private val timeFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())
    private val isoFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
    private var isInitialized = false
    private var cachedVersion = "002.002.128"

    fun init(context: Context) {
        if (isInitialized) return
        isInitialized = true

        cachedVersion = getAppVersion(context)

        val oldHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            e("CRASH", "FATAL UNCAUGHT EXCEPTION on thread ${thread.name}: ${throwable.message}", throwable)
            oldHandler?.uncaughtException(thread, throwable)
        }

        i("SYSTEM", "AppLogger inicializado com sucesso. Versão: $cachedVersion")
    }

    private fun getAppVersion(context: Context): String {
        return try {
            val pInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(context.packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            val vCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }
            "v${pInfo.versionName} (Code: $vCode)"
        } catch (e: Exception) {
            "v002.002.128"
        }
    }

    fun i(tag: String, message: String) {
        val entry = "[${timeFormat.format(Date())}] [INFO] [$tag] $message"
        addLog(entry)
        Log.i("ServONVIF_$tag", message)
    }

    fun d(tag: String, message: String) {
        val entry = "[${timeFormat.format(Date())}] [DEBUG] [$tag] $message"
        addLog(entry)
        Log.d("ServONVIF_$tag", message)
    }

    fun w(tag: String, message: String) {
        val entry = "[${timeFormat.format(Date())}] [WARN] [$tag] $message"
        addLog(entry)
        Log.w("ServONVIF_$tag", message)
    }

    fun e(tag: String, message: String, throwable: Throwable? = null) {
        val stackTrace = throwable?.let { "\n" + Log.getStackTraceString(it) } ?: ""
        val entry = "[${timeFormat.format(Date())}] [ERROR] [$tag] $message$stackTrace"
        addLog(entry)
        Log.e("ServONVIF_$tag", message, throwable)
    }

    private fun addLog(entry: String) {
        logQueue.add(entry)
        while (logQueue.size > MAX_LOGS) {
            logQueue.poll()
        }
    }

    fun getLogsAsString(): String {
        return logQueue.joinToString("\n")
    }

    fun clear() {
        logQueue.clear()
        i("SYSTEM", "Console de logs limpo pelo usuário.")
    }

    fun generateFullDiagnosticReport(context: Context): String {
        val configRepo = ServerConfigRepository(context)
        val hasOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Settings.canDrawOverlays(context)) "CONCEDIDA (OK)" else "NEGADA (Necessária para PiP flutuante)"
        } else {
            "AUTOMÁTICA (Android < 6.0)"
        }

        val hwId = try {
            HardwareIdHelper.getHardwareFingerprint(context)
        } catch (e: Exception) {
            "Desconhecido (${e.message})"
        }

        val versionInfo = getAppVersion(context)

        return buildString {
            appendLine("=================================================================")
            appendLine("📺 RELATÓRIO COMPLETO DE DIAGNÓSTICO — SERVONVIF ANDROID TV")
            appendLine("=================================================================")
            appendLine("• Origem da Aplicação : ServONVIF Android TV (Native PiP Sentinel)")
            appendLine("• Versão do APK       : $versionInfo")
            appendLine("• Pacote Android      : ${context.packageName}")
            appendLine("• Dispositivo / Modelo: ${Build.MANUFACTURER} ${Build.MODEL} (${Build.PRODUCT})")
            appendLine("• Sistema Operacional : Android ${Build.VERSION.RELEASE} (API Level: ${Build.VERSION.SDK_INT})")
            appendLine("• ID de Hardware / FP : $hwId")
            appendLine("• Permissão PiP Overlay: $hasOverlay")
            appendLine("• Servidor Configurado: ${configRepo.httpBaseUrl}")
            appendLine("• URL WebSocket       : ${configRepo.wsBaseUrl}/ws/events")
            appendLine("• Duração Padrão PiP  : ${configRepo.pipDurationSeconds} segundos (Tamanho: ${configRepo.pipSize})")
            appendLine("• Data / Hora do Relatório: ${isoFormat.format(Date())}")
            appendLine("=================================================================")
            appendLine("📜 LOGS COMPLETOS DE OPERAÇÃO EM TEMPO REAL:")
            appendLine("=================================================================")
            if (logQueue.isEmpty()) {
                appendLine("Nenhum log registrado até o momento.")
            } else {
                appendLine(getLogsAsString())
            }
            appendLine("=================================================================")
            appendLine("🏁 FIM DO RELATÓRIO DE DIAGNÓSTICO")
            appendLine("=================================================================")
        }
    }

    fun copyReportToClipboard(context: Context): String {
        val report = generateFullDiagnosticReport(context)
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("ServONVIF_TV_Logs", report)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(context, "📋 Logs completos copiados! Cole no chat.", Toast.LENGTH_LONG).show()
        return report
    }
}
