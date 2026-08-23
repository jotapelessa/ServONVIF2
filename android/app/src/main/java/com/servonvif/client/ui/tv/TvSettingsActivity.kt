package com.servonvif.client.ui.tv

import android.app.Activity
import android.os.Bundle
import android.view.View
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

    // Size Buttons (Strict 16:9)
    private lateinit var btnSizeMicro: Button
    private lateinit var btnSizeMini: Button
    private lateinit var btnSizeCompact: Button
    private lateinit var btnSizeLarge: Button

    // Duration Buttons
    private lateinit var btnDur5s: Button
    private lateinit var btnDur10s: Button
    private lateinit var btnDur15s: Button
    private lateinit var btnDur30s: Button

    private var selectedPosition = ServerConfigRepository.POSITION_TOP_RIGHT
    private var selectedSize = ServerConfigRepository.SIZE_MINI
    private var selectedDuration = 10

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_settings)

        configRepo = ServerConfigRepository(this)

        initViews()
        loadCurrentSettings()
        setupListeners()
        setupFocusEffects()
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

        btnSizeMicro = findViewById(R.id.btnSizeMicro)
        btnSizeMini = findViewById(R.id.btnSizeMini)
        btnSizeCompact = findViewById(R.id.btnSizeCompact)
        btnSizeLarge = findViewById(R.id.btnSizeLarge)

        btnDur5s = findViewById(R.id.btnDur5s)
        btnDur10s = findViewById(R.id.btnDur10s)
        btnDur15s = findViewById(R.id.btnDur15s)
        btnDur30s = findViewById(R.id.btnDur30s)
    }

    private fun setupFocusEffects() {
        val focusableButtons = listOf(
            btnPosTopRight, btnPosTopLeft, btnPosBottomRight, btnPosBottomLeft, btnPosCenter,
            btnSizeMicro, btnSizeMini, btnSizeCompact, btnSizeLarge,
            btnDur5s, btnDur10s, btnDur15s, btnDur30s,
            btnTestConnection, btnSaveSettings
        )

        for (btn in focusableButtons) {
            btn.setOnFocusChangeListener { v, hasFocus ->
                if (hasFocus) {
                    v.animate().scaleX(1.06f).scaleY(1.06f).setDuration(150).start()
                } else {
                    v.animate().scaleX(1.0f).scaleY(1.0f).setDuration(150).start()
                }
            }
        }
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
        btnPosTopRight.setBackgroundResource(if (selectedPosition == ServerConfigRepository.POSITION_TOP_RIGHT) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnPosTopLeft.setBackgroundResource(if (selectedPosition == ServerConfigRepository.POSITION_TOP_LEFT) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnPosBottomRight.setBackgroundResource(if (selectedPosition == ServerConfigRepository.POSITION_BOTTOM_RIGHT) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnPosBottomLeft.setBackgroundResource(if (selectedPosition == ServerConfigRepository.POSITION_BOTTOM_LEFT) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnPosCenter.setBackgroundResource(if (selectedPosition == ServerConfigRepository.POSITION_CENTER) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
    }

    private fun updateSizeUI() {
        btnSizeMicro.setBackgroundResource(if (selectedSize == ServerConfigRepository.SIZE_MICRO) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnSizeMini.setBackgroundResource(if (selectedSize == ServerConfigRepository.SIZE_MINI || selectedSize == ServerConfigRepository.SIZE_SMALL) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnSizeCompact.setBackgroundResource(if (selectedSize == ServerConfigRepository.SIZE_COMPACT || selectedSize == ServerConfigRepository.SIZE_MEDIUM) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnSizeLarge.setBackgroundResource(if (selectedSize == ServerConfigRepository.SIZE_LARGE) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
    }

    private fun updateDurationUI() {
        btnDur5s.setBackgroundResource(if (selectedDuration == 5) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnDur10s.setBackgroundResource(if (selectedDuration == 10) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnDur15s.setBackgroundResource(if (selectedDuration == 15) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
        btnDur30s.setBackgroundResource(if (selectedDuration == 30) R.drawable.btn_tv_action_blue_selector else R.drawable.btn_tv_action_dark_selector)
    }

    private fun setupListeners() {
        btnPosTopRight.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_TOP_RIGHT; updatePositionUI() }
        btnPosTopLeft.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_TOP_LEFT; updatePositionUI() }
        btnPosBottomRight.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_BOTTOM_RIGHT; updatePositionUI() }
        btnPosBottomLeft.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_BOTTOM_LEFT; updatePositionUI() }
        btnPosCenter.setOnClickListener { selectedPosition = ServerConfigRepository.POSITION_CENTER; updatePositionUI() }

        btnSizeMicro.setOnClickListener { selectedSize = ServerConfigRepository.SIZE_MICRO; updateSizeUI() }
        btnSizeMini.setOnClickListener { selectedSize = ServerConfigRepository.SIZE_MINI; updateSizeUI() }
        btnSizeCompact.setOnClickListener { selectedSize = ServerConfigRepository.SIZE_COMPACT; updateSizeUI() }
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
