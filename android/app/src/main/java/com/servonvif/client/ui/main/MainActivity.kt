package com.servonvif.client.ui.main

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.servonvif.client.R
import com.servonvif.client.service.MonitoringForegroundService

class MainActivity : AppCompatActivity() {

    private lateinit var etServerIp: EditText
    private lateinit var btnToggleService: Button
    private lateinit var tvStatus: TextView
    private var isServiceRunning = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        etServerIp = findViewById(R.id.etServerIp)
        btnToggleService = findViewById(R.id.btnToggleService)
        tvStatus = findViewById(R.id.tvStatus)

        btnToggleService.setOnClickListener {
            if (!isServiceRunning) {
                startMonitoringService()
            } else {
                stopMonitoringService()
            }
        }
    }

    private fun startMonitoringService() {
        val intent = Intent(this, MonitoringForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        isServiceRunning = true
        btnToggleService.text = "Desconectar Monitoramento"
        tvStatus.text = "Status: Conectado e escutando alertas em background"
    }

    private fun stopMonitoringService() {
        val intent = Intent(this, MonitoringForegroundService::class.java)
        stopService(intent)
        isServiceRunning = false
        btnToggleService.text = "Conectar Monitoramento"
        tvStatus.text = "Status: Desconectado"
    }
}
