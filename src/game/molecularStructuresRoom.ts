export type MoleculeFormula = "H2O" | "NH4" | "CO2" | "NH3";

export type MoleculePlaqueKind =
  | MoleculeFormula
  | "H2O-wrong-color"
  | "CO2-bent"
  | "NH3-extra-hydrogen";

export type MolecularPlaqueDefinition = {
  id: string;
  name: string;
  description: string;
  formula: MoleculeFormula | "distractor";
  kind: MoleculePlaqueKind;
  position: [number, number, number];
  rotation: [number, number, number];
};

export type MolecularSlotDefinition = {
  id: string;
  formula: MoleculeFormula;
};

export const molecularStructuresRoom = {
  id: "molecular-structures-scenic-layer",
  internalName: "Molecular Structures",
  accessibleAreaIds: ["hub", "north-puzzle-room", "east-puzzle-room"],
};

export const molecularBoardSlots: MolecularSlotDefinition[] = [
  { id: "molecular-slot-h2o", formula: "H2O" },
  { id: "molecular-slot-nh4", formula: "NH4" },
  { id: "molecular-slot-co2", formula: "CO2" },
  { id: "molecular-slot-nh3", formula: "NH3" },
];

export const molecularPlaques: MolecularPlaqueDefinition[] = [
  {
    id: "molecular-plaque-h2o",
    name: "Molecule Plaque A",
    description: "A small plaque showing a bent three-atom molecule.",
    formula: "H2O",
    kind: "H2O",
    position: [-3.78, 2.28, -2.3],
    rotation: [0, Math.PI / 2, -0.18],
  },
  {
    id: "molecular-plaque-nh4",
    name: "Molecule Plaque B",
    description: "A small plaque showing a central atom with four hydrogens.",
    formula: "NH4",
    kind: "NH4",
    position: [1.35, 0.98, -1.24],
    rotation: [-Math.PI / 2, 0, 0.15],
  },
  {
    id: "molecular-plaque-co2",
    name: "Molecule Plaque C",
    description: "A small plaque showing a linear three-atom molecule.",
    formula: "CO2",
    kind: "CO2",
    position: [2.86, 1.06, -8.35],
    rotation: [0, -Math.PI / 2, -0.08],
  },
  {
    id: "molecular-plaque-nh3",
    name: "Molecule Plaque D",
    description: "A small plaque showing a central atom with three hydrogens.",
    formula: "NH3",
    kind: "NH3",
    position: [-2.15, 1.18, -7.5],
    rotation: [0, Math.PI / 2, 0.08],
  },
  {
    id: "molecular-plaque-h2o-wrong-color",
    name: "Molecule Plaque E",
    description: "A misleading plaque with the right shape but suspicious atom colors.",
    formula: "distractor",
    kind: "H2O-wrong-color",
    position: [3.78, 1.92, 2.3],
    rotation: [0, -Math.PI / 2, 0.12],
  },
  {
    id: "molecular-plaque-co2-bent",
    name: "Molecule Plaque F",
    description: "A misleading plaque with a bent structure.",
    formula: "distractor",
    kind: "CO2-bent",
    position: [8.2, 1.12, -2.34],
    rotation: [-Math.PI / 2, 0, -0.1],
  },
  {
    id: "molecular-plaque-nh3-extra-hydrogen",
    name: "Molecule Plaque G",
    description: "A misleading plaque with one extra hydrogen.",
    formula: "distractor",
    kind: "NH3-extra-hydrogen",
    position: [11.72, 2.12, -1.55],
    rotation: [0, -Math.PI / 2, 0.16],
  },
];
