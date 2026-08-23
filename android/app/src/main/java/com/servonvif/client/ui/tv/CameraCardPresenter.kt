package com.servonvif.client.ui.tv

import android.graphics.Color
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.leanback.widget.ImageCardView
import androidx.leanback.widget.Presenter
import com.servonvif.client.R
import com.servonvif.client.data.model.CameraModel

class CameraCardPresenter : Presenter() {

    override fun onCreateViewHolder(parent: ViewGroup): ViewHolder {
        val cardView = ImageCardView(parent.context).apply {
            isFocusable = true
            isFocusableInTouchMode = true
            setBackgroundColor(Color.parseColor("#1E293B"))
            setMainImageDimensions(320, 180) // 16:9 Aspect Ratio
        }
        return ViewHolder(cardView)
    }

    override fun onBindViewHolder(viewHolder: ViewHolder, item: Any?) {
        val camera = item as? CameraModel ?: return
        val cardView = viewHolder.view as ImageCardView

        cardView.titleText = camera.name
        cardView.contentText = if (camera.isActive) "● ONLINE (RTSP Ativo)" else "○ OFFLINE"
        cardView.setMainImage(ContextCompat.getDrawable(cardView.context, R.drawable.app_banner))
    }

    override fun onUnbindViewHolder(viewHolder: ViewHolder) {
        val cardView = viewHolder.view as ImageCardView
        cardView.mainImage = null
    }
}
