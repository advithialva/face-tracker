"use client";
import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";

const SavedVideos = forwardRef((props, ref) => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useImperativeHandle(ref, () => ({
    loadVideos
  }));

  useEffect(() => {
    loadVideos();
  }, []);

  function loadVideos() {
    setIsLoading(true);
    const request = indexedDB.open("VideoStorage", 1);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("videos", "readonly");
      const store = transaction.objectStore("videos");

      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const videos = getAllRequest.result.map((video) => ({
          key: video.key,
          data: URL.createObjectURL(video.blob),
          size: video.blob.size,
          timestamp: parseInt(video.key.split('_')[1])
        }));
        setVideos(videos.reverse());
        setIsLoading(false);
      };

      getAllRequest.onerror = () => {
        console.error("Error loading videos from IndexedDB.");
        setIsLoading(false);
      };
    };

    request.onerror = () => {
      console.error("Error opening IndexedDB.");
      setIsLoading(false);
    };
  }

  function deleteVideo(key) {
    const request = indexedDB.open("VideoStorage", 1);

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction("videos", "readwrite");
      const store = transaction.objectStore("videos");

      const deleteRequest = store.delete(key);

      deleteRequest.onsuccess = () => {
        setVideos((prev) => prev.filter((v) => v.key !== key));
        if (selectedVideo && selectedVideo.key === key) {
          setSelectedVideo(null);
        }
      };

      deleteRequest.onerror = () => {
        console.error("Error deleting video from IndexedDB.");
      };
    };

    request.onerror = () => {
      console.error("Error opening IndexedDB.");
    };
  }

  function downloadVideo(video) {
    const link = document.createElement('a');
    link.href = video.data;
    link.download = `face-recording-${video.key}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString();
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-1">
            Saved Recordings
          </h2>
          <p className="text-gray-600 text-sm">
            {videos.length} {videos.length === 1 ? 'video' : 'videos'}
          </p>
        </div>
        <button
          onClick={loadVideos}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors border border-gray-300 disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Videos Grid */}
      {videos.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div
              key={video.key}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              {/* Video Preview */}
              <div className="relative aspect-video bg-gray-100">
                <video
                  src={video.data}
                  className="w-full h-full object-cover cursor-pointer"
                  preload="metadata"
                  onClick={() => setSelectedVideo(video)}
                  onError={(e) => {
                    console.error(`Video playback error for ${video.key}:`, e.target.error);
                  }}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                  <button
                    onClick={() => setSelectedVideo(video)}
                    className="bg-white/90 rounded-full p-3 hover:bg-white transition-colors shadow-sm"
                  >
                    <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Video Info */}
              <div className="p-4">
                <div className="mb-3">
                  <p className="text-gray-900 font-medium text-sm mb-1">
                    {formatDate(video.timestamp)}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {formatFileSize(video.size)}
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadVideo(video)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors border border-blue-200 hover:border-blue-300"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => deleteVideo(video.key)}
                    className="px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors border border-red-200 hover:border-red-300"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No recordings yet</h3>
          <p className="text-gray-600 text-sm">Start recording to save videos</p>
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatDate(selectedVideo.timestamp)}
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-gray-100">
              <video
                src={selectedVideo.data}
                controls
                autoPlay
                className="w-full h-full"
                onError={(e) => {
                  console.error(`Video playback error:`, e.target.error);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SavedVideos.displayName = "SavedVideos";

export default SavedVideos;
