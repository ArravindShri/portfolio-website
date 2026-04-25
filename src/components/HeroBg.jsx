import { useEffect, useRef } from 'react';

export default function HeroBg({ variant = 'chart' }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (variant === 'none') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0;
    let H = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const POINTS = 240;
    const series = [];
    let seed = 1.3;
    for (let i = 0; i < POINTS; i++) {
      seed += (Math.sin(i * 0.08) + (Math.random() - 0.5) * 0.9) * 0.4;
      series.push(seed);
    }
    let t = 0;

    const draw = () => {
      t += 1;
      if (t % 6 === 0) {
        series.shift();
        const last = series[series.length - 1];
        series.push(last + (Math.sin(t * 0.01) + (Math.random() - 0.5) * 1.1) * 0.35);
      }

      ctx.clearRect(0, 0, W, H);

      if (variant === 'grid' || variant === 'chart') {
        ctx.strokeStyle = 'rgba(255,255,255,0.035)';
        ctx.lineWidth = 1;
        const gx = 60;
        const offX = (t * 0.3) % gx;
        ctx.beginPath();
        for (let x = -offX; x < W; x += gx) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
        }
        for (let y = 0; y < H; y += gx) {
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
        }
        ctx.stroke();
      }

      if (variant === 'chart') {
        const min = Math.min(...series);
        const max = Math.max(...series);
        const pad = 80;
        const cw = W;
        const ch = H - 60;
        const step = cw / (series.length - 1);

        ctx.beginPath();
        ctx.moveTo(0, ch);
        series.forEach((v, i) => {
          const x = i * step;
          const y = pad + (1 - (v - min) / (max - min + 1e-9)) * (ch - pad);
          ctx.lineTo(x, y);
        });
        ctx.lineTo(cw, ch);
        const grad = ctx.createLinearGradient(0, 0, 0, ch);
        grad.addColorStop(0, 'rgba(218,119,86,0.14)');
        grad.addColorStop(1, 'rgba(218,119,86,0.00)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        series.forEach((v, i) => {
          const x = i * step;
          const y = pad + (1 - (v - min) / (max - min + 1e-9)) * (ch - pad);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = 'rgba(218,119,86,0.45)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        const lastV = series[series.length - 1];
        const lx = cw;
        const ly = pad + (1 - (lastV - min) / (max - min + 1e-9)) * (ch - pad);
        ctx.beginPath();
        ctx.arc(lx - 4, ly, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#DA7756';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(lx - 4, ly, 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(218,119,86,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = 'rgba(138,130,118,0.6)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        const gridLines = 4;
        for (let i = 0; i <= gridLines; i++) {
          const y = pad + (i / gridLines) * (ch - pad);
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(cw, y);
          ctx.stroke();
          const val = (max - (i / gridLines) * (max - min)).toFixed(2);
          ctx.fillText(val, cw - 10, y - 4);
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [variant]);

  if (variant === 'none') {
    return (
      <div
        className="hero-bg"
        style={{
          background:
            'radial-gradient(ellipse at 70% 30%, rgba(218,119,86,0.06), transparent 60%)',
        }}
      />
    );
  }

  return (
    <div className="hero-bg">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}
