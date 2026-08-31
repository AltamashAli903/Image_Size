import { useRef, useState } from "react";
import "./App.css";
import Swal from "sweetalert2";

function App() {
  const fileInputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [targetSize, setTargetSize] = useState("");
  const [compressedFiles, setCompressedFiles] = useState([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Open file picker
  const handleChooseImage = () => {
    fileInputRef.current?.click();
  };

  // Add selected images
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    const newFiles = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setCompressedFiles([]);

    event.target.value = "";
  };

  // Remove one selected image
  const removeImage = (id) => {
    setSelectedFiles((prev) => {
      const imageToRemove = prev.find(
        (item) => item.id === id
      );

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      return prev.filter((item) => item.id !== id);
    });

    setCompressedFiles([]);
  };

  // Compress one image
  const compressSingleImage = (file, targetBytes) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = image.width;
          canvas.height = image.height;

          ctx.drawImage(image, 0, 0);

          const getBlob = (quality) => {
            return new Promise((resolveBlob) => {
              canvas.toBlob(
                (blob) => resolveBlob(blob),
                "image/jpeg",
                quality
              );
            });
          };

          let low = 0.01;
          let high = 1;

          let bestBlob = null;
          let bestDifference = Infinity;

          for (let i = 0; i < 20; i++) {
            const quality = (low + high) / 2;

            const blob = await getBlob(quality);

            if (!blob) continue;

            const difference = Math.abs(
              blob.size - targetBytes
            );

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
            reject(
              new Error("Could not compress image.")
            );
            return;
          }

          // Temporary padding approach.
          // We will replace this with the proper exact-size
          // JPEG algorithm later.
          let finalBlob = bestBlob;

          if (bestBlob.size < targetBytes) {
            const paddingSize =
              targetBytes - bestBlob.size;

            const padding = new Uint8Array(
              paddingSize
            );

            finalBlob = new Blob(
              [bestBlob, padding],
              {
                type: "image/jpeg",
              }
            );
          }

          const fileName =
            file.name.substring(
              0,
              file.name.lastIndexOf(".")
            ) || "image";

          const finalFile = new File(
            [finalBlob],
            `compressed-${fileName}.jpg`,
            {
              type: "image/jpeg",
            }
          );

          resolve(finalFile);
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not load image."));
      };

      image.src = objectUrl;
    });
  };

  // Compress all images
  const compressImages = async () => {
    if (selectedFiles.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No images selected",
        text: "Please select at least one image.",
        confirmButtonText: "Okay",
      });
      return;
    }

    if (!targetSize || Number(targetSize) <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Target size required",
        text: "Please enter the required image size.",
        confirmButtonText: "Okay",
      });
      return;
    }

    setIsCompressing(true);
    setCompressedFiles([]);

    const targetBytes = Number(targetSize) * 1024;

    try {
      const results = [];

      for (const item of selectedFiles) {
        const compressed = await compressSingleImage(
          item.file,
          targetBytes
        );

        results.push({
          id: item.id,
          originalFile: item.file,
          compressedFile: compressed,
          preview: item.preview,
        });
      }

      setCompressedFiles(results);
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Compression failed",
        text: "Something went wrong while compressing your images.",
        confirmButtonText: "Okay",
      });
    } finally {
      setIsCompressing(false);
    }
  };

  // Download one image
  const downloadImage = (file) => {
    const url = URL.createObjectURL(file);

    const link = document.createElement("a");

    link.href = url;
    link.download = file.name;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // Reset
  const resetApp = () => {
    selectedFiles.forEach((item) => {
      URL.revokeObjectURL(item.preview);
    });

    setSelectedFiles([]);
    setCompressedFiles([]);
    setTargetSize("");
    setIsCompressing(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="app">
      <div className="container">

        {compressedFiles.length === 0 ? (
          <>
            {/* HEADER */}

            <div className="header">
              <h1>Compress your images</h1>

              <p className="subtitle">
                Reduce image size to your required size.
              </p>
            </div>

            {/* UPLOAD */}

            <div
              className="upload-box"
              onClick={handleChooseImage}
            >
              <div className="upload-icon">
                ↑
              </div>

              <h2>
                {selectedFiles.length > 0
                  ? `${selectedFiles.length} image${selectedFiles.length > 1
                    ? "s"
                    : ""
                  } selected`
                  : "Upload your images"}
              </h2>

              <p>
                JPG, JPEG, PNG or WebP
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileChange}
                style={{ display: "none" }}
              />

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleChooseImage();
                }}
              >
                Choose Images
              </button>
            </div>

            {/* SELECTED IMAGES */}

            {selectedFiles.length > 0 && (
              <div className="selected-section">

                <div className="section-heading">
                  <span>
                    Selected Images
                  </span>

                  <span>
                    {selectedFiles.length}
                  </span>
                </div>

                <div className="image-list">

                  {selectedFiles.map((item) => (
                    <div
                      className="image-card"
                      key={item.id}
                    >
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="image-thumbnail"
                      />

                      <div className="image-info">
                        <strong>
                          {item.file.name}
                        </strong>

                        <span>
                          {(
                            item.file.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                        </span>
                      </div>

                      <button
                        type="button"
                        className="remove-button"
                        onClick={() =>
                          removeImage(item.id)
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}

                </div>
              </div>
            )}

            {/* TARGET SIZE */}

            <div className="size-section">

              <label>
                Target Size
              </label>

              <div className="size-input">

                <input
                  type="number"
                  min="1"
                  placeholder="Enter required size"
                  value={targetSize}
                  onChange={(event) =>
                    setTargetSize(
                      event.target.value
                    )
                  }
                />

                <span>KB</span>

              </div>

            </div>

            {/* COMPRESS */}

            <button
              className="compress-button"
              onClick={compressImages}
              disabled={isCompressing}
            >
              {isCompressing
                ? "Compressing..."
                : selectedFiles.length > 1
                  ? `Compress ${selectedFiles.length} Images`
                  : "Compress Image"}
            </button>
          </>
        ) : (
          <>
            {/* RESULT HEADER */}

            <div className="success-icon">
              ✓
            </div>

            <h1>Images Ready</h1>

            <p className="subtitle">
              {compressedFiles.length} image
              {compressedFiles.length > 1
                ? "s"
                : ""}{" "}
              compressed successfully.
            </p>

            {/* RESULT LIST */}

            <div className="result-list">

              {compressedFiles.map((item) => (
                <div
                  className="result-card"
                  key={item.id}
                >
                  <img
                    src={item.preview}
                    alt={item.originalFile.name}
                    className="result-thumbnail"
                  />

                  <div className="result-info">

                    <strong>
                      {item.originalFile.name}
                    </strong>

                    <div className="size-details">
                      <span>
                        {(
                          item.originalFile.size /
                          1024 /
                          1024
                        ).toFixed(2)}{" "}
                        MB
                      </span>

                      <span className="arrow">
                        →
                      </span>

                      <span className="result-size">
                        {(
                          item.compressedFile.size /
                          1024
                        ).toFixed(2)}{" "}
                        KB
                      </span>
                    </div>

                  </div>

                  <button
                    type="button"
                    className="small-download"
                    onClick={() =>
                      downloadImage(
                        item.compressedFile
                      )
                    }
                  >
                    Download
                  </button>

                </div>
              ))}

            </div>

            {/* TARGET */}

            <div className="target-info">
              Target size:{" "}
              <strong>
                {targetSize} KB
              </strong>
            </div>

            {/* AGAIN */}

            <button
              className="again-button"
              onClick={resetApp}
            >
              Compress More Images
            </button>
          </>
        )}

      </div>
    </div>
  );
}

export default App;
