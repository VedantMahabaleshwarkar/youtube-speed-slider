# YouTube Speed Slider

A Chrome extension that adds a dedicated playback speed slider to the YouTube player control bar. It provides immediate, draggable speed control without needing to open the settings menu.

## Features

* **Integrated Slider:** Adds a custom speed slider and label directly into the YouTube player.
* **Draggable Control:** Click and drag to toggle between 1x, 1.25x, 1.5x, 1.75x, and 2x speeds.
* **Live Sync:** Automatically updates the UI if the playback rate is changed via YouTube's native menu or keyboard shortcuts.
* **Performance Optimized:** Uses `requestAnimationFrame` and DOM caching for smooth, lag-free UI updates.

## Installation

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/youtube-speed-slider.git

```


2. **Open Chrome Extensions:**
Navigate to `chrome://extensions` in your browser.
3. **Enable Developer Mode:**
Toggle the **Developer mode** switch in the top right corner.
4. **Load the Extension:**
Click **Load unpacked** and select the folder containing the repository files.

## How it Works

The extension injects a content script that monitors for the YouTube player's presence. Once detected, it inserts a slider into the `.ytp-right-controls` section. The script manages a singleton state for dragging and directly modifies the video element's `playbackRate` property. It also listens for YouTube's internal navigation events (`yt-navigate-finish`) to ensure the slider persists across different videos in a session.

---

**Would you like me to help you write the `manifest.json` file so it correctly references these files for the git repo?**