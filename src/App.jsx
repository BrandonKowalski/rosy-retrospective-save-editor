import {useCallback, useRef, useState} from "react";
import {buildSRM, parseSRM} from "./srm.js";

function ScoreEntry({entry, onChange, rank}) {
    const inputStyle = {
        background: "rgba(15, 56, 15, 0.6)",
        border: "1px solid var(--gb-dark)",
        borderRadius: "4px",
        padding: "8px 10px",
        fontFamily: "'DotGothic16', monospace",
        fontSize: "18px",
        color: "var(--gb-lightest)",
        outline: "none",
        transition: "border-color 0.15s",
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "8px 0",
            }}
        >
      <span
          style={{
              fontSize: "18px",
              color: "var(--gb-light)",
              width: "28px",
              textAlign: "center",
              opacity: 0.7,
          }}
      >
        {rank}.
      </span>
            <input
                type="text"
                maxLength={6}
                value={entry.name.trimEnd()}
                onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z ]/g, "");
                    onChange({...entry, name: val.padEnd(6, " ").slice(0, 6)});
                }}
                placeholder="NAME"
                style={{...inputStyle, width: "110px", letterSpacing: "2px"}}
                onFocus={(e) => (e.target.style.borderColor = "var(--gb-light)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--gb-dark)")}
            />
            <input
                type="number"
                min={0}
                max={999999}
                value={entry.score || ""}
                onChange={(e) => {
                    const val = Math.min(
                        999999,
                        Math.max(0, parseInt(e.target.value) || 0)
                    );
                    onChange({...entry, score: val});
                }}
                placeholder="000000"
                style={{...inputStyle, width: "130px", textAlign: "right"}}
                onFocus={(e) => (e.target.style.borderColor = "var(--gb-light)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--gb-dark)")}
            />
        </div>
    );
}

