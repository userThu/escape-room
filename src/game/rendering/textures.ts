import * as THREE from "three";

export function createCanvasTexture(
  baseColor: string,
  lineColor: string,
  accentColor: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = lineColor;
  context.lineWidth = 3;

  for (let position = 0; position <= 256; position += 64) {
    context.beginPath();
    context.moveTo(position, 0);
    context.lineTo(position, 256);
    context.stroke();
    context.beginPath();
    context.moveTo(0, position);
    context.lineTo(256, position);
    context.stroke();
  }

  context.fillStyle = accentColor;

  for (let index = 0; index < 22; index += 1) {
    const x = (index * 53) % 256;
    const y = (index * 97) % 256;
    const width = 8 + ((index * 11) % 28);
    const height = 3 + ((index * 7) % 14);
    context.globalAlpha = 0.16;
    context.fillRect(x, y, width, height);
  }

  context.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

export function createAtomLegendPosterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 704;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const atomLegend = [
    { color: "#a66f6f", element: "O", name: "Oxygen" },
    { color: "#6f9f86", element: "N", name: "Nitrogen" },
    { color: "#4d5560", element: "C", name: "Carbon" },
    { color: "#b7bec7", element: "H", name: "Hydrogen" },
    { color: "#7188a6", element: "Na", name: "Sodium" },
    { color: "#a9825e", element: "Cl", name: "Chlorine" },
  ];

  context.fillStyle = "#d7d2c5";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.strokeStyle = "#2f3437";
  context.lineWidth = 18;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  context.fillStyle = "#27313a";
  context.font = "700 40px Arial";
  context.fillText("ATOM COLOR KEY", 56, 86);

  context.fillStyle = "#53606a";
  context.font = "24px Arial";
  context.fillText("Molecular structures lab", 58, 122);

  atomLegend.forEach(({ color, element, name }, index) => {
    const y = 174 + index * 72;

    context.fillStyle = color;
    context.beginPath();
    context.arc(90, y, 28, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#c4cad1";
    context.lineWidth = 5;
    context.stroke();

    context.fillStyle = "#27313a";
    context.font = "700 30px Arial";
    context.fillText(element, 140, y + 10);

    context.fillStyle = "#4f5961";
    context.font = "24px Arial";
    context.fillText(name, 210, y + 9);
  });

  context.fillStyle = "#58646e";
  context.font = "22px Arial";
  context.fillText("Use this key for H2O, NH4,", 58, 634);
  context.fillText("CO2, and NH3 plaques.", 58, 666);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

const atomColors = {
  carbon: "#4d5560",
  hydrogen: "#b7bec7",
  nitrogen: "#6f9f86",
  oxygen: "#a66f6f",
  wrong: "#7188a6",
};

function finishTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

function drawBond(
  context: CanvasRenderingContext2D,
  from: [number, number],
  to: [number, number],
) {
  context.strokeStyle = "#7b8490";
  context.lineCap = "round";
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(from[0], from[1]);
  context.lineTo(to[0], to[1]);
  context.stroke();
}

function drawAtom(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#d7dde5";
  context.lineWidth = 5;
  context.stroke();
}

export function createFormulaLabelTexture(formula: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.fillStyle = "#151b22";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#7f8b99";
  context.lineWidth = 5;
  context.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  context.fillStyle = "#e8edf2";
  context.font = "700 42px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(formula, canvas.width / 2, canvas.height / 2 + 1);

  return finishTexture(canvas);
}

export function createMoleculePlaqueTexture(kind: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 384;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.fillStyle = "#c7c0b2";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#3b4147";
  context.lineWidth = 18;
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
  context.fillStyle = "rgba(70, 76, 82, 0.14)";
  context.fillRect(54, 56, canvas.width - 108, canvas.height - 112);

  const center: [number, number] = [256, 192];

  if (kind === "H2O" || kind === "H2O-wrong-color") {
    const oxygenColor =
      kind === "H2O-wrong-color" ? atomColors.wrong : atomColors.oxygen;
    const left: [number, number] = [168, 250];
    const right: [number, number] = [344, 250];

    drawBond(context, center, left);
    drawBond(context, center, right);
    drawAtom(context, center[0], center[1], 44, oxygenColor);
    drawAtom(context, left[0], left[1], 28, atomColors.hydrogen);
    drawAtom(context, right[0], right[1], 28, atomColors.hydrogen);
  } else if (kind === "CO2") {
    const left: [number, number] = [142, 192];
    const right: [number, number] = [370, 192];

    drawBond(context, center, left);
    drawBond(context, center, right);
    drawAtom(context, center[0], center[1], 38, atomColors.carbon);
    drawAtom(context, left[0], left[1], 38, atomColors.oxygen);
    drawAtom(context, right[0], right[1], 38, atomColors.oxygen);
  } else if (kind === "CO2-bent") {
    const left: [number, number] = [172, 250];
    const right: [number, number] = [340, 246];

    drawBond(context, center, left);
    drawBond(context, center, right);
    drawAtom(context, center[0], center[1], 38, atomColors.carbon);
    drawAtom(context, left[0], left[1], 38, atomColors.oxygen);
    drawAtom(context, right[0], right[1], 38, atomColors.oxygen);
  } else if (kind === "NH4" || kind === "NH3-extra-hydrogen") {
    const hydrogens: Array<[number, number]> = [
      [256, 94],
      [156, 194],
      [356, 194],
      [256, 292],
    ];

    hydrogens.forEach((hydrogen) => drawBond(context, center, hydrogen));
    drawAtom(context, center[0], center[1], 42, atomColors.nitrogen);
    hydrogens.forEach(([x, y]) =>
      drawAtom(context, x, y, 27, atomColors.hydrogen),
    );
  } else {
    const hydrogens: Array<[number, number]> = [
      [256, 104],
      [168, 246],
      [344, 246],
    ];

    hydrogens.forEach((hydrogen) => drawBond(context, center, hydrogen));
    drawAtom(context, center[0], center[1], 42, atomColors.nitrogen);
    hydrogens.forEach(([x, y]) =>
      drawAtom(context, x, y, 27, atomColors.hydrogen),
    );
  }

  return finishTexture(canvas);
}
