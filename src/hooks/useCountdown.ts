"use client";

import { useState, useEffect } from "react";
import { timeUntil } from "@/lib/utils";

export function useCountdown(expiryDate: string | number | Date | null | undefined) {
  const [remaining, setRemaining] = useState({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
  const ms = expiryDate ? new Date(expiryDate).getTime() : null;

  useEffect(() => {
    if (ms === null) return;

    function tick() {
      setRemaining(timeUntil(new Date(ms)));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [ms]);

  return remaining;
}