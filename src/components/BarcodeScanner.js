import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScanner({ onDetected }) {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;

    const startScanner = async () => {
      try {
        await codeReader.decodeFromVideoDevice(null, videoRef.current, (result, err) => {
          if (result) {
            const isbn = result.getText().replace(/[^0-9X]/gi, '');
            if (isbn.startsWith('978') || isbn.startsWith('979')) {
              onDetected(isbn);
              codeReader.reset();  // stop scanning
            }
          }
        });
      } catch (error) {
        console.error('Camera error:', error);
      }
    };

    startScanner();

    return () => {
      try {
        codeReaderRef.current && codeReaderRef.current.reset();
      } catch (err) {
        console.warn("Error during cleanup:", err);
      }
    };
  }, [onDetected]);

  return (
    <div>
      <video ref={videoRef} width="100%" style={{ borderRadius: "10px" }} />
      <p>📷 Point your camera at an ISBN barcode</p>
    </div>
  );
}
