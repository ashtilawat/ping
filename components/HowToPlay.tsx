"use client";

import { useCallback, useEffect, useId, useRef } from "react";

type HowToPlayProps = {
  open: boolean;
  onClose: () => void;
};

export function HowToPlay({ open, onClose }: HowToPlayProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="how-to-play-backdrop"
      onClick={onClose}
      data-testid="how-to-play-overlay"
    >
      <div
        className="how-to-play-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="how-to-play-header">
          <h2 id={titleId}>How to play</h2>
          <button
            ref={closeRef}
            type="button"
            className="how-to-play-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="how-to-play-rules">
          Tap a cell to get its Manhattan distance to the hidden signal —{" "}
          <strong>0</strong> finds it. You get four taps per board, playing{" "}
          <strong>4×4</strong>, then <strong>6×6</strong>, then <strong>12×12</strong>{" "}
          each day.
        </p>

        <div className="how-to-play-example">
          <p className="how-to-play-example-label">Example on a 4×4 board</p>
          <div className="how-to-play-grid" aria-hidden="true">
            <div className="how-to-play-cell">3</div>
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell win">0</div>
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
            <div className="how-to-play-cell empty" />
          </div>
          <p className="how-to-play-example-caption">
            Signal at center. Tap top-left → distance <strong>3</strong>. Tap center →{" "}
            <strong>0</strong>, signal found.
          </p>
        </div>

        <button type="button" className="how-to-play-dismiss" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}

export function HowToPlayTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="how-to-play-trigger"
      onClick={onClick}
      data-testid="how-to-play-button"
    >
      How to play
    </button>
  );
}
