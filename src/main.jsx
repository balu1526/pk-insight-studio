import React, { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2, Download,
  FileSpreadsheet, FlaskConical, LineChart, Play, RefreshCw,
  ShieldCheck, Upload, XCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis
} from "recharts";
import "./styles.css";

const demoRows = [
  { Subject: "SUBJ-001", Time: 0, Concentration: 0.0 },
  { Subject: "SUBJ-001", Time: 0.5, Concentration: 4.2 },
  { Subject: "SUBJ-001", Time: 1, Concentration: 8.9 },
  { Subject: "SUBJ-001", Time: 2, Concentration: 13.1 },
  { Subject: "SUBJ-001", Time: 4, Concentration: 10.2 },
  { Subject: "SUBJ-001", Time: 6, Concentration: 7.1 },
  { Subject: "SUBJ-001", Time: 8, Concentration: 4.8 },
  { Subject: "SUBJ-001", Time: 12, Concentration: 2.5 },
  { Subject: "SUBJ-001", Time: 16, Concentration: 1.35 },
  { Subject: "SUBJ-001", Time: 24, Concentration: 0.42 },
];

const num = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (v === null || v === undefined || String(v).trim() === "") return NaN;
  return Number(String(v).trim().replace(/,/g, ""));
};

function trapz(time, conc) {
  let auc = 0;
  for (let i = 1; i < time.length; i++) {
    auc += ((conc[i - 1] + conc[i]) / 2) * (time[i] - time[i - 1]);
  }
  return auc;
}

function logSlope(time, conc) {
  const pairs = time.map((t, i) => [t, conc[i]]).filter(([, c]) => c > 0);
  if (pairs.length < 3) return null;
  const n = pairs.length;
  const sx = pairs.reduce((a, [x]) => a + x, 0);
  const sy = pairs.reduce((a, [, c]) => a + Math.log(c), 0);
  const sxx = pairs.reduce((a, [x]) => a + x * x, 0);
  const sxy = pairs.reduce((a, [x, c]) => a + x * Math.log(c), 0);
  const den = n * sxx - sx * sx;
  if (!den) return null;
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  const meanY = sy / n;
  const ssTot = pairs.reduce((a, [x, c]) => a + (Math.log(c) - meanY) ** 2, 0);
  const ssRes = pairs.reduce((a, [x, c]) => a + (Math.log(c) - (intercept + slope * x)) ** 2, 0);
  return { lambda: -slope, r2: ssTot ? 1 - ssRes / ssTot : 0 };
}

function calculateNCA(rows) {
  const clean = rows
    .map((r) => ({ time: num(r.Time), conc: num(r.Concentration) }))
    .filter((r) => Number.isFinite(r.time) && Number.isFinite(r.conc))
    .sort((a, b) => a.time - b.time);

  const time = clean.map((r) => r.time);
  const conc = clean.map((r) => r.conc);
  if (time.length < 2) return null;

  let maxIndex = 0;
  conc.forEach((c, i) => { if (c > conc[maxIndex]) maxIndex = i; });

  const aucLast = trapz(time, conc);
  const terminal = logSlope(time.slice(-4), conc.slice(-4));
  const lambda = terminal && terminal.lambda > 0 ? terminal.lambda : null;
  const halfLife = lambda ? Math.log(2) / lambda : null;
  const clast = conc[conc.length - 1];
  const aucExtra = lambda && clast > 0 ? clast / lambda : null;
  const aucInf = aucExtra !== null ? aucLast + aucExtra : null;
  const mrt = aucInf ? (trapz(time, time.map((c, i) => c * conc[i])) + (clast * time[time.length - 1] / lambda)) / aucInf : null;

  return {
    n: time.length,
    cmax: conc[maxIndex],
    tmax: time[maxIndex],
    aucLast,
    lambdaZ: lambda,
    halfLife,
    aucInf,
    mrt,
    terminalR2: terminal?.r2 ?? null,
    lastTime: time[time.length - 1],
  };
}

function detectColumns(rows) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const pick = (names) => keys.find(k => names.some(n => norm(k).includes(n)));
  return {
    time: pick(["time", "timepoint", "nominaltime", "samplingtime"]),
    conc: pick(["concentration", "conc", "concentrationvalue", "drugconcentration"]),
    subject: pick(["subject", "subjectid", "patient", "participant", "id"])
  };
}

function normalizeRows(raw, cols) {
  return raw.map((r) => ({
    Subject: cols.subject ? String(r[cols.subject] ?? "").trim() : "SUBJ-001",
    Time: cols.time ? num(r[cols.time]) : NaN,
    Concentration: cols.conc ? num(r[cols.conc]) : NaN,
  }));
}

