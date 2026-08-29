export interface AndroidFile {
  path: string;
  name: string;
  language: string;
  description: string;
  content: string;
}

export const ANDROID_FILES: AndroidFile[] = [
  {
    path: 'android/app-modern/src/main/java/com/servonvif/tv/ui/home/TvHomeScreen.kt',
    name: 'TvHomeScreen.kt',
    language: 'kotlin',
    description: 'Jetpack Compose for TV - Tela Principal Estilo Netflix com Hero Billboard e Carrosséis D-pad',
    content: `package com.servonvif.tv.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.servonvif.tv.model.Camera
import com.servonvif.tv.model.LprDetection
import com.servonvif.tv.model.SecurityEvent

/**
 * ServONVIF PRO - Smart TV 10-Foot Leanback UI
 * Netflix Clone for CCTV & Security
 */
@Composable
fun TvHomeScreen(
    cameras: List<Camera>,
    lprEvents: List<LprDetection>,
    recordings: List<SecurityEvent>,
    onOpenFullscreen: (Camera) -> Unit,
    onOpenMosaic: () -> Unit,
    onTakeSnapshot: (Camera) -> Unit
) {
    var focusedCamera by remember { mutableStateOf(cameras.firstOrNull()) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070B14))
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 48.dp)
        ) {
            // 1. HERO BILLBOARD (55% Height with Vignette Gradient)
            item {
                focusedCamera?.let { cam ->
                    HeroBillboard(
                        camera = cam,
                        onWatchFullscreen = { onOpenFullscreen(cam) },
                        onOpenMosaic = onOpenMosaic,
                        onSnapshot = { onTakeSnapshot(cam) }
                    )
                }
            }

            // 2. RAIL 1: Mosaico Rápido de Câmeras
            item {
                TvContentRail(
                    title = "Mosaico Rápido de Câmeras",
                    subtitle = "Navegue para alterar a câmera em destaque"
                ) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        contentPadding = PaddingValues(horizontal = 48.dp)
                    ) {
                        items(cameras) { cam ->
                            CameraCard16x9(
                                camera = cam,
                                isSelected = focusedCamera?.id == cam.id,
                                onFocused = { focusedCamera = cam },
                                onClick = { onOpenFullscreen(cam) }
                            )
                        }
                    }
                }
            }

            // 3. RAIL 2: Detecções Recentes & LPR
            item {
                TvContentRail(
                    title = "Detecções Recentes & LPR (Placas de Veículos)",
                    subtitle = "Reconhecimento por IA com tags Mercosul"
                ) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        contentPadding = PaddingValues(horizontal = 48.dp)
                    ) {
                        items(lprEvents) { lpr ->
                            LprVehicleCard(
                                lpr = lpr,
                                onClick = { /* Open playback at detection timestamp */ }
                            )
                        }
                    }
                }
            }

            // 4. RAIL 3: Eventos de Movimento & Gravações
            item {
                TvContentRail(
                    title = "Eventos de Movimento & Gravações",
                    subtitle = "Histórico recente com clipes MP4 de alta definição"
                ) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        contentPadding = PaddingValues(horizontal = 48.dp)
                    ) {
                        items(recordings) { evt ->
                            RecordingCard(event = evt, onClick = { /* Play recording */ })
                        }
                    }
                }
            }
        }
    }
}
`
  },
  {
    path: 'android/app-modern/src/main/java/com/servonvif/tv/ui/components/HeroBillboard.kt',
    name: 'HeroBillboard.kt',
    language: 'kotlin',
    description: 'Componente Hero Billboard 16:9 com Transmissão RTSP/MJPEG e OSD Badges',
    content: `package com.servonvif.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.servonvif.tv.model.Camera

@Composable
fun HeroBillboard(
    camera: Camera,
    onWatchFullscreen: () -> Unit,
    onOpenMosaic: () -> Unit,
    onSnapshot: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(440.dp)
    ) {
        // Video Stream Texture / Exoplayer Surface
        VideoStreamSurface(
            streamUrl = camera.streamUrl,
            modifier = Modifier.fillMaxSize()
        )

        // Dark Vignette Gradient Overlay (Netflix Style)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color(0x99070B14),
                            Color(0xFF070B14)
                        ),
                        startY = 100f
                    )
                )
        )

        // OSD Overlays and Badges
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 48.dp, vertical = 24.dp)
        ) {
            // Badges
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                BadgeLive()
                BadgeText(text = camera.resolution)
                BadgeText(text = "\${camera.fps} FPS")
                BadgeText(text = camera.codec)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = camera.name,
                style = MaterialTheme.typography.headlineLarge,
                color = Color.White
            )

            Text(
                text = "📍 \${camera.location} • \${camera.sensor}",
                style = MaterialTheme.typography.bodyMedium,
                color = Color(0xFF94A3B8)
            )

            Spacer(modifier = Modifier.height(16.dp))

            // D-pad Action Buttons
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TvButton(
                    text = "▶ Assistir em Tela Cheia",
                    isPrimary = true,
                    onClick = onWatchFullscreen
                )
                TvButton(
                    text = "⛶ Mosaico 2x2",
                    isPrimary = false,
                    onClick = onOpenMosaic
                )
                TvButton(
                    text = "📸 Snapshot",
                    isPrimary = false,
                    onClick = onSnapshot
                )
            }
        }
    }
}
`
  },
  {
    path: 'android/app-modern/src/main/java/com/servonvif/tv/network/ServOnvifApiService.kt',
    name: 'ServOnvifApiService.kt',
    language: 'kotlin',
    description: 'Interface Retrofit mapeando endpoints do ServONVIF NVR',
    content: `package com.servonvif.tv.network

import com.servonvif.tv.model.*
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path

interface ServOnvifApiService {

    @GET("/api/cameras")
    suspend fun getCameras(): Response<List<CameraDto>>

    @GET("/api/cameras/{id}/frame")
    suspend fun getCameraFrame(@Path("id") cameraId: String): Response<ByteArray>

    @GET("/api/events")
    suspend fun getEvents(): Response<List<SecurityEventDto>>

    @GET("/api/lpr/detections")
    suspend fun getLprDetections(): Response<List<LprDetectionDto>>

    @GET("/api/auth/connection-info")
    suspend fun getConnectionTelemetry(): Response<ConnectionTelemetryDto>
}
`
  },
  {
    path: 'android/app-modern/src/main/java/com/servonvif/tv/network/EventsWebSocketListener.kt',
    name: 'EventsWebSocketListener.kt',
    language: 'kotlin',
    description: 'WebSocket Listener para Alertas de Intrusão e LPR em Tempo Real (ws/events)',
    content: `package com.servonvif.tv.network

import com.google.gson.Gson
import com.servonvif.tv.model.LiveSecurityAlert
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener

class EventsWebSocketListener : WebSocketListener() {

    private val _incomingAlerts = MutableSharedFlow<LiveSecurityAlert>(extraBufferCapacity = 64)
    val incomingAlerts = _incomingAlerts.asSharedFlow()

    private val gson = Gson()

    override fun onMessage(webSocket: WebSocket, text: String) {
        try {
            val alert = gson.fromJson(text, LiveSecurityAlert::class.java)
            _incomingAlerts.tryEmit(alert)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
        // Auto-reconnect with exponential backoff
    }
}
`
  },
  {
    path: 'android/app-modern/src/main/res/drawable/selector_dpad_neon_focus.xml',
    name: 'selector_dpad_neon_focus.xml',
    language: 'xml',
    description: 'Seletor XML de Foco Leanback com Borda Neon Ciano e Vidro Fumê',
    content: `<?xml version="1.0" encoding="utf-8"?>
<selector xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- State: Focused with D-pad -->
    <item android:state_focused="true">
        <shape android:shape="rectangle">
            <solid android:color="#E6131D33" />
            <stroke
                android:width="3dp"
                android:color="#00D2FF" />
            <corners android:radius="12dp" />
        </shape>
    </item>
    
    <!-- State: Default Unfocused -->
    <item>
        <shape android:shape="rectangle">
            <solid android:color="#D9131D33" />
            <stroke
                android:width="1dp"
                android:color="#1E2D4A" />
            <corners android:radius="12dp" />
        </shape>
    </item>
</selector>
`
  },
  {
    path: 'android/app-modern/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    language: 'xml',
    description: 'Manifest do Android TV com suporte Leanback 10-Foot UI e Picture-in-Picture',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.servonvif.tv">

    <!-- Android TV Core Features -->
    <uses-feature
        android:name="android.software.leanback"
        android:required="true" />
    <uses-feature
        android:name="android.hardware.touchscreen"
        android:required="false" />

    <!-- Permissions for RTSP & WebSocket Telemetry -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:name=".ServOnvifTvApp"
        android:allowBackup="true"
        android:banner="@drawable/tv_banner"
        android:icon="@mipmap/ic_launcher"
        android:label="ServONVIF TV PRO"
        android:supportsRtl="true"
        android:theme="@style/Theme.ServOnvifTV">

        <!-- Main Leanback TV Activity -->
        <activity
            android:name=".MainActivity"
            android:banner="@drawable/tv_banner"
            android:configChanges="keyboard|keyboardHidden|navigation|orientation|screenLayout|screenSize|smallestScreenSize"
            android:exported="true"
            android:icon="@mipmap/ic_launcher"
            android:label="ServONVIF TV PRO"
            android:launchMode="singleTask"
            android:supportsPictureInPicture="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
            </intent-filter>
        </activity>

    </application>
</manifest>
`
  }
];
