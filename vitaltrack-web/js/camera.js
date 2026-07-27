/**
 * Real camera capture for fingertip PPG. Opens the device camera, tries to
 * turn on the torch (works on some Android/Chrome combinations via the
 * non-standard MediaStreamTrack `torch` constraint; there is currently no
 * web API for torch control on iOS Safari at all — Apple hasn't shipped
 * one), and streams the mean red-channel brightness of each frame.
 *
 * Every frame is drawn to an off-screen canvas only to compute a single
 * brightness number — no frame, image, or video is ever stored, sent
 * anywhere, or kept past that computation.
 */
class CameraPPGCapture {
  constructor() {
    this.stream = null;
    this.videoTrack = null;
    this.videoEl = document.createElement('video');
    this.videoEl.setAttribute('playsinline', ''); // required for iOS Safari to avoid fullscreen takeover
    this.videoEl.muted = true;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 40;
    this.canvas.height = 30;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.rafId = null;
    this.torchSupported = false;
  }

  async start(onSample) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 160 },
        height: { ideal: 120 },
      },
      audio: false,
    });

    this.videoTrack = this.stream.getVideoTracks()[0];
    this.videoEl.srcObject = this.stream;
    await this.videoEl.play();

    this.torchSupported = await this._tryEnableTorch();

    const loop = () => {
      if (!this.stream) return;
      const luminance = this._sampleFrame();
      if (luminance !== null) {
        onSample(performance.now(), luminance);
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);

    return { torchSupported: this.torchSupported };
  }

  async _tryEnableTorch() {
    try {
      const capabilities = this.videoTrack.getCapabilities ? this.videoTrack.getCapabilities() : {};
      if (!capabilities.torch) return false;
      await this.videoTrack.applyConstraints({ advanced: [{ torch: true }] });
      return true;
    } catch (e) {
      return false;
    }
  }

  _sampleFrame() {
    if (this.videoEl.readyState < 2) return null; // not enough data yet
    this.ctx.drawImage(this.videoEl, 0, 0, this.canvas.width, this.canvas.height);
    let imageData;
    try {
      imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    } catch (e) {
      return null; // can happen transiently right after stream start
    }

    let sum = 0;
    let count = 0;
    // Red channel: with the torch on and a fingertip over the lens, red
    // light transmitted through tissue dominates the frame and tracks
    // blood-volume change most strongly. Sampled every 4th pixel — cheap
    // enough to run every frame.
    for (let i = 0; i < imageData.length; i += 16) {
      sum += imageData[i];
      count++;
    }
    return count === 0 ? 0 : sum / count;
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.videoTrack && this.torchSupported) {
      this.videoTrack.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    this.stream = null;
    this.videoTrack = null;
  }
}
