import * as THREE from "three";

export type AabbCollider = {
  id: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
};

export type ColliderDefinition = {
  id: string;
  center: [number, number, number];
  size: [number, number, number];
};

export const staticColliderDefinitions: ColliderDefinition[] = [];

export function createAabbCollider({
  id,
  center,
  size,
}: ColliderDefinition): AabbCollider {
  const halfSize = new THREE.Vector3(size[0] / 2, size[1] / 2, size[2] / 2);
  const centerPoint = new THREE.Vector3(center[0], center[1], center[2]);

  return {
    id,
    min: centerPoint.clone().sub(halfSize),
    max: centerPoint.clone().add(halfSize),
  };
}

export function createPlayerCollider(
  position: THREE.Vector3,
  radius: number,
  height: number,
): AabbCollider {
  return {
    id: "player",
    min: new THREE.Vector3(
      position.x - radius,
      position.y - height,
      position.z - radius,
    ),
    max: new THREE.Vector3(
      position.x + radius,
      position.y,
      position.z + radius,
    ),
  };
}

export function intersectsAabb(a: AabbCollider, b: AabbCollider) {
  return (
    a.min.x <= b.max.x &&
    a.max.x >= b.min.x &&
    a.min.y <= b.max.y &&
    a.max.y >= b.min.y &&
    a.min.z <= b.max.z &&
    a.max.z >= b.min.z
  );
}

export function collidesWithStaticGeometry(
  playerPosition: THREE.Vector3,
  playerRadius: number,
  playerHeight: number,
  colliders: AabbCollider[],
) {
  const playerCollider = createPlayerCollider(
    playerPosition,
    playerRadius,
    playerHeight,
  );

  return colliders.some((collider) => intersectsAabb(playerCollider, collider));
}
