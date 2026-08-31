import { useRef, useState } from "react";
import "./App.css";

function App() {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [targetSize, setTargetSize] = useState("");
  const [compressedFile, setCompressedFile] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleChooseImage = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    setSelectedFile(file);
    setCompressedFile(null);
  };

const compressImage = () => {
  if (!selectedFile) {
    alert("Please select an image first.");
    return;
  }

  if (!targetSize || Number(targetSize) <= 0) {
    alert("Please enter a required size.");
    return;
  }

  setIsCompressing(true);

  const targetBytes = Number(targetSize) * 1024;

  const image = new Image();
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  image.onload = async () => {
    canvas.width = image.width;
    canvas.height = image.height;

    ctx.drawImage(image, 0, 0);

    const getBlob = (quality) => {
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          "image/jpeg",
          quality
        );
      });
    };

    /*
      Binary search for the JPEG quality
      that produces a file closest to the target size.
    */

    let low = 0.01;
    let high = 1;
    let bestBlob = null;
    let bestDifference = Infinity;

    for (let i = 0; i < 20; i++) {
      const quality = (low + high) / 2;

      const blob = await getBlob(quality);

      const difference = Math.abs(blob.size - targetBytes);

      if (difference < bestDifference) {
        bestDifference = difference;
        bestBlob = blob;
      }

      if (blob.size > targetBytes) {
        high = quality;
      } else {
        low = quality;
      }
    }

    if (!bestBlob) {
      setIsCompressing(false);
      alert("Could not compress image.");
      return;
    }

    console.log("Target:", targetBytes, "bytes");
    console.log("Closest:", bestBlob.size, "bytes");

    /*
      If the closest result is smaller than the target,
      we will add padding bytes so the final file reaches
      the exact requested size.

      NOTE:
      This creates a valid file only when the padding is added
      in a way the JPEG format can safely ignore.
    */

    let finalBlob = bestBlob;

    if (bestBlob.size < targetBytes) {
      const paddingSize = targetBytes - bestBlob.size;

      const padding = new Uint8Array(paddingSize);

      finalBlob = new Blob(
        [bestBlob, padding],
        {
          type: "image/jpeg",
        }
      );
    }

    const finalFile = new File(
      [finalBlob],
      `compressed-${selectedFile.name.split(".")[0]}.jpg`,
      {
        type: "image/jpeg",
      }
    );

    console.log(
      "FINAL SIZE:",
      finalFile.size,
      "bytes"
    );

    console.log(
      "FINAL SIZE:",
      (finalFile.size / 1024).toFixed(2),
      "KB"
    );

    setCompressedFile(finalFile);
    setIsCompressing(false);
  };

  image.src = URL.createObjectURL(selectedFile);
};

  const downloadImage = () => {
    if (!compressedFile) return;

    const url = URL.createObjectURL(compressedFile);

    const link = document.createElement("a");
    link.href = url;
    link.download = compressedFile.name;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

return (
  <div className="app">
    <div className="container">

      {!compressedFile ? (
        <>
          {/* HEADER */}

          <h1>Compress your image</h1>

          <p className="subtitle">
            Reduce your image size without losing quality.
          </p>

          {/* UPLOAD */}

          <div className="upload-box">
            <div className="upload-icon">↑</div>

            <h2>
              {selectedFile
                ? selectedFile.name
                : "Upload your image"}
            </h2>

            <p>
              {selectedFile
                ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                : "JPG, JPEG or PNG"}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <button onClick={handleChooseImage}>
              Choose Image
            </button>
          </div>

          {/* SIZE */}

          <div className="size-section">
           

            <div className="size-input">
              <input
                type="number"
                placeholder="Enter required size"
                min="1"
                value={targetSize}
                onChange={(e) => setTargetSize(e.target.value)}
              />

              <span>KB</span>
            </div>
          </div>

          {/* COMPRESS */}

          <button
            className="compress-button"
            onClick={compressImage}
            disabled={isCompressing}
          >
            {isCompressing
              ? "Compressing..."
              : "Compress Image"}
          </button>
        </>
      ) : (
        <>
          {/* RESULT SCREEN */}

          <div className="success-icon">
            ✓
          </div>

          <h1>Image Ready</h1>

          <p className="subtitle">
            Your image has been compressed successfully.
          </p>

          <div className="result">

            <div className="result-row">
              <span>Original Size</span>

              <strong>
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </strong>
            </div>

            <div className="result-row">
              <span>Compressed Size</span>

              <strong>
                {(compressedFile.size / 1024).toFixed(2)} KB
              </strong>
            </div>

            <div className="result-row">
              <span>Target Size</span>

              <strong>
                {targetSize} KB
              </strong>
            </div>

          </div>

          <button
            className="compress-button"
            onClick={downloadImage}
          >
            Download Image
          </button>

          <button
            className="again-button"
            onClick={() => {
              setSelectedFile(null);
              setCompressedFile(null);
              setTargetSize("");
              setIsCompressing(false);

              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}
          >
            Compress Another Image
          </button>
        </>
      )}

    </div>
  </div>
);
}

export default App;
