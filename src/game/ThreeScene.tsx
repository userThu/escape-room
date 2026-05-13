"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  collidesWithStaticGeometry,
  createAabbCollider,
  type ColliderDefinition,
} from "@/src/game/collision";
import {
  doorDefinitions,
  greyboxBlocks,
  greyboxColliderDefinitions,
} from "@/src/game/greyboxLayout";
import {
  labBoxProps,
  labCylinderProps,
  labLamps,
  labPropColliderDefinitions,
} from "@/src/game/labDecor";
import { molecularStructureDecals } from "@/src/game/molecularStructuresRoom";
import {
  getTargetedInteractable,
  type Interactable,
} from "@/src/game/interactions";
import {
  addInventoryItem,
  completePuzzle,
  getGameState,
  recordResponse,
  selectInventoryItemByIndex,
  unlockDoor,
} from "@/src/state";
import { MolecularPuzzleTerminal } from "@/src/ui/MolecularPuzzleTerminal";

const playerHeight = 1.7;
const playerRadius = 0.35;
const walkSpeed = 4;
const sprintSpeed = 7;
const mouseSensitivity = 0.002;
const maxPitch = Math.PI / 2 - 0.05;
const interactionRange = 3;

type FeedbackMessage = {
  id: number;
  text: string;
  tone: "success" | "failure";
};

// "menu" = showing Play/Instructions buttons
// "instructions" = showing instructions view
// "gone" = start screen dismissed, game running
type StartScreen = "menu" | "instructions" | "gone";

