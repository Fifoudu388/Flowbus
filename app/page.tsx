import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero card">
        <p className="eyebrow">Temps réel</p>
        <h1>FlowBus</h1>
        <p>
          Consultez les prochains passages en moins de 2 clics, scannez un QR code d&apos;arrêt ou recherchez une
          station.
        </p>
        <div className="cta-grid">
          <Link href="/search" className="btn btn-primary">
            Trouver un arrêt
          </Link>
          <Link href="/scan" className="btn btn-secondary">
            Scanner un QR code
          </Link>
        </div>
      </section>
    </main>
  );
}
