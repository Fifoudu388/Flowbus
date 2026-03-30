'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useEffect, useRef, useState } from 'react';

export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const [status, setStatus] = useState('Prêt à scanner. Autorisez la caméra pour démarrer.');

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 300 });
    readerRef.current = reader;
    let active = true;

    reader
      .decodeFromVideoDevice(undefined, videoElement, (result, error) => {
        if (!active) return;
        if (result) {
          const text = result.getText();
          try {
            const url = new URL(text, window.location.origin);
            if (/^\/stop\/.+/.test(url.pathname)) {
              setStatus('QR code détecté. Redirection...');
              active = false;
              reader.stopContinuousDecode();
              router.push(url.pathname);
              return;
            }
            setStatus('QR code valide détecté, mais URL non supportée.');
          } catch {
            setStatus('QR code invalide.');
          }
        }

        if (error) {
          setStatus('Scan actif... pointez la caméra vers un QR code d’arrêt.');
        }
      })
      .catch(() => {
        setStatus('Impossible d’accéder à la caméra. Vérifiez les permissions.');
      });

    return () => {
      active = false;
      reader.stopContinuousDecode();
      readerRef.current = null;
    };
  }, [router]);

  return (
    <section className="card stack">
      <h1>Scanner un QR code</h1>
      <p className="helper-text">{status}</p>
      <video ref={videoRef} className="camera-frame" muted playsInline />
      <p className="helper-text">
        Astuce : le QR code doit contenir un lien de type <code>/stop/id_arret</code>.
      </p>
      <Link href="/search" className="btn btn-secondary">
        Rechercher manuellement
      </Link>
    </section>
  );
}
