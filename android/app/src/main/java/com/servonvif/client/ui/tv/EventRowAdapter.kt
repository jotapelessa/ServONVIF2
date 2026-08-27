package com.servonvif.client.ui.tv

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.servonvif.client.R

data class TvEventItem(
    val id: String,
    val title: String,
    val timestamp: String,
    val badge: String
)

class EventRowAdapter(
    private var events: List<TvEventItem>,
    private val onEventClicked: (TvEventItem) -> Unit
) : RecyclerView.Adapter<EventRowAdapter.EventViewHolder>() {

    inner class EventViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val imgThumbnail: ImageView = itemView.findViewById(R.id.imgEventThumbnail)
        val tvTitle: TextView = itemView.findViewById(R.id.tvEventTitle)
        val tvTime: TextView = itemView.findViewById(R.id.tvEventTime)
        val tvBadge: TextView = itemView.findViewById(R.id.tvEventTypeBadge)

        init {
            itemView.setOnFocusChangeListener { v, hasFocus ->
                val scale = if (hasFocus) 1.05f else 1.0f
                val elevation = if (hasFocus) 12f else 2f

                v.animate()
                    .scaleX(scale)
                    .scaleY(scale)
                    .translationZ(elevation)
                    .setDuration(150)
                    .setInterpolator(DecelerateInterpolator())
                    .start()
            }

            itemView.setOnClickListener {
                if (adapterPosition != RecyclerView.NO_POSITION) {
                    onEventClicked(events[adapterPosition])
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): EventViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_event_tv_card, parent, false)
        return EventViewHolder(view)
    }

    override fun onBindViewHolder(holder: EventViewHolder, position: Int) {
        val item = events[position]
        holder.tvTitle.text = item.title
        holder.tvTime.text = item.timestamp
        holder.tvBadge.text = item.badge
        holder.imgThumbnail.setImageResource(R.drawable.app_banner)
    }

    override fun getItemCount(): Int = events.size

    fun updateEvents(newEvents: List<TvEventItem>) {
        events = newEvents
        notifyDataSetChanged()
    }
}
