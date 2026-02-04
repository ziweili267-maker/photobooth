const video = document.getElementById('video');
const btnCapture = document.getElementById('btn-capture');
const countdownEl = document.getElementById('countdown');
const countNum = document.getElementById('count-num');
const flashEl = document.getElementById('flash');
const photoSlots = document.getElementById('photo-slots');
const stripContainer = document.getElementById('strip-container');
const galleryPanel = document.getElementById('gallery-panel');
const mobileModal = document.getElementById('mobile-modal');
const mobilePreviewArea = document.getElementById('mobile-preview-area');
const dateText = document.getElementById('date-text');
const brandText = document.getElementById('brand-text');

let currentFilter = '';
let currentBg = '#ffffff';
let isCapturing = false;
let capturedPhotos = [];

// Init
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, 
            audio: false 
        });
        video.srcObject = stream;
    } catch (e) {
        alert('无法访问摄像头，请允许权限');
    }
    
    // Set Date
    const now = new Date();
    dateText.innerText = now.toLocaleDateString().replace(/\//g, '.');
    
    // Set initial active filter button (Normal)
    const normalFilterButton = document.querySelector('button[onclick="setFilter(\'\')"]');
    if (normalFilterButton) {
        normalFilterButton.classList.add('filter-active');
        activeFilterButton = normalFilterButton;
    }
}

// Filter - Track active button
let activeFilterButton = null;

window.setFilter = (filterClass) => {
    currentFilter = filterClass;
    video.className = `w-full h-full ${filterClass}`;

    // Remove active class from previous button
    if (activeFilterButton) {
        activeFilterButton.classList.remove('filter-active');
    }

    // Find and highlight the new active button based on its onclick attribute or data
    // A more robust way is to assign IDs or data attributes to buttons in HTML, but for now, we can match the argument passed to setFilter.
    // Let's find the button whose onclick calls setFilter with the current filterClass.
    // This is a bit fragile, but works for this specific case.
    // A better approach is to add data attributes to the buttons in HTML.
    // For now, I'll assume the buttons have predictable structures based on the HTML provided earlier.
    // Normal: setFilter('')
    // Bright: setFilter('filter-bright')
    // Vintage: setFilter('filter-vintage')
    // Mono: setFilter('filter-grayscale')
    const filterButtons = document.querySelectorAll('button[onclick*="setFilter"]');
    for (const btn of filterButtons) {
        if (filterClass === '') {
             if (btn.getAttribute('onclick') === `setFilter('')`) {
                btn.classList.add('filter-active');
                activeFilterButton = btn;
                break;
             }
        } else {
            if (btn.getAttribute('onclick').includes(`'${filterClass}'`)) {
                btn.classList.add('filter-active');
                activeFilterButton = btn;
                break;
            }
        }
    }
};

// Background
window.setBg = (color) => {
    currentBg = color;
    stripContainer.style.backgroundColor = color;
    // Contrast text
    const isDark = color === '#111';
    brandText.style.color = isDark ? 'white' : 'black';
    dateText.style.color = isDark ? '#666' : '#999';
    stripContainer.querySelector('.border-b-2').style.borderColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
};

// Capture Logic
btnCapture.addEventListener('click', async () => {
    if (isCapturing) return;
    isCapturing = true;
    capturedPhotos = [];
    
    // Clear slots visually
    photoSlots.innerHTML = '';
    for(let i=0; i<4; i++) {
        const div = document.createElement('div');
        div.className = 'aspect-[4/3] bg-gray-100/10 flex items-center justify-center border-2 border-dashed border-gray-300/30 rounded-sm';
        div.innerHTML = `<span class="opacity-30 text-2xl font-cute">${i+1}</span>`;
        photoSlots.appendChild(div);
    }

    // Show panel on desktop with animation
    if(window.innerWidth >= 768) {
        galleryPanel.classList.remove('hidden');
        galleryPanel.classList.add('gallery-panel-show');
    }

    for (let i = 0; i < 4; i++) {
        // Highlight active slot
        const slots = photoSlots.children;
        if(slots[i]) slots[i].style.borderColor = '#ec4899'; // pink

        await countdown(3);
        flash();
        const photo = snap();
        capturedPhotos.push(photo);
        
        // Put in slot
        slots[i].innerHTML = '';
        slots[i].appendChild(photo);
        slots[i].style.borderColor = 'transparent';
        slots[i].className = 'aspect-[4/3] overflow-hidden rounded-sm shadow-sm';
        
        if (i < 3) await sleep(1000);
    }

    isCapturing = false;
    // Show result
    if (window.innerWidth < 768) {
        // Mobile: clone strip to modal
        mobilePreviewArea.innerHTML = '';
        const clone = stripContainer.cloneNode(true);
        clone.style.transform = 'scale(1)';
        clone.style.width = '100%';
        mobilePreviewArea.appendChild(clone);
        mobileModal.classList.remove('hidden');
        mobileModal.classList.add('flex');
    }
});

