import {useCallback, useEffect, useRef, useState} from "react";
import {buildSRM, mergeGroups, parseSRM} from "./srm.js";

// Standard tetromino shapes
const BLOCK_SHAPES = [
    [[1, 1, 1, 1]],                     // I
    [[1, 1], [1, 1]],                   // O
    [[0, 1, 0], [1, 1, 1]],             // T
    [[0, 1, 1], [1, 1, 0]],             // S
    [[1, 1, 0], [0, 1, 1]],             // Z
    [[1, 0, 0], [1, 1, 1]],             // J
    [[0, 0, 1], [1, 1, 1]],             // L
];

const BLOCK_COLORS = [
    "rgba(58, 122, 58, 0.12)",
    "rgba(90, 138, 58, 0.10)",
    "rgba(160, 200, 32, 0.06)",
    "rgba(15, 56, 15, 0.15)",
];

function rotateShape(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = [];
    for (let c = 0; c < cols; c++) {
        const newRow = [];
        for (let r = rows - 1; r >= 0; r--) {
            newRow.push(shape[r][c]);
        }
        rotated.push(newRow);
    }
    return rotated;
}

function FallingBlocks() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let animId;
        let blocks = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const CELL = 18;
        const GAP = 2; // minimum gap in cells between pieces
        const SPEED = 0.4;
        const SPAWN_INTERVAL = 1200;
        let lastSpawn = 0;

        // Build a set of occupied columns near the top of the screen
        const getOccupiedCells = () => {
            const occupied = new Set();
            for (const b of blocks) {
                if (b.y > CELL * 6) continue; // only check blocks near top
                for (let r = 0; r < b.shape.length; r++) {
                    for (let c = 0; c < b.shape[r].length; c++) {
                        if (b.shape[r][c]) {
                            const gy = Math.round((b.y + r * CELL) / CELL);
                            // Add the cell and surrounding gap cells
                            for (let dx = -GAP; dx <= GAP; dx++) {
                                for (let dy = -GAP; dy <= GAP; dy++) {
                                    occupied.add(`${b.gx + c + dx},${gy + dy}`);
                                }
                            }
                        }
                    }
                }
            }
            return occupied;
        };

        const spawnBlock = () => {
            let shape = BLOCK_SHAPES[Math.floor(Math.random() * BLOCK_SHAPES.length)];
            const rotations = Math.floor(Math.random() * 4);
            for (let i = 0; i < rotations; i++) shape = rotateShape(shape);
            const color = BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)];
            const cols = shape[0].length;
            const rows = shape.length;
            const maxGx = Math.floor(canvas.width / CELL) - cols;
            const gx = Math.floor(Math.random() * (maxGx + 1));
            const gy = -rows;

            const occupied = getOccupiedCells();
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (shape[r][c] && occupied.has(`${gx + c},${gy + r}`)) return;
                }
            }

            blocks.push({
                x: gx * CELL,
                y: gy * CELL,
                gx,
                speed: SPEED,
                shape,
                color,
            });
        };

        const draw = (timestamp) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (timestamp - lastSpawn > SPAWN_INTERVAL) {
                spawnBlock();
                lastSpawn = timestamp;
            }

            blocks = blocks.filter((b) => b.y < canvas.height + CELL * 4);

            for (const b of blocks) {
                b.y += b.speed;
                ctx.fillStyle = b.color;
                for (let r = 0; r < b.shape.length; r++) {
                    for (let c = 0; c < b.shape[r].length; c++) {
                        if (b.shape[r][c]) {
                            ctx.fillRect(b.x + c * CELL, b.y + r * CELL, CELL - 1, CELL - 1);
                        }
                    }
                }
            }

            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 0,
                pointerEvents: "none",
            }}
        />
    );
}

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

    const loadFiles = useCallback(async (buffers, names) => {
        const parsed = await Promise.all(buffers.map((buf) => parseSRM(buf)));
        let a, b, raw;
        if (parsed.length === 1) {
            ({typeA: a, typeB: b, raw} = parsed[0]);
        } else {
            a = mergeGroups(parsed.map((p) => p.typeA));
            b = mergeGroups(parsed.map((p) => p.typeB));
            raw = parsed[0].raw;
        }
        setRawData(raw);
        setTypeA(a);
        setTypeB(b);
        setFileName(parsed.length === 1 ? names[0] : "Merged.srm");
        setDirty(parsed.length > 1);
    }, []);

    const handleUpload = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        Promise.all(
            files.map(
                (f) =>
                    new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => resolve({buffer: ev.target.result, name: f.name});
                        reader.readAsArrayBuffer(f);
                    })
            )
        ).then((results) => {
            loadFiles(results.map((r) => r.buffer), results.map((r) => r.name));
        });
        e.target.value = "";
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (!files.length) return;
        Promise.all(
            files.map(
                (f) =>
                    new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => resolve({buffer: ev.target.result, name: f.name});
                        reader.readAsArrayBuffer(f);
                    })
            )
        ).then((results) => {
            loadFiles(results.map((r) => r.buffer), results.map((r) => r.name));
        });
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
                    <path
                        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
            </a>
            <header style={{textAlign: "center", maxWidth: 520, width: "100%"}}>
                <div
                    className="header-text"
                    style={{
                        fontSize: 14,
                        letterSpacing: 3,
                        color: "var(--gb-mid)",
                        marginBottom: 6,
                    }}
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
                        background:
                            "linear-gradient(90deg, transparent, var(--gb-dark), transparent)",
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
                                fontSize: 24,
                                color: "var(--gb-light)",
                                marginBottom: 12,
                            }}
                        >
                            LOAD SAVE FILE
                        </div>
                        <div
                            style={{
                                fontSize: 20,
                                color: "var(--gb-mid)",
                                lineHeight: 1.6,
                            }}
                        >
                            Drop one file to edit, or multiple to merge
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
                        <input
                            type="text"
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            style={{
                                width: "100%",
                                fontSize: 15,
                                color: "var(--gb-mid)",
                                marginTop: 4,
                                background: "none",
                                border: "1px solid transparent",
                                borderRadius: 4,
                                padding: "4px 6px",
                                fontFamily: "'DotGothic16', monospace",
                                textAlign: "center",
                                outline: "none",
                                transition: "border-color 0.15s",
                            }}
                            onFocus={(e) => (e.target.style.borderColor = "var(--gb-dark)")}
                            onBlur={(e) => (e.target.style.borderColor = "transparent")}
                        />
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
