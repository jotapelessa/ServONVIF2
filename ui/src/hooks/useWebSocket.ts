"use client";

import { useEffect, useRef, useState } from "react";
import { WS_BASE } from "@/lib/api-client";
import { useAlertStore } from "@/store/useCameraStore";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const addEvent = useAlertStore((state) => state.addEvent);

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio Context alert failed:", e);
    }
  };

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      const ws = new WebSocket(`${WS_BASE}/ws/events`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket connected to ServONVIF Engine");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "MOTION_ALERT" || payload.type === "PLATE_DETECTED") {
            addEvent(payload);
            playAlertSound();
          }
        } catch (e) {
          console.error("Failed to parse WS message:", e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log("WebSocket disconnected. Reconnecting in 3s...");
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [addEvent]);

  return { isConnected };
}
