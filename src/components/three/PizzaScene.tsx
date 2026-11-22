"use client";

import { useEffect, useRef, useState } from "react";

import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "motion/react";

import { Pause, Play } from "lucide-react";

const VIDEO_URL =
  "/videos/pizzahub-pizza-thick-crust-hq.webm";

const POSTER_URL =
  "/videos/pizzahub-pizza-thick-crust-hq.png";

interface PizzaSceneProps {
  variant?: "hero" | "preview";
  active?: boolean;
}

export default function PizzaScene({
  variant = "hero",
  active = true,
}: PizzaSceneProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const reducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [manualPlay, setManualPlay] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(x, {
    stiffness: 85,
    damping: 23,
  });

  const rotateY = useSpring(y, {
    stiffness: 85,
    damping: 23,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    const update = () => {
      setTabVisible(!document.hidden);
    };

    update();

    document.addEventListener(
      "visibilitychange",
      update
    );

    const stage = stageRef.current;

    const observer =
      typeof IntersectionObserver !== "undefined" &&
      stage
        ? new IntersectionObserver(
            ([entry]) => {
              setVisible(entry.isIntersecting);
            },
            { threshold: 0.05 }
          )
        : null;

    if (observer && stage) {
      observer.observe(stage);
    } else {
      setVisible(true);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();

      document.removeEventListener(
        "visibilitychange",
        update
      );
    };
  }, []);

  const allowMotion =
    mounted && (!reducedMotion || manualPlay);

  const shouldPlay =
    allowMotion &&
    active &&
    visible &&
    tabVisible &&
    !paused &&
    !failed;

  const showVideo =
    allowMotion &&
    !failed &&
    (playing || (paused && !blocked));

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    let cancelled = false;

    if (shouldPlay) {
      video.muted = true;

      video.play().catch(() => {
        if (!cancelled) {
          setBlocked(true);
        }
      });
    } else {
      video.pause();
    }

    return () => {
      cancelled = true;
      video.pause();
    };
  }, [shouldPlay, allowMotion]);

  function togglePlayback() {
    if (playing) {
      setPaused(true);
      videoRef.current?.pause();
      return;
    }

    setManualPlay(true);
    setPaused(false);
    setBlocked(false);

    const video = videoRef.current;

    if (video && active) {
      video.muted = true;

      void video.play().catch(() => {
        setBlocked(true);
      });
    }
  }

  return (
    <div
      ref={stageRef}
      className={`pizza-stage pizza-stage--${variant}`}
      onPointerMove={(event) => {
        if (
          reducedMotion ||
          event.pointerType !== "mouse"
        ) {
          return;
        }

        const rect =
          event.currentTarget.getBoundingClientRect();

        if (!rect.width || !rect.height) return;

        x.set(
          ((event.clientY - rect.top) /
            rect.height -
            0.5) *
            -12
        );

        y.set(
          ((event.clientX - rect.left) /
            rect.width -
            0.5) *
            16
        );
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <div
        className="pizza-stage-glow"
        aria-hidden="true"
      />

      <div
        className="pizza-stage-shadow"
        aria-hidden="true"
      />

      <motion.div
        className="pizza-stage-media"
        style={{
          rotateX: reducedMotion ? 0 : rotateX,
          rotateY: reducedMotion ? 0 : rotateY,
        }}
      >
        <img
          src={POSTER_URL}
          alt="Whole pizza with golden, thick crust"
          className={`pizza-poster ${
            showVideo ? "pizza-poster-hidden" : ""
          }`}
          loading={
            variant === "hero" ? "eager" : "lazy"
          }
        />

        {allowMotion && !failed && (
          <video
            ref={videoRef}
            src={VIDEO_URL}
            poster={POSTER_URL}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            aria-hidden="true"
            className={`pizza-video ${
              showVideo
                ? "pizza-video-visible"
                : ""
            }`}
            onPlaying={() => {
              setPlaying(true);
              setBlocked(false);
            }}
            onPause={() => {
              setPlaying(false);
            }}
            onError={() => {
              setFailed(true);
              setPlaying(false);
            }}
          />
        )}
      </motion.div>

      {!failed && (
        <button
          type="button"
          className="pizza-playback"
          onClick={togglePlayback}
          aria-label={
            playing
              ? "Pause pizza rotation"
              : "Play pizza rotation"
          }
        >
          {playing ? (
            <Pause size={15} />
          ) : (
            <Play size={15} />
          )}

          <span>{playing ? "Pause" : "Play"}</span>
        </button>
      )}
    </div>
  );
}