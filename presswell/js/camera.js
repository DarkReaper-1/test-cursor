/**
 * Sensor Layer — camera + optional torch for fingertip PPG
 */
(function (global) {
  async function openCamera({ preferTorch = true } = {}) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera not available in this browser");
    }

    const attempts = [
      {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      },
      {
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      },
      { audio: false, video: true },
    ];

    let stream = null;
    let lastErr = null;
    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!stream) throw lastErr || new Error("Unable to open camera");

    const track = stream.getVideoTracks()[0];
    let torchOn = false;
    if (preferTorch && track) {
      try {
        const caps = track.getCapabilities?.() || {};
        if (caps.torch) {
          await track.applyConstraints({ advanced: [{ torch: true }] });
          torchOn = true;
        }
      } catch {
        // Torch unsupported — continue without it
      }
    }

    return { stream, track, torchOn };
  }

  function attach(video, stream) {
    video.srcObject = stream;
    return video.play().catch(() => {});
  }

  function stop(stream) {
    stream?.getTracks?.().forEach((t) => t.stop());
  }

  /**
   * Sample mean red intensity from the center ROI of the current video frame.
   */
  function sampleRed(video, canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let sum = 0;
    let n = 0;
    // Center ROI
    const x0 = Math.floor(w * 0.3);
    const x1 = Math.floor(w * 0.7);
    const y0 = Math.floor(h * 0.3);
    const y1 = Math.floor(h * 0.7);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        sum += data[i]; // R
        n++;
      }
    }
    return n ? sum / n : 0;
  }

  global.Camera = { openCamera, attach, stop, sampleRed };
})(window);
