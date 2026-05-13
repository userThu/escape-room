export type EscapeRoomId =
  | "molecular-structures-room"
  | "analysis-room"
  | "locked-lab";

export type RoomPuzzle = {
  id: string;
  label: string;
  status: "implemented" | "planned";
};

export type EscapeRoomDefinition = {
  id: EscapeRoomId;
  label: string;
  areaIds: string[];
  puzzles: RoomPuzzle[];
};

export const escapeRooms: EscapeRoomDefinition[] = [
  {
    id: "molecular-structures-room",
    label: "Molecular Structures",
    areaIds: ["north-puzzle-room"],
    puzzles: [
      {
        id: "molecular-structures",
        label: "Molecular Structures terminal",
        status: "implemented",
      },
    ],
  },
  {
    id: "analysis-room",
    label: "Open Analysis Lab",
    areaIds: ["east-puzzle-room"],
    puzzles: [
      {
        id: "analysis-machine",
        label: "Chemical reaction machine",
        status: "implemented",
      },
    ],
  },
  {
    id: "locked-lab",
    label: "Locked Lab",
    areaIds: ["locked-room"],
    puzzles: [
      {
        id: "locked-lab-sequence",
        label: "Locked-room puzzle sequence",
        status: "planned",
      },
    ],
  },
];
