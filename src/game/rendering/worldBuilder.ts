import * as THREE from "three";
import {
  createAabbCollider,
  type AabbCollider,
} from "@/src/game/collision";
import {
  greyboxBlocks,
  greyboxColliderDefinitions,
} from "@/src/game/greyboxLayout";
import {
  labBoxProps,
  labCylinderProps,
  labLamps,
  labPropColliderDefinitions,
} from "@/src/game/labDecor";
import {
  molecularBoardSlots,
  molecularPlaques,
  type MoleculeFormula,
} from "@/src/game/molecularStructuresRoom";
import {
  createAtomLegendPosterTexture,
  createCanvasTexture,
  createFormulaLabelTexture,
  createMoleculePlaqueTexture,
} from "@/src/game/rendering/textures";

type WorldBuilderOptions = {
  playerHeight: number;
};

export type BuiltGameWorld = {
  cabinetDoors: CabinetDoorTarget[];
  camera: THREE.PerspectiveCamera;
  doorMeshes: Map<string, THREE.Mesh>;
  reactionMachineChamber: THREE.Object3D;
  reactionMachineSliderSlot: THREE.Object3D;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  staticColliders: AabbCollider[];
  molecularPlaqueTargets: MolecularPlaqueTarget[];
  molecularSubmitLever: MolecularSubmitLeverTarget;
  molecularSlotTargets: MolecularSlotTarget[];
  waterBeaker: THREE.Object3D;
  dispose: () => void;
};

export type CabinetDoorTarget = {
  id: string;
  label: string;
  object: THREE.Object3D;
  toggle: () => boolean;
};

export type MolecularPlaqueTarget = {
  id: string;
  formula: MoleculeFormula | "distractor";
  kind: string;
  object: THREE.Object3D;
  item: {
    id: string;
    name: string;
    description: string;
  };
  collect: () => void;
};

export type MolecularSlotTarget = {
  id: string;
  formula: MoleculeFormula;
  object: THREE.Object3D;
  clearPlaque: () => void;
  placePlaque: (kind: string) => void;
};

export type MolecularSubmitLeverTarget = {
  object: THREE.Object3D;
  pull: () => void;
};

