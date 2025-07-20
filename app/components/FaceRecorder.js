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
        };
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
    } else {
      stream = videoRef.current.srcObject;
    }

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
        localChunks.push(e.data);
      }
    };
    recorderRef.current.onstop = () => {
      if (localChunks.length === 0) {
        console.error("[Recorder] No chunks available for Blob creation.");
        return;
      }
      const blob = new Blob(localChunks, { type: "video/webm" });
      if (blob.size > 0) {
        onSave(blob);
      } else {
        console.error("No video data recorded — try recording longer, or check debug logs.");
      }
    };
    recorderRef.current.start();
  };

  const stop = () => {
    setRecording(false);
    if (!recorderRef.current) return;
    recorderRef.current.stop();
  };

    const onSave = (videoBlob) => {
    console.log("[DEBUG] onSave called with blob:", videoBlob);
    console.log("[DEBUG] Blob size:", videoBlob?.size);
    console.log("[DEBUG] Blob type:", videoBlob?.type);
    
    if (!videoBlob || videoBlob.size === 0) {
      console.error("[Storage] Invalid video blob - cannot save");
      alert("Error: Invalid video data. Recording may have failed.");
      return;
    }

    // Check if IndexedDB is available
    if (!window.indexedDB) {
      console.error("[Storage] IndexedDB not supported in this browser");
      alert("Error: Browser storage not supported");
      return;
    }

    console.log("[DEBUG] Attempting to save to IndexedDB...");

    // Open or create IndexedDB database
    const request = indexedDB.open("VideoStorage", 2);

    request.onupgradeneeded = (event) => {
      console.log("[DEBUG] Database upgrade needed");
      const db = event.target.result;
      if (!db.objectStoreNames.contains("videos")) {
        const objectStore = db.createObjectStore("videos", { keyPath: "key" });
        console.log("[DEBUG] Created videos object store");
      }
    };

    request.onsuccess = (event) => {
      console.log("[DEBUG] Database opened successfully");
      const db = event.target.result;

      // Check if the object store exists
      if (!db.objectStoreNames.contains("videos")) {
        console.log("[DEBUG] Videos object store doesn't exist - need to recreate database");
        // Close this connection and reopen with a higher version to trigger upgrade
        db.close();
        
        const upgradeRequest = indexedDB.open("VideoStorage", 3);
        
        upgradeRequest.onupgradeneeded = (upgradeEvent) => {
          console.log("[DEBUG] Upgrading database to create videos store");
          const upgradeDb = upgradeEvent.target.result;
          if (!upgradeDb.objectStoreNames.contains("videos")) {
            upgradeDb.createObjectStore("videos", { keyPath: "key" });
            console.log("[DEBUG] Created videos object store during upgrade");
          }
        };
        
        upgradeRequest.onsuccess = (upgradeEvent) => {
          console.log("[DEBUG] Database upgrade completed, now saving video");
          const upgradeDb = upgradeEvent.target.result;
          
          try {
            const transaction = upgradeDb.transaction("videos", "readwrite");
            const store = transaction.objectStore("videos");

            const key = `video_${Date.now()}`;
            const videoData = { key, blob: videoBlob };

            console.log("[DEBUG] Attempting to store video with key:", key);
            const addRequest = store.add(videoData);

            addRequest.onsuccess = () => {
              console.log("[DEBUG] Video saved successfully to IndexedDB");
              alert("Video saved successfully!");
              if (props.onVideoSaved) {
                props.onVideoSaved();
              }
            };

            addRequest.onerror = (error) => {
              console.error("[Storage] Error saving video to IndexedDB:", error);
              console.error("[DEBUG] Add request error:", addRequest.error);
              alert("Error saving video: " + (addRequest.error?.message || "Unknown error"));
            };

            transaction.onerror = (error) => {
              console.error("[DEBUG] Transaction error:", error);
              alert("Storage transaction failed");
            };

          } catch (error) {
            console.error("[DEBUG] Exception during save:", error);
            alert("Exception during save: " + error.message);
          }
        };
        
        upgradeRequest.onerror = (error) => {
          console.error("[DEBUG] Error during database upgrade:", error);
          alert("Failed to upgrade storage");
        };
        
        return;
      }

      try {
        const transaction = db.transaction("videos", "readwrite");
        const store = transaction.objectStore("videos");

        const key = `video_${Date.now()}`;
        const videoData = { key, blob: videoBlob };

        console.log("[DEBUG] Attempting to store video with key:", key);
        const addRequest = store.add(videoData);

        addRequest.onsuccess = () => {
          console.log("[DEBUG] Video saved successfully to IndexedDB");
          alert("Video saved successfully!");
          if (props.onVideoSaved) {
            props.onVideoSaved();
          }
        };

        addRequest.onerror = (error) => {
          console.error("[Storage] Error saving video to IndexedDB:", error);
          console.error("[DEBUG] Add request error:", addRequest.error);
          alert("Error saving video: " + (addRequest.error?.message || "Unknown error"));
        };

        transaction.onerror = (error) => {
          console.error("[DEBUG] Transaction error:", error);
          alert("Storage transaction failed");
        };

      } catch (error) {
        console.error("[DEBUG] Exception during save:", error);
        alert("Exception during save: " + error.message);
      }
    };

    request.onerror = (error) => {
      console.error("[Storage] Error opening IndexedDB:", error);
      console.error("[DEBUG] Request error details:", request.error);
      alert("Failed to open storage: " + (request.error?.message || "Unknown error"));
    };

    request.onblocked = () => {
      console.error("[Storage] IndexedDB blocked - another tab may have the database open");
      alert("Storage blocked - close other tabs and try again");
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
