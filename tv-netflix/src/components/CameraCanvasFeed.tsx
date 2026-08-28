import React, { useEffect, useRef } from 'react';
import { Camera } from '../types';

interface CameraCanvasFeedProps {
  camera: Camera;
  className?: string;
  showScanlines?: boolean;
  showOsd?: boolean;
  isHero?: boolean;
}

export const CameraCanvasFeed: React.FC<CameraCanvasFeedProps> = ({
  camera,
  className = '',
  showScanlines = false,
  showOsd = true,
  isHero = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;

    // Simulation variables for movement in CCTV scene
    let carX = -100;
    let personX = 80;
    let personDirection = 1;
    let leavesOffset = 0;

    const render = () => {
      frameCount++;
      const width = canvas.width;
      const height = canvas.height;

      // If camera is offline, render the exact offline screen requested
      if (camera.status === 'offline') {
        ctx.fillStyle = '#060911';
        ctx.fillRect(0, 0, width, height);

        // Subtle static noise
        const imgData = ctx.getImageData(0, 0, width, height);
        const buffer = new Uint32Array(imgData.data.buffer);
        for (let i = 0; i < buffer.length; i += 4) {
          if (Math.random() > 0.96) {
            buffer[i] = 0xff222222;
          }
        }
        ctx.putImageData(imgData, 0, 0);

        // Center No Signal Alert
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(width * 0.1, height * 0.35, width * 0.8, height * 0.3);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(width * 0.1, height * 0.35, width * 0.8, height * 0.3);

        ctx.font = `bold ${Math.max(14, Math.floor(width / 32))}px Inter, sans-serif`;
        ctx.fillStyle = '#EF4444';
        ctx.textAlign = 'center';
        ctx.fillText('🔴 SEM SINAL • CÂMERA DESCONECTADA', width / 2, height / 2 - 8);

        ctx.font = `${Math.max(10, Math.floor(width / 48))}px monospace`;
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`IP: ${camera.ip} • Tentando reconexão automática RTSP...`, width / 2, height / 2 + 16);
        return;
      }

      // 1. Draw CCTV Scene Background
      const isNight = camera.nightVision;
      
      if (isNight) {
        // Greenish/IR Monochrome Night Vision
        ctx.fillStyle = '#0B1510';
        ctx.fillRect(0, 0, width, height);
      } else {
        // Deep realistic CCTV palette
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#101B2E');
        bgGrad.addColorStop(0.5, '#16233B');
        bgGrad.addColorStop(1, '#0D1726');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw Environment elements based on camera id
      if (camera.id === 'cam-01') {
        // Gate & Garage driveway
        ctx.fillStyle = isNight ? '#142018' : '#1C2942';
        ctx.beginPath();
        ctx.moveTo(width * 0.1, height);
        ctx.lineTo(width * 0.35, height * 0.45);
        ctx.lineTo(width * 0.65, height * 0.45);
        ctx.lineTo(width * 0.9, height);
        ctx.fill();

        // Road markings
        ctx.strokeStyle = isNight ? '#2A4D38' : '#3B82F6';
        ctx.setLineDash([12, 10]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(width * 0.5, height);
        ctx.lineTo(width * 0.5, height * 0.48);
        ctx.stroke();
        ctx.setLineDash([]);

        // Gate Structure
        ctx.strokeStyle = isNight ? '#2E543C' : '#475569';
        ctx.lineWidth = 4;
        ctx.strokeRect(width * 0.28, height * 0.3, width * 0.44, height * 0.2);
        
        // Gate bars
        for (let x = width * 0.3; x < width * 0.7; x += 16) {
          ctx.beginPath();
          ctx.moveTo(x, height * 0.3);
          ctx.lineTo(x, height * 0.5);
          ctx.stroke();
        }

        // Animated Car Driving In
        carX = (carX + 1.2) % (width + 200);
        const actualCarX = carX - 100;
        if (actualCarX > -120 && actualCarX < width + 100) {
          const carY = height * 0.68 + (actualCarX / width) * 15;
          const carW = 120;
          const carH = 45;

          ctx.fillStyle = '#0284C7';
          ctx.beginPath();
          ctx.roundRect(actualCarX, carY, carW, carH, 8);
          ctx.fill();

          // Roof
          ctx.fillStyle = '#0369A1';
          ctx.beginPath();
          ctx.roundRect(actualCarX + 25, carY - 22, 65, 24, 6);
          ctx.fill();

          // Headlights glow
          ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
          ctx.beginPath();
          ctx.moveTo(actualCarX + carW, carY + 10);
          ctx.lineTo(actualCarX + carW + 120, carY - 20);
          ctx.lineTo(actualCarX + carW + 140, carY + 60);
          ctx.closePath();
          ctx.fill();

          // LPR Detection Box overlay (AI tracking green rectangle)
          ctx.strokeStyle = '#22C55E';
          ctx.lineWidth = 2;
          ctx.strokeRect(actualCarX + carW - 20, carY + 15, 34, 16);
          ctx.fillStyle = '#22C55E';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('BRA2E19', actualCarX + carW - 20, carY + 12);
        }
      } else if (camera.id === 'cam-02') {
        // Pool & Garden
        ctx.fillStyle = isNight ? '#0A2518' : '#0284C7';
        ctx.beginPath();
        ctx.ellipse(width * 0.5, height * 0.65, width * 0.35, height * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pool Water shimmer
        ctx.fillStyle = isNight ? 'rgba(52, 211, 153, 0.2)' : 'rgba(56, 189, 248, 0.3)';
        for (let i = 0; i < 5; i++) {
          const waveY = height * 0.55 + i * 14 + Math.sin(frameCount * 0.05 + i) * 3;
          ctx.fillRect(width * 0.28, waveY, width * 0.44, 2);
        }
      } else if (camera.id === 'cam-03') {
        // Perimeter Wall & Intrusion Box
        ctx.fillStyle = isNight ? '#122417' : '#1E293B';
        ctx.fillRect(0, height * 0.4, width, height * 0.6);

        // Wire fence
        ctx.strokeStyle = isNight ? '#22543D' : '#64748B';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < width; i += 20) {
          ctx.beginPath();
          ctx.moveTo(i, height * 0.4);
          ctx.lineTo(i + 15, height * 0.25);
          ctx.stroke();
        }

        // Animated Walking Person with Motion Tracking Box (ALERTA ATIVO)
        personX += personDirection * 0.8;
        if (personX > width * 0.75) personDirection = -1;
        if (personX < width * 0.15) personDirection = 1;

        const pY = height * 0.55;
        ctx.fillStyle = '#E2E8F0';
        // Head
        ctx.beginPath();
        ctx.arc(personX, pY - 35, 7, 0, Math.PI * 2);
        ctx.fill();
        // Body
        ctx.fillRect(personX - 5, pY - 26, 10, 22);
        // Legs
        const legSwing = Math.sin(frameCount * 0.15) * 8;
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(personX - 2, pY - 4);
        ctx.lineTo(personX - 5 - legSwing, pY + 15);
        ctx.moveTo(personX + 2, pY - 4);
        ctx.lineTo(personX + 5 + legSwing, pY + 15);
        ctx.stroke();

        // AI Intrusion Alert Box (Flashing Red/Orange Neon)
        const isBlink = Math.floor(frameCount / 15) % 2 === 0;
        ctx.strokeStyle = isBlink ? '#EF4444' : '#F97316';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(personX - 20, pY - 50, 40, 72);
        
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(personX - 20, pY - 64, 75, 14);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillText('PESSOA 98%', personX - 16, pY - 53);
      } else {
        // General interior or garden
        ctx.fillStyle = isNight ? '#0F1E14' : '#131D33';
        ctx.fillRect(0, height * 0.45, width, height * 0.55);
      }

      // Leaves / Tree motion in garden
      leavesOffset = Math.sin(frameCount * 0.03) * 4;
      ctx.fillStyle = isNight ? '#163824' : '#065F46';
      ctx.beginPath();
      ctx.arc(width * 0.12 + leavesOffset, height * 0.25, width * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Subtle CCTV Grain
      if (Math.random() > 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.fillRect(0, 0, width, height);
      }

      // OSD Timestamp and Camera Details on Canvas
      if (showOsd) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + String(Math.floor((frameCount % 30) * 33)).padStart(3, '0');

        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(8, 8, 220, 22);
        ctx.fillStyle = '#00D2FF';
        ctx.fillText(`SERVONVIF • ${dateStr} ${timeStr}`, 14, 23);

        // Bitrate & FPS in top right
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(width - 150, 8, 142, 22);
        ctx.fillStyle = '#38BDF8';
        ctx.textAlign = 'right';
        ctx.fillText(`${camera.fps} FPS • ${camera.bitrate}`, width - 14, 23);
        ctx.textAlign = 'left';
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [camera, showOsd]);

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#070B14] select-none ${className}`}>
      <canvas
        ref={canvasRef}
        width={isHero ? 1280 : 640}
        height={isHero ? 720 : 360}
        className="w-full h-full object-cover"
      />
      {showScanlines && <div className="absolute inset-0 cctv-scanlines pointer-events-none" />}
    </div>
  );
};
