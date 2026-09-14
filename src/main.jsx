import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import {
  Activity,
  Upload,
  Play,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  ChevronRight,
  CheckCircle2,
  Menu,
  X
} from "lucide-react";
import "./styles.css";

const sample = [
  { t: 0, c: 0.00 },
  { t: 0.5, c: 3.8 },
  { t: 1, c: 8.7 },
  { t: 1.5, c: 12.4 },
  { t: 2, c: 14.1 },
  { t: 3, c: 11.8 },
  { t: 4, c: 9.2 },
  { t: 6, c: 6.1 },
  { t: 8, c: 4.0 },
  { t: 12, c: 1.9 },
  { t: 16, c: 0.8 },
  { t: 24, c: 0.18 }
];

function trapezoidalAUC(x, y) {
  let area = 0;

  for (let i = 1; i < x.length; i++) {
    area +=
      (x[i] - x[i - 1]) *
      ((y[i] + y[i - 1]) / 2);
  }

  return area;
}

function App() {
  const [file, setFile] = useState(null);
  const [ran, setRan] = useState(false);
  const [menu, setMenu] = useState(false);

  const metrics = useMemo(() => {
    const time = sample.map((d) => d.t);
    const concentration = sample.map((d) => d.c);

    return {
      auc: trapezoidalAUC(time, concentration),
      cmax: 14.1,
      tmax: 2,
      half: 5.62
    };
  }, []);

  const runAnalysis = () => {
    setRan(true);
  };

  return (
    <div className="app">

      {/* HEADER */}
      <header>
        <div className="brand">
          <div className="logo">
            <Activity />
          </div>

          <div>
            <b>PK Insight</b>
            <span>STUDIO</span>
          </div>
        </div>

        <nav className={menu ? "open" : ""}>
          <a href="#workspace">Workspace</a>
          <a href="#analytics">Analytics</a>
          <a href="#validation">Validation</a>
          <a href="#reports">Reports</a>
        </nav>

        <button
          className="menu"
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>

        <button className="ghost">
          Sign in
        </button>

        <button className="primary small">
          New study
        </button>
      </header>

      <main>

        {/* HERO */}
        <section className="hero">
          <div className="glow"></div>

          <div className="eyebrow">
            <span></span>
            PHARMACOKINETIC ANALYSIS WORKSPACE
          </div>

          <h1>
            Turn concentration data into
            <br />
            <em>decision-ready PK insight.</em>
          </h1>

          <p>
            Upload study data, validate it, run
            non-compartmental analysis, explore
            exposure profiles, and generate
            reproducible reports.
          </p>

          <div className="hero-actions">
            <a
              className="primary"
              href="#workspace"
            >
              Open workspace
              <ChevronRight />
            </a>

            <button
              className="secondary"
              onClick={runAnalysis}
            >
              <Play />
              Run demo analysis
            </button>
          </div>

          <div className="trust">
            <ShieldCheck />
            Built for traceable, reviewable analysis
            <span>•</span>
            NCA-ready workflow
          </div>
        </section>

        {/* WORKSPACE */}
        <section
          id="workspace"
          className="workspace"
        >

          <aside>

            <div className="step active">
              <strong>01</strong>
              <div>
                <b>Import data</b>
                <small>CSV / Excel</small>
              </div>
            </div>

            <div
              className={
                "step " + (file ? "done" : "")
              }
            >
              <strong>02</strong>
              <div>
                <b>Validate</b>
                <small>Quality checks</small>
              </div>
            </div>

            <div
              className={
                "step " + (ran ? "done" : "")
              }
            >
              <strong>03</strong>
              <div>
                <b>NCA analysis</b>
                <small>Exposure metrics</small>
              </div>
            </div>

            <div className="step">
              <strong>04</strong>
              <div>
                <b>Review</b>
                <small>Plots & tables</small>
              </div>
            </div>

            <div className="step">
              <strong>05</strong>
              <div>
                <b>Report</b>
                <small>Export</small>
              </div>
            </div>

          </aside>

          <div className="panel">

            <div className="panel-head">

              <div>
                <div className="kicker">
                  DATA INGESTION
                </div>

                <h2>
                  Start with your study data
                </h2>

                <p>
                  Use a tidy dataset with time
                  and concentration columns,
                  plus optional subject,
                  treatment and period fields.
                </p>
              </div>

              <FileSpreadsheet size={32} />

            </div>

            <label
              className="drop"
              onDragOver={(e) =>
                e.preventDefault()
              }
            >

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) =>
                  setFile(
                    e.target.files?.[0]
                  )
                }
              />

              <div className="upload">

                <Upload />

                <b>
                  {file
                    ? file.name
                    : "Drop CSV or Excel here"}
                </b>

                <span>
                  {file
                    ? "File selected — ready for validation"
                    : "or click to browse • up to 50 MB"}
                </span>

              </div>

            </label>

            <div className="quick">

              <button
                className="secondary"
                onClick={() =>
                  setFile({
                    name: "demo_pk_dataset.csv"
                  })
                }
              >
                Use demo dataset
              </button>

              <button
                className="primary"
                onClick={runAnalysis}
              >
                <Play />
                Validate & analyze
              </button>

            </div>

            {file && (
              <div className="notice ok">
                <CheckCircle2 />

                <b>{file.name}</b>

                loaded.
                Schema checks ready.
              </div>
            )}

          </div>
        </section>

        {/* ANALYTICS */}
        <section
          id="analytics"
          className="analytics"
        >

          <div className="section-title">

            <div>
              <div className="kicker">
                ANALYTICS
              </div>

              <h2>
                Exposure profile
              </h2>
            </div>

            <div className="badge">
              <span></span>
              {ran
                ? "Analysis complete"
                : "Preview"}
            </div>

          </div>

          <div className="cards">

            {[
              [
                "Cmax",
                metrics.cmax + " ng/mL",
                "Peak concentration"
              ],
              [
                "Tmax",
                metrics.tmax + " h",
                "Observed peak time"
              ],
              [
                "AUC₀–t",
                metrics.auc.toFixed(1) +
                  " ng·h/mL",
                "Linear trapezoidal"
              ],
              [
                "t½",
                metrics.half + " h",
                "Terminal estimate"
              ]
            ].map(
              ([title, value, description]) => (
                <div
                  className="metric"
                  key={title}
                >
                  <small>{title}</small>

                  <strong>
                    {ran ? value : "—"}
                  </strong>

                  <span>
                    {description}
                  </span>
                </div>
              )
            )}

          </div>

          <div className="chart">

            <div className="chart-head">

              <div>
                <b>
                  Concentration vs time
                </b>

                <span>
                  Single-subject demonstration
                  profile
                </span>
              </div>

              <span className="legend">
                <i></i>
                Concentration
              </span>

            </div>

            <ResponsiveContainer
              width="100%"
              height={310}
            >

              <AreaChart data={sample}>

                <defs>
                  <linearGradient
                    id="fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopOpacity=".32"
                    />

                    <stop
                      offset="100%"
                      stopOpacity=".02"
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity=".12"
                />

                <XAxis
                  dataKey="t"
                  label={{
                    value: "Time (h)",
                    position: "insideBottom",
                    offset: -5
                  }}
                />

                <YAxis
                  label={{
                    value: "Concentration",
                    angle: -90,
                    position: "insideLeft"
                  }}
                />

                <Tooltip />

                <Area
                  type="monotone"
                  dataKey="c"
                  strokeWidth={3}
                  fill="url(#fill)"
                  stroke="currentColor"
                />

              </AreaChart>

            </ResponsiveContainer>

          </div>
        </section>

        {/* FEATURES */}
        <section
          id="validation"
          className="features"
        >

          <div>
            <div className="kicker">
              WORKFLOW CONTROLS
            </div>

            <h2>
              Designed for analysis you can audit.
            </h2>
          </div>

          <div className="feature-grid">

            {[
              [
                "Data validation",
                "Detect missing timepoints, duplicate records, non-numeric values and inconsistent subject structures."
              ],
              [
                "NCA engine",
                "Compute standard exposure and terminal-phase metrics with explicit method settings."
              ],
              [
                "BE-ready outputs",
                "Prepare treatment summaries and log-transformed exposure comparisons for review."
              ]
            ].map(
              ([title, description], index) => (

                <article key={title}>

                  <div className="num">
                    0{index + 1}
                  </div>

                  <h3>
                    {title}
                  </h3>

                  <p>
                    {description}
                  </p>

                  <a href="#workspace">
                    Open module
                    <ChevronRight />
                  </a>

                </article>

              )
            )}

          </div>
        </section>

        {/* REPORTING */}
        <section
          id="reports"
          className="cta"
        >

          <div>

            <div className="kicker">
              REPORTING
            </div>

            <h2>
              One analysis. A reproducible record.
            </h2>

            <p>
              Keep settings, validation results,
              derived parameters and visualizations
              together for review and export.
            </p>

          </div>

          <button
            className="primary"
            onClick={() =>
              alert(
                "Demo export: connect a backend/report engine for PDF generation."
              )
            }
          >
            <Download />
            Export report
          </button>

        </section>

      </main>

      {/* FOOTER */}
      <footer>

        <div className="brand">

          <div className="logo">
            <Activity />
          </div>

          <div>
            <b>PK Insight</b>
            <span>STUDIO</span>
          </div>

        </div>

        <span>
          © 2026 PK Insight Studio •
          Research software prototype
        </span>

      </footer>

    </div>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);
