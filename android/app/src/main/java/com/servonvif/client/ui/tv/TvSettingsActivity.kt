package com.servonvif.client.ui.tv

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import com.servonvif.client.R
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.network.ServOnvifApiClient
import kotlin.concurrent.thread

class TvSettingsActivity : Activity() {

    private lateinit var etServerIp: EditText
    private lateinit var etServerPort: EditText
    private lateinit var swSoundAlert: Switch
    private lateinit var swAutoStart: Switch
    private lateinit var btnTestConnection: Button
    private lateinit var btnSaveSettings: Button
    private lateinit var tvStatusMessage: TextView
    private lateinit var configRepo: ServerConfigRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_settings)

        configRepo = ServerConfigRepository(this)

        etServerIp = findViewById(R.id.etTvServerIp)
        etServerPort = findViewById(R.id.etTvServerPort)
        swSoundAlert = findViewById(R.id.swTvSoundAlert)
        swAutoStart = findViewById(R.id.swTvAutoStart)
        btnTestConnection = findViewById(R.id.btnTvTestConnection)
        btnSaveSettings = findViewById(R.id.btnTvSaveSettings)
        tvStatusMessage = findViewById(R.id.tvTvStatusMessage)

        loadCurrentSettings()
        setupListeners()
    }

    private fun loadCurrentSettings() {
        etServerIp.setText(configRepo.serverIp)
        etServerPort.setText(configRepo.serverPort.toString())
        swSoundAlert.isChecked = configRepo.isSoundAlertEnabled
        swAutoStart.isChecked = configRepo.isAutoStartOnBoot
    }

    private fun setupListeners() {
        btnTestConnection.setOnClickListener {
            val ip = etServerIp.text.toString().trim()
            val port = etServerPort.text.toString().toIntOrNull() ?: 8080

            tvStatusMessage.text = "Testando conexão com http://$ip:$port..."
            thread {
                val tempRepo = ServerConfigRepository(this).apply {
                    this.serverIp = ip
                    this.serverPort = port
                }
                val apiClient = ServOnvifApiClient(tempRepo)
                val isSuccess = apiClient.testConnection()

                runOnUiThread {
                    if (isSuccess) {
                        tvStatusMessage.text = "✅ Conexão estabelecida com sucesso com o servidor!"
                    } else {
                        tvStatusMessage.text = "❌ Não foi possível conectar ao servidor em $ip:$port"
                    }
                }
            }
        }

        btnSaveSettings.setOnClickListener {
            val ip = etServerIp.text.toString().trim()
            val port = etServerPort.text.toString().toIntOrNull() ?: 8080

            if (ip.isNotEmpty()) {
                configRepo.serverIp = ip
                configRepo.serverPort = port
                configRepo.isSoundAlertEnabled = swSoundAlert.isChecked
                configRepo.isAutoStartOnBoot = swAutoStart.isChecked

                Toast.makeText(this, "Configurações salvas com sucesso!", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }
}
