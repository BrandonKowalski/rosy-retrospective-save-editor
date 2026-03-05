import {useState} from "react";

const entryStr = (e) =>
    e.score > 0 ? `${e.name.trimEnd()} ${e.score.toLocaleString()}` : "\u2014";

function buildDiff(sources, mergedGroups, sourceKey, labelFn) {
    const diffs = [];
    for (let gi = 0; gi < mergedGroups.length; gi++) {
        const merged = mergedGroups[gi];
        const differsFromAny = sources.some((src) =>
            src[sourceKey][gi].some(
                (e, i) => e.score !== merged[i].score || e.name !== merged[i].name
            )
        );
        if (!differsFromAny) continue;
        const sourceEntries = sources.flatMap((src) =>
            src[sourceKey][gi].map((e) => ({...e, file: src.name}))
        );
        const rows = merged.map((entry) => {
            const from = sourceEntries.find(
                (s) => s.score === entry.score && s.name === entry.name
            );
            return {...entry, file: from?.file || "?"};
        });
        diffs.push({label: labelFn(gi), rows});
    }
    return diffs;
}

export default function MergeDiff({sources, mergedA, mergedB}) {
    const [expanded, setExpanded] = useState(true);

    const typeADiffs = buildDiff(sources, mergedA, "typeA", (i) => `Level ${i}`);
    const typeBDiffs = buildDiff(sources, mergedB, "typeB", (i) => `Level ${Math.floor(i / 6)} \u00b7 Height ${i % 6}`);
    const allDiffs = [
        ...typeADiffs.map((d) => ({...d, type: "A"})),
        ...typeBDiffs.map((d) => ({...d, type: "B"})),
    ];

    if (allDiffs.length === 0) return null;

    return (
        <div
            style={{
                maxWidth: 520,
                width: "100%",
                marginTop: 20,
                border: "1px solid var(--gb-dark)",
                borderRadius: 6,
                background: "rgba(48,98,48,0.12)",
                overflow: "hidden",
            }}
        >
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(139,172,15,0.1)",
                    border: "none",
                    padding: "12px 16px",
                    cursor: "pointer",
                    fontFamily: "'DotGothic16', monospace",
                    fontSize: 16,
                    color: "var(--gb-lightest)",
                    letterSpacing: 2,
                }}
            >
                <span>MERGE DIFF ({allDiffs.length} changed)</span>
                <span style={{fontSize: 14, opacity: 0.6}}>{expanded ? "\u25bc" : "\u25b6"}</span>
            </button>
            {expanded && (
                <div style={{padding: "8px 16px 16px"}}>
                    {allDiffs.map((diff, di) => (
                        <div key={di} style={{marginBottom: 10}}>
                            <div
                                style={{
                                    fontSize: 14,
                                    color: "var(--gb-light)",
                                    marginBottom: 4,
                                    letterSpacing: 1,
                                }}
                            >
                                TYPE-{diff.type} {diff.label}
                            </div>
                            <div
                                style={{
                                    fontSize: 16,
                                    fontFamily: "'DotGothic16', monospace",
                                    lineHeight: 1.8,
                                }}
                            >
                                {diff.rows.map((r, ri) => (
                                    <div
                                        key={ri}
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            color: "var(--gb-lightest)",
                                        }}
                                    >
                                        <span style={{flex: 1}}>
                                            {ri + 1}. {entryStr(r)}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 13,
                                                opacity: 0.6,
                                                alignSelf: "center",
                                            }}
                                        >
                                            {r.file}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
