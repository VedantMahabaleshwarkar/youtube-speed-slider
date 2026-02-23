const SPEEDS = [1, 1.25, 1.5, 1.75, 2];

// 1. Singleton state to manage listeners
let isDragging = false;
let activeSlider = null;
let dragCache = null; // Caches DOM elements to prevent thrashing
let rafId = null;     // RequestAnimationFrame ID

// Global mouse handlers to prevent listener duplication
document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    activeSlider = null;
    dragCache = null;
    if (rafId) cancelAnimationFrame(rafId);
    document.querySelectorAll('.ytp-speed-panel-active')
      .forEach(p => p.classList.remove('ytp-speed-panel-active'));
  }
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging || !activeSlider || !dragCache) return;
  
  // Calculate index purely from cached geometry and math (No DOM queries here!)
  let percent = (e.clientX - dragCache.rect.left) / dragCache.rect.width;
  percent = Math.max(0, Math.min(1, percent));
  const index = Math.round(percent * (SPEEDS.length - 1));
  
  // Debounce the visual update to the browser's render cycle
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => applySpeedUpdate(index));
});

// Separated purely for applying the cached update
function applySpeedUpdate(index) {
  if (!dragCache) return;
  const speed = SPEEDS[index];
  if (dragCache.video) dragCache.video.playbackRate = speed;
  if (dragCache.label) dragCache.label.textContent = speed + 'x';
  
  const percent = (index / (SPEEDS.length - 1)) * 100;
  if (dragCache.progress) dragCache.progress.style.width = percent + '%';
  if (dragCache.handle) dragCache.handle.style.left = percent + '%';
}

function initSpeedSlider() {
  const rightControlsList = document.querySelectorAll('.ytp-right-controls');
  
  rightControlsList.forEach(rightControls => {
    const rightControlsGroup = rightControls.querySelector('.ytp-right-controls-right');
    
    if (rightControls.querySelector('.ytp-speed-area')) return;

    const player = rightControls.closest('.html5-video-player');
    const video = player ? player.querySelector('video') : document.querySelector('video');

    const container = document.createElement('div');
    container.className = 'ytp-speed-area';
    
    const button = document.createElement('div');
    button.className = 'ytp-button ytp-speed-button';
    
    const label = document.createElement('div');
    label.className = 'ytp-speed-label';
    label.textContent = '1x';

    // Add click listener to toggle through speeds cyclically
    label.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent clicks from interfering with parent containers
      
      if (!video) return;

      const currentSpeed = video.playbackRate;
      let currentIndex = SPEEDS.indexOf(currentSpeed);
      
      // Fallback in case the speed was set to a custom value outside our array
      if (currentIndex === -1) {
        currentIndex = 0; 
      }

      // Calculate the next index, looping back to 0 if at the end
      const nextIndex = (currentIndex + 1) % SPEEDS.length;
      
      // Update the video speed directly. 
      // The existing 'ratechange' listener will automatically update the UI!
      video.playbackRate = SPEEDS[nextIndex];
    });
    
    const panel = document.createElement('div');
    panel.className = 'ytp-speed-panel';
    
    const slider = document.createElement('div');
    slider.className = 'ytp-speed-slider';
    
    const track = document.createElement('div');
    track.className = 'ytp-speed-slider-track';
    
    const progress = document.createElement('div');
    progress.className = 'ytp-speed-slider-progress';
    
    const handle = document.createElement('div');
    handle.className = 'ytp-speed-slider-handle';
    
    slider.appendChild(track);
    slider.appendChild(progress);
    slider.appendChild(handle);
    panel.appendChild(slider);
    
    button.appendChild(label);
    container.appendChild(button);
    container.appendChild(panel);
    
    if (rightControlsGroup) {
      // Inject exactly before the right-side control group wrapper
      rightControlsGroup.insertAdjacentElement('beforebegin', container);
    } else {
      // Safe fallback
      rightControls.insertAdjacentElement('afterbegin', container);
    }
    
    slider.addEventListener('mousedown', (e) => {
      isDragging = true;
      activeSlider = slider;
      panel.classList.add('ytp-speed-panel-active');
      
      // CACHE EXPENSIVE DOM QUERIES ONCE PER DRAG
      dragCache = {
        rect: slider.getBoundingClientRect(),
        video: video,
        label: label,
        progress: progress,
        handle: handle
      };
      
      // Trigger initial update
      let percent = (e.clientX - dragCache.rect.left) / dragCache.rect.width;
      percent = Math.max(0, Math.min(1, percent));
      const index = Math.round(percent * (SPEEDS.length - 1));
      applySpeedUpdate(index);
    });

    // Initialize with current speed
    if (video) {
      const currentSpeed = video.playbackRate;
      const index = SPEEDS.indexOf(currentSpeed) !== -1 ? SPEEDS.indexOf(currentSpeed) : 0;
      
      // Temporarily mock dragCache just for initialization
      dragCache = { video, label, progress, handle };
      applySpeedUpdate(index);
      dragCache = null; 
      
      // PREVENT MEMORY LEAK: Only attach if we haven't already
      if (!video.dataset.speedListenerAttached) {
        video.dataset.speedListenerAttached = 'true';
        video.addEventListener('ratechange', () => {
          if (isDragging) return;
          const newSpeed = video.playbackRate;
          const newIndex = SPEEDS.indexOf(newSpeed);
          
          // FIX: Always query the active document, do not rely on the closure's 'container' variable!
          const activeContainer = document.querySelector('.ytp-speed-area');
          if (!activeContainer) return;

          const currentLabel = activeContainer.querySelector('.ytp-speed-label');
          const currentProgress = activeContainer.querySelector('.ytp-speed-slider-progress');
          const currentHandle = activeContainer.querySelector('.ytp-speed-slider-handle');

          if (newIndex !== -1) {
            const percent = (newIndex / (SPEEDS.length - 1)) * 100;
            if (currentProgress) currentProgress.style.width = percent + '%';
            if (currentHandle) currentHandle.style.left = percent + '%';
            if (currentLabel) currentLabel.textContent = newSpeed + 'x';
          } else {
            if (currentLabel) currentLabel.textContent = newSpeed + 'x';
          }
        });
      }
    }
  });
}

function resilientInit() {
  const rightControls = document.querySelector('.ytp-right-controls');
  // Wait for the structural anchor, not the fullscreen button
  const rightControlsGroup = document.querySelector('.ytp-right-controls-right'); 
  const video = document.querySelector('video');

  // We can be slightly more lenient here; as long as rightControls and video exist, 
  // our fallback insertion logic will handle a missing rightControlsGroup gracefully.
  if (rightControls && video) {
     initSpeedSlider();
     return true;
  }
  return false;
}

// Polling wrapper replacing setTimeouts
function startPolling() {
  if (resilientInit()) return;
  
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    // Stop after ~10 seconds to prevent infinite loops on non-video pages
    if (resilientInit() || attempts > 20) {
      clearInterval(interval);
    }
  }, 500);
}

// 3. YouTube SPA Event Listeners
document.addEventListener('yt-navigate-finish', startPolling);
document.addEventListener('yt-page-data-updated', startPolling);

// Initial trigger
startPolling();