import type { ColliderDefinition } from "@/src/game/collision";

export type GreyboxBlockKind = "ceiling" | "floor" | "wall" | "door";

export type GreyboxBlock = ColliderDefinition & {
  kind: GreyboxBlockKind;
};

export type DoorRequirement = {
  inventoryItemIds?: string[];
  puzzleIds?: string[];
};

export type DoorDefinition = {
  id: string;
  label: string;
  requirement: DoorRequirement;
  successMessage: string;
  failureMessage: string;
};

const wallHeight = 3;
const wallY = wallHeight / 2;
const wallThickness = 0.25;
const ceilingY = wallHeight + wallThickness / 2;

export const greyboxBlocks: GreyboxBlock[] = [
  {
    id: "floor-hub",
    kind: "floor",
    center: [0, -0.04, 0],
    size: [8, 0.08, 8],
  },
  {
    id: "floor-north-puzzle-room",
    kind: "floor",
    center: [0, -0.04, -8],
    size: [6, 0.08, 8],
  },
  {
    id: "floor-east-puzzle-room",
    kind: "floor",
    center: [8, -0.04, 0],
    size: [8, 0.08, 6],
  },
  {
    id: "floor-exit-corridor",
    kind: "floor",
    center: [0, -0.04, 7],
    size: [6, 0.08, 6],
  },
  {
    id: "ceiling-hub",
    kind: "ceiling",
    center: [0, ceilingY, 0],
    size: [8, wallThickness, 8],
  },
  {
    id: "ceiling-north-puzzle-room",
    kind: "ceiling",
    center: [0, ceilingY, -8],
    size: [6, wallThickness, 8],
  },
  {
    id: "ceiling-east-puzzle-room",
    kind: "ceiling",
    center: [8, ceilingY, 0],
    size: [8, wallThickness, 6],
  },
  {
    id: "ceiling-exit-corridor",
    kind: "ceiling",
    center: [0, ceilingY, 7],
    size: [6, wallThickness, 6],
  },
  {
    id: "hub-north-wall-left",
    kind: "wall",
    center: [-2.75, wallY, -4],
    size: [2.5, wallHeight, wallThickness],
  },
  {
    id: "hub-north-wall-right",
    kind: "wall",
    center: [2.75, wallY, -4],
    size: [2.5, wallHeight, wallThickness],
  },
  {
    id: "hub-east-wall-top",
    kind: "wall",
    center: [4, wallY, -2.75],
    size: [wallThickness, wallHeight, 2.5],
  },
  {
    id: "hub-east-wall-bottom",
    kind: "wall",
    center: [4, wallY, 2.75],
    size: [wallThickness, wallHeight, 2.5],
  },
  {
    id: "hub-west-wall",
    kind: "wall",
    center: [-4, wallY, 0],
    size: [wallThickness, wallHeight, 8],
  },
  {
    id: "hub-south-wall-left",
    kind: "wall",
    center: [-2.75, wallY, 4],
    size: [2.5, wallHeight, wallThickness],
  },
  {
    id: "hub-south-wall-right",
    kind: "wall",
    center: [2.75, wallY, 4],
    size: [2.5, wallHeight, wallThickness],
  },
  {
    id: "north-room-west-wall",
    kind: "wall",
    center: [-3, wallY, -8],
    size: [wallThickness, wallHeight, 8],
  },
  {
    id: "north-room-east-wall",
    kind: "wall",
    center: [3, wallY, -8],
    size: [wallThickness, wallHeight, 8],
  },
  {
    id: "north-room-north-wall",
    kind: "wall",
    center: [0, wallY, -12],
    size: [6, wallHeight, wallThickness],
  },
  {
    id: "east-room-north-wall",
    kind: "wall",
    center: [8, wallY, -3],
    size: [8, wallHeight, wallThickness],
  },
  {
    id: "east-room-south-wall",
    kind: "wall",
    center: [8, wallY, 3],
    size: [8, wallHeight, wallThickness],
  },
  {
    id: "east-room-east-wall",
    kind: "wall",
    center: [12, wallY, 0],
    size: [wallThickness, wallHeight, 6],
  },
  {
    id: "exit-corridor-west-wall",
    kind: "wall",
    center: [-3, wallY, 7],
    size: [wallThickness, wallHeight, 6],
  },
  {
    id: "exit-corridor-east-wall",
    kind: "wall",
    center: [3, wallY, 7],
    size: [wallThickness, wallHeight, 6],
  },
  {
    id: "exit-wall-left",
    kind: "wall",
    center: [-2, wallY, 10],
    size: [2, wallHeight, wallThickness],
  },
  {
    id: "exit-wall-right",
    kind: "wall",
    center: [2, wallY, 10],
    size: [2, wallHeight, wallThickness],
  },
  {
    id: "final-door",
    kind: "door",
    center: [0, wallY, 10],
    size: [2, wallHeight, wallThickness],
  },
];

export const greyboxColliderDefinitions = greyboxBlocks.filter(
  ({ kind }) => kind !== "ceiling" && kind !== "floor",
);

/**
 * Door definitions for the two-room, three-stage escape route.
 *
 * Stage gate → final-door : currently requires all Final Matter Reactor chambers.
 */
export const doorDefinitions: DoorDefinition[] = [
  {
    id: "final-door",
    label: "Final Door",
    requirement: {},
    successMessage: "The final door releases with a heavy magnetic snap.",
    failureMessage:
      "Sealed: stabilize all three Matter Reactor chambers.",
  },
];
