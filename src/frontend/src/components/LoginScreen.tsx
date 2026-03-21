import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { motion } from "motion/react";
import { useState } from "react";

export default function LoginScreen() {
  const { startPlaying } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartPlaying = async () => {
    setIsLoading(true);
    await startPlaying();
    setIsLoading(false);
  };

  return (
    <div className="app-shell flex flex-col items-center justify-center min-h-dvh stadium-gradient relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url('/assets/generated/stadium-bg.dim_430x200.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, oklch(0.13 0.025 255) 80%)",
        }}
      />
      <div
        className="absolute top-20 left-10 w-32 h-32 rounded-full opacity-10"
        style={{ background: "oklch(0.65 0.18 220)" }}
      />
      <div
        className="absolute bottom-32 right-8 w-24 h-24 rounded-full opacity-10"
        style={{ background: "oklch(0.72 0.18 50)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm px-6 text-center"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="text-7xl mb-6"
        >
          🏏
        </motion.div>

        <h1 className="font-display text-5xl font-800 text-foreground text-glow-orange mb-2">
          FansBattle
        </h1>
        <p className="text-muted-foreground text-sm tracking-widest uppercase mb-12">
          Cricket Fan Wars
        </p>

        <Button
          data-ocid="login.primary_button"
          onClick={handleStartPlaying}
          disabled={isLoading}
          className="w-full h-14 font-display font-700 text-lg text-accent-foreground glow-orange"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))",
          }}
        >
          {isLoading ? "Starting..." : "Start Playing"}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-6">
          No sign-up required. Jump right in!
        </p>
        <p className="text-center text-xs text-muted-foreground/50 mt-2 px-4">
          For entertainment only. Not affiliated with IPL or BCCI.
        </p>
      </motion.div>
    </div>
  );
}
