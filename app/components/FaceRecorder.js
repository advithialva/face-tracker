"use client";
import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "@vladmandic/face-api";

export default function FaceRecorder({ onVideoSaved }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mergeCanvasRef = useRef(null);
  const recorderRef = useRef(null);

  // Change this to test: true = record with overlay, false = record direct webcam
  const USE_CANVAS_RECORD = false;

  const [recording, setRecording] = useState(false);
  const [available, setAvailable] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [faceCount, setFaceCount] = useState(0);

  useEffect(() => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
    ]).then(() => setAvailable(true));
  }, []);

  useEffect(() => {
    if (!available) return;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
          console.log("[Webcam] Ready: videoWidth", videoRef.current.videoWidth);
        };
        console.log("[Webcam] Video stream started.");
      } catch (err) {
        console.error("[Webcam] Could not get video stream:", err);
      }
    })();
  }, [available]);

  useEffect(() => {
    let interval;
    if (recording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  useEffect(() => {
    if (!available) return;
    let animation;
    const detect = async () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          );
          setFaceCount(detections.length);
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          detections.forEach((det) => {
            const { x, y, width, height } = det.box;
            ctx.strokeStyle = "#2563eb"; // Blue-600
            ctx.lineWidth = 3;
            ctx.shadowColor = "#2563eb";
            ctx.shadowBlur = 8;
            ctx.strokeRect(x, y, width, height);
          });
        } catch (err) {
          // If face detection fails, don't break loop
        }
      }
      animation = requestAnimationFrame(detect);
    };
    detect();
    return () => cancelAnimationFrame(animation);
  }, [available]);

  useEffect(() => {
    if (!USE_CANVAS_RECORD) return;
    let frame = 0;
    let drawId;
    const drawToMergeCanvas = () => {
      const mergeCanvas = mergeCanvasRef.current;
      const video = videoRef.current;
      const overlay = canvasRef.current;
      if (
        mergeCanvas &&
        video &&
        overlay &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        mergeCanvas.width = video.videoWidth;
        mergeCanvas.height = video.videoHeight;
        const ctx = mergeCanvas.getContext("2d");
        ctx.drawImage(video, 0, 0, mergeCanvas.width, mergeCanvas.height);
        ctx.drawImage(overlay, 0, 0, mergeCanvas.width, mergeCanvas.height);
        if (frame % 60 === 0) {
          console.log("[mergeCanvas] Drawing frame", frame, new Date().toISOString());
        }
        frame++;
      }
      drawId = requestAnimationFrame(drawToMergeCanvas);
    };
    drawToMergeCanvas();
    return () => cancelAnimationFrame(drawId);
  }, [USE_CANVAS_RECORD]);

  const start = () => {
    setRecording(true);
    let stream;
    if (USE_CANVAS_RECORD) {
      stream = mergeCanvasRef.current.captureStream();
      console.log("[Recorder] Recording from mergeCanvas (with overlay).");
    } else {
      stream = videoRef.current.srcObject;
      console.log("[Recorder] Recording directly from webcam.");
    }

    console.log("[Recorder] Stream details:", stream);
    if (!stream) {
      console.error("[Recorder] No valid stream available for recording.");
      return;
    }
    if (!window.MediaRecorder.isTypeSupported("video/webm")) {
      console.error("[Recorder] video/webm format not supported by this browser.");
      return;
    }

    recorderRef.current = new window.MediaRecorder(stream, { mimeType: "video/webm" });

    const localChunks = [];
    recorderRef.current.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        console.log("[Recorder] Data available, chunk size:", e.data.size);
        localChunks.push(e.data);
        console.log("[Recorder] Updated localChunks:", localChunks);
      }
    };
    recorderRef.current.onstop = () => {
      console.log("[Recorder] Chunks before Blob creation:", localChunks);
      if (localChunks.length === 0) {
        console.error("[Recorder] No chunks available for Blob creation.");
        return;
      }
      const blob = new Blob(localChunks, { type: "video/webm" });
      console.log("[Recorder] Stopped. Blob length:", blob.size, "Chunks:", localChunks.length);
      if (blob.size > 0) {
        // Save directly using onSave
        onSave(blob);
      } else {
        console.error("No video data recorded — try recording longer, or check debug logs.");
      }
    };
    recorderRef.current.start();
    console.log("[Recorder] Recording started.");
  };

  const stop = () => {
    setRecording(false);
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    console.log("[Recorder] Recording stopped.");
  };

  const onSave = (blob) => {
    const key = `video_${Date.now()}`;

    // Open or create IndexedDB database
    const request = indexedDB.open("VideoStorage", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("videos")) {
        db.createObjectStore("videos", { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("videos", "readwrite");
      const store = transaction.objectStore("videos");

      const videoData = { key, blob };
      const addRequest = store.add(videoData);

      addRequest.onsuccess = () => {
        if (onVideoSaved) {
          onVideoSaved({ key });
        }
      };

      addRequest.onerror = () => {
        console.error("Error saving video to IndexedDB.");
      };
    };

    request.onerror = () => {
      console.error("Error opening IndexedDB.");
    };
  };

  return (
    <div className="w-full">
      {/* Video Container */}
      <div className="relative w-full max-w-2xl mx-auto mb-6">
        <div className="relative aspect-video rounded-lg bg-gray-100 shadow-sm border border-gray-200 overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            className="w-full h-full object-cover"
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />
          <canvas ref={mergeCanvasRef} className="hidden" />
          
          {/* Status Indicators */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 border border-gray-200 shadow-sm">
              <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-xs font-medium text-gray-700">
                {isReady ? 'Ready' : 'Loading'}
              </span>
            </div>
            {faceCount > 0 && (
              <div className="bg-blue-600 rounded-md px-2 py-1 shadow-sm">
                <span className="text-xs font-medium text-white">
                  {faceCount} Face{faceCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
          
          {recording && (
            <div className="absolute top-3 right-3 bg-red-500 rounded-md px-2 py-1 flex items-center gap-1 shadow-sm">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-white">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        {!recording ? (
          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={start}
            disabled={!available || !isReady}
          >
            <div className="w-3 h-3 bg-white rounded-full"></div>
            Start Recording
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
            onClick={stop}
          >
            <div className="w-3 h-3 bg-white rounded-sm"></div>
            Stop Recording
          </button>
        )}
      </div>
    </div>
  );
}
