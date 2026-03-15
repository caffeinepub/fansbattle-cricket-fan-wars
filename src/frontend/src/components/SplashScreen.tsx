import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 2600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      data-ocid="splash.panel"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden"
      style={{
        transition: "opacity 0.6s ease",
        opacity: fadeOut ? 0 : 1,
      }}
    >
      {/* Background */}
      <img
        src="/assets/generated/splash-bg.dim_1080x1920.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden="true"
      />
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-6">
        {/* Logo */}
        <div
          className="flex flex-col items-center"
          style={{
            animation: "splashLogoIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both",
            animationDelay: "0.2s",
          }}
        >
          <img
            src="/assets/generated/fansbattle-logo-transparent.dim_600x600.png"
            alt="FansBattle Logo"
            className="w-44 h-44 drop-shadow-[0_0_32px_rgba(251,191,36,0.9)]"
          />
          <h1
            className="text-white font-black text-4xl mt-2 tracking-widest uppercase"
            style={{
              textShadow: "0 0 24px #f59e0b, 0 2px 8px rgba(0,0,0,0.8)",
              letterSpacing: "0.15em",
            }}
          >
            FansBattle
          </h1>
          <p
            className="text-amber-400 font-bold text-sm tracking-[0.3em] uppercase mt-1"
            style={{ textShadow: "0 0 12px #f59e0b" }}
          >
            Cricket Fan Wars
          </p>
        </div>
      </div>

      {/* Captains row */}
      <div
        className="relative z-10 w-full"
        style={{
          animation: "splashCaptainsIn 0.6s ease both",
          animationDelay: "0.5s",
        }}
      >
        <img
          src="/assets/generated/cricket-captains-transparent.dim_1080x400.png"
          alt="Five cricket captains"
          className="w-full object-contain"
          style={{ maxHeight: "180px" }}
        />
      </div>

      {/* Tagline */}
      <div
        className="relative z-10 w-full flex flex-col items-center pb-12"
        style={{
          animation: "splashTaglineIn 0.5s ease both",
          animationDelay: "0.7s",
        }}
      >
        <p
          className="text-white font-black text-2xl text-center leading-tight"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}
        >
          Choose Your Team
        </p>
        <p
          className="text-amber-400 font-black text-2xl text-center leading-tight"
          style={{ textShadow: "0 0 16px #f59e0b, 0 2px 8px rgba(0,0,0,0.8)" }}
        >
          Battle the Fans
        </p>
      </div>

      <style>{`
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes splashCaptainsIn {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashTaglineIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
