import { useState, useCallback, useMemo } from "react";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs";

// ─── HELPERS ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD" }).format(n);

// ─── ICONS ──────────────────────────────────────────────────────────────────
const IconUpload = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const IconTruck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" rx="1" />
    <path d="M16 8h4l3 5v3h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const IconArrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconBolt = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

// ─── SAMPLE DATA ────────────────────────────────────────────────────────────
const SAMPLE_DATA = [
  { origen: "Los Angeles, CA", destino: "Monterrey, NL", proveedor: "Trans Continental MX", precio_kg: 0.085, transit_days: 4, precio_kg_team: 0.105, transit_days_team: 2 },
  { origen: "Los Angeles, CA", destino: "Monterrey, NL", proveedor: "Logística Norteña",    precio_kg: 0.092, transit_days: 3, precio_kg_team: 0.115, transit_days_team: 2 },
  { origen: "Los Angeles, CA", destino: "Monterrey, NL", proveedor: "FletEx Premium",       precio_kg: 0.078, transit_days: 6, precio_kg_team: 0.098, transit_days_team: 3 },
  { origen: "Houston, TX",     destino: "Monterrey, NL", proveedor: "Trans Continental MX", precio_kg: 0.055, transit_days: 2, precio_kg_team: 0.072, transit_days_team: 1 },
  { origen: "Houston, TX",     destino: "Monterrey, NL", proveedor: "Border Express",       precio_kg: 0.048, transit_days: 3, precio_kg_team: 0.065, transit_days_team: 1 },
  { origen: "Houston, TX",     destino: "Monterrey, NL", proveedor: "Logística Norteña",    precio_kg: 0.062, transit_days: 1, precio_kg_team: 0.080, transit_days_team: 1 },
  { origen: "Dallas, TX",      destino: "Monterrey, NL", proveedor: "Trans Continental MX", precio_kg: 0.060, transit_days: 2, precio_kg_team: 0.078, transit_days_team: 1 },
  { origen: "Dallas, TX",      destino: "Monterrey, NL", proveedor: "Border Express",       precio_kg: 0.053, transit_days: 3, precio_kg_team: 0.070, transit_days_team: 1 },
  { origen: "Chicago, IL",     destino: "Monterrey, NL", proveedor: "FletEx Premium",       precio_kg: 0.110, transit_days: 5, precio_kg_team: 0.135, transit_days_team: 3 },
  { origen: "Chicago, IL",     destino: "Monterrey, NL", proveedor: "Trans Continental MX", precio_kg: 0.125, transit_days: 4, precio_kg_team: 0.150, transit_days_team: 2 },
  { origen: "Miami, FL",       destino: "Monterrey, NL", proveedor: "Logística Norteña",    precio_kg: 0.140, transit_days: 6, precio_kg_team: 0.170, transit_days_team: 3 },
  { origen: "Miami, FL",       destino: "Monterrey, NL", proveedor: "FletEx Premium",       precio_kg: 0.130, transit_days: 7, precio_kg_team: 0.158, transit_days_team: 4 },
];

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [peso, setPeso] = useState("");
  const [unidad, setUnidad] = useState("libras"); // "libras" o "kilos"
  const [ordenar, setOrdenar] = useState("costo"); // "costo" o "dias"
  const [searched, setSearched] = useState(false);
  const [usingSample, setUsingSample] = useState(false);

  // Parse Excel
  const parseFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws);
      // Normalize keys to lowercase
      const normalized = json.map((row) => {
        const n = {};
        Object.keys(row).forEach((k) => {
          n[k.toLowerCase().replace(/\s+/g, "_")] = row[k];
        });
        return n;
      });
      setData(normalized);
      setUsingSample(false);
      setSearched(false);
      setOrigen("");
      setDestino("");
      setPeso("");
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const loadSample = () => {
    setData(SAMPLE_DATA);
    setUsingSample(true);
    setSearched(false);
    setOrigen("");
    setDestino("");
    setPeso("");
  };

  const activeData = data || [];

  const origenes = useMemo(
    () => [...new Set(activeData.map((r) => r.origen).filter(Boolean))].sort(),
    [activeData]
  );
  const destinos = useMemo(
    () => [...new Set(activeData.map((r) => r.destino).filter(Boolean))].sort(),
    [activeData]
  );

  const results = useMemo(() => {
    if (!searched || !origen || !destino || !peso) return [];
    const pesoValue = parseFloat(peso);
    // Convertir a kilos: 1 libra = 0.453592 kg
    const kilos = unidad === "libras" ? pesoValue * 0.453592 : pesoValue;
    const filas = [];
    activeData
      .filter((r) => r.origen === origen && r.destino === destino)
      .forEach((r) => {
        // Opción normal
        filas.push({
          ...r,
          isTeam: false,
          precioUsado: r.precio_kg || 0,
          diasUsados: r.transit_days || null,
          total: (r.precio_kg || 0) * kilos,
        });
        // Opción TEAM (solo si tiene precio_kg_team)
        if (r.precio_kg_team) {
          filas.push({
            ...r,
            isTeam: true,
            precioUsado: r.precio_kg_team,
            diasUsados: r.transit_days_team || null,
            total: r.precio_kg_team * kilos,
          });
        }
      });
    return filas.sort((a, b) => {
      if (ordenar === "dias") {
        const dA = a.diasUsados ?? 9999;
        const dB = b.diasUsados ?? 9999;
        return dA !== dB ? dA - dB : a.total - b.total;
      }
      return a.total - b.total;
    });
  }, [searched, origen, destino, peso, unidad, ordenar, activeData]);

  const handleSearch = () => {
    if (origen && destino && peso) setSearched(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#e8e8e8", fontFamily: "'Courier New', monospace", color: "#1a1a1a" }}>
      {/* Header */}
      <div style={{ borderBottom: "2px solid #ccc", padding: "20px 40px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ color: "#4a5fc1" }}><IconTruck /></div>
        <div>
          <div style={{ fontSize: 16, letterSpacing: 6, color: "#666", textTransform: "uppercase" }}>Sistema de</div>
          <div style={{ fontSize: 28, fontWeight: "bold", letterSpacing: 2, color: "#1a1a1a" }}>COTIZACIÓN DE FLETE</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 14, color: "#666", letterSpacing: 2 }}>EE.UU → MTY</div>
      </div>

      <div style={{ maxWidth: "100%", margin: "0 auto", padding: "40px clamp(24px, 5vw, 80px)" }}>

        {/* Upload zone */}
        {!data ? (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragging ? "#4a5fc1" : "#999"}`,
                borderRadius: 4,
                padding: "60px 40px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                background: dragging ? "rgba(74,95,193,0.1)" : "#f5f5f5",
              }}
            >
              <div style={{ color: dragging ? "#4a5fc1" : "#666", marginBottom: 16 }}><IconUpload /></div>
              <div style={{ fontSize: 17, letterSpacing: 3, color: "#333", marginBottom: 8, textTransform: "uppercase" }}>
                Arrastra tu archivo Excel aquí
              </div>
              <div style={{ fontSize: 15, color: "#555", marginBottom: 24 }}>
                o selecciona el archivo manualmente
              </div>
              <label style={{
                display: "inline-block",
                padding: "12px 32px",
                background: "#4a5fc1",
                border: "1px solid #4a5fc1",
                borderRadius: 2,
                fontSize: 14,
                letterSpacing: 2,
                cursor: "pointer",
                color: "#fff",
                textTransform: "uppercase",
              }}>
                Seleccionar .xlsx
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                  onChange={(e) => e.target.files[0] && parseFile(e.target.files[0])} />
              </label>
            </div>

            {/* Sample data notice */}
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "#666", marginBottom: 10, letterSpacing: 1 }}>— o —</div>
              <button onClick={loadSample} style={{
                background: "transparent", border: "1px solid #999", borderRadius: 2,
                color: "#333", fontSize: 14, letterSpacing: 2, padding: "10px 24px",
                cursor: "pointer", textTransform: "uppercase",
              }}>
                Usar datos de ejemplo
              </button>
            </div>

            {/* Column guide */}
            <div style={{ marginTop: 40, background: "#f5f5f5", border: "1px solid #ccc", borderRadius: 4, padding: 24 }}>
              <div style={{ fontSize: 14, letterSpacing: 3, color: "#666", textTransform: "uppercase", marginBottom: 16 }}>
                Columnas esperadas en tu Excel
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["origen",          "Ciudad de origen (ej: Houston, TX)"],
                  ["destino",         "Ciudad destino (ej: Monterrey, NL)"],
                  ["proveedor",       "Nombre del agente / empresa"],
                  ["precio_kg",       "Precio normal por kilogramo en USD"],
                  ["transit_days",    "Días de tránsito normal (opcional)"],
                  ["precio_kg_team",  "Precio TEAM por kilogramo en USD (opcional)"],
                  ["transit_days_team", "Días de tránsito TEAM (opcional)"],
                ].map(([col, desc]) => (
                  <div key={col} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <code style={{ color: "#4a5fc1", fontSize: 14, whiteSpace: "nowrap", minWidth: 100 }}>{col}</code>
                    <span style={{ color: "#555", fontSize: 14 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* File loaded banner */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#f5f5f5", border: "1px solid #ccc", borderRadius: 4,
              padding: "12px 20px", marginBottom: 32,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4caf50" }} />
                <span style={{ fontSize: 15, color: "#333", letterSpacing: 1 }}>
                  {usingSample ? "Datos de ejemplo cargados" : "Archivo cargado"} —{" "}
                  <span style={{ color: "#4a5fc1", fontWeight: "bold" }}>{activeData.length} cotizaciones</span>
                </span>
              </div>
              <button
                onClick={() => { setData(null); setSearched(false); setUsingSample(false); }}
                style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}
              >
                Cambiar archivo
              </button>
            </div>

            {/* Search form */}
            <div style={{ background: "#f5f5f5", border: "1px solid #ccc", borderRadius: 4, padding: 28, marginBottom: 32 }}>
              <div style={{ fontSize: 14, letterSpacing: 3, color: "#666", textTransform: "uppercase", marginBottom: 24 }}>
                Parámetros de búsqueda
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
                {/* Origen */}
                <div>
                  <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>Origen</label>
                  <select value={origen} onChange={(e) => { setOrigen(e.target.value); setSearched(false); }}
                    style={{ width: "100%", background: "#fff", border: "1px solid #999", borderRadius: 2, color: origen ? "#1a1a1a" : "#999", padding: "12px 14px", fontSize: 16, fontFamily: "system-ui, Arial, sans-serif" }}>
                    <option value="">Seleccionar...</option>
                    {origenes.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {/* Arrow */}
                <div style={{ color: "#4a5fc1", paddingBottom: 10 }}><IconArrow /></div>

                {/* Destino */}
                <div>
                  <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>Destino</label>
                  <select value={destino} onChange={(e) => { setDestino(e.target.value); setSearched(false); }}
                    style={{ width: "100%", background: "#fff", border: "1px solid #999", borderRadius: 2, color: destino ? "#1a1a1a" : "#999", padding: "12px 14px", fontSize: 16, fontFamily: "system-ui, Arial, sans-serif" }}>
                    <option value="">Seleccionar...</option>
                    {destinos.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Peso y Unidad */}
                <div style={{ display: "flex", gap: 8 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>Peso</label>
                    <input
                      type="number" min="0.1" step="0.1" value={peso}
                      onChange={(e) => { setPeso(e.target.value); setSearched(false); }}
                      placeholder="0.0"
                      style={{ width: "100px", background: "#fff", border: "1px solid #999", borderRadius: 2, color: "#1a1a1a", padding: "12px 14px", fontSize: 16, fontFamily: "system-ui, Arial, sans-serif" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, letterSpacing: 2, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>Unidad</label>
                    <select value={unidad} onChange={(e) => { setUnidad(e.target.value); setSearched(false); }}
                      style={{ width: "100%", background: "#fff", border: "1px solid #999", borderRadius: 2, color: "#1a1a1a", padding: "12px 14px", fontSize: 16, fontFamily: "system-ui, Arial, sans-serif" }}>
                      <option value="libras">Libras</option>
                      <option value="kilos">Kilos</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={!origen || !destino || !peso}
                style={{
                  marginTop: 24,
                  padding: "14px 40px",
                  background: (!origen || !destino || !peso) ? "#ccc" : "#4a5fc1",
                  color: (!origen || !destino || !peso) ? "#999" : "#fff",
                  border: "none", borderRadius: 2,
                  fontSize: 15, fontWeight: "bold", letterSpacing: 3,
                  textTransform: "uppercase", cursor: (!origen || !destino || !peso) ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
              >
                Buscar opciones
              </button>
            </div>

            {/* Results */}
            {searched && (
              <div>
                {results.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#666", fontSize: 16, letterSpacing: 1 }}>
                    No se encontraron cotizaciones para esa ruta.
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <div style={{ fontSize: 14, letterSpacing: 3, color: "#666", textTransform: "uppercase" }}>
                        {results.length} opciones encontradas
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#999", letterSpacing: 1, marginRight: 4 }}>ORDENAR:</span>
                        <button
                          onClick={() => setOrdenar("costo")}
                          style={{
                            padding: "6px 16px", borderRadius: 3, fontSize: 13, fontWeight: "bold", cursor: "pointer",
                            border: `2px solid ${ordenar === "costo" ? "#4a5fc1" : "#ccc"}`,
                            background: ordenar === "costo" ? "#4a5fc1" : "#fff",
                            color: ordenar === "costo" ? "#fff" : "#666",
                            transition: "all 0.15s", fontFamily: "inherit",
                          }}
                        >
                          💲 Costo
                        </button>
                        <button
                          onClick={() => setOrdenar("dias")}
                          style={{
                            padding: "6px 16px", borderRadius: 3, fontSize: 13, fontWeight: "bold", cursor: "pointer",
                            border: `2px solid ${ordenar === "dias" ? "#4a5fc1" : "#ccc"}`,
                            background: ordenar === "dias" ? "#4a5fc1" : "#fff",
                            color: ordenar === "dias" ? "#fff" : "#666",
                            transition: "all 0.15s", fontFamily: "inherit",
                          }}
                        >
                          ⏱ Tránsito
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {results.map((r, i) => (
                        <div key={i} style={{
                          background: i === 0 ? "#e3f2fd" : r.isTeam ? "#fff8e1" : "#f5f5f5",
                          border: `1px solid ${i === 0 ? "#4a5fc1" : r.isTeam ? "#f0a500" : "#ccc"}`,
                          borderRadius: 4,
                          padding: "20px 24px",
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto auto",
                          alignItems: "center",
                          gap: 20,
                          transition: "border-color 0.2s",
                        }}>
                          {/* Rank badge */}
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: i === 0 ? "#4a5fc1" : r.isTeam ? "#f0a500" : "#ddd",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 15, fontWeight: "bold", color: i === 0 || r.isTeam ? "#fff" : "#666",
                            flexShrink: 0,
                          }}>
                            {i + 1}
                          </div>

                          {/* Provider + route */}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 18, color: "#1a1a1a", fontWeight: i === 0 ? "bold" : "normal" }}>
                                {r.proveedor || "Sin nombre"}
                              </span>
                              {r.isTeam && (
                                <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#f0a500", color: "#fff", fontSize: 11, fontWeight: "bold", letterSpacing: 1, padding: "2px 8px", borderRadius: 3 }}>
                                  <IconBolt /> TEAM
                                </span>
                              )}
                              {i === 0 && (
                                <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#4a5fc1", fontSize: 13, letterSpacing: 1, fontWeight: "bold" }}>
                                  <IconStar /> MEJOR PRECIO
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 14, color: "#666", display: "flex", alignItems: "center", gap: 6 }}>
                              <span>{r.origen}</span>
                              <span style={{ color: "#999" }}>→</span>
                              <span>{r.destino}</span>
                            </div>
                          </div>

                          {/* Transit time */}
                          {r.diasUsados && (
                            <div style={{ textAlign: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5, color: r.isTeam ? "#f0a500" : "#666", fontSize: 15, justifyContent: "center" }}>
                                <IconClock />
                                <span>{r.diasUsados} {r.diasUsados === 1 ? "día" : "días"}</span>
                              </div>
                              <div style={{ fontSize: 13, color: "#999", letterSpacing: 1, marginTop: 2 }}>TRÁNSITO</div>
                            </div>
                          )}

                          {/* Prices */}
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 24, fontWeight: "bold", color: i === 0 ? "#4a5fc1" : r.isTeam ? "#f0a500" : "#1a1a1a" }}>
                              {fmt(r.total)}
                            </div>
                            <div style={{ fontSize: 14, color: "#666", marginTop: 2 }}>
                              {fmt(r.precioUsado)} / kg · {peso} {unidad}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #ccc", padding: "16px 40px", textAlign: "center" }}>
        <span style={{ fontSize: 13, color: "#999", letterSpacing: 2, textTransform: "uppercase" }}>
          Cotizador de Flete · Uso local · Los datos no se guardan
        </span>
      </div>
    </div>
  );
}