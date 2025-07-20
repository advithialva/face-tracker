# FaceTracker 


A modern, professional face detection and video recording application built with Next.js and Face-API.js. Record videos with real-time face detection overlays and manage your recordings with an intuitive interface.

---
## ✨ Features

- **Real-time Face Detection**: Advanced AI-powered face detection using Face-API.js
- **Video Recording**: Record videos with or without face detection overlays
- **Local Storage**: Videos saved to IndexedDB for offline access
- **Clean Interface**: Professional, light-themed UI design
- **Video Management**: View, download, and delete saved recordings
- **Responsive Design**: Works seamlessly across desktop and mobile devices
---

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/advithialva/face-tracker.git
cd face-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser
---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Face Detection**: Face-API.js with TinyFaceDetector
- **Storage**: IndexedDB for local video storage
- **Video Recording**: MediaRecorder API
- **Language**: JavaScript/React
---

## 📁 Project Structure

```
face-tracking-app/
├── app/
│   ├── components/
│   │   ├── FaceRecorder.js    # Main recording component
│   │   └── SavedVideos.js     # Video gallery component
│   ├── page.js                # Main page layout
│   └── layout.js              # Root layout
├── public/
│   └── models/                # Face-API.js model files
├── styles/
│   └── globals.css           
└── README.md
```
---

## 🎯 How It Works

1. **Face Detection**: The app loads Face-API.js models and initializes face detection
2. **Camera Access**: Requests webcam permission and displays live video feed
3. **Real-time Processing**: Continuously detects faces and draws bounding boxes
4. **Recording**: Captures video with MediaRecorder API (with or without overlays)
5. **Storage**: Saves recordings to IndexedDB for persistence
6. **Playback**: Provides interface to view, download, and manage recordings

---

## 🙏 Acknowledgments

- [Face-API.js](https://github.com/justadudewhohacks/face-api.js) for face detection
- [Next.js](https://nextjs.org) for the React framework
- [Tailwind CSS](https://tailwindcss.com) for styling
---