export function buildGameWorld(
  mount: HTMLDivElement,
  { playerHeight }: WorldBuilderOptions,
): BuiltGameWorld {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111827);

  const doorMeshes = new Map<string, THREE.Mesh>();
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, playerHeight, 0);
  camera.rotation.order = "YXZ";

  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  mount.appendChild(renderer.domElement);

  const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
  const generatedTextures: THREE.Texture[] = [];
  const generatedMaterials: THREE.Material[] = [];
  const generatedGeometries: THREE.BufferGeometry[] = [];
  const textureLoader = new THREE.TextureLoader();
  const floorTexture = createCanvasTexture("#343c47", "#242b34", "#6b5e48");
  const wallTexture = createCanvasTexture("#7d8587", "#656d70", "#2f383a");
  const ceilingTexture = createCanvasTexture("#5f686b", "#485154", "#252b2e");
  const doorTexture = createCanvasTexture("#343a40", "#24282d", "#7c2d12");
  const atomLegendPosterTexture = createAtomLegendPosterTexture();
  const terminalTexture = textureLoader.load(
    "/textures/computer-terminal-texture.png",
  );

  terminalTexture.colorSpace = THREE.SRGBColorSpace;
  terminalTexture.wrapS = THREE.RepeatWrapping;
  terminalTexture.wrapT = THREE.RepeatWrapping;

  floorTexture?.repeat.set(3, 3);
  wallTexture?.repeat.set(2, 2);
  ceilingTexture?.repeat.set(2, 2);
  doorTexture?.repeat.set(1, 1);

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b3442,
    map: floorTexture,
    roughness: 0.82,
    metalness: 0.08,
  });
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b949e,
    map: wallTexture,
    roughness: 0.9,
    metalness: 0.02,
  });
  const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    map: ceilingTexture,
    roughness: 0.88,
    metalness: 0.04,
  });
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x343a40,
    map: doorTexture,
    roughness: 0.72,
    metalness: 0.18,
  });
  const benchMaterial = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.7,
    metalness: 0.18,
  });
  const cabinetMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.62,
    metalness: 0.28,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.55,
    metalness: 0.35,
  });
  const hazardMaterial = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.52,
    metalness: 0.08,
  });
  const terminalBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x26313d,
    map: terminalTexture,
    roughness: 0.5,
    metalness: 0.42,
  });
  const terminalTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.55,
    metalness: 0.35,
  });
  const terminalScreenMaterial = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x0891b2,
    emissiveIntensity: 1.25,
    roughness: 0.18,
    metalness: 0.04,
  });
  const circuitTraceMaterial = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
  });
  const circuitGlowMaterial = new THREE.MeshBasicMaterial({
    color: 0x86efac,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x8ecae6,
    opacity: 0.52,
    roughness: 0.12,
    metalness: 0.02,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const glassEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0xc7f9ff,
    opacity: 0.74,
    roughness: 0.18,
    metalness: 0.03,
    transparent: true,
  });
  const shelfGlassMaterial = new THREE.MeshStandardMaterial({
    color: 0xb8d7df,
    opacity: 0.58,
    roughness: 0.28,
    metalness: 0.08,
    transparent: true,
  });
  const pipeMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.48,
    metalness: 0.55,
  });
  const tankMaterial = new THREE.MeshStandardMaterial({
    color: 0xa3a3a3,
    roughness: 0.38,
    metalness: 0.62,
  });
  const blackRubberMaterial = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.68,
    metalness: 0.12,
  });
  const paperMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    roughness: 0.9,
    metalness: 0,
  });
  const amberChemicalMaterial = new THREE.MeshStandardMaterial({
    color: 0xb7793a,
    emissive: 0x2f1708,
    opacity: 0.66,
    roughness: 0.28,
    transparent: true,
  });
  const violetChemicalMaterial = new THREE.MeshStandardMaterial({
    color: 0x8b7aa8,
    emissive: 0x1f1830,
    opacity: 0.62,
    roughness: 0.3,
    transparent: true,
  });
  const lampHousingMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.58,
    metalness: 0.44,
  });
  const lampPanelMaterial = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    emissive: 0xbfdcff,
    emissiveIntensity: 1.9,
    roughness: 0.22,
    metalness: 0.02,
  });
  const posterFrameMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f2933,
    roughness: 0.62,
    metalness: 0.16,
  });
  const atomLegendPosterMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: atomLegendPosterTexture,
    side: THREE.DoubleSide,
  });
  const propMaterials = {
    bench: benchMaterial,
    cabinet: cabinetMaterial,
    hazard: hazardMaterial,
    machine: terminalBodyMaterial,
    metal: metalMaterial,
    pipe: pipeMaterial,
    tank: tankMaterial,
  };
  const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  const beakerGeometry = new THREE.CylinderGeometry(0.18, 0.16, 0.42, 16, 1, true);
  const tubeGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.42, 12);
  const vesselRimGeometry = new THREE.TorusGeometry(1, 0.08, 8, 20);
  const vesselBaseGeometry = new THREE.CylinderGeometry(1, 1, 0.08, 16);
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0c4a6e,
    opacity: 0.7,
    roughness: 0.2,
    transparent: true,
  });
  const cabinetDoors: CabinetDoorTarget[] = [];
  const molecularPlaqueTargets: MolecularPlaqueTarget[] = [];
  const molecularSlotTargets: MolecularSlotTarget[] = [];
  let molecularSubmitLever: MolecularSubmitLeverTarget | null = null;
  let reactionMachineChamber: THREE.Object3D | null = null;
  let reactionMachineSliderSlot: THREE.Object3D | null = null;
  let waterBeaker: THREE.Object3D | null = null;

  const addBoxComponent = (
    group: THREE.Group,
    material: THREE.Material,
    position: [number, number, number],
    scale: [number, number, number],
  ) => {
    const component = new THREE.Mesh(blockGeometry, material);

    component.position.set(position[0], position[1], position[2]);
    component.scale.set(scale[0], scale[1], scale[2]);
    component.castShadow = false;
    component.receiveShadow = false;
    group.add(component);

    return component;
  };

  const addCylinderComponent = (
    group: THREE.Group,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number],
    scale: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    const component = new THREE.Mesh(geometry, material);

    component.position.set(position[0], position[1], position[2]);
    component.scale.set(scale[0], scale[1], scale[2]);
    component.rotation.set(rotation[0], rotation[1], rotation[2]);
    component.castShadow = false;
    component.receiveShadow = false;
    group.add(component);

    return component;
  };

  const addGlassVessel = (
    group: THREE.Group,
    geometry: THREE.BufferGeometry,
    position: [number, number, number],
    scale: [number, number, number],
    radius: number,
  ) => {
    const vessel = addCylinderComponent(
      group,
      geometry,
      glassMaterial,
      position,
      scale,
    );
    const scaledRadius = radius * scale[0];
    const halfHeight = 0.21 * scale[1];
    const rimY = position[1] + halfHeight;
    const baseY = position[1] - halfHeight + 0.01;
    const rim = new THREE.Mesh(vesselRimGeometry, glassEdgeMaterial);
    const base = new THREE.Mesh(vesselBaseGeometry, glassEdgeMaterial);

    rim.position.set(position[0], rimY, position[2]);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(scaledRadius, scaledRadius, scaledRadius);
    rim.castShadow = false;
    rim.receiveShadow = false;
    group.add(rim);

    base.position.set(position[0], baseY, position[2]);
    base.scale.set(scaledRadius, 1, scaledRadius);
    base.castShadow = false;
    base.receiveShadow = false;
    group.add(base);
    vessel.userData.glassDetails = [rim, base];

    return vessel;
  };

  const addLiquidFill = (
    group: THREE.Group,
    material: THREE.Material,
    position: [number, number, number],
    radius: number,
    height: number,
  ) =>
    addCylinderComponent(
      group,
      cylinderGeometry,
      material,
      position,
      [radius, height, radius],
    );

  const createTextureMaterial = (
    texture: THREE.Texture | null,
    options: THREE.MeshBasicMaterialParameters = {},
  ) => {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      ...options,
    });

    if (texture) {
      generatedTextures.push(texture);
    }

    generatedMaterials.push(material);

    return material;
  };

  const createPlaqueGroup = (
    kind: string,
    frameMaterial: THREE.Material,
    position: [number, number, number],
    rotation: [number, number, number],
  ) => {
    const group = new THREE.Group();
    const plaqueGeometry = new THREE.PlaneGeometry(0.5, 0.36);
    const diagramTexture = createMoleculePlaqueTexture(kind);
    const diagramMaterial = createTextureMaterial(diagramTexture);
    const body = addBoxComponent(group, frameMaterial, [0, 0, -0.025], [0.58, 0.44, 0.05]);
    const face = new THREE.Mesh(plaqueGeometry, diagramMaterial);
    const surfaceNormal = new THREE.Vector3(0, 0, 1).applyEuler(
      new THREE.Euler(rotation[0], rotation[1], rotation[2]),
    );

    face.position.set(0, 0, 0.005);
    face.renderOrder = 8;
    group.add(face);
    group.position
      .set(position[0], position[1], position[2])
      .addScaledVector(surfaceNormal, 0.035);
    group.rotation.set(rotation[0], rotation[1], rotation[2]);
    generatedGeometries.push(plaqueGeometry);

    return { body, group };
  };

  const addVialRack = (
    group: THREE.Group,
    position: [number, number, number],
  ) => {
    addBoxComponent(group, blackRubberMaterial, position, [0.48, 0.05, 0.18]);

    [-0.16, 0, 0.16].forEach((offset, index) => {
      const tubeX = position[0] + offset;
      const tubeY = position[1] + 0.11;
      const liquidMaterial =
        index % 2 === 0 ? amberChemicalMaterial : violetChemicalMaterial;

      addGlassVessel(
        group,
        tubeGeometry,
        [tubeX, tubeY, position[2]],
        [0.9, 0.66, 0.9],
        0.045,
      );
      addLiquidFill(
        group,
        liquidMaterial,
        [tubeX, tubeY - 0.06, position[2]],
        0.035,
        0.08,
      );
    });
  };

  const createLabFurniture = ({
    id,
    material,
    size,
  }: (typeof labBoxProps)[number]) => {
    const group = new THREE.Group();
    const width = size[0];
    const height = size[1];
    const depth = size[2];

    if (material === "bench") {
      addBoxComponent(group, benchMaterial, [0, height / 2 - 0.069, 0], [width, 0.16, depth]);
      addBoxComponent(group, metalMaterial, [-width * 0.4, 0, -depth * 0.38], [0.12, height, 0.12]);
      addBoxComponent(group, metalMaterial, [width * 0.4, 0, -depth * 0.38], [0.12, height, 0.12]);
      addBoxComponent(group, metalMaterial, [-width * 0.4, 0, depth * 0.38], [0.12, height, 0.12]);
      addBoxComponent(group, metalMaterial, [width * 0.4, 0, depth * 0.38], [0.12, height, 0.12]);
      addBoxComponent(group, metalMaterial, [0, -height * 0.18, 0], [width * 0.82, 0.08, depth * 0.82]);
      addGlassVessel(group, beakerGeometry, [-width * 0.22, height / 2 + 0.16, 0], [1, 1, 1], 0.18);
      addLiquidFill(group, amberChemicalMaterial, [-width * 0.22, height / 2 + 0.04, 0], 0.135, 0.1);
      addBoxComponent(group, paperMaterial, [width * 0.22 - 0.18, height / 2 + 0.02, depth * 0.08 + 0.05], [0.5, 0.02, 0.34]);
      addVialRack(group, [width * 0.08, height / 2 + 0.04, -depth * 0.22]);
    } else if (material === "cabinet" && id === "east-room-cabinet-bank") {
      const backX = width / 2 - 0.035;
      const frontX = -width / 2 - 0.03;
      const innerX = -width * 0.16;

      addBoxComponent(group, cabinetMaterial, [backX, 0, 0], [0.07, height, depth]);
      addBoxComponent(group, cabinetMaterial, [0, height / 2 - 0.035, 0], [width, 0.07, depth]);
      addBoxComponent(group, cabinetMaterial, [0, -height / 2 + 0.035, 0], [width, 0.07, depth]);
      addBoxComponent(group, cabinetMaterial, [0, 0, -depth / 2 + 0.035], [width, height, 0.07]);
      addBoxComponent(group, cabinetMaterial, [0, 0, depth / 2 - 0.035], [width, height, 0.07]);
      addBoxComponent(group, metalMaterial, [frontX, 0, 0], [0.035, height * 0.95, 0.035]);
      addBoxComponent(group, shelfGlassMaterial, [innerX, height * 0.18, 0], [width * 0.72, 0.055, depth * 0.86]);
      addBoxComponent(group, shelfGlassMaterial, [innerX, -height * 0.18, 0], [width * 0.72, 0.055, depth * 0.86]);

      [
        [-depth * 0.28, height * 0.33],
        [0, height * 0.33],
        [depth * 0.27, height * 0.33],
        [-depth * 0.18, -height * 0.02],
        [depth * 0.18, -height * 0.02],
      ].forEach(([z, y]) => {
        addGlassVessel(group, tubeGeometry, [innerX, y, z], [0.85, 0.88, 0.85], 0.045);
      });

      addGlassVessel(group, beakerGeometry, [innerX, -height * 0.36, -depth * 0.22], [0.88, 0.88, 0.88], 0.18);
      addGlassVessel(group, beakerGeometry, [innerX, -height * 0.36, depth * 0.24], [0.88, 0.88, 0.88], 0.18);
      const waterGlass = addGlassVessel(
        group,
        beakerGeometry,
        [innerX, -height * 0.02, depth * 0.32],
        [1.05, 1.05, 1.05],
        0.18,
      );
      const waterLiquid = addLiquidFill(group, waterMaterial, [innerX, -height * 0.12, depth * 0.32], 0.145, 0.1);
      waterGlass.userData.linkedLiquid = waterLiquid;
      waterBeaker = waterGlass;

      [
        {
          hingeZ: -depth * 0.5,
          label: "left closet door",
          startZ: -depth * 0.25,
          swing: -Math.PI / 2.4,
        },
        {
          hingeZ: depth * 0.5,
          label: "right closet door",
          startZ: depth * 0.25,
          swing: Math.PI / 2.4,
        },
      ].forEach(({ hingeZ, label, startZ, swing }, index) => {
        const doorPivot = new THREE.Group();
        const door = addBoxComponent(
          doorPivot,
          terminalBodyMaterial,
          [0, 0, startZ - hingeZ],
          [0.08, height * 0.94, depth * 0.48],
        );

        addBoxComponent(
          doorPivot,
          hazardMaterial,
          [-0.045, 0, startZ - hingeZ + (index === 0 ? depth * 0.12 : -depth * 0.12)],
          [0.025, height * 0.16, depth * 0.04],
        );
        doorPivot.position.set(frontX - 0.04, 0, hingeZ);
        group.add(doorPivot);

        let isOpen = false;

        cabinetDoors.push({
          id: `east-room-cabinet-door-${index + 1}`,
          label,
          object: door,
          toggle: () => {
            isOpen = !isOpen;
            doorPivot.rotation.y = isOpen ? swing : 0;
            return isOpen;
          },
        });
      });
    } else if (material === "cabinet") {
      addBoxComponent(group, cabinetMaterial, [0, 0, 0], [width, height, depth]);
      addBoxComponent(group, metalMaterial, [0, 0, -depth / 2 - 0.02], [width * 0.9, height * 0.04, 0.04]);
      addBoxComponent(group, metalMaterial, [0, height * 0.24, -depth / 2 - 0.02], [width * 0.9, height * 0.04, 0.04]);
      addBoxComponent(group, blackRubberMaterial, [0, -height * 0.12, -depth / 2 - 0.04], [width * 0.08, height * 0.36, 0.04]);
      addBoxComponent(group, hazardMaterial, [0, height * 0.38, -depth / 2 - 0.05], [width * 0.45, height * 0.12, 0.03]);
    } else if (material === "machine") {
      addBoxComponent(group, terminalBodyMaterial, [0, -0.15, 0], [width, height * 0.72, depth]);
      addBoxComponent(group, metalMaterial, [-width * 0.34, 0.62, -depth * 0.44], [width * 0.22, 0.9, 0.08]);
      addBoxComponent(group, cabinetMaterial, [width * 0.18, 0.52, -depth * 0.45], [width * 0.45, 0.62, 0.06]);
      addBoxComponent(group, hazardMaterial, [width * 0.36, 0.92, -depth * 0.5], [width * 0.16, 0.16, 0.035]);
      addBoxComponent(group, blackRubberMaterial, [width * 0.18, 0.42, -depth * 0.5], [width * 0.34, 0.08, 0.035]);
      addBoxComponent(group, blackRubberMaterial, [width * 0.18, 0.27, -depth * 0.5], [width * 0.34, 0.08, 0.035]);

      const chamber = addCylinderComponent(
        group,
        beakerGeometry,
        glassMaterial,
        [-width * 0.26, 0.32, -depth * 0.18],
        [1.35, 1.75, 1.35],
      );
      addCylinderComponent(
        group,
        tubeGeometry,
        violetChemicalMaterial,
        [-width * 0.26, 0.1, -depth * 0.18],
        [3, 1, 3],
      );
      addCylinderComponent(
        group,
        cylinderGeometry,
        pipeMaterial,
        [-width * 0.26, 1.18, -depth * 0.18],
        [0.08, width * 0.34, 0.08],
        [0, 0, Math.PI / 2],
      );
      addCylinderComponent(
        group,
        cylinderGeometry,
        pipeMaterial,
        [width * 0.24, 0.95, -depth * 0.2],
        [0.06, height * 0.42, 0.06],
      );
      addBoxComponent(group, metalMaterial, [-width * 0.46, -0.74, -depth * 0.36], [0.12, 0.44, 0.12]);
      addBoxComponent(group, metalMaterial, [width * 0.46, -0.74, -depth * 0.36], [0.12, 0.44, 0.12]);
      addBoxComponent(group, metalMaterial, [-width * 0.46, -0.74, depth * 0.36], [0.12, 0.44, 0.12]);
      addBoxComponent(group, metalMaterial, [width * 0.46, -0.74, depth * 0.36], [0.12, 0.44, 0.12]);

      const sliderSlot = addBoxComponent(
        group,
        terminalTrimMaterial,
        [-width / 2 - 0.035, 0.42, 0.04],
        [0.05, 0.5, 0.5],
      );
      addBoxComponent(group, terminalScreenMaterial, [-width / 2 - 0.07, 0.42, 0.04], [0.025, 0.08, 0.38]);

      if (id === "east-room-fume-hood") {
        reactionMachineChamber = chamber;
        reactionMachineSliderSlot = sliderSlot;
      }
    } else if (material === "wallShelf") {
      addBoxComponent(group, shelfGlassMaterial, [0, 0, 0], [width, height, depth]);

      if (width > depth) {
        addBoxComponent(group, metalMaterial, [-width * 0.38, -0.16, 0], [0.08, 0.32, 0.08]);
        addBoxComponent(group, metalMaterial, [width * 0.38, -0.16, 0], [0.08, 0.32, 0.08]);
        addGlassVessel(group, tubeGeometry, [-width * 0.24, 0.2, 0], [0.72, 0.7, 0.72], 0.045);
        addGlassVessel(group, beakerGeometry, [width * 0.18, 0.2, 0.02], [0.72, 0.72, 0.72], 0.18);
      } else {
        addBoxComponent(group, metalMaterial, [0, -0.16, -depth * 0.38], [0.08, 0.32, 0.08]);
        addBoxComponent(group, metalMaterial, [0, -0.16, depth * 0.38], [0.08, 0.32, 0.08]);
        addGlassVessel(group, tubeGeometry, [0, 0.2, -depth * 0.24], [0.72, 0.7, 0.72], 0.045);
        addGlassVessel(group, beakerGeometry, [0.02, 0.2, depth * 0.18], [0.72, 0.72, 0.72], 0.18);
      }
    } else if (material === "metal") {
      addBoxComponent(group, metalMaterial, [0, 0, 0], [width, height * 0.08, depth]);
      addBoxComponent(group, metalMaterial, [0, height * 0.28, 0], [width, height * 0.08, depth]);
      addBoxComponent(group, metalMaterial, [0, -height * 0.28, 0], [width, height * 0.08, depth]);
      addBoxComponent(group, metalMaterial, [-width * 0.45, 0, -depth * 0.4], [0.08, height, 0.08]);
      addBoxComponent(group, metalMaterial, [width * 0.45, 0, -depth * 0.4], [0.08, height, 0.08]);
      addBoxComponent(group, metalMaterial, [-width * 0.45, 0, depth * 0.4], [0.08, height, 0.08]);
      addBoxComponent(group, metalMaterial, [width * 0.45, 0, depth * 0.4], [0.08, height, 0.08]);
      addVialRack(group, [0, height * 0.24 + 0.2, 0]);
    } else {
      addBoxComponent(group, blackRubberMaterial, [0, 0, 0], [width, height, depth]);
      addBoxComponent(group, hazardMaterial, [0, height * 0.22, -depth / 2 - 0.02], [width * 0.72, height * 0.08, 0.04]);
      addBoxComponent(group, hazardMaterial, [0, -height * 0.04, -depth / 2 - 0.02], [width * 0.72, height * 0.08, 0.04]);
    }

    return group;
  };

  greyboxBlocks.forEach(({ center, id, kind, size }) => {
    const material =
      kind === "floor"
        ? floorMaterial
        : kind === "ceiling"
          ? ceilingMaterial
          : kind === "door"
            ? doorMaterial
            : wallMaterial;
    const block = new THREE.Mesh(blockGeometry, material);

    block.position.set(center[0], center[1], center[2]);
    block.scale.set(size[0], size[1], size[2]);
    block.castShadow = false;
    block.receiveShadow = false;
    scene.add(block);

    if (kind === "door") {
      doorMeshes.set(id, block);
    }
  });

  labBoxProps.forEach((definition) => {
    const prop = createLabFurniture(definition);
    const { center } = definition;

    prop.position.set(center[0], center[1], center[2]);
    scene.add(prop);
  });

  const boardGroup = new THREE.Group();

  addBoxComponent(boardGroup, terminalTrimMaterial, [0, 0, -0.045], [3.05, 1.98, 0.09]);
  addBoxComponent(boardGroup, terminalBodyMaterial, [0, 0, 0.005], [2.84, 1.78, 0.04]);
  addBoxComponent(boardGroup, circuitTraceMaterial, [0, 0.88, 0.04], [2.56, 0.025, 0.025]);
  addBoxComponent(boardGroup, circuitTraceMaterial, [0, -0.88, 0.04], [2.56, 0.025, 0.025]);
  addBoxComponent(boardGroup, circuitTraceMaterial, [-1.28, 0, 0.04], [0.025, 1.64, 0.025]);
  addBoxComponent(boardGroup, circuitTraceMaterial, [1.28, 0, 0.04], [0.025, 1.64, 0.025]);
  addBoxComponent(boardGroup, circuitTraceMaterial, [0, 0, 0.045], [0.04, 1.45, 0.02]);
  addBoxComponent(boardGroup, circuitTraceMaterial, [0, -0.02, 0.045], [2.18, 0.04, 0.02]);

  molecularBoardSlots.forEach(({ formula, id }, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = column === 0 ? -0.62 : 0.62;
    const y = row === 0 ? 0.42 : -0.48;
    const slot = addBoxComponent(
      boardGroup,
      terminalTrimMaterial,
      [x, y + 0.12, 0.055],
      [0.8, 0.48, 0.045],
    );
    const placedTexture = createMoleculePlaqueTexture(formula);
    const placedMaterial = createTextureMaterial(placedTexture);
    const placedGeometry = new THREE.PlaneGeometry(0.62, 0.42);
    const placedPlaque = new THREE.Mesh(placedGeometry, placedMaterial);
    const labelTexture = createFormulaLabelTexture(formula);
    const labelMaterial = createTextureMaterial(labelTexture);
    const labelGeometry = new THREE.PlaneGeometry(0.76, 0.2);
    const label = new THREE.Mesh(labelGeometry, labelMaterial);

    placedPlaque.position.set(x, y + 0.12, 0.085);
    placedPlaque.visible = false;
    boardGroup.add(placedPlaque);

    label.position.set(x, y - 0.25, 0.085);
    boardGroup.add(label);
    addBoxComponent(boardGroup, circuitGlowMaterial, [x - 0.5, y + 0.12, 0.075], [0.08, 0.08, 0.018]);
    addBoxComponent(boardGroup, circuitTraceMaterial, [x, y + 0.48, 0.065], [0.54, 0.025, 0.018]);

    generatedGeometries.push(placedGeometry, labelGeometry);
    molecularSlotTargets.push({
      id,
      formula,
      object: slot,
      clearPlaque: () => {
        placedPlaque.visible = false;
      },
      placePlaque: (kind) => {
        const texture = createMoleculePlaqueTexture(kind);

        if (placedPlaque.material instanceof THREE.Material) {
          const oldMaterialIndex = generatedMaterials.indexOf(
            placedPlaque.material,
          );

          if (oldMaterialIndex >= 0) {
            generatedMaterials.splice(oldMaterialIndex, 1);
          }

          if (
            placedPlaque.material instanceof THREE.MeshBasicMaterial &&
            placedPlaque.material.map
          ) {
            const oldTextureIndex = generatedTextures.indexOf(
              placedPlaque.material.map,
            );

            if (oldTextureIndex >= 0) {
              generatedTextures.splice(oldTextureIndex, 1);
            }

            placedPlaque.material.map.dispose();
          }

          placedPlaque.material.dispose();
        }

        placedPlaque.material = createTextureMaterial(texture);
        placedPlaque.visible = true;
      },
    });
  });

  const leverPivot = new THREE.Group();
  const leverBase = addBoxComponent(boardGroup, terminalTrimMaterial, [1.72, 0, 0.06], [0.28, 0.7, 0.08]);
  addCylinderComponent(
    leverPivot,
    cylinderGeometry,
    hazardMaterial,
    [0, 0.22, 0],
    [0.045, 0.32, 0.045],
    [0, 0, Math.PI / 2],
  );

  addCylinderComponent(
    leverPivot,
    cylinderGeometry,
    circuitGlowMaterial,
    [0, 0.52, 0],
    [0.09, 0.05, 0.09],
  );
  leverPivot.position.set(1.72, -0.24, 0.14);
  leverPivot.rotation.z = -0.45;
  boardGroup.add(leverPivot);
  molecularSubmitLever = {
    object: leverBase,
    pull: () => {
      leverPivot.rotation.z = leverPivot.rotation.z < 0 ? 0.45 : -0.45;
    },
  };

  boardGroup.position.set(0, 1.62, -11.84);
  scene.add(boardGroup);

  molecularPlaques.forEach((plaque) => {
    const { body, group } = createPlaqueGroup(
      plaque.kind,
      terminalTrimMaterial,
      plaque.position,
      plaque.rotation,
    );

    scene.add(group);
    molecularPlaqueTargets.push({
      id: plaque.id,
      formula: plaque.formula,
      kind: plaque.kind,
      object: body,
      item: {
        id: plaque.id,
        name: plaque.name,
        description: plaque.description,
      },
      collect: () => {
        group.visible = false;
        body.raycast = () => {};
      },
    });
  });

  labCylinderProps.forEach(({ center, depth, material, radius, rotation }) => {
    const prop = new THREE.Mesh(cylinderGeometry, propMaterials[material]);

    prop.position.set(center[0], center[1], center[2]);
    prop.scale.set(radius, depth, radius);
    prop.castShadow = false;
    prop.receiveShadow = false;

    if (rotation) {
      prop.rotation.set(rotation[0], rotation[1], rotation[2]);
    }

    scene.add(prop);
  });

  labLamps.forEach(({ center, intensity, size }) => {
    const housing = new THREE.Mesh(blockGeometry, lampHousingMaterial);
    const panel = new THREE.Mesh(blockGeometry, lampPanelMaterial);
    const lamp = new THREE.PointLight(0xdbeafe, intensity, 8);

    housing.position.set(center[0], center[1] + 0.035, center[2]);
    housing.scale.set(size[0] + 0.18, size[1], size[2] + 0.18);
    housing.castShadow = false;
    housing.receiveShadow = false;
    scene.add(housing);

    panel.position.set(center[0], center[1] - 0.025, center[2]);
    panel.scale.set(size[0], size[1], size[2]);
    scene.add(panel);

    lamp.position.set(center[0], center[1] - 0.25, center[2]);
    lamp.castShadow = false;
    scene.add(lamp);
  });

  const posterGroup = new THREE.Group();
  const posterGeometry = new THREE.PlaneGeometry(0.95, 1.3);
  const poster = new THREE.Mesh(posterGeometry, atomLegendPosterMaterial);

  poster.position.set(0, 0, 0.01);
  posterGroup.add(poster);
  addBoxComponent(posterGroup, posterFrameMaterial, [0, 0.67, 0], [1.05, 0.04, 0.05]);
  addBoxComponent(posterGroup, posterFrameMaterial, [0, -0.67, 0], [1.05, 0.04, 0.05]);
  addBoxComponent(posterGroup, posterFrameMaterial, [-0.52, 0, 0], [0.04, 1.36, 0.05]);
  addBoxComponent(posterGroup, posterFrameMaterial, [0.52, 0, 0], [0.04, 1.36, 0.05]);
  posterGroup.position.set(-2.86, 2.04, -6.8);
  posterGroup.rotation.y = Math.PI / 2;
  posterGroup.rotation.z = -0.08;
  scene.add(posterGroup);

  const ambientLight = new THREE.HemisphereLight(0xe0f2fe, 0x1f2937, 1.1);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
  keyLight.position.set(4, 6, 3);
  keyLight.castShadow = false;
  scene.add(keyLight);

  const staticColliders = [
    ...greyboxColliderDefinitions,
    ...labPropColliderDefinitions,
  ].map(createAabbCollider);

  if (
    !reactionMachineChamber ||
    !reactionMachineSliderSlot ||
    !waterBeaker ||
    !molecularSubmitLever
  ) {
    throw new Error("Reaction machine interaction targets were not created.");
  }

  return {
    cabinetDoors,
    camera,
    doorMeshes,
    reactionMachineChamber,
    reactionMachineSliderSlot,
    renderer,
    scene,
    staticColliders,
    molecularPlaqueTargets,
    molecularSubmitLever,
    molecularSlotTargets,
    waterBeaker,
    dispose: () => {
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock();
      }

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }

      blockGeometry.dispose();
      floorMaterial.dispose();
      wallMaterial.dispose();
      ceilingMaterial.dispose();
      doorMaterial.dispose();
      benchMaterial.dispose();
      cabinetMaterial.dispose();
      metalMaterial.dispose();
      hazardMaterial.dispose();
      glassMaterial.dispose();
      glassEdgeMaterial.dispose();
      shelfGlassMaterial.dispose();
      blackRubberMaterial.dispose();
      paperMaterial.dispose();
      terminalBodyMaterial.dispose();
      terminalTrimMaterial.dispose();
      terminalScreenMaterial.dispose();
      circuitTraceMaterial.dispose();
      circuitGlowMaterial.dispose();
      amberChemicalMaterial.dispose();
      violetChemicalMaterial.dispose();
      waterMaterial.dispose();
      pipeMaterial.dispose();
      tankMaterial.dispose();
      lampHousingMaterial.dispose();
      lampPanelMaterial.dispose();
      posterFrameMaterial.dispose();
      atomLegendPosterMaterial.dispose();
      cylinderGeometry.dispose();
      beakerGeometry.dispose();
      tubeGeometry.dispose();
      vesselRimGeometry.dispose();
      vesselBaseGeometry.dispose();
      posterGeometry.dispose();
      generatedGeometries.forEach((geometry) => geometry.dispose());
      generatedMaterials.forEach((material) => material.dispose());
      generatedTextures.forEach((texture) => texture.dispose());
      floorTexture?.dispose();
      wallTexture?.dispose();
      ceilingTexture?.dispose();
      doorTexture?.dispose();
      atomLegendPosterTexture?.dispose();
      terminalTexture.dispose();
      renderer.dispose();
    },
  };
}
