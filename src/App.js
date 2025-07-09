import { useState } from "react";
import Tesseract from "tesseract.js";

export default function App() {
  const [view, setView] = useState("scan");
  const [photo, setPhoto] = useState(null);
  const [isbn, setIsbn] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [loadingText, setLoadingText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [isbnNotFound, setIsbnNotFound] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const handleScanClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setPhoto(url);
        setView("saving");

        setLoadingText("Extracting text...");
        const result = await Tesseract.recognize(url, "eng", {
          logger: (m) => console.log(m),
        });

        const text = result.data.text;
        setLoadingText("Detecting ISBN...");

        const match = text.match(/97[89][-– ]?\d{1,5}[-– ]?\d{1,7}[-– ]?\d{1,7}[-– ]?\d/);
        if (match) {
          const detectedIsbn = match[0].replace(/[-–\s]/g, "");
          setIsbn(detectedIsbn);
          setIsbnNotFound(false);

          try {
            const response = await fetch("https://testocr.pythonanywhere.com/receive_isbn", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isbn: detectedIsbn }),
            });

            const data = await response.json();
            if (data.title) {
              setBookTitle(data.title);
              setShowManualInput(false);
              await sendToBackend(detectedIsbn, data.title);
              setSaveMessage("✅ Saved successfully");
              setIsSaved(true);
              setView("confirmation");
            } else {
              setBookTitle("");
              setShowManualInput(false);
              setIsSaved(false);
              setIsbnNotFound(true);
              setView("confirmation");
            }
          } catch (error) {
            console.error("Fetch error:", error);
            setBookTitle("");
            setShowManualInput(false);
            setIsSaved(false);
            setIsbnNotFound(true);
            setView("confirmation");
          }
        } else {
          setIsbn("");
          setIsbnNotFound(true);
          setShowManualInput(false);
          setView("confirmation");
        }
      }
    };
    input.click();
  };

  const sendToBackend = async (isbnToSend, titleToSend) => {
    try {
      const response = await fetch("https://testocr.pythonanywhere.com/save_title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: isbnToSend, b_title: titleToSend }),
      });
      const data = await response.json();
      console.log("✅ Saved:", data);
    } catch (error) {
      console.error("❌ Backend error:", error);
    }
  };

  const handleSendManual = async () => {
    const usedIsbn = isbn || manualIsbn.trim();
    const usedTitle = manualTitle.trim();

    if (usedIsbn && usedTitle) {
      await sendToBackend(usedIsbn, usedTitle);
      setSaveMessage("✅ Saved successfully");
      setIsSaved(true);
    } else {
      setSaveMessage("❗ Please enter both ISBN and book title");
    }
  };

  const handleBack = () => {
    setView("scan");
    setPhoto(null);
    setIsbn("");
    setManualIsbn("");
    setBookTitle("");
    setManualTitle("");
    setShowManualInput(false);
    setIsbnNotFound(false);
    setSaveMessage("");
    setIsSaved(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {view === "scan" && (
          <>
            <h1 style={styles.header}>📚 ISBN Scanner</h1>
            <p style={styles.subText}>Scan a book's ISBN from a photo</p>
            <button style={styles.primaryButton} onClick={handleScanClick}>
              📷 Take Photo
            </button>
          </>
        )}

        {view === "saving" && (
          <>
            <div style={styles.spinner}></div>
            <h3>Processing...</h3>
            <p>{loadingText}</p>
          </>
        )}

        {view === "confirmation" && (
          <>
            {photo && <img src={photo} alt="Scanned Book" style={styles.image} />}

            {isbnNotFound ? (
              <>
                <h3 style={{ color: "red" }}>❗ ISBN not found</h3>
                {!showManualInput && (
                  <button style={styles.manualButton} onClick={() => setShowManualInput(true)}>
                    ✍️ Enter Manually
                  </button>
                )}
              </>
            ) : (
              <>
                <h3 style={{ color: "#28a745" }}>✅ ISBN Detected</h3>
                <p><strong>ISBN:</strong> {isbn}</p>
                {bookTitle && <p><strong>Book Title:</strong> {bookTitle}</p>}
              </>
            )}

            {showManualInput && (
              <>
                <p>Enter ISBN:</p>
                <input
                  value={manualIsbn}
                  onChange={(e) => setManualIsbn(e.target.value)}
                  placeholder="Enter ISBN"
                  style={styles.input}
                />

                <p>Enter Book Title:</p>
                <input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Enter book title"
                  style={styles.input}
                />

                {!isSaved && (
                  <button style={styles.saveButton} onClick={handleSendManual}>
                    🚀 Save
                  </button>
                )}
              </>
            )}

            {saveMessage && <p style={{ marginTop: 12, color: "green" }}>{saveMessage}</p>}

            <button style={styles.secondaryButton} onClick={handleBack}>
              🔙 Return to Scanner
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(to right, #e0f7fa, #fefefe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    padding: "30px",
    borderRadius: "20px",
    boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  header: {
    fontSize: "26px",
    color: "#007bff",
  },
  subText: {
    color: "#666",
    marginBottom: "20px",
  },
  image: {
    width: "180px",
    borderRadius: "16px",
    marginBottom: "20px",
  },
  input: {
    padding: "10px",
    width: "90%",
    borderRadius: "8px",
    border: "1px solid #ccc",
    marginBottom: "12px",
  },
  primaryButton: {
    marginTop: "20px",
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 28px",
    fontSize: "16px",
    cursor: "pointer",
  },
  saveButton: {
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 24px",
    fontSize: "16px",
    cursor: "pointer",
  },
  secondaryButton: {
    background: "#6c757d",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "20px",
  },
  manualButton: {
    background: "#ffc107",
    color: "#000",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "10px",
  },
  spinner: {
    margin: "20px auto",
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #007bff",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
  },
};