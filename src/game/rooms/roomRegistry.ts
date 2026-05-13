/**
 * Two-room escape route with three major stages:
 *   1. molecular-structures  — north puzzle room (Room 1)
 *   2. evidence-lab          — east puzzle room  (Room 1, unlocked after stage 1)
 *   3. final-door            — exit corridor     (Room 2, unlocked after stage 2)
 *
 * The old density/separation-room progression has been removed.
 */

export type EscapeRoomId =
  | "molecular-structures"
  | "evidence-lab"
  | "final-door";

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
    id: "molecular-structures",
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
    id: "evidence-lab",
    label: "Evidence Lab",
    areaIds: ["east-puzzle-room"],
    puzzles: [
      {
        id: "evidence-lab",
        label: "Evidence lab analysis station",
        status: "implemented",
      },
    ],
  },
  {
    id: "final-door",
    label: "Final Door",
    areaIds: ["exit-corridor"],
    puzzles: [
      {
        id: "final-door",
        label: "Final exit sequence",
        status: "planned",
      },
    ],
  },
];
