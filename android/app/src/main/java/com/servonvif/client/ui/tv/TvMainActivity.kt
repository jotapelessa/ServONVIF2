package com.servonvif.client.ui.tv

import android.app.Activity
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.TextView
import com.servonvif.client.R

class TvMainActivity : Activity() {

    private lateinit var tvWebView: WebView
    private lateinit var tvServerStatus: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_tv_main)

        tvWebView = findViewById(R.id.tvWebView)
        tvServerStatus = findViewById(R.id.tvServerStatus)

        // Leanback optimized WebView for TV large screen grid
        tvWebView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        tvServerStatus.text = "ServONVIF TV Dashboard - Conectando..."
        tvWebView.loadUrl("http://192.168.1.100:8080/")
    }
}
