import {useState} from "react";
import ScoreEntry from "./ScoreEntry.jsx";

export default function LevelGroup({label, entries, onChange}) {
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
