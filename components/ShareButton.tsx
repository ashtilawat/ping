"use client";

import { useCallback, useState } from "react";
import { buildShareImage } from "@/lib/shareImage";
import { buildShareText, type BoardShareResult } from "@/lib/share";

type ShareButtonProps = {
  dateStr: string;
  boards: BoardShareResult[];
  finished: boolean;
};

export function ShareButton({ dateStr, boards, finished }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const text = buildShareText({ dateStr, boards });

    try {
      const imageBlob = await buildShareImage({ dateStr, boards });

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": imageBlob,
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else if (navigator.share && navigator.canShare?.({ files: [new File([imageBlob], "ping.png", { type: "image/png" })] })) {
        const file = new File([imageBlob], "ping.png", { type: "image/png" });
        await navigator.share({ text, files: [file] });
      } else {
        await navigator.clipboard.writeText(text);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        /* clipboard unavailable */
      }
    }
  }, [dateStr, boards]);

  if (!finished) return null;

  return (
    <div className="share-panel">
      <button type="button" className="share-button" onClick={handleShare}>
        {copied ? "Copied!" : "Copy share card"}
      </button>
    </div>
  );
}