function createCanvasTexture(
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

function createAtomLegendPosterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 704;

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  const atomLegend = [
    { color: "#a66f6f", element: "O", name: "Oxygen" },
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
    const y = 190 + index * 84;

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
  context.fillText("Use this key for H2O, CO2, CH4,", 58, 634);
  context.fillText("O2, and the NaCl lattice.", 58, 666);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

export function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeInterfaceRef = useRef<"notebook" | "molecularPuzzle" | null>(
    null,
  );
  const isPlayerPausedRef = useRef(true); // start paused until Play is clicked
  const rendererCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetedInteractableRef = useRef<Interactable | null>(null);
  const [startScreen, setStartScreen] = useState<StartScreen>("menu");
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const [isMolecularPuzzleOpen, setIsMolecularPuzzleOpen] = useState(false);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(
    null,
  );
  const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>(
    [],
  );

  const showFeedbackMessage = useCallback(
    (text: string, tone: FeedbackMessage["tone"]) => {
      const id = Date.now() + Math.random();

      setFeedbackMessages((messages) => [
        ...messages.slice(-2),
        { id, text, tone },
      ]);

      window.setTimeout(() => {
        setFeedbackMessages((messages) =>
          messages.filter((message) => message.id !== id),
        );
      }, 3200);
    },
    [],
  );

  const releasePointerLock = useCallback(() => {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);

  const requestPointerLockAfterInterface = useCallback(() => {
    if (!rendererCanvasRef.current || document.pointerLockElement) {
      return;
    }

    void rendererCanvasRef.current.requestPointerLock().catch(() => {
      setIsPointerLocked(false);
    });
  }, []);

  const pausePlayerForInterface = useCallback(() => {
    isPlayerPausedRef.current = true;
    setIsSprinting(false);
    setInteractionPrompt(null);
    releasePointerLock();
  }, [releasePointerLock]);

  const resumePlayerFromInterface = useCallback(() => {
    isPlayerPausedRef.current = false;
    activeInterfaceRef.current = null;
    requestPointerLockAfterInterface();
  }, [requestPointerLockAfterInterface]);

  // ── Start screen handlers ────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    setStartScreen("gone");
    isPlayerPausedRef.current = false;
    // Request pointer lock on the canvas
    if (rendererCanvasRef.current) {
      void rendererCanvasRef.current.requestPointerLock().catch(() => {
        setIsPointerLocked(false);
      });
    }
  }, []);

  const handleShowInstructions = useCallback(() => {
    setStartScreen("instructions");
  }, []);

  const handleBackToMenu = useCallback(() => {
    setStartScreen("menu");
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  const openMolecularPuzzle = useCallback(() => {
    activeInterfaceRef.current = "molecularPuzzle";
    pausePlayerForInterface();
    setIsMolecularPuzzleOpen(true);
  }, [pausePlayerForInterface]);

  const closeMolecularPuzzle = useCallback(() => {
    setIsMolecularPuzzleOpen(false);
    resumePlayerFromInterface();
  }, [resumePlayerFromInterface]);

  const completeMolecularPuzzle = useCallback(() => {
    completePuzzle("molecular-structures");
    addInventoryItem({
      id: "molecular-access-card",
      name: "Molecular Access Card",
      description: "A terminal-issued clearance card for molecule verification.",
    });
    recordResponse(
      "molecular-structures",
      "Player correctly matched the observed molecular structures.",
    );
    showFeedbackMessage(
      "Molecular terminal accepted the formulas. Clearance granted.",
      "success",
    );
    closeMolecularPuzzle();
  }, [closeMolecularPuzzle, showFeedbackMessage]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);
    const openedDoorIds = new Set<string>();
    const doorMeshes = new Map<string, THREE.Mesh>();

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, playerHeight, 0);
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererCanvasRef.current = renderer.domElement;
    mount.appendChild(renderer.domElement);

    const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
    const moleculeTextures: THREE.Texture[] = [];
    const moleculeMaterials: THREE.Material[] = [];
    const moleculeGeometries: THREE.BufferGeometry[] = [];
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

    if (floorTexture) {
      floorTexture.repeat.set(3, 3);
    }

    if (wallTexture) {
      wallTexture.repeat.set(2, 2);
    }

    if (ceilingTexture) {
      ceilingTexture.repeat.set(2, 2);
    }

    if (doorTexture) {
      doorTexture.repeat.set(1, 1);
    }

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
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x8ecae6,
      opacity: 0.42,
      roughness: 0.08,
      metalness: 0.02,
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

    const addBoxComponent = (
      group: THREE.Group,
      material: THREE.Material,
      position: [number, number, number],
      scale: [number, number, number],
    ) => {
      const component = new THREE.Mesh(blockGeometry, material);

      component.position.set(position[0], position[1], position[2]);
      component.scale.set(scale[0], scale[1], scale[2]);
      component.castShadow = true;
      component.receiveShadow = true;
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
      component.castShadow = true;
      component.receiveShadow = true;
      group.add(component);

      return component;
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

        addCylinderComponent(
          group,
          tubeGeometry,
          glassMaterial,
          [tubeX, tubeY, position[2]],
          [0.9, 0.66, 0.9],
        );
        addBoxComponent(
          group,
          liquidMaterial,
          [tubeX, tubeY - 0.06, position[2]],
          [0.042, 0.08, 0.042],
        );
      });
    };

    const createLabFurniture = ({
      material,
      size,
    }: (typeof labBoxProps)[number]) => {
      const group = new THREE.Group();
      const width = size[0];
      const height = size[1];
      const depth = size[2];

      if (material === "bench") {
        addBoxComponent(group, benchMaterial, [0, height / 2 - 0.07, 0], [width, 0.16, depth]);
        addBoxComponent(group, metalMaterial, [-width * 0.4, 0, -depth * 0.38], [0.12, height, 0.12]);
        addBoxComponent(group, metalMaterial, [width * 0.4, 0, -depth * 0.38], [0.12, height, 0.12]);
        addBoxComponent(group, metalMaterial, [-width * 0.4, 0, depth * 0.38], [0.12, height, 0.12]);
        addBoxComponent(group, metalMaterial, [width * 0.4, 0, depth * 0.38], [0.12, height, 0.12]);
        addBoxComponent(group, metalMaterial, [0, -height * 0.18, 0], [width * 0.82, 0.08, depth * 0.82]);
        addCylinderComponent(group, beakerGeometry, glassMaterial, [-width * 0.22, height / 2 + 0.16, 0], [1, 1, 1]);
        addBoxComponent(group, amberChemicalMaterial, [-width * 0.22, height / 2 + 0.04, 0], [0.18, 0.1, 0.18]);
        addBoxComponent(group, paperMaterial, [width * 0.22, height / 2 + 0.02, depth * 0.08], [0.5, 0.02, 0.34]);
        addVialRack(group, [width * 0.08, height / 2 + 0.04, -depth * 0.22]);
      } else if (material === "machine") {
        addBoxComponent(group, terminalBodyMaterial, [0, 0, 0], [width, height, depth]);
        addBoxComponent(group, terminalTrimMaterial, [0, height * 0.32, -depth / 2 - 0.03], [width * 0.78, height * 0.34, 0.05]);
        addBoxComponent(group, terminalScreenMaterial, [-width * 0.2, height * 0.34, -depth / 2 - 0.06], [width * 0.22, height * 0.18, 0.035]);
        addBoxComponent(group, blackRubberMaterial, [width * 0.18, height * 0.34, -depth / 2 - 0.06], [width * 0.28, height * 0.05, 0.035]);
        addBoxComponent(group, blackRubberMaterial, [width * 0.18, height * 0.23, -depth / 2 - 0.06], [width * 0.28, height * 0.05, 0.035]);
        addBoxComponent(group, metalMaterial, [0, -height * 0.18, -depth / 2 - 0.04], [width * 0.86, height * 0.04, 0.04]);
        addBoxComponent(group, metalMaterial, [0, -height * 0.02, -depth / 2 - 0.04], [width * 0.86, height * 0.04, 0.04]);
        addCylinderComponent(group, beakerGeometry, glassMaterial, [-width * 0.34, -height * 0.18, -depth * 0.18], [0.75, 0.82, 0.75]);
        addBoxComponent(group, violetChemicalMaterial, [-width * 0.34, -height * 0.26, -depth * 0.18], [0.12, 0.08, 0.12]);
      } else if (material === "metal") {
        addBoxComponent(group, metalMaterial, [0, 0, 0], [width, height * 0.08, depth]);
        addBoxComponent(group, metalMaterial, [0, height * 0.28, 0], [width, height * 0.08, depth]);
        addBoxComponent(group, metalMaterial, [0, -height * 0.28, 0], [width, height * 0.08, depth]);
        addBoxComponent(group, metalMaterial, [-width * 0.45, 0, -depth * 0.4], [0.08, height, 0.08]);
        addBoxComponent(group, metalMaterial, [width * 0.45, 0, -depth * 0.4], [0.08, height, 0.08]);
        addBoxComponent(group, metalMaterial, [-width * 0.45, 0, depth * 0.4], [0.08, height, 0.08]);
        addBoxComponent(group, metalMaterial, [width * 0.45, 0, depth * 0.4], [0.08, height, 0.08]);
        addVialRack(group, [0, height * 0.24+.2, 0]);
      } else {
        addBoxComponent(group, hazardMaterial, [0, 0, 0], [width, height, depth]);
        addBoxComponent(group, blackRubberMaterial, [0, height * 0.22, -depth / 2 - 0.02], [width * 0.72, height * 0.08, 0.04]);
        addBoxComponent(group, blackRubberMaterial, [0, -height * 0.04, -depth / 2 - 0.02], [width * 0.72, height * 0.08, 0.04]);
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
      block.castShadow = kind !== "floor";
      block.receiveShadow = true;
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

    const terminalGroup = new THREE.Group();
    const addTerminalBox = (
      material: THREE.Material,
      position: [number, number, number],
      scale: [number, number, number],
    ) => addBoxComponent(terminalGroup, material, position, scale);

    addTerminalBox(terminalTrimMaterial, [0.14, 0.18, 0], [0.42, 0.36, 0.76]);
    addTerminalBox(terminalBodyMaterial, [0, 0.58, 0], [0.6, 0.72, 1.1]);
    addTerminalBox(terminalTrimMaterial, [-0.33, 0.84, 0], [0.08, 0.58, 0.94]);
    const terminalScreen = addTerminalBox(
      terminalScreenMaterial,
      [-0.38, 0.9, 0],
      [0.04, 0.42, 0.72],
    );
    addTerminalBox(terminalTrimMaterial, [-0.46, 0.46, 0], [0.38, 0.08, 0.88]);
    addTerminalBox(terminalBodyMaterial, [-0.58, 0.5, -0.18], [0.06, 0.06, 0.08]);
    addTerminalBox(terminalBodyMaterial, [-0.58, 0.5, 0], [0.06, 0.06, 0.08]);
    addTerminalBox(terminalBodyMaterial, [-0.58, 0.5, 0.18], [0.06, 0.06, 0.08]);
    terminalGroup.position.set(2.58, 0.65, -7.8);
    scene.add(terminalGroup);

    labCylinderProps.forEach(({ center, depth, material, radius, rotation }) => {
      const prop = new THREE.Mesh(cylinderGeometry, propMaterials[material]);

      prop.position.set(center[0], center[1], center[2]);
      prop.scale.set(radius, depth, radius);
      prop.castShadow = true;
      prop.receiveShadow = true;

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
      housing.receiveShadow = true;
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
    posterGroup.position.set(-2.86, 1.75, -7.8);
    posterGroup.rotation.y = Math.PI / 2;
    scene.add(posterGroup);

    molecularStructureDecals.forEach(
      ({ position, rotation, size, texturePath }) => {
        const texture = textureLoader.load(texturePath);
        const material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
        });
        const decal = new THREE.Mesh(
          new THREE.PlaneGeometry(size[0], size[1]),
          material,
        );

        texture.colorSpace = THREE.SRGBColorSpace;
        moleculeTextures.push(texture);
        moleculeMaterials.push(material);
        moleculeGeometries.push(decal.geometry);
        decal.position.set(position[0], position[1], position[2]);
        decal.rotation.set(rotation[0], rotation[1], rotation[2]);
        scene.add(decal);
      },
    );

    const ambientLight = new THREE.HemisphereLight(0xe0f2fe, 0x1f2937, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(4, 6, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);

    const pressedKeys = new Set<string>();
    const moveDirection = new THREE.Vector3();
    const nextPosition = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const staticColliders = [
      ...greyboxColliderDefinitions,
      ...labPropColliderDefinitions,
      {
        id: "molecular-structures-terminal",
        center: [2.5, 1.33, -7.8],
        size: [0.95, 1.36, 1.35],
      } satisfies ColliderDefinition,
    ].map(createAabbCollider);
    const raycaster = new THREE.Raycaster();
    raycaster.far = interactionRange;
    const doorInteractables: Interactable[] = doorDefinitions.flatMap((door) => {
      const doorMesh = doorMeshes.get(door.id);

      if (!doorMesh) {
        return [];
      }

      return [
        {
          id: door.id,
          object: doorMesh,
          prompt: `Press E to open ${door.label}`,
          interact: () => {
            if (openedDoorIds.has(door.id)) {
              showFeedbackMessage(`${door.label} is already open.`, "success");
              return;
            }

            const gameState = getGameState();
            const hasItems = (door.requirement.inventoryItemIds ?? []).every(
              (itemId) =>
                gameState.inventoryItems.some(({ id }) => id === itemId),
            );
            const hasPuzzles = (door.requirement.puzzleIds ?? []).every(
              (puzzleId) => Boolean(gameState.completedPuzzles[puzzleId]),
            );

            if (!hasItems || !hasPuzzles) {
              showFeedbackMessage(door.failureMessage, "failure");
              return;
            }

            openedDoorIds.add(door.id);
            doorMesh.visible = false;
            doorMesh.raycast = () => {};
            unlockDoor(door.id);

            const colliderIndex = staticColliders.findIndex(
              ({ id }) => id === door.id,
            );

            if (colliderIndex >= 0) {
              staticColliders.splice(colliderIndex, 1);
            }

            showFeedbackMessage(door.successMessage, "success");
          },
        },
      ];
    });
    const interactables: Interactable[] = [
      ...doorInteractables,
      {
        id: "molecular-structures-terminal",
        object: terminalScreen,
        prompt: "Press E to use molecular terminal",
        interact: openMolecularPuzzle,
      },
    ];
    let yaw = 0;
    let pitch = 0;
    let sprinting = false;

    const requestPointerLock = (event: MouseEvent) => {
      if (
        isPlayerPausedRef.current ||
        event.target !== renderer.domElement ||
        document.pointerLockElement === renderer.domElement
      ) {
        return;
      }

      void renderer.domElement.requestPointerLock().catch(() => {
        setIsPointerLocked(false);
      });
    };

    const handlePointerLockChange = () => {
      setIsPointerLocked(document.pointerLockElement === renderer.domElement);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (
        isPlayerPausedRef.current ||
        document.pointerLockElement !== renderer.domElement
      ) {
        return;
      }

      yaw -= event.movementX * mouseSensitivity;
      pitch = THREE.MathUtils.clamp(
        pitch - event.movementY * mouseSensitivity,
        -maxPitch,
        maxPitch,
      );
      camera.rotation.set(pitch, yaw, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Block all keyboard input while start screen is showing
      if (isPlayerPausedRef.current && activeInterfaceRef.current === null) {
        return;
      }

      if (/^Digit[1-9]$/.test(event.code) && !event.repeat) {
        if (isPlayerPausedRef.current) {
          return;
        }

        event.preventDefault();
        selectInventoryItemByIndex(Number(event.code.slice(5)) - 1);
        return;
      }

      if (isPlayerPausedRef.current) {
        return;
      }

      if (
        ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(
          event.code,
        )
      ) {
        event.preventDefault();
      }

      if ((event.code === "ShiftLeft" || event.code === "ShiftRight") && !event.repeat) {
        sprinting = !sprinting;
        setIsSprinting(sprinting);
        return;
      }

      if (event.code === "KeyE" && !event.repeat) {
        event.preventDefault();
        pressedKeys.clear();
        sprinting = false;
        setIsSprinting(false);
        targetedInteractableRef.current?.interact();
        return;
      }

      pressedKeys.add(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.code);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    mount.addEventListener("click", requestPointerLock);
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", handleResize);

    let animationFrameId = 0;
    let previousFrameAt = performance.now();

    const animate = () => {
      const now = performance.now();
      const deltaSeconds = Math.min((now - previousFrameAt) / 1000, 0.1);
      previousFrameAt = now;

      if (isPlayerPausedRef.current) {
        renderer.render(scene, camera);
        animationFrameId = window.requestAnimationFrame(animate);
        return;
      }

      moveDirection.set(0, 0, 0);

      if (pressedKeys.has("KeyW")) moveDirection.z -= 1;
      if (pressedKeys.has("KeyS")) moveDirection.z += 1;
      if (pressedKeys.has("KeyA")) moveDirection.x -= 1;
      if (pressedKeys.has("KeyD")) moveDirection.x += 1;

      if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
        forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        right.set(Math.cos(yaw), 0, -Math.sin(yaw));

        const speed = sprinting ? sprintSpeed : walkSpeed;
        const forwardStep = -moveDirection.z * speed * deltaSeconds;
        const rightStep = moveDirection.x * speed * deltaSeconds;
        const stepX = forward.x * forwardStep + right.x * rightStep;
        const stepZ = forward.z * forwardStep + right.z * rightStep;

        nextPosition.copy(camera.position);
        nextPosition.x += stepX;

        if (
          !collidesWithStaticGeometry(
            nextPosition,
            playerRadius,
            playerHeight,
            staticColliders,
          )
        ) {
          camera.position.x = nextPosition.x;
        }

        nextPosition.copy(camera.position);
        nextPosition.z += stepZ;

        if (
          !collidesWithStaticGeometry(
            nextPosition,
            playerRadius,
            playerHeight,
            staticColliders,
          )
        ) {
          camera.position.z = nextPosition.z;
        }

        camera.position.y = playerHeight;
      }

      const targetedInteractable = getTargetedInteractable(
        camera,
        raycaster,
        interactables,
      );

      if (targetedInteractableRef.current !== targetedInteractable) {
        targetedInteractableRef.current = targetedInteractable;
        setInteractionPrompt(targetedInteractable?.prompt ?? null);
      }

      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      mount.removeEventListener("click", requestPointerLock);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);

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
      blackRubberMaterial.dispose();
      paperMaterial.dispose();
      terminalBodyMaterial.dispose();
      terminalTrimMaterial.dispose();
      terminalScreenMaterial.dispose();
      amberChemicalMaterial.dispose();
      violetChemicalMaterial.dispose();
      pipeMaterial.dispose();
      tankMaterial.dispose();
      lampHousingMaterial.dispose();
      lampPanelMaterial.dispose();
      posterFrameMaterial.dispose();
      atomLegendPosterMaterial.dispose();
      cylinderGeometry.dispose();
      beakerGeometry.dispose();
      tubeGeometry.dispose();
      posterGeometry.dispose();
      moleculeGeometries.forEach((geometry) => geometry.dispose());
      moleculeMaterials.forEach((material) => material.dispose());
      moleculeTextures.forEach((texture) => texture.dispose());
      floorTexture?.dispose();
      wallTexture?.dispose();
      ceilingTexture?.dispose();
      doorTexture?.dispose();
      atomLegendPosterTexture?.dispose();
      terminalTexture.dispose();
      renderer.dispose();
      rendererCanvasRef.current = null;
    };
  }, [openMolecularPuzzle, showFeedbackMessage]);

  const isInterfaceOpen = isMolecularPuzzleOpen;

  return (
    <div ref={mountRef} className="fixed inset-0 cursor-crosshair">
      {/* ── Start Screen Panel ───────────────────────────────────────────── */}
      {startScreen !== "gone" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div
            className="relative w-full max-w-md rounded-lg border border-slate-600/60 bg-slate-900/95 px-10 py-10 shadow-2xl"
            style={{ boxShadow: "0 0 60px rgba(14,165,233,0.08), 0 25px 50px rgba(0,0,0,0.7)" }}
          >
            {/* Thin cyan accent line at top */}
            <div className="absolute left-0 top-0 h-px w-full rounded-t-lg bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />

            {startScreen === "menu" && (
              <>
                {/* Title */}
                <div className="mb-1 text-center">
                  <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-cyan-500/70">
                    Laboratory Escape
                  </p>
                  <h1
                    className="text-4xl font-bold tracking-tight text-slate-100"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.02em" }}
                  >
                    Chemistry Escape
                  </h1>
                  <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-slate-500 to-transparent" />
                </div>

                {/* Buttons */}
                <div className="mt-10 flex flex-col gap-3">
                  <button
                    onClick={handlePlay}
                    className="group relative w-full overflow-hidden rounded border border-cyan-500/40 bg-cyan-950/50 px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-widest text-cyan-300 transition-all duration-200 hover:border-cyan-400/70 hover:bg-cyan-900/60 hover:text-cyan-100 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <span className="relative z-10">▶ Play</span>
                  </button>
                  <button
                    onClick={handleShowInstructions}
                    className="w-full rounded border border-slate-600/50 bg-slate-800/50 px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-widest text-slate-400 transition-all duration-200 hover:border-slate-500/70 hover:bg-slate-700/50 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                  >
                    Instructions
                  </button>
                </div>

                {/* Footer hint */}
                <p className="mt-8 text-center font-mono text-xs text-slate-600">
                  Click Play, then click the screen to lock your cursor
                </p>
              </>
            )}

            {startScreen === "instructions" && (
              <>
                {/* Back button */}
                <button
                  onClick={handleBackToMenu}
                  className="mb-6 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-300 focus:outline-none"
                >
                  <span>←</span>
                  <span>Back</span>
                </button>

                {/* Story */}
                <p className="text-sm leading-relaxed text-slate-300">
                  You have found yourself lost in an abandoned science laboratory
                  whose doors are all locked, requiring strange mechanisms to open.
                  Fortunately, as an expert chemist, these symbols and puzzles seem
                  familiar and may even be solvable. Use your knowledge to escape
                  from this predicament!
                </p>

                {/* Divider */}
                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-700/80" />
                  <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
                    How to Play
                  </span>
                  <div className="h-px flex-1 bg-slate-700/80" />
                </div>

                {/* Keybinds */}
                <div className="flex flex-col gap-3">
                  {[
                    { key: "WASD", desc: "Move around the world" },
                    { key: "Shift", desc: "Sprint to move faster" },
                    { key: "E", desc: "Interact with objects" },
                    { key: "J", desc: "Open your journal" },
                  ].map(({ key, desc }) => (
                    <div key={key} className="flex items-center gap-4">
                      <kbd
                        className="min-w-[3rem] rounded border border-slate-600 bg-slate-800 px-2.5 py-1 text-center font-mono text-xs font-bold text-slate-200 shadow-sm"
                        style={{ boxShadow: "0 2px 0 rgba(0,0,0,0.5)" }}
                      >
                        {key}
                      </kbd>
                      <span className="text-sm text-slate-400">{desc}</span>
                    </div>
                  ))}
                </div>

                {/* Play from instructions */}
                <button
                  onClick={handlePlay}
                  className="mt-8 w-full rounded border border-cyan-500/40 bg-cyan-950/50 px-6 py-3 font-mono text-sm font-semibold uppercase tracking-widest text-cyan-300 transition-all duration-200 hover:border-cyan-400/70 hover:bg-cyan-900/60 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  ▶ Play
                </button>
              </>
            )}

            {/* Thin cyan accent line at bottom */}
            <div className="absolute bottom-0 left-0 h-px w-full rounded-b-lg bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          </div>
        </div>
      )}

      {/* ── In-game overlay elements (only shown once game started) ─────── */}
      {startScreen === "gone" && (
        <>
          {isInterfaceOpen ? (
            <div className="pointer-events-none fixed inset-0 z-10 bg-black/55" />
          ) : null}
          <div className="pointer-events-none fixed left-1/2 top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-white/70" />
            <div className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-white/70" />
          </div>
          {interactionPrompt ? (
            <div className="pointer-events-none fixed left-1/2 top-[calc(50%+2rem)] z-10 -translate-x-1/2 rounded border border-white/15 bg-black/45 px-3 py-2 text-sm font-medium text-white/90 backdrop-blur">
              {interactionPrompt}
            </div>
          ) : null}
          <div className="pointer-events-none fixed left-6 top-32 z-20 flex max-w-sm flex-col gap-2">
            {feedbackMessages.map((message) => (
              <div
                className={`animate-feedback-fade rounded border px-4 py-3 text-sm shadow-lg backdrop-blur ${
                  message.tone === "success"
                    ? "border-emerald-300/30 bg-emerald-950/70 text-emerald-100"
                    : "border-red-300/30 bg-red-950/70 text-red-100"
                }`}
                key={message.id}
              >
                {message.text}
              </div>
            ))}
          </div>
        </>
      )}

      <MolecularPuzzleTerminal
        isOpen={isMolecularPuzzleOpen}
        onClose={closeMolecularPuzzle}
        onComplete={completeMolecularPuzzle}
      />
    </div>
  );
}