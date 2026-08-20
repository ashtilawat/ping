"use client";

import { useCallback, useState } from "react";
import { buildShareText, type TapRecord } from "@/lib/share";

type ShareButtonProps = {
  dateStr: string;
  taps: TapRecord[];
  won: boolean;
  finished: boolean;
};

export function ShareButton({ dateStr, taps, won, finished }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const text = buildShareText({ dateStr, taps, won });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable */
    }
  }, [dateStr, taps, won]);

  if (!finished) return null;

  return (
    <div className="share-panel">
      <button type="button" className="share-button" onClick={handleShare}>
        {copied ? "Copied!" : "Copy share card"}
      </button>
    </div>
  );
}
