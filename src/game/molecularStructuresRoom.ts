export type MolecularDecal = {
  id: string;
  label: string;
  texturePath: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
};

export type MolecularPuzzleEntry = {
  id: string;
  texturePath: string;
  answer: string;
};

export const molecularStructuresRoom = {
  id: "molecular-structures-scenic-layer",
  internalName: "Molecular Structures",
  accessibleAreaIds: ["hub", "north-puzzle-room", "east-puzzle-room"],
};

export const molecularStructureDecals: MolecularDecal[] = [
  {
    id: "h2o-wall-decal",
    label: "H2O",
    texturePath: "/molecules/h2o.svg",
    position: [-3.86, 2.67, -2.32],
    rotation: [0, Math.PI / 2, -Math.PI / 5],
    size: [0.3, 0.2],
  },
  {
    id: "co2-east-wall-decal",
    label: "CO2",
    texturePath: "/molecules/co2.svg",
    position: [2.86, 0.68, -8.25],
    rotation: [0, -Math.PI / 2, -Math.PI / 6],
    size: [0.34, 0.15],
  },
  {
    id: "ch4-floor-decal",
    label: "CH4",
    texturePath: "/molecules/ch4.svg",
    position: [8.358, 0.22, 2.67],
    rotation: [0, Math.PI / 2, 0],
    size: [0.3, 0.23],
  },
  {
    id: "nacl-furniture-decal",
    label: "NaCl lattice",
    texturePath: "/molecules/nacl-lattice.svg",
    position: [1.73, 2.99, 4.29],
    rotation: [Math.PI / 2, 0, 0],
    size: [0.34, 0.34],
  },
];

export const molecularPuzzleEntries: MolecularPuzzleEntry[] = [
  {
    id: "h2o",
    texturePath: "/molecules/h2o.svg",
    answer: "H2O",
  },
  {
    id: "co2",
    texturePath: "/molecules/co2.svg",
    answer: "CO2",
  },
  {
    id: "ch4",
    texturePath: "/molecules/ch4.svg",
    answer: "CH4",
  },
  {
    id: "nacl",
    texturePath: "/molecules/nacl-lattice.svg",
    answer: "NaCl",
  },
];
