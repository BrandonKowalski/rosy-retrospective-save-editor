import {useCallback, useRef, useState} from "react";
import {buildSRM, mergeGroups, parseSRM} from "./srm.js";
import FallingBlocks from "./components/FallingBlocks.jsx";
import LevelGroup from "./components/LevelGroup.jsx";
import MergeDiff from "./components/MergeDiff.jsx";

function readFiles(fileList) {
    return Promise.all(
        Array.from(fileList).map(
            (f) =>
                new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve({buffer: ev.target.result, name: f.name});
                    reader.readAsArrayBuffer(f);
                })
        )
    );
}

function getFileExt(name) {
    const match = name.match(/\.[^.]+$/);
    return match ? match[0] : ".srm";
}

const BTN_BASE = {
    fontFamily: "'DotGothic16', monospace",
    fontSize: "16px",
    cursor: "pointer",
    letterSpacing: "1px",
    borderRadius: "4px",
    padding: "10px 20px",
    border: "1px solid var(--gb-dark)",
    transition: "all 0.15s",
};

const TABS = [
    {key: "a", label: "TYPE-A"},
    {key: "b", label: "TYPE-B"},
];

export default function App() {
    const [rawData, setRawData] = useState(null);
    const [fileExt, setFileExt] = useState(".srm");
    const [tab, setTab] = useState("a");
    const [dirty, setDirty] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [typeA, setTypeA] = useState(null);
    const [typeB, setTypeB] = useState(null);
    const [mergeSources, setMergeSources] = useState(null);
    const fileRef = useRef(null);

    const loaded = rawData !== null;

    const loadFiles = useCallback(async (buffers, names, existing) => {
        const parsed = await Promise.all(buffers.map((buf) => parseSRM(buf)));
        let a, b, raw;
        if (existing) {
            a = mergeGroups([existing.typeA, ...parsed.map((p) => p.typeA)]);
            b = mergeGroups([existing.typeB, ...parsed.map((p) => p.typeB)]);
            raw = existing.raw;
            const prevSources = existing.mergeSources || [
                {name: existing.fileName, typeA: existing.typeA, typeB: existing.typeB},
            ];
            setMergeSources([
                ...prevSources,
                ...parsed.map((p, i) => ({name: names[i], typeA: p.typeA, typeB: p.typeB})),
            ]);
            setFileExt(getFileExt(names[0]));
            setDirty(true);
        } else if (parsed.length === 1) {
            ({typeA: a, typeB: b, raw} = parsed[0]);
            setMergeSources(null);
            setFileExt(getFileExt(names[0]));
            setDirty(false);
        } else {
            a = mergeGroups(parsed.map((p) => p.typeA));
            b = mergeGroups(parsed.map((p) => p.typeB));
            raw = parsed[0].raw;
            setMergeSources(parsed.map((p, i) => ({name: names[i], typeA: p.typeA, typeB: p.typeB})));
            setFileExt(getFileExt(names[0]));
            setDirty(true);
        }
        setRawData(raw);
        setTypeA(a);
        setTypeB(b);
    }, []);

    const handleFiles = (files) => {
        if (!files.length) return;
        const existing = loaded ? {typeA, typeB, raw: rawData, mergeSources} : null;
        readFiles(files).then((results) => {
            loadFiles(results.map((r) => r.buffer), results.map((r) => r.name), existing);
        });
    };

    const handleUpload = (e) => {
        handleFiles(e.target.files);
        e.target.value = "";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleSave = () => {
        const data = buildSRM(typeA, typeB, rawData);
        const blob = new Blob([data], {type: "application/octet-stream"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        a.download = `Tetris_Rosy_Retrospection_${ts}${fileExt}`;
        a.click();
        URL.revokeObjectURL(url);
        setDirty(false);
    };

    const updateGroup = (setter, idx, entries) => {
        setter((prev) => {
            const next = [...prev];
            next[idx] = entries;
            return next;
        });
        setDirty(true);
    };

    const ext = fileExt.toUpperCase();

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "32px 16px",
                position: "relative",
                zIndex: 1,
            }}
        >
            <FallingBlocks />

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
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
            </a>

            <header style={{textAlign: "center", maxWidth: 520, width: "100%"}}>
                <div
                    className="header-text"
                    style={{fontSize: 14, letterSpacing: 3, color: "var(--gb-mid)", marginBottom: 6}}
                >
                    TETRIS ROSY RETROSPECTION
                </div>
                <h1
                    className="header-text"
                    style={{
                        fontSize: 28,
                        letterSpacing: 2,
                        color: "var(--gb-light)",
                        textShadow: "0 0 24px rgba(160,200,32,0.3)",
                        fontWeight: "normal",
                    }}
                >
                    SAVE EDITOR
                </h1>
                <div
                    style={{
                        height: 2,
                        background: "linear-gradient(90deg, transparent, var(--gb-dark), transparent)",
                        margin: "16px 0 22px",
                    }}
                />

                <input
                    ref={fileRef}
                    type="file"
                    accept=".srm,.sav"
                    multiple
                    onChange={handleUpload}
                    style={{display: "none"}}
                />

                {!loaded ? (
                    <div
                        onClick={() => fileRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
                        style={{
                            border: `2px dashed ${dragging ? "var(--gb-light)" : "var(--gb-dark)"}`,
                            borderRadius: 8,
                            padding: "48px 24px",
                            cursor: "pointer",
                            background: dragging ? "rgba(139,172,15,0.08)" : "rgba(48,98,48,0.12)",
                            transition: "all 0.2s",
                        }}
                    >
                        <div style={{fontSize: 24, color: "var(--gb-light)", marginBottom: 12}}>
                            LOAD SAVE FILE
                        </div>
                        <div style={{fontSize: 20, color: "var(--gb-mid)", lineHeight: 1.6}}>
                            Drop one file to edit, or multiple to merge
                            <br />
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
                            onClick={handleSave}
                            style={{
                                ...BTN_BASE,
                                minWidth: 170,
                                background: dirty ? "rgba(139,172,15,0.2)" : "rgba(48,98,48,0.25)",
                                borderColor: dirty ? "var(--gb-light)" : "var(--gb-dark)",
                                color: dirty ? "var(--gb-lightest)" : "var(--gb-mid)",
                            }}
                        >
                            {dirty ? `● SAVE ${ext}` : `SAVE ${ext}`}
                        </button>
                    </div>
                )}
            </header>

            {mergeSources && typeA && typeB && (
                <MergeDiff sources={mergeSources} mergedA={typeA} mergedB={typeB} />
            )}

            {loaded && (
                <>
                    <nav style={{display: "flex", maxWidth: 520, width: "100%", marginTop: 28}}>
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    background: tab === t.key ? "rgba(48,98,48,0.35)" : "rgba(15,56,15,0.25)",
                                    border: "1px solid var(--gb-dark)",
                                    borderBottom: tab === t.key ? "1px solid transparent" : undefined,
                                    borderRadius: "6px 6px 0 0",
                                    color: tab === t.key ? "var(--gb-lightest)" : "var(--gb-mid)",
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
                                    onChange={(e) => updateGroup(setTypeA, i, e)}
                                />
                            ))}
                        {tab === "b" &&
                            typeB.map((g, i) => (
                                <LevelGroup
                                    key={`b${i}`}
                                    label={`Level ${Math.floor(i / 6)} \u00b7 Height ${i % 6}`}
                                    entries={g}
                                    onChange={(e) => updateGroup(setTypeB, i, e)}
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
                <p>Be smart, take a backup before editing.</p>
                <p style={{fontSize: 12, fontWeight: "bold"}}>
                    Not affiliated with or endorsed by The Tetris Company.
                </p>
            </footer>
            <div style={{fontSize: 11, color: "var(--gb-mid)", opacity: 0.4, marginTop: 8}}>
                {__GIT_HASH__}
            </div>
        </div>
    );
}
