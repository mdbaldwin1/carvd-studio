import React from 'react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold">Carvd Studio</div>
          <div className="flex gap-8">
            <a href="/features" className="hover:text-yellow-400 transition">Features</a>
            <a href="/pricing" className="hover:text-yellow-400 transition">Pricing</a>
            <a href="/docs" className="hover:text-yellow-400 transition">Docs</a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6">
            Professional Furniture Design
            <span className="block text-yellow-400">Made Simple</span>
          </h1>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Design custom furniture and cabinetry with 3D visualization,
            optimized cut lists, and material cost tracking. 100% offline.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="#download"
              className="bg-yellow-400 text-slate-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition"
            >
              Download for macOS
            </a>
            <a
              href="/pricing"
              className="border-2 border-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-slate-900 transition"
            >
              View Pricing
            </a>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-bold mb-2">3D Visualization</h3>
            <p className="text-slate-400">
              Design in 3D with real-time rendering. See your furniture come to life.
            </p>
          </div>
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
            <div className="text-4xl mb-4">📐</div>
            <h3 className="text-xl font-bold mb-2">Optimized Cut Lists</h3>
            <p className="text-slate-400">
              Generate cutting diagrams that minimize waste and save money.
            </p>
          </div>
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">100% Offline</h3>
            <p className="text-slate-400">
              Your designs stay on your computer. No cloud, no subscriptions.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 mt-20 border-t border-slate-700 text-center text-slate-400">
        <p>&copy; 2026 Carvd Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