function validate(rows) {
  const issues = [];
  const seen = new Set();
  rows.forEach((r, i) => {
    if (!r.Subject) issues.push(`Row ${i + 2}: missing Subject`);
    if (!Number.isFinite(r.Time)) issues.push(`Row ${i + 2}: Time is missing or non-numeric`);
    if (!Number.isFinite(r.Concentration)) issues.push(`Row ${i + 2}: Concentration is missing or non-numeric`);
    if (Number.isFinite(r.Time) && r.Time < 0) issues.push(`Row ${i + 2}: Time cannot be negative`);
    if (Number.isFinite(r.Concentration) && r.Concentration < 0) issues.push(`Row ${i + 2}: Concentration cannot be negative`);
    if (Number.isFinite(r.Time) && r.Subject) {
      const key = `${r.Subject}|${r.Time}`;
      if (seen.has(key)) issues.push(`Row ${i + 2}: duplicate Subject + Time (${key})`);
      seen.add(key);
    }
  });
  const valid = rows.filter(r => Number.isFinite(r.Time) && Number.isFinite(r.Concentration));
  if (valid.length < 2) issues.push("At least two valid time/concentration records are required.");
  return issues;
}

function parseCSV(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const parseLine = (line) => {
    const out = [];
    let cell = "", quote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quote && line[i + 1] === '"') { cell += '"'; i++; }
        else quote = !quote;
      } else if (ch === "," && !quote) { out.push(cell); cell = ""; }
      else cell += ch;
    }
    out.push(cell);
    return out;
  };
  const headers = parseLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

