(() => {
  "use strict";

  const MAX_FILE_BYTES = 20 * 1024 * 1024;
  const $ = (id) => document.getElementById(id);

  const fileInput = $("file-input");
  const dropZone = $("drop-zone");
  const workspace = $("workspace");
  const errorBox = $("error-box");
  const statusBox = $("status-box");
  const quality = $("quality");
  const qualityValue = $("quality-value");
  const outputFormat = $("output-format");
  const maxWidthInput = $("max-width");
  const maxHeightInput = $("max-height");
  const compressButton = $("compress-button");
  const results = $("results");
  const originalPreview = $("original-preview");
  const compressedPreview = $("compressed-preview");
  const downloadButton = $("download-button");

  let currentFile = null;
  let originalUrl = null;
  let compressedUrl = null;
  let originalImage = null;
  let operationId = 0;

  $("year").textContent = String(new Date().getFullYear());

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    statusBox.hidden = true;
  }

  function showStatus(message) {
    statusBox.textContent = message;
    statusBox.hidden = false;
    errorBox.hidden = true;
  }

  function clearMessages() {
    errorBox.hidden = true;
    statusBox.hidden = true;
    errorBox.textContent = "";
    statusBox.textContent = "";
  }

  function revokeUrl(url) {
    if (url) URL.revokeObjectURL(url);
  }

  function clearResult() {
    operationId += 1;
    results.hidden = true;
    if (compressedUrl) revokeUrl(compressedUrl);
    compressedUrl = null;
    compressedPreview.removeAttribute("src");
    downloadButton.removeAttribute("href");
    downloadButton.removeAttribute("download");
  }

  function resetTool() {
    currentFile = null;
    originalImage = null;
    if (originalUrl) revokeUrl(originalUrl);
    originalUrl = null;
    clearResult();
    fileInput.value = "";
    workspace.hidden = true;
    dropZone.hidden = false;
    clearMessages();
    $("file-name").textContent = "";
    $("file-meta").textContent = "";
    originalPreview.removeAttribute("src");
    maxWidthInput.value = "";
    maxHeightInput.value = "";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let unit = units[0];
    for (let i = 1; value >= 1024 && i < units.length; i += 1) {
      value /= 1024;
      unit = units[i];
    }
    return `${value.toFixed(value >= 100 ? 0 : 1)} ${unit}`;
  }

  function safeBaseName(name) {
    const base = name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
    return (base || "image").slice(0, 80);
  }

  function getExtension(mime) {
    if (mime === "image/jpeg") return "jpg";
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    return "img";
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("The browser could not open this image. Please choose a different file."));
      img.src = url;
    });
  }

  async function handleFile(file) {
    clearMessages();
    clearResult();

    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      showError("Please select a valid image file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError("This file is larger than 20 MB. Please choose a smaller image.");
      return;
    }
    if (file.size === 0) {
      showError("This file is empty. Please choose another image.");
      return;
    }

    if (originalUrl) revokeUrl(originalUrl);
    currentFile = file;
    originalUrl = URL.createObjectURL(file);
    originalImage = null;
    dropZone.hidden = true;
    workspace.hidden = false;
    $("file-name").textContent = file.name;
    $("file-meta").textContent = `${formatBytes(file.size)} · ${file.type || "Image"}`;
    originalPreview.src = originalUrl;
    maxWidthInput.value = "";
    maxHeightInput.value = "";
    showStatus("Loading image…");

    try {
      const img = await loadImage(originalUrl);
      if (currentFile !== file) return;
      originalImage = img;
      $("file-meta").textContent = `${img.naturalWidth} × ${img.naturalHeight} px · ${formatBytes(file.size)}`;
      showStatus("Image ready. Adjust the settings and select Compress image.");
    } catch (error) {
      showError(error.message || "Could not read this image.");
      currentFile = null;
      originalImage = null;
    }
  }

  function targetDimensions(width, height) {
    const rawW = maxWidthInput.value.trim();
    const rawH = maxHeightInput.value.trim();
    const maxW = rawW ? Number(rawW) : width;
    const maxH = rawH ? Number(rawH) : height;

    if ((rawW && (!Number.isInteger(maxW) || maxW < 1 || maxW > 20000)) ||
        (rawH && (!Number.isInteger(maxH) || maxH < 1 || maxH > 20000))) {
      throw new Error("Maximum width and height must be whole numbers from 1 to 20,000.");
    }
    const scale = Math.min(1, maxW / width, maxH / height);
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale))
    };
  }

  async function compressImage() {
    clearMessages();
    if (!currentFile || !originalImage) {
      showError("Please upload a valid image first.");
      return;
    }

    const thisOperation = ++operationId;
    compressButton.disabled = true;
    compressButton.textContent = "Compressing…";

    try {
      const dims = targetDimensions(originalImage.naturalWidth, originalImage.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = dims.width;
      canvas.height = dims.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser could not start image processing. Try an updated browser.");

      const mime = outputFormat.value;
      if (mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, dims.width, dims.height);
      }
      ctx.drawImage(originalImage, 0, 0, dims.width, dims.height);

      const qualityNumber = Number(quality.value) / 100;
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, mime, qualityNumber);
      });

      if (thisOperation !== operationId) return;
      if (!blob) throw new Error("This browser could not create the selected output format. Try JPG or WebP.");

      // Some browsers may fall back to PNG if a requested canvas format is unsupported.
      const actualMime = blob.type || mime;
      const newUrl = URL.createObjectURL(blob);
      if (compressedUrl) revokeUrl(compressedUrl);
      compressedUrl = newUrl;
      compressedPreview.src = compressedUrl;
      $("original-dimensions").textContent = `${originalImage.naturalWidth} × ${originalImage.naturalHeight}`;
      $("compressed-dimensions").textContent = `${dims.width} × ${dims.height}`;
      $("original-size").textContent = formatBytes(currentFile.size);
      $("compressed-size").textContent = formatBytes(blob.size);

      const difference = currentFile.size - blob.size;
      const percentage = currentFile.size > 0 ? Math.round((difference / currentFile.size) * 100) : 0;
      const badge = $("savings-badge");
      if (difference > 0) {
        badge.textContent = `${percentage}% smaller`;
        badge.classList.remove("no-savings");
        $("result-note").textContent = `Saved ${formatBytes(difference)} compared with the original file. Results vary by image and settings.`;
      } else if (difference === 0) {
        badge.textContent = "Same file size";
        badge.classList.add("no-savings");
        $("result-note").textContent = "The output is the same size as the original. Try a different format or smaller dimensions.";
      } else {
        badge.textContent = `${Math.abs(percentage)}% larger`;
        badge.classList.add("no-savings");
        $("result-note").textContent = "This output is larger than the original. Try WebP, JPG, or smaller dimensions.";
      }

      downloadButton.href = compressedUrl;
      downloadButton.download = `${safeBaseName(currentFile.name)}-compressed.${getExtension(actualMime)}`;
      results.hidden = false;
      showStatus("Processing complete. Review the preview before downloading.");
    } catch (error) {
      if (thisOperation === operationId) showError(error.message || "Compression failed. Please try another image or format.");
    } finally {
      if (thisOperation === operationId) {
        compressButton.disabled = false;
        compressButton.textContent = "Compress image";
      }
    }
  }

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) handleFile(file);
  });

  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach((type) => {
    dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      dropZone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragging");
    });
  });
  dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) {
      fileInput.value = "";
      handleFile(file);
    }
  });

  quality.addEventListener("input", () => {
    qualityValue.textContent = `${quality.value}%`;
  });

  compressButton.addEventListener("click", compressImage);
  $("remove-file").addEventListener("click", resetTool);

  outputFormat.addEventListener("change", () => {
    if (!currentFile) return;
    clearResult();
    showStatus("Settings changed. Compress the image again to apply them.");
  });
  [maxWidthInput, maxHeightInput].forEach((input) => {
    input.addEventListener("input", () => {
      if (currentFile) {
        clearResult();
        showStatus("Settings changed. Compress the image again to apply them.");
      }
    });
  });
  quality.addEventListener("change", () => {
    if (currentFile) {
      clearResult();
      showStatus("Settings changed. Compress the image again to apply them.");
    }
  });

  downloadButton.addEventListener("click", (event) => {
    if (!compressedUrl) {
      event.preventDefault();
      showError("Compress an image before downloading.");
    }
  });

  window.addEventListener("beforeunload", () => {
    revokeUrl(originalUrl);
    revokeUrl(compressedUrl);
  });
})();
