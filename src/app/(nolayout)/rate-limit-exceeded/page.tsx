"use client";

import { useEffect, useState } from "react";

export default function RateLimitExceededPage() {
  const [secondsLeft, setSecondsLeft] = useState(60);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "16px",
      }}
    >
      <h1 style={{ fontSize: "48px", fontWeight: "bold" }}>
        TOO MANY REQUESTS
      </h1>

      <p style={{ fontSize: "18px", opacity: 0.7 }}>Try again in a minute</p>

      <p style={{ fontSize: "24px", fontWeight: "bold" }}>{secondsLeft}s</p>
    </div>
  );
}