async function parseFile(file) {
  const buffer = await file.arrayBuffer();
  if (file.name.toLowerCase().endsWith(".csv")) {
    return parseCSV(new TextDecoder().decode(buffer));
  }
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function downloadCSV(results) {
  const headers = ["Subject","N","Cmax","Tmax","AUClast","AUCinf","Lambda_z","Half_life","MRT","Terminal_R2"];
  const lines = [headers.join(","), ...results.map(r => headers.map(h => {
    const v = r[h === "Lambda_z" ? "lambdaZ" : h === "Half_life" ? "halfLife" : h === "Terminal_R2" ? "terminalR2" : h.toLowerCase()] ?? "";
    return typeof v === "number" ? v : `"${String(v).replaceAll('"','""')}"`;
  }).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "pk_insight_nca_results.csv"; a.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [rows, setRows] = useState(demoRows);
  const [fileName, setFileName] = useState("demo_pk_dataset.csv");
  const [issues, setIssues] = useState([]);
  const [ran, setRan] = useState(true);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const subjects = useMemo(() => [...new Set(rows.map(r => r.Subject || "SUBJ-001"))], [rows]);
  const results = useMemo(() => subjects.map(subject => {
    const nca = calculateNCA(rows.filter(r => r.Subject === subject));
    return nca ? { Subject: subject, ...nca } : null;
  }).filter(Boolean), [rows]);

  const selected = results[0] || null;
  const chartData = useMemo(() => rows
    .filter(r => Number.isFinite(r.Time) && Number.isFinite(r.Concentration))
    .sort((a,b) => a.Time-b.Time)
    .map(r => ({ time: r.Time, concentration: r.Concentration })), [rows]);

  const loadRows = (newRows, name) => {
    const cols = detectColumns(newRows);
    const normalized = normalizeRows(newRows, cols);
    const nextIssues = validate(normalized);
    setRows(normalized);
    setFileName(name);
    setIssues(nextIssues);
    setRan(false);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const raw = await parseFile(file);
      if (!raw.length) throw new Error("The file contains no data rows.");
      loadRows(raw, file.name);
    } catch (e) {
      setIssues([e.message || "Could not read the file."]);
    } finally {
      setBusy(false);
    }
  };

  const runAnalysis = () => {
    const nextIssues = validate(rows);
    setIssues(nextIssues);
    setRan(nextIssues.length === 0);
  };

  const useDemo = () => {
    setRows(demoRows);
    setFileName("demo_pk_dataset.csv");
    setIssues([]);
    setRan(true);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><div className="brandmark"><Activity size={17}/></div><div><b>PK Insight</b><span>STUDIO</span></div></div>
        <nav><a href="#workspace">Workspace</a><a href="#analytics">Analytics</a><a href="#validation">Validation</a><a href="#reports">Reports</a></nav>
        <div className="top-actions"><button className="ghost">Sign in</button><button className="primary small">New study</button></div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">PHARMACOKINETIC ANALYSIS WORKSPACE</div>
          <h1>Turn concentration data into <span>decision-ready PK insight.</span></h1>
          <p>Upload study data, validate it, run non-compartmental analysis, explore exposure profiles, and export reproducible results.</p>
          <div className="hero-actions"><a className="primary" href="#workspace">Open workspace <b>›</b></a><button className="secondary" onClick={useDemo}><Play size={15}/> Run demo analysis</button></div>
          <div className="trust"><ShieldCheck size={13}/> Built for traceable, reviewable analysis <i/> NCA-ready workflow</div>
        </section>

        <section id="workspace" className="workspace">
          <aside className="steps">
            {["Import data","Validate","NCA analysis","Review","Report"].map((s,i)=><div className={`step ${i===0 ? "active":""}`} key={s}><span>{String(i+1).padStart(2,"0")}</span><div><b>{s}</b><small>{["CSV / Excel","Quality checks","Exposure metrics","Plots & tables","Export"][i]}</small></div></div>)}
          </aside>

          <div className="panel ingestion">
            <div className="panel-head"><div><div className="eyebrow">DATA INGESTION</div><h2>Start with your study data</h2><p>CSV or Excel with Time and Concentration columns. Subject is optional.</p></div><FileSpreadsheet size={24}/></div>
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e=>handleFile(e.target.files?.[0])}/>
            <button className="dropzone" onClick={()=>inputRef.current?.click()}>
              <Upload size={25}/><b>{busy ? "Reading file…" : fileName}</b><span>{busy ? "Please wait" : "Tap to choose CSV / XLSX"}</span>
            </button>
            <div className="row-actions"><button className="secondary" onClick={useDemo}>Use demo dataset</button><button className="primary" onClick={runAnalysis}><Play size={15}/> Validate & analyze</button></div>
            <div className={`status ${issues.length ? "bad":""}`}>{issues.length ? <><AlertTriangle size={15}/>{issues.length} validation issue{issues.length===1?"":"s"} found</> : <><CheckCircle2 size={15}/>{ran ? "Analysis ready — schema checks passed." : "Data loaded — run validation & analysis."}</>}</div>
          </div>
        </section>

        <section id="validation" className="section">
          <div className="section-title"><div><div className="eyebrow">VALIDATION</div><h2>Data quality checks</h2></div><span className={`pill ${issues.length ? "danger":""}`}>{issues.length ? `${issues.length} issue(s)` : "PASS"}</span></div>
          {issues.length ? <div className="issues">{issues.slice(0,12).map((x,i)=><div key={i}><XCircle size={15}/>{x}</div>)}{issues.length>12&&<small>Showing first 12 issues.</small>}</div> : <div className="pass-card"><CheckCircle2 size={22}/><div><b>No validation issues detected</b><span>Required numeric fields are present, values are non-negative, and Subject + Time combinations are unique.</span></div></div>}
        </section>

        <section id="analytics" className="section">
          <div className="section-title"><div><div className="eyebrow">ANALYTICS</div><h2>Exposure profile</h2></div><span className="pill">NCA</span></div>
          <div className="metrics">
            {[["Cmax",selected?.cmax,"Peak concentration"],["Tmax",selected?.tmax,"Time to peak"],["AUClast",selected?.aucLast,"Linear trapezoid"],["Half-life",selected?.halfLife,"Terminal estimate"]].map(([k,v,s])=><div className="metric" key={k}><small>{k}</small><strong>{typeof v==="number"?v.toFixed(3):"—"}</strong><span>{s}</span></div>)}
          </div>
          <div className="chart panel"><div className="chart-title"><b>Concentration vs time</b><span>Single-subject demonstration</span></div><div className="chart-box"><ResponsiveContainer width="100%" height={330}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" opacity={0.12}/><XAxis dataKey="time" label={{value:"Time",position:"insideBottom",offset:-5}}/><YAxis label={{value:"Concentration",angle:-90,position:"insideLeft"}}/><Tooltip/><Legend/><Area type="monotone" dataKey="concentration" name="Concentration" stroke="#51e0bd" fill="#51e0bd" fillOpacity={0.12}/></AreaChart></ResponsiveContainer></div></div>
        </section>

        <section className="section">
          <div className="section-title"><div><div className="eyebrow">NCA RESULTS</div><h2>Subject-level parameters</h2></div><button className="secondary" onClick={()=>downloadCSV(results)} disabled={!results.length}><Download size={15}/> Export CSV</button></div>
          <div className="table-wrap"><table><thead><tr><th>Subject</th><th>N</th><th>Cmax</th><th>Tmax</th><th>AUClast</th><th>AUCinf</th><th>λz</th><th>t½</th><th>MRT</th><th>R²</th></tr></thead><tbody>{results.map(r=><tr key={r.Subject}><td><b>{r.Subject}</b></td><td>{r.n}</td><td>{r.cmax.toFixed(3)}</td><td>{r.tmax.toFixed(3)}</td><td>{r.aucLast.toFixed(3)}</td><td>{r.aucInf?.toFixed(3) ?? "—"}</td><td>{r.lambdaZ?.toFixed(5) ?? "—"}</td><td>{r.halfLife?.toFixed(3) ?? "—"}</td><td>{r.mrt?.toFixed(3) ?? "—"}</td><td>{r.terminalR2?.toFixed(4) ?? "—"}</td></tr>)}</tbody></table></div>
        </section>

        <section id="reports" className="report panel">
          <div><div className="eyebrow">REPORT</div><h2>Ready for review</h2><p>Export the current subject-level NCA results as a CSV for downstream review and reporting.</p></div>
          <button className="primary" onClick={()=>downloadCSV(results)}><Download size={16}/> Download results</button>
        </section>
      </main>

      <footer><div className="brand"><div className="brandmark"><FlaskConical size={16}/></div><div><b>PK Insight</b><span>STUDIO</span></div></div><span>Prototype • Validate before regulated use</span></footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
