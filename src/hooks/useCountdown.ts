"use client";

import { useState, useEffect } from "react";
import { timeUntil } from "@/lib/utils";

export function useCountdown(expiryDate: Date | null) {
  const [remaining, setRemaining] = useState({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });

  useEffect(() => {
    if (!expiryDate) return;

    function tick() {
      setRemaining(timeUntil(expiryDate!));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiryDate]);

  return remaining;
}