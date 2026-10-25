export async function downloadStoryCard(opts: {
  setNumber: number;
  tier: string;
  altitude: number;
  squares: ("green" | "red" | "yellow")[];
}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const g = canvas.getContext("2d");
  if (!g) return;

  const sky = g.createLinearGradient(0, 0, 0, 1920);
  sky.addColorStop(0, "#05070f");
  sky.addColorStop(0.45, "#12304f");
  sky.addColorStop(1, "#9fd8ff");
  g.fillStyle = sky;
  g.fillRect(0, 0, 1080, 1920);

  g.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 80; i += 1) {
    const x = (i * 97) % 1080;
    const y = (i * 53) % 900;
    g.fillRect(x, y, 3, 3);
  }

  try {
    await document.fonts.load('42px "Press Start 2P"');
  } catch {
    /* fall back to the default canvas font */
  }

  g.textAlign = "center";
  g.fillStyle = "#ffffff";
  g.font = '54px "Press Start 2P", monospace';
  g.fillText("ACE SETS", 540, 280);
  g.fillStyle = "#7ee9ff";
  g.font = '28px "Press Start 2P", monospace';
  g.fillText("THE DAILY SET", 540, 360);

  g.fillStyle = "#ffffff";
  g.font = '36px "Press Start 2P", monospace';
  g.fillText(`SET #${opts.setNumber}`, 540, 620);
  g.fillStyle = "#ff8fb3";
  g.fillText(opts.tier.toUpperCase(), 540, 720);
  g.fillStyle = "#ffffff";
  g.font = '64px "Press Start 2P", monospace';
  g.fillText(`${opts.altitude} km`, 540, 860);

  const colors = { green: "#3ddc97", red: "#ff5d8f", yellow: "#ffd15c" };
  const size = 96;
  const gap = 24;
  const total = opts.squares.length * size + (opts.squares.length - 1) * gap;
  let x = (1080 - total) / 2;
  opts.squares.forEach((sq) => {
    g.fillStyle = colors[sq];
    g.fillRect(x, 980, size, size);
    x += size + gap;
  });

  g.fillStyle = "#d5e8ff";
  g.font = '26px "Press Start 2P", monospace';
  g.fillText("acesets.com/daily", 540, 1240);

  // Pixel rocket
  g.fillStyle = "#ff5d8f";
  g.fillRect(522, 1380, 36, 24);
  g.fillStyle = "#f4f7fb";
  g.fillRect(504, 1404, 72, 120);
  g.fillStyle = "#3ee0ff";
  g.fillRect(522, 1434, 36, 36);
  g.fillStyle = "#ff5d8f";
  g.fillRect(468, 1488, 36, 48);
  g.fillRect(576, 1488, 36, 48);
  g.fillStyle = "#ffd15c";
  g.fillRect(522, 1524, 36, 36);

  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `ace-set-${opts.setNumber}.png`;
  a.click();
}