function LevelGroup({label, entries, onChange}) {
    const hasData = entries.some((e) => e.score > 0 || e.name.trim().length > 0);
    const [expanded, setExpanded] = useState(hasData);

    return (
        <div style={{borderBottom: "1px solid #1a3a1a"}}>
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "none",
                    border: "none",
                    padding: "12px 6px",
                    cursor: "pointer",
                    fontFamily: "'DotGothic16', monospace",
                    fontSize: "17px",
                    color: hasData ? "var(--gb-lightest)" : "var(--gb-mid)",
                }}
            >
                <span>{label}</span>
                <span style={{display: "flex", alignItems: "center", gap: "8px"}}>
          {hasData && (
              <span style={{fontSize: "15px", opacity: 0.7}}>
              {entries[0].score > 0 ? entries[0].score.toLocaleString() : "—"}
            </span>
          )}
                    <span style={{fontSize: "14px", opacity: 0.6}}>
            {expanded ? "▼" : "▶"}
          </span>
        </span>
            </button>
            {expanded && (
                <div style={{padding: "0 6px 14px 6px"}}>
                    {entries.map((entry, i) => (
                        <ScoreEntry
                            key={i}
                            rank={i + 1}
                            entry={entry}
                            onChange={(updated) => {
                                const next = [...entries];
                                next[i] = updated;
                                onChange(next);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function App() {
    const [rawData, setRawData] = useState(null);
    const [fileName, setFileName] = useState("");
    const [tab, setTab] = useState("a");
    const [dirty, setDirty] = useState(false);
    const [dragging, setDragging] = useState(false);

    const [typeA, setTypeA] = useState(null);
    const [typeB, setTypeB] = useState(null);

    const fileRef = useRef(null);

    const loaded = rawData !== null;

    const loadFile = useCallback((buffer, name) => {
        const {typeA: a, typeB: b, raw} = parseSRM(buffer);
        setRawData(raw);
        setTypeA(a);
        setTypeB(b);
        setFileName(name);
        setDirty(false);
    }, []);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => loadFile(ev.target.result, file.name);
        reader.readAsArrayBuffer(file);
        e.target.value = "";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => loadFile(ev.target.result, file.name);
        reader.readAsArrayBuffer(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragging(false);
    };

    const handleSave = () => {
        const data = buildSRM(typeA, typeB, rawData);
        const blob = new Blob([data], {type: "application/octet-stream"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName || "Tetris_Rosy_Retrospection.srm";
        a.click();
        URL.revokeObjectURL(url);
        setDirty(false);
    };

    const updateA = (idx, entries) => {
        const next = [...typeA];
        next[idx] = entries;
        setTypeA(next);
        setDirty(true);
    };

    const updateB = (idx, entries) => {
        const next = [...typeB];
        next[idx] = entries;
        setTypeB(next);
        setDirty(true);
    };

    const tabs = [
        {key: "a", label: "TYPE-A"},
        {key: "b", label: "TYPE-B"},
    ];

    const btnBase = {
        fontFamily: "'DotGothic16', monospace",
        fontSize: "16px",
        cursor: "pointer",
        letterSpacing: "1px",
        borderRadius: "4px",
        padding: "10px 20px",
        border: "1px solid var(--gb-dark)",
        transition: "all 0.15s",
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "32px 16px",
            }}
        >
            <a
                href="https://github.com/BrandonKowalski/rosy-retrospective-save-editor"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    position: "fixed",
                    top: 12,
                    right: 12,
                    zIndex: 100,
                    color: "var(--gb-mid)",
                    transition: "color 0.2s",
                }}
                aria-label="View source on GitHub"
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gb-lightest)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gb-mid)")}
            >
                <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor">
                    <path
                        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
            </a>
            <header style={{textAlign: "center", maxWidth: 520, width: "100%"}}>
                <div
                    style={{
                        fontSize: 15,
                        letterSpacing: 4,
                        color: "var(--gb-mid)",
                        marginBottom: 2,
                    }}
                >
                    TETRIS ROSY RETROSPECTION
                </div>
                <h1
                    style={{
                        fontSize: 30,
                        letterSpacing: 3,
                        color: "var(--gb-light)",
                        textShadow: "0 0 24px rgba(160,200,32,0.3)",
                        fontWeight: "normal",
                    }}
                >
                    HIGH SCORE EDITOR
                </h1>
                <div
                    style={{
                        height: 2,
                        background:
                            "linear-gradient(90deg, transparent, var(--gb-dark), transparent)",
                        margin: "16px 0 22px",
                    }}
                />

                <input
                    ref={fileRef}
                    type="file"
                    accept=".srm,.sav"
                    onChange={handleUpload}
                    style={{display: "none"}}
                />

                {!loaded ? (
                    <div
                        onClick={() => fileRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        style={{
                            border: `2px dashed ${dragging ? "var(--gb-light)" : "var(--gb-dark)"}`,
                            borderRadius: 8,
                            padding: "48px 24px",
                            cursor: "pointer",
                            background: dragging
                                ? "rgba(139,172,15,0.08)"
                                : "rgba(48,98,48,0.12)",
                            transition: "all 0.2s",
                        }}
                    >
                        <div
                            style={{
                                fontSize: 20,
                                color: "var(--gb-light)",
                                marginBottom: 12,
                            }}
                        >
                            LOAD .SRM FILE
                        </div>
                        <div
                            style={{
                                fontSize: 15,
                                color: "var(--gb-mid)",
                                lineHeight: 1.6,
                            }}
                        >
                            Click to browse or drag and drop
                            <br/>
                            .srm and .sav supported
                        </div>
                    </div>
                ) : (
                    <div
                        style={{
                            display: "flex",
                            gap: 10,
                            justifyContent: "center",
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <button
                            onClick={() => fileRef.current?.click()}
                            style={{
                                ...btnBase,
                                background: "rgba(48,98,48,0.5)",
                                color: "var(--gb-light)",
                            }}
                        >
                            LOAD .SRM
                        </button>
                        <button
                            onClick={handleSave}
                            style={{
                                ...btnBase,
                                background: dirty
                                    ? "rgba(139,172,15,0.2)"
                                    : "rgba(48,98,48,0.25)",
                                borderColor: dirty ? "var(--gb-light)" : "var(--gb-dark)",
                                color: dirty ? "var(--gb-lightest)" : "var(--gb-mid)",
                            }}
                        >
                            {dirty ? "\u2605 SAVE .SRM" : "SAVE .SRM"}
                        </button>
                        <div
                            style={{
                                width: "100%",
                                fontSize: 15,
                                color: "var(--gb-mid)",
                                marginTop: 4,
                            }}
                        >
                            {fileName}
                        </div>
                    </div>
                )}
            </header>

            {loaded && (
                <>
                    <nav
                        style={{
                            display: "flex",
                            maxWidth: 520,
                            width: "100%",
                            marginTop: 28,
                        }}
                    >
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    background:
                                        tab === t.key
                                            ? "rgba(48,98,48,0.35)"
                                            : "rgba(15,56,15,0.25)",
                                    border: "1px solid var(--gb-dark)",
                                    borderBottom:
                                        tab === t.key ? "1px solid transparent" : undefined,
                                    borderRadius: "6px 6px 0 0",
                                    color:
                                        tab === t.key ? "var(--gb-lightest)" : "var(--gb-mid)",
                                    fontFamily: "'DotGothic16', monospace",
                                    fontSize: 16,
                                    cursor: "pointer",
                                    letterSpacing: 2,
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </nav>

                    <section
                        style={{
                            maxWidth: 520,
                            width: "100%",
                            background: "rgba(48,98,48,0.12)",
                            border: "1px solid var(--gb-dark)",
                            borderTop: "none",
                            borderRadius: "0 0 6px 6px",
                            padding: "10px 20px",
                        }}
                    >
                        {tab === "a" &&
                            typeA.map((g, i) => (
                                <LevelGroup
                                    key={`a${i}`}
                                    label={`Level ${i}`}
                                    entries={g}
                                    onChange={(e) => updateA(i, e)}
                                />
                            ))}

                        {tab === "b" &&
                            typeB.map((g, i) => (
                                <LevelGroup
                                    key={`b${i}`}
                                    label={`Level ${Math.floor(i / 6)} \u00b7 Height ${i % 6}`}
                                    entries={g}
                                    onChange={(e) => updateB(i, e)}
                                />
                            ))}
                    </section>
                </>
            )}

            <footer
                style={{
                    marginTop: 20,
                    fontSize: 14,
                    color: "white",
                    background: "var(--gb-dark)",
                    textAlign: "center",
                    lineHeight: 1.6,
                    maxWidth: 520,
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: 6,
                }}
            >
                <p>
                    Be smart, take a backup before editing.
                </p>
                <p>
                    Made with &hearts; in Ithaca, NY
                </p>
                <p style={{fontSize: 12, fontWeight: "bold"}}>
                    Not affiliated with or endorsed by The Tetris Company.
                </p>
            </footer>
        </div>
    );
}
