"use client";

import dynamic from "next/dynamic";
import SavedVideos from "./components/SavedVideos";
import { useRef } from "react";

const FaceRecorder = dynamic(() => import("./components/FaceRecorder"), { ssr: false });

export default function Home() {
  const savedVideosRef = useRef(null);

  const handleVideoSaved = () => {
    if (savedVideosRef.current) {
      savedVideosRef.current.loadVideos();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              FaceTracker
            </h1>
            <p className="text-gray-600">
              Face detection and video recording
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Recording Section */}
          <section>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 p-6">
              <FaceRecorder onVideoSaved={handleVideoSaved} />
            </div>
          </section>

          {/* Saved Videos Section */}
          <section>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 p-6">
              <SavedVideos ref={savedVideosRef} />
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
            {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center text-gray-500">
            <p className="text-sm">&copy; 2025 FaceTracker</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
