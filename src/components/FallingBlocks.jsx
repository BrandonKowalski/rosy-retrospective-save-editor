import {useEffect, useRef} from "react";

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

export default function FallingBlocks() {
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
        const GAP = 2;
        const SPEED = 0.4;
        const SPAWN_INTERVAL = 1200;
        let lastSpawn = 0;

        const getOccupiedCells = () => {
            const occupied = new Set();
            for (const b of blocks) {
                if (b.y > CELL * 6) continue;
                for (let r = 0; r < b.shape.length; r++) {
                    for (let c = 0; c < b.shape[r].length; c++) {
                        if (b.shape[r][c]) {
                            const gy = Math.round((b.y + r * CELL) / CELL);
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
