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

export default function ScoreEntry({entry, onChange, rank}) {
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
