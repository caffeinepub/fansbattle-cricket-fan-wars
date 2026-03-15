import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { useState } from "react";

interface Props {
  onLogin: (phone: string) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [step, setStep] = useState<"init" | "otp">("init");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = () => {
    if (phone.length >= 10) setStep("otp");
  };

  const handleVerify = () => {
    if (otp.length >= 4) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onLogin(phone);
      }, 600);
    }
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin("google-user");
    }, 800);
  };

  return (
    <div className="app-shell flex flex-col items-center justify-center min-h-dvh stadium-gradient relative overflow-hidden">
      {/* Background decoration */}
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

      {/* Decorative circles */}
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
        className="relative z-10 w-full max-w-sm px-6"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="text-6xl mb-4"
          >
            🏏
          </motion.div>
          <h1 className="font-display text-4xl font-800 text-foreground text-glow-orange">
            FansBattle
          </h1>
          <p className="text-muted-foreground text-sm mt-2 tracking-widest uppercase">
            Cricket Fan Wars
          </p>
        </div>

        <div className="card-glass rounded-2xl p-6 space-y-4">
          {step === "init" ? (
            <>
              <h2 className="font-display text-xl font-700 text-center text-foreground">
                Join the Battle
              </h2>
              <p className="text-muted-foreground text-sm text-center">
                Enter your mobile number to continue
              </p>
              <Input
                data-ocid="login.input"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12"
              />
              <Button
                data-ocid="login.primary_button"
                onClick={handleSendOtp}
                disabled={phone.length < 10}
                className="w-full h-12 font-display font-700 text-accent-foreground glow-orange"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))",
                }}
              >
                Send OTP
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                data-ocid="login.google_button"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full h-12 border-border text-foreground hover:bg-secondary gap-3"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  aria-label="Google"
                  role="img"
                >
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </>
          ) : (
            <>
              <h2 className="font-display text-xl font-700 text-center text-foreground">
                Enter OTP
              </h2>
              <p className="text-muted-foreground text-sm text-center">
                Sent to {phone}
              </p>
              <Input
                data-ocid="otp.input"
                type="number"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground h-12 text-center text-xl tracking-widest"
                maxLength={6}
              />
              <Button
                data-ocid="otp.submit_button"
                onClick={handleVerify}
                disabled={otp.length < 4 || isLoading}
                className="w-full h-12 font-display font-700 text-accent-foreground glow-orange"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.72 0.18 50), oklch(0.78 0.2 40))",
                }}
              >
                {isLoading ? "Verifying..." : "Verify & Enter"}
              </Button>
              <button
                type="button"
                onClick={() => setStep("init")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Change number
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service
        </p>
      </motion.div>
    </div>
  );
}
