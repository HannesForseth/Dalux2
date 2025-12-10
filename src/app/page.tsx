export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="text-2xl font-bold text-white">
            Dalux<span className="text-blue-500">2</span>
          </div>
          <div className="flex gap-4">
            <button className="px-4 py-2 text-slate-300 hover:text-white transition-colors">
              Logga in
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Kom igång
            </button>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Modern projekthantering för{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              byggbranschen
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Samla alla dina byggprojekt på ett ställe. Hantera dokument,
            ritningar, avvikelser och kommunikation i realtid.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors">
              Starta gratis provperiod
            </button>
            <button className="px-8 py-4 border border-slate-600 text-white rounded-lg text-lg font-semibold hover:bg-slate-800 transition-colors">
              Se demo
            </button>
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <FeatureCard
            title="Dokumenthantering"
            description="Ladda upp och organisera alla projektdokument på ett ställe med versionskontroll."
            icon="📁"
          />
          <FeatureCard
            title="Ritningsvisare"
            description="Visa och kommentera ritningar direkt i webbläsaren med avancerade verktyg."
            icon="📐"
          />
          <FeatureCard
            title="Avvikelsehantering"
            description="Rapportera och följ upp avvikelser med foton och kommentarer i realtid."
            icon="⚠️"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}
