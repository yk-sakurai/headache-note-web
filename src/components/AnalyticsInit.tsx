"use client";
import { useEffect } from "react";
import { initAnalytics } from "@/lib/firebase/analytics.client";

export default function AnalyticsInit() {
  useEffect(() => {
    void initAnalytics();
  }, []);

  return null;
}
