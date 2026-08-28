package com.servonvif.client.ui.tv

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.servonvif.client.R
import com.servonvif.client.data.model.CameraModel

/**
 * TV-Optimized Horizontal Camera Discovery Row Adapter.
 * Features:
 * - Live MJPEG stream inside each 16:9 card.
 * - 1.05x smooth scale & 12dp elevation on focus.
 * - Live and Motion badges with pulse feedback.
 * - Safe D-pad navigation without thread blocks.
 */
class CameraRowAdapter(
    private var cameras: List<CameraModel>,
    private var serverBaseUrl: String,
    private val onCameraFocused: (CameraModel) -> Unit,
    private val onCameraClicked: (CameraModel) -> Unit
) : RecyclerView.Adapter<CameraRowAdapter.CameraViewHolder>() {

    private val motionCameraIds = mutableSetOf<Int>()

    inner class CameraViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val webStream: WebView = itemView.findViewById(R.id.webCameraStream)
        val tvName: TextView = itemView.findViewById(R.id.tvCardCameraName)
        val tvRes: TextView = itemView.findViewById(R.id.tvCardCameraRes)
        val tvFps: TextView = itemView.findViewById(R.id.tvCardCameraFps)
        val tvLiveBadge: TextView = itemView.findViewById(R.id.tvCardLiveBadge)
        val tvMotionBadge: TextView = itemView.findViewById(R.id.tvCardMotionBadge)

        init {
            webStream.settings.apply {
                javaScriptEnabled = false
                cacheMode = WebSettings.LOAD_NO_CACHE
                useWideViewPort = true
                loadWithOverviewMode = true
            }
            webStream.setBackgroundColor(0xFF090E18.toInt())

            itemView.setOnFocusChangeListener { v, hasFocus ->
                val scale = if (hasFocus) 1.05f else 1.0f
                val elevation = if (hasFocus) 12f else 2f
                v.animate()
                    .scaleX(scale)
                    .scaleY(scale)
                    .translationZ(elevation)
                    .setDuration(140)
                    .setInterpolator(DecelerateInterpolator())
                    .start()

                if (hasFocus && adapterPosition != RecyclerView.NO_POSITION && adapterPosition < cameras.size) {
                    onCameraFocused(cameras[adapterPosition])
                }
            }

            itemView.setOnClickListener {
                if (adapterPosition != RecyclerView.NO_POSITION && adapterPosition < cameras.size) {
                    onCameraClicked(cameras[adapterPosition])
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): CameraViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_camera_tv_card, parent, false)
        return CameraViewHolder(view)
    }

    override fun onBindViewHolder(holder: CameraViewHolder, position: Int) {
        val camera = cameras[position]
        holder.tvName.text = camera.name
        holder.tvRes.text = "5MP • ONVIF RTSP"
        holder.tvFps.text = "25 FPS"
        holder.tvMotionBadge.visibility = if (motionCameraIds.contains(camera.id)) View.VISIBLE else View.GONE

        val streamUrl = "$serverBaseUrl/api/mjpeg/${camera.id}"
        val html = """
            <!DOCTYPE html>
            <html>
            <head><meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no"></head>
            <body style="margin:0;padding:0;background-color:#070B14;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden;">
                <img src="$streamUrl" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'" />
            </body>
            </html>
        """.trimIndent()

        holder.webStream.loadDataWithBaseURL(serverBaseUrl, html, "text/html", "UTF-8", null)
    }

    override fun getItemCount(): Int = cameras.size

    fun updateData(newCameras: List<CameraModel>, newServerBaseUrl: String) {
        cameras = newCameras
        serverBaseUrl = newServerBaseUrl
        notifyDataSetChanged()
    }

    fun setMotion(cameraId: Int, hasMotion: Boolean) {
        if (hasMotion) {
            motionCameraIds.add(cameraId)
        } else {
            motionCameraIds.remove(cameraId)
        }
        val index = cameras.indexOfFirst { it.id == cameraId }
        if (index != -1) {
            notifyItemChanged(index)
        }
    }
}
