import type { ColliderDefinition } from "@/src/game/collision";

export type BoxProp = ColliderDefinition & {
  material: "bench" | "cabinet" | "metal" | "hazard" | "glass";
};

export type CylinderProp = {
  id: string;
  center: [number, number, number];
  radius: number;
  depth: number;
  material: "pipe" | "tank";
  rotation?: [number, number, number];
};

export type LabLamp = {
  id: string;
  center: [number, number, number];
  size: [number, number, number];
  intensity: number;
};

export const labBoxProps: BoxProp[] = [
  {
    id: "hub-map-table",
    center: [0, 0.45, -2.6],
    size: [2.4, 0.9, 0.8],
    material: "bench",
  },
  {
    id: "north-room-left-bench",
    center: [-2.15, 0.5, -8],
    size: [0.7, 1, 4.6],
    material: "bench",
  },
  {
    id: "north-room-back-shelf",
    center: [0, 1.1, -11.55],
    size: [4.6, 2.2, 0.45],
    material: "metal",
  },
  {
    id: "north-room-glass-case",
    center: [1.9, 0.8, -7.6],
    size: [0.7, 1.6, 1.5],
    material: "glass",
  },
  {
    id: "east-room-workbench",
    center: [8.2, 0.5, -2.35],
    size: [4.8, 1, 0.7],
    material: "bench",
  },
  {
    id: "east-room-cabinet-bank",
    center: [11.45, 1, 0],
    size: [0.55, 2, 3.4],
    material: "cabinet",
  },
  {
    id: "east-room-fume-hood",
    center: [7.2, 1.3, 2.45],
    size: [2.3, 2.1, 0.7],
    material: "metal",
  },
  {
    id: "locked-room-warning-crate",
    center: [-8.8, 0.55, -1.6],
    size: [1.3, 1.1, 1.3],
    material: "hazard",
  },
  {
    id: "locked-room-storage-rack",
    center: [-11.45, 1.1, 0.9],
    size: [0.55, 2.2, 2.9],
    material: "metal",
  },
  {
    id: "exit-corridor-lock-panel",
    center: [1.72, 1.2, 7.3],
    size: [0.15, 0.8, 0.55],
    material: "hazard",
  },
];

export const labCylinderProps: CylinderProp[] = [
  {
    id: "locked-room-pressure-tank",
    center: [-10.6, 0.9, -2.1],
    radius: 0.38,
    depth: 1.8,
    material: "tank",
  },
  {
    id: "hub-overhead-pipe",
    center: [0, 2.55, -1.2],
    radius: 0.08,
    depth: 7.2,
    material: "pipe",
    rotation: [0, 0, Math.PI / 2],
  },
  {
    id: "east-room-wall-pipe",
    center: [8, 2.35, -2.82],
    radius: 0.07,
    depth: 6.2,
    material: "pipe",
    rotation: [0, Math.PI / 2, 0],
  },
];

export const labLamps: LabLamp[] = [
  {
    id: "hub-fluorescent",
    center: [0, 2.82, 0],
    size: [2.6, 0.08, 0.32],
    intensity: 3.1,
  },
  {
    id: "north-room-fluorescent",
    center: [0, 2.82, -8],
    size: [2.2, 0.08, 0.32],
    intensity: 2.5,
  },
  {
    id: "east-room-fluorescent",
    center: [8, 2.82, 0],
    size: [2.6, 0.08, 0.32],
    intensity: 2.6,
  },
  {
    id: "locked-room-dim-light",
    center: [-8, 2.82, 0],
    size: [2, 0.08, 0.32],
    intensity: 1,
  },
  {
    id: "exit-corridor-fluorescent",
    center: [0, 2.82, 6],
    size: [1.4, 0.08, 0.28],
    intensity: 1.8,
  },
];

export const labPropColliderDefinitions: ColliderDefinition[] = labBoxProps.map(
  ({ center, id, size }) => ({ center, id, size }),
);
