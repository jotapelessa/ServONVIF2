package com.servonvif.client.ui.tv

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat
import com.servonvif.client.R
import com.servonvif.client.data.repository.ServerConfigRepository
import com.servonvif.client.network.ServOnvifApiClient
import kotlin.concurrent.thread

class TvSettingsActivity : Activity() {

    private lateinit var etServerIp: EditText
    private lateinit var etServerPort: EditText
    private lateinit var swSoundAlert: SwitchCompat
    private lateinit var swAutoStart: SwitchCompat
    private lateinit var btnTestConnection: Button
    private lateinit var btnSaveSettings: Button
    private lateinit var tvStatusMessage: TextView
    private lateinit var configRepo: ServerConfigRepository

    // Position Buttons
    private lateinit var btnPosTopRight: Button
    private lateinit var btnPosTopLeft: Button
    private lateinit var btnPosBottomRight: Button
    private lateinit var btnPosBottomLeft: Button
    private lateinit var btnPosCenter: Button

    // Size Buttons
    private lateinit var btnSizeSmall: Button
    private lateinit var btnSizeMedium: Button
    private lateinit var btnSizeLarge: Button

    // Duration Buttons
    private lateinit var btnDur5s: Button
    private lateinit var btnDur10s: Button
    private lateinit var btnDur15s: Button
    private lateinit var btnDur30s: Button

    private var selectedPosition = ServerConfigRepository.POSITION_TOP_RIGHT
    private var selectedSize = ServerConfigRepository.SIZE_SMALL
    private var selectedDuration = 10

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_settings)

        configRepo = ServerConfigRepository(this)

        initViews()
        loadCurrentSettings()
        setupListeners()
    }

    private fun initViews() {
        etServerIp = findViewById(R.id.etTvServerIp)
        etServerPort = findViewById(R.id.etTvServerPort)
        swSoundAlert = findViewById(R.id.swTvSoundAlert)
        swAutoStart = findViewById(R.id.swTvAutoStart)
        btnTestConnection = findViewById(R.id.btnTvTestConnection)
        btnSaveSettings = findViewById(R.id.btnTvSaveSettings)
        tvStatusMessage = findViewById(R.id.tvTvStatusMessage)

        btnPosTopRight = findViewById(R.id.btnPosTopRight)
        btnPosTopLeft = findViewById(R.id.btnPosTopLeft)
        btnPosBottomRight = findViewById(R.id.btnPosBottomRight)
        btnPosBottomLeft = findViewById(R.id.btnPosBottomLeft)
        btnPosCenter = findViewById(R.id.btnPosCenter)

        btnSizeSmall = findViewById(R.id.btnSizeSmall)
        btnSizeMedium = findViewById(R.id.btnSizeMedium)
        btnSizeLarge = findViewById(R.id.btnSizeLarge)

        btnDur5s = findViewById(R.id.btnDur5s)
        btnDur10s = findViewById(R.id.btnDur10s)
        btnDur15s = findViewById(R.id.btnDur15s)
        btnDur30s = findViewById(R.id.btnDur30s)
    }

    private fun loadCurrentSettings() {
        etServerIp.setText(configRepo.serverIp)
        etServerPort.setText(configRepo.serverPort.toString())
        swSoundAlert.isChecked = configRepo.isSoundAlertEnabled
        swAutoStart.isChecked = configRepo.isAutoStartOnBoot

        selectedPosition = configRepo.pipPosition
        selectedSize = configRepo.pipSize
        selectedDuration = configRepo.pipDurationSeconds

        updatePositionUI()
        updateSizeUI()
        updateDurationUI()
    }

    private fun updatePositionUI() {
        val activeColor = ContextCompat.getColor(this, R.color.blue_primary)
        val inactiveColor = ContextCompat.getColor(this, R.color.card_bg)

        btnPosTopRight.setBackgroundColor(if (selectedPosition == ServerConfigRepository.POSITION_TOP_RIGHT) activeColor else inactiveColor)
        btnPosTopLeft.setBackgroundColor(if (selectedPosition == ServerConfigRepository.POSITION_TOP_LEFT) activeColor else inactiveColor)
        btnPosBottomRight.setBackgroundColor(if (selectedPosition == ServerConfigRepository.POSITION_BOTTOM_RIGHT) activeColor else inactiveColor)
        btnPosBottomLeft.setBackgroundColor(if (selectedPosition == ServerConfigRepository.POSITION_BOTTOM_LEFT) activeColor else inactiveColor)
        btnPosCenter.setBackgroundColor(if (selectedPosition == ServerConfigRepository.POSITION_CENTER) activeColor else inactiveColor)
    }

    private fun updateSizeUI() {
        val activeColor = ContextCompat.getColor(this, R.color.blue_primary)
        val inactiveColor = ContextCompat.getColor(this, R.color.card_bg)

        btnSizeSmall.setBackgroundColor(if (selectedSize == ServerConfigRepository.SIZE_SMALL) activeColor else inactiveColor)
        btnSizeMedium.setBackgroundColor(if (selectedSize == ServerConfigRepository.SIZE_MEDIUM) activeColor else inactiveColor)
        btnSizeLarge.setBackgroundColor(if (selectedSize == ServerConfigRepository.SIZE_LARGE) activeColor else inactiveColor)
    }

    private fun updateDurationUI() {
        val activeColor = ContextCompat.getColor(this, R.color.blue_primary)
        val inactiveColor = ContextCompat.getColor(this, R.color.card_bg)

        btnDur5s.setBackgroundColor(if (selectedDuration == 5) activeColor else inactiveColor)
        btnDur10s.setBackgroundColor(if (selectedDuration == 10) activeColor else inactiveColor)
        btnDur15s.setBackgroundColor(if (selectedDuration == 15) activeColor else inactiveColor)
        btnDur30s.setBackgroundColor(if (selectedDuration == 30) activeColor else inactiveColor)
    }

    private fun setupListeners() {
        btnPosTopRight.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_TOP_RIGHT; updatePositionUI() }
        btnPosTopLeft.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_TOP_LEFT; updatePositionUI() }
        btnPosBottomRight.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_BOTTOM_RIGHT; updatePositionUI() }
        btnPosBottomLeft.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_BOTTOM_LEFT; updatePositionUI() }
        btnPosCenter.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_CENTER; updatePositionUI() }

        btnSizeSmall.setOnClickListener { selectedSize = ServerConfigRepository.SIZE_SMALL; updateSizeUI() }
        btnSizeMedium.setOnClickListener { selectedSize = ServerConfigRepository.SIZE_MEDIUM; updateSizeUI() }
        btnSizeLarge.setOnClickListener { selectedSize = ServerConfigRepository.SIZE_LARGE; updateSizeUI() }

        btnDur5s.setOnClickListener { selectedDuration = 5; updateDurationUI() }
        btnDur10s.setOnClickListener { selectedDuration = 10; updateDurationUI() }
        btnDur15s.setOnClickListener { selectedDuration = 15; updateDurationUI() }
        btnDur30s.setOnClickListener { selectedDuration = 30; updateDurationUI() }

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
                configRepo.pipPosition = selectedPosition
                configRepo.pipSize = selectedSize
                configRepo.pipDurationSeconds = selectedDuration

                Toast.makeText(this, "Configurações salvas com sucesso!", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }
}
