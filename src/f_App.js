import { useState, useEffect } from "react";
import Tesseract from "tesseract.js";

export default function App() {
  const [view, setView] = useState("scan");
  const [photo, setPhoto] = useState(null);
  const [isbn, setIsbn] = useState("");
  const [loadingText, setLoadingText] = useState("");

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

          // ✅ Send ISBN to Flask server
          try {
            const response = await fetch("http://192.168.1.34:5000/receive_isbn", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ isbn: detectedIsbn }),
            });

            const data = await response.json();
            console.log("Flask Response:", data);
          } catch (error) {
            console.error("Error sending ISBN to Flask:", error);
          }

        } else {
          setIsbn("ISBN not found");
        }

        setView("confirmation");
      }
    };
    input.click();
  };

  useEffect(() => {
    if (view === "confirmation") {
      const timer = setTimeout(() => {
        setView("scan");
        setPhoto(null);
        setIsbn("");
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      backgroundColor: "#f5f5f5"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "400px",
        background: "#fff",
        padding: "20px",
        borderRadius: "16px",
        boxShadow: "0 0 20px rgba(0,0,0,0.1)",
        textAlign: "center"
      }}>
        {view === "scan" && (
          <>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>📚 Alphabit Scanner</h2>
            <p style={{ color: "#888" }}>Click photo to scan real ISBN</p>
            <button
              onClick={handleScanClick}
              style={{
                marginTop: "20px",
                background: "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "16px"
              }}
            >
              📷 Click Photo
            </button>
          </>
        )}

        {view === "saving" && (
          <>
            <div style={{ fontSize: "30px", marginBottom: "10px" }}>🔄</div>
            <h3>Processing...</h3>
            <p>{loadingText}</p>
          </>
        )}

        {view === "confirmation" && (
          <>
            {photo && (
              <img
                src={photo}
                alt="Scanned Book"
                style={{
                  width: "150px",
                  height: "auto",
                  margin: "10px auto",
                  borderRadius: "12px"
                }}
              />
            )}
            <h3>✅ Scan Complete</h3>
            <p>Detected ISBN:</p>
            <p><strong>{isbn}</strong></p>
            <p>Returning to scanner in 7 seconds...</p>
          </>
        )}
      </div>
    </div>
  );
}
