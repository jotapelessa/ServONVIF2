package com.servonvif.client.ui.main

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.servonvif.client.R
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.service.MonitoringForegroundService

class MainActivity : AppCompatActivity() {

    private lateinit var etServerIp: EditText
    private lateinit var btnToggleService: Button
    private lateinit var btnSaveIp: Button
    private lateinit var tvStatus: TextView
    private lateinit var configRepo: ServerConfigRepository
    private var isServiceRunning = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        configRepo = ServerConfigRepository(this)
        etServerIp = findViewById(R.id.etServerIp)
        btnToggleService = findViewById(R.id.btnToggleService)
        tvStatus = findViewById(R.id.tvStatus)

        etServerIp.setText(configRepo.serverIp)

        btnToggleService.setOnClickListener {
            val newIp = etServerIp.text.toString().trim()
            if (newIp.isNotEmpty()) {
                configRepo.serverIp = newIp
            }

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
        tvStatus.text = "Status: Conectado a ${configRepo.serverIp} e escutando alertas em segundo plano"
        Toast.makeText(this, "Monitoramento ativado com sucesso!", Toast.LENGTH_SHORT).show()
    }

    private fun stopMonitoringService() {
        val intent = Intent(this, MonitoringForegroundService::class.java)
        stopService(intent)
        isServiceRunning = false
        btnToggleService.text = "Conectar Monitoramento"
        tvStatus.text = "Status: Desconectado"
    }
}
