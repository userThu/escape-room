import * as THREE from "three";

export type Interactable = {
  id: string;
  object: THREE.Object3D;
  prompt: string;
  interact: () => void;
};

const cameraCenter = new THREE.Vector2(0, 0);

export function getTargetedInteractable(
  camera: THREE.Camera,
  raycaster: THREE.Raycaster,
  interactables: Interactable[],
  interactableObjects = interactables.map(({ object }) => object),
) {
  raycaster.setFromCamera(cameraCenter, camera);

  const intersections = raycaster.intersectObjects(interactableObjects, false);
  const targetedObject = intersections[0]?.object;

  if (!targetedObject) {
    return null;
  }

  return (
    interactables.find(({ object }) => object === targetedObject) ?? null
  );
}