function countdown(sec) {
    return new Promise(resolve => {
        countdownEl.classList.remove('hidden');
        let n = sec;
        countNum.innerText = n;
        countNum.classList.add('countdown-number'); // Apply the animation class
        
        const int = setInterval(() => {
            n--;
            if(n > 0) {
                countNum.innerText = n;
                // Re-apply the animation class for the next number (this might cause issues if too quick, but should work for 1s intervals)
                // A better way is to trigger a reflow, but for now, removing and adding back might suffice.
                countNum.classList.remove('countdown-number');
                void countNum.offsetWidth; // Trigger reflow
                countNum.classList.add('countdown-number');
            } else {
                clearInterval(int);
                // Allow the last animation to finish before hiding
                setTimeout(() => {
                    countdownEl.classList.add('hidden');
                    countNum.classList.remove('countdown-number'); // Clean up the class
                }, 300); // Match the animation duration
                resolve();
            }
        }, 1000);
    });
}

function flash() {
    flashEl.style.opacity = 1;
    setTimeout(() => flashEl.style.opacity = 0, 150);
}

function snap() {
    const cvs = document.createElement('canvas');
    // Crop center 4:3
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const aspect = 4/3;
    
    let sw, sh, sx, sy;
    if (vw/vh > aspect) {
        sh = vh; sw = sh * aspect;
        sx = (vw - sw)/2; sy = 0;
    } else {
        sw = vw; sh = sw / aspect;
        sx = 0; sy = (vh - sh)/2;
    }
    
    cvs.width = 600; 
    cvs.height = 450;
    const ctx = cvs.getContext('2d');
    
    // Mirror & Filter
    ctx.translate(cvs.width, 0);
    ctx.scale(-1, 1);
    
    if (currentFilter.includes('grayscale')) ctx.filter = 'grayscale(1)';
    if (currentFilter.includes('sepia')) ctx.filter = 'sepia(0.8)';
    if (currentFilter.includes('bright')) ctx.filter = 'brightness(1.2) contrast(1.1)';
    if (currentFilter.includes('vintage')) ctx.filter = 'sepia(0.4) contrast(1.2) saturate(0.8)';
    
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cvs.width, cvs.height);
    
    const img = new Image();
    img.src = cvs.toDataURL('image/jpeg', 0.95);
    img.className = 'w-full h-full object-cover';
    return img;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Download
const btnDownload = document.getElementById('btn-download');
btnDownload.addEventListener('click', downloadStrip);

function downloadStrip() {
    // Select the strip (mobile or desktop source)
    const target = window.innerWidth < 768 ? mobilePreviewArea.firstChild : stripContainer;
    
    html2canvas(target, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Clawdbot-Photo-${Date.now()}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    });
}

// Mobile Close
window.closeMobileModal = () => {
    mobileModal.classList.add('hidden');
    mobileModal.classList.remove('flex');
    // reset
    photoSlots.innerHTML = '';
    capturedPhotos = [];
};

document.getElementById('btn-restart').addEventListener('click', () => {
    photoSlots.innerHTML = '';
    capturedPhotos = [];
    galleryPanel.classList.add('hidden');
});

initCamera();