"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { collidesWithStaticGeometry } from "@/src/game/collision";
import { doorDefinitions } from "@/src/game/greyboxLayout";
import {
  getTargetedInteractable,
  type Interactable,
} from "@/src/game/interactions";
import { molecularPlaques } from "@/src/game/molecularStructuresRoom";
import { buildGameWorld } from "@/src/game/rendering/worldBuilder";
import { createMoleculePlaqueTexture } from "@/src/game/rendering/textures";
import {
  addInventoryItem,
  addLabNotebookEntry,
  completePuzzle,
  enableFinalMatterParticleDisplays,
  getGameState,
  type InventoryItem,
  grantFinalMatterAccess,
  insertFinalMatterReactorItem,
  loadEvidenceReactant,
  markEvidencePressureTestComplete,
  markEvidenceVerified,
  recordResponse,
  removeInventoryItem,
  retrieveFinalMatterReactorItem,
  selectInventoryItemByIndex,
  stabilizeFinalMatterReactorChamber,
  type FinalMatterChamberId,
  unlockDoor,
} from "@/src/state";
import { GameHud } from "@/src/ui/GameHud";

const playerHeight = 1.7;
const playerRadius = 0.35;
const walkSpeed = 4;
const sprintSpeed = 7;
const mouseSensitivity = 0.002;
const maxPitch = Math.PI / 2 - 0.05;
const interactionRange = 3;
const finalMatterChamberRequirements: Record<FinalMatterChamberId, string[]> = {
  bubble: ["baking_soda_cartridge", "vinegar_cartridge"],
  sieve: ["sand_cartridge", "water_cartridge"],
  spiral: ["sugar_cartridge", "water_cartridge"],
};

const finalMatterInventoryItems: Partial<Record<string, InventoryItem>> = {
  baking_soda_cartridge: {
    id: "baking_soda_cartridge",
    name: "Baking Soda Cartridge",
    description: "A sealed baking soda sample cartridge for the Evidence Lab.",
  },
  sand_cartridge: {
    id: "sand_cartridge",
    name: "Sand Cartridge",
    description: "A sealed sand sample cartridge for the Evidence Lab.",
  },
  sugar_cartridge: {
    id: "sugar_cartridge",
    name: "Sugar Cartridge",
    description: "A sealed sugar sample cartridge for the Evidence Lab.",
  },
  vinegar_cartridge: {
    id: "vinegar_cartridge",
    name: "Vinegar Cartridge",
    description: "A sealed vinegar sample cartridge for the Evidence Lab.",
  },
  water_cartridge: {
    id: "water_cartridge",
    name: "Water Cartridge",
    description:
      "A sealed cartridge of distilled water for the evidence-lab analysis station.",
  },
};

type FeedbackMessage = {
  id: number;
  text: string;
  tone: "success" | "failure";
};

type PlacedMolecularPlaque = {
  formula: string;
  item: InventoryItem;
  kind: string;
  slotId: string;
};

type ActiveInterface = "notebook" | null;
type StartScreen = "menu" | "instructions" | "gone";

export function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeInterfaceRef = useRef<ActiveInterface>(null);
  const isPlayerPausedRef = useRef(true);
  const rendererCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playStartedAtRef = useRef<number | null>(null);
  const targetedInteractableRef = useRef<Interactable | null>(null);
  const [startScreen, setStartScreen] = useState<StartScreen>("menu");
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [escapeSeconds, setEscapeSeconds] = useState<number | null>(null);
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
      }, 6500);
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

    void rendererCanvasRef.current.requestPointerLock().catch(() => {});
  }, []);

  const pausePlayerForInterface = useCallback(() => {
    isPlayerPausedRef.current = true;
    setInteractionPrompt(null);
    releasePointerLock();
  }, [releasePointerLock]);

  const resumePlayerFromInterface = useCallback(() => {
    isPlayerPausedRef.current = false;
    activeInterfaceRef.current = null;
    requestPointerLockAfterInterface();
  }, [requestPointerLockAfterInterface]);

  const handlePlay = useCallback(() => {
    playStartedAtRef.current = performance.now();
    setEscapeSeconds(null);
    setStartScreen("gone");
    isPlayerPausedRef.current = false;

    if (rendererCanvasRef.current) {
      void rendererCanvasRef.current.requestPointerLock().catch(() => {});
    }
  }, []);

  const openNotebook = useCallback(() => {
    activeInterfaceRef.current = "notebook";
    pausePlayerForInterface();
    setIsNotebookOpen(true);
  }, [pausePlayerForInterface]);

  const closeNotebook = useCallback(() => {
    setIsNotebookOpen(false);
    resumePlayerFromInterface();
  }, [resumePlayerFromInterface]);

  const completeMolecularPuzzle = useCallback(() => {
    const wasAlreadyCompleted = Boolean(
      getGameState().completedPuzzles["molecular-structures"],
    );

    completePuzzle("molecular-structures");

    if (!wasAlreadyCompleted) {
      // Stage 1 reward: particle_lens unlocks the evidence-lab analysis station.
      addInventoryItem({
        id: "particle_lens",
        name: "Particle Lens",
        description:
          "A precision optical insert issued by the molecular board. Required to activate the evidence-lab station.",
      });
      // Stage 1 also seeds the first cartridge so the player can begin lab work.
      addInventoryItem({
        id: "water_cartridge",
        name: "Water Cartridge",
        description: "A sealed cartridge of distilled water for the evidence-lab analysis station.",
      });
      addLabNotebookEntry(
        "Particle Lens — Field Notes",
        "The molecular board issued a Particle Lens alongside the water cartridge. " +
          "When held up to the viewer port on the final door, the lens refracts the " +
          "internal beam and projects a before/after particle diagram onto the frosted " +
          "panel — showing the substance's particle arrangement before separation and " +
          "its purified state after. Match both diagrams to the reference chart to " +
          "confirm the correct separation sequence and release the door lock.",
      );
    }
    recordResponse(
      "molecular-structures",
      "Player correctly placed the molecule plaques into the formula board.",
    );
    showFeedbackMessage(
      "The formula board unlocks molecular clearance.",
      "success",
    );
  }, [showFeedbackMessage]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const world = buildGameWorld(mount, { playerHeight });
    const {
      cabinetDoors,
      camera,
      doorMeshes,
      evidenceLabMachine,
      evidenceLabTargets,
      finalMatterReactor,
      molecularPlaqueTargets,
      molecularSubmitLever,
      molecularSlotTargets,
      renderer,
      scene,
      staticColliders,
      waterBeaker,
    } = world;

    rendererCanvasRef.current = renderer.domElement;
    scene.add(camera);

    const openedDoorIds = new Set<string>();
    const placedMolecularSlots = new Map<string, PlacedMolecularPlaque>();
    const raycaster = new THREE.Raycaster();
    raycaster.far = interactionRange;
    const heldItemGroup = new THREE.Group();
    const heldItemPivot = new THREE.Group();
    const heldBodyGeometry = new THREE.BoxGeometry(0.34, 0.24, 0.045);
    const heldFaceGeometry = new THREE.PlaneGeometry(0.3, 0.2);
    const heldCartridgeGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.32, 16);
    const heldCartridgeCapGeometry = new THREE.CylinderGeometry(0.062, 0.062, 0.045, 16);
    const heldLensDiscGeometry = new THREE.CylinderGeometry(0.14, 0.14, 0.025, 24);
    const heldLensRingGeometry = new THREE.TorusGeometry(0.105, 0.012, 8, 28);
    const heldLensTraceGeometry = new THREE.BoxGeometry(0.15, 0.01, 0.012);
    const heldBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.52,
      metalness: 0.25,
    });
    const heldGenericMaterial = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x0f172a,
      roughness: 0.35,
      metalness: 0.12,
    });
    const heldCartridgeShellMaterial = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.45,
      metalness: 0.15,
    });
    const heldCartridgeCapMaterial = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      roughness: 0.35,
      metalness: 0.25,
    });
    const heldLensBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x172033,
      roughness: 0.34,
      metalness: 0.55,
    });
    const heldLensCircuitMaterial = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x075985,
      emissiveIntensity: 0.8,
      roughness: 0.22,
      metalness: 0.2,
    });
    const heldBody = new THREE.Mesh(heldBodyGeometry, heldBodyMaterial);
    const heldFace = new THREE.Mesh(
      heldFaceGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );
    const heldGenericGeometry = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 18);
    const heldGeneric = new THREE.Mesh(heldGenericGeometry, heldGenericMaterial);
    const heldCartridge = new THREE.Group();
    const heldLens = new THREE.Group();
    const heldCartridgeBody = new THREE.Mesh(
      heldCartridgeGeometry,
      heldCartridgeShellMaterial,
    );
    const heldCartridgeTop = new THREE.Mesh(
      heldCartridgeCapGeometry,
      heldCartridgeCapMaterial,
    );
    const heldCartridgeBottom = new THREE.Mesh(
      heldCartridgeCapGeometry,
      heldCartridgeCapMaterial,
    );
    const heldLensDisc = new THREE.Mesh(heldLensDiscGeometry, heldLensBodyMaterial);
    const heldLensRing = new THREE.Mesh(heldLensRingGeometry, heldLensCircuitMaterial);
    const heldLensTraceA = new THREE.Mesh(heldLensTraceGeometry, heldLensCircuitMaterial);
    const heldLensTraceB = new THREE.Mesh(heldLensTraceGeometry, heldLensCircuitMaterial);
    const cartridgeAccentColors: Record<string, number> = {
      baking_soda_cartridge: 0x60a5fa,
      sand_cartridge: 0xa16207,
      sugar_cartridge: 0xfacc15,
      vinegar_cartridge: 0xef4444,
      water_cartridge: 0x38bdf8,
    };
    const plaqueKindsByItemId = new Map(
      molecularPlaques.map((plaque) => [plaque.id, plaque.kind]),
    );
    let selectedHeldItemId: string | null = null;

    heldItemGroup.position.set(0.42, -0.32, -0.9);
    heldItemGroup.visible = false;
    heldFace.position.z = 0.026;
    heldGeneric.visible = false;
    heldGeneric.rotation.x = Math.PI / 2;
    heldCartridgeBody.rotation.z = Math.PI / 2;
    heldCartridgeTop.rotation.z = Math.PI / 2;
    heldCartridgeBottom.rotation.z = Math.PI / 2;
    heldCartridgeTop.position.x = 0.18;
    heldCartridgeBottom.position.x = -0.18;
    heldCartridge.add(heldCartridgeBody, heldCartridgeTop, heldCartridgeBottom);
    heldCartridge.visible = false;
    heldLensDisc.rotation.x = Math.PI / 2;
    heldLensRing.rotation.x = Math.PI / 2;
    heldLensRing.position.z = 0.018;
    heldLensTraceA.position.z = 0.036;
    heldLensTraceB.position.z = 0.038;
    heldLensTraceB.rotation.z = Math.PI / 2;
    heldLens.add(heldLensDisc, heldLensRing, heldLensTraceA, heldLensTraceB);
    heldLens.visible = false;
    heldItemPivot.add(heldBody, heldFace, heldGeneric, heldCartridge, heldLens);
    heldItemGroup.add(heldItemPivot);
    camera.add(heldItemGroup);

    const updateHeldItemVisual = () => {
      const gameState = getGameState();
      const selectedItemId = gameState.selectedInventoryItemId;

      if (selectedItemId === selectedHeldItemId) {
        return;
      }

      selectedHeldItemId = selectedItemId;

      if (heldFace.material instanceof THREE.MeshBasicMaterial) {
        heldFace.material.map?.dispose();
        heldFace.material.dispose();
      }

      const plaqueKind = selectedItemId
        ? plaqueKindsByItemId.get(selectedItemId)
        : null;

      if (plaqueKind) {
        heldFace.material = new THREE.MeshBasicMaterial({
          map: createMoleculePlaqueTexture(plaqueKind),
          side: THREE.DoubleSide,
          transparent: true,
        });
        heldBody.visible = true;
        heldFace.visible = true;
        heldGeneric.visible = false;
        heldCartridge.visible = false;
        heldLens.visible = false;
        heldItemGroup.visible = true;
        return;
      }

      if (selectedItemId) {
        const cartridgeColor = cartridgeAccentColors[selectedItemId];

        heldBody.visible = false;
        heldFace.visible = false;
        heldGeneric.visible = !cartridgeColor && selectedItemId !== "particle_lens";
        heldCartridge.visible = Boolean(cartridgeColor);
        heldLens.visible = selectedItemId === "particle_lens";

        if (cartridgeColor) {
          heldCartridgeCapMaterial.color.setHex(cartridgeColor);
        }

        heldItemGroup.visible = true;
        return;
      }

      heldBody.visible = false;
      heldFace.visible = false;
      heldGeneric.visible = false;
      heldCartridge.visible = false;
      heldLens.visible = false;
      heldItemGroup.visible = false;
    };

    const doorInteractables = doorDefinitions.flatMap<Interactable>((door) => {
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
            const reactorChambers = Object.values(
              gameState.finalMatterReactor.chambers,
            );
            const hasItems =
              door.id === "final-door"
                ? true
                : (door.requirement.inventoryItemIds ?? []).every((itemId) =>
                    gameState.inventoryItems.some(({ id }) => id === itemId),
                  );
            const hasPuzzles =
              door.id === "final-door"
                ? reactorChambers.every(({ stabilized }) => stabilized)
                : (door.requirement.puzzleIds ?? []).every((puzzleId) =>
                    Boolean(gameState.completedPuzzles[puzzleId]),
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

            if (door.id === "final-door") {
              const startedAt = playStartedAtRef.current ?? performance.now();

              pressedKeys.clear();
              sprinting = false;
              isPlayerPausedRef.current = true;
              releasePointerLock();
              setInteractionPrompt(null);
              setEscapeSeconds((performance.now() - startedAt) / 1000);
            }

            showFeedbackMessage(door.successMessage, "success");
          },
        },
      ];
    });
    const syncFinalMatterReactorVisuals = () => {
      const { finalMatterReactor: reactorState } = getGameState();

      (Object.keys(reactorState.chambers) as FinalMatterChamberId[]).forEach(
        (chamberId) => {
          finalMatterReactor.setChamberState(
            chamberId,
            reactorState.chambers[chamberId],
          );
        },
      );
      finalMatterReactor.setDoorLocked(!reactorState.finalAccessGranted);
      finalMatterReactor.setParticleDisplaysEnabled(
        reactorState.particleDisplaysEnabled,
      );
    };

    syncFinalMatterReactorVisuals();

    const interactables: Interactable[] = [
      ...doorInteractables,
      {
        id: "final-matter-reactor-particle-display",
        object: finalMatterReactor.displayTarget,
        prompt: "The terminal seems to accept something..",
        interact: () => {
          const gameState = getGameState();

          if (gameState.finalMatterReactor.particleDisplaysEnabled) {
            showFeedbackMessage("Particle displays are already online.", "success");
            return;
          }

          const selectedItem = gameState.inventoryItems.find(
            ({ id }) => id === gameState.selectedInventoryItemId,
          );

          if (selectedItem?.id !== "particle_lens") {
            showFeedbackMessage(
              "The offline particle displays require the Particle Lens.",
              "failure",
            );
            return;
          }

          removeInventoryItem(selectedItem.id);
          enableFinalMatterParticleDisplays();
          recordResponse(
            "final-matter-reactor",
            "Inserted the Particle Lens and restored final-door particle displays.",
          );
          showFeedbackMessage(
            "Particle Lens inserted. Final-door particle displays are online.",
            "success",
          );
          syncFinalMatterReactorVisuals();
        },
      },
      ...finalMatterReactor.slotTargets.map<Interactable>((slot) => ({
        id: slot.id,
        object: slot.object,
        prompt: `Press E to use ${slot.label}`,
        interact: () => {
          const gameState = getGameState();
          const chamber = gameState.finalMatterReactor.chambers[slot.chamberId];
          const chamberName = slot.label.split(" slot ")[0];
          const placedItemId = chamber.slots[slot.slotIndex];

          if (chamber.stabilized) {
            showFeedbackMessage(`${slot.label.split(" slot ")[0]} is already stabilized.`, "success");
            return;
          }

          if (placedItemId) {
            const retrievedItemId = retrieveFinalMatterReactorItem(
              slot.chamberId,
              slot.slotIndex,
            );

            if (retrievedItemId && retrievedItemId !== "water_cartridge") {
              addInventoryItem(
                finalMatterInventoryItems[retrievedItemId] ?? {
                  id: retrievedItemId,
                  name: retrievedItemId.replaceAll("_", " "),
                },
              );
            }

            recordResponse(
              "final-matter-reactor",
              `Retrieved ${retrievedItemId ?? placedItemId} from the ${slot.chamberId} chamber.`,
            );
            showFeedbackMessage(`${chamberName} releases ${retrievedItemId ?? placedItemId}.`, "success");
            syncFinalMatterReactorVisuals();
            return;
          }

          const selectedItem = gameState.inventoryItems.find(
            ({ id }) => id === gameState.selectedInventoryItemId,
          );

          if (!selectedItem) {
            showFeedbackMessage(
              "Select an inventory item before loading the Matter Reactor.",
              "failure",
            );
            return;
          }

          if (!finalMatterInventoryItems[selectedItem.id]) {
            showFeedbackMessage(
              "Incorrect material for the Matter Reactor.",
              "failure",
            );
            return;
          }

          insertFinalMatterReactorItem(
            slot.chamberId,
            slot.slotIndex,
            selectedItem.id,
          );

          if (selectedItem.id !== "water_cartridge") {
            removeInventoryItem(selectedItem.id);
          }

          recordResponse(
            "final-matter-reactor",
            `Loaded ${selectedItem.id} into the ${slot.chamberId} chamber.`,
          );

          const updatedState = getGameState();
          const updatedChamber =
            updatedState.finalMatterReactor.chambers[slot.chamberId];
          const requiredToken = finalMatterChamberRequirements[slot.chamberId];
          const loadedPair = [...updatedChamber.slots].sort().join("+");
          const requiredPair = [...requiredToken].sort().join("+");

          if (
            updatedChamber.slots.every(Boolean) &&
            loadedPair === requiredPair
          ) {
            stabilizeFinalMatterReactorChamber(slot.chamberId);
            recordResponse(
              "final-matter-reactor",
              `Stabilized the ${slot.chamberId} chamber with ${requiredPair}.`,
            );
            showFeedbackMessage(`${chamberName} stabilizes.`, "success");
          } else if (updatedChamber.slots.every(Boolean)) {
            showFeedbackMessage(
              "Incorrect pairing. Press E on a filled slot to retrieve its material.",
              "failure",
            );
          } else {
            showFeedbackMessage(`${selectedItem.name} locks into ${chamberName}.`, "success");
          }

          const latestState = getGameState();
          const allChambersStable = (
            Object.keys(
              latestState.finalMatterReactor.chambers,
            ) as FinalMatterChamberId[]
          ).every(
            (chamberId) =>
              latestState.finalMatterReactor.chambers[chamberId].stabilized,
          );

          if (
            allChambersStable &&
            !latestState.finalMatterReactor.finalAccessGranted
          ) {
            grantFinalMatterAccess();
            completePuzzle("final-matter-reactor");
            addInventoryItem({
              id: "final_access",
              name: "Final Access",
              description:
                "A synchronized access signature from the Final Door Matter Reactor.",
            });
            recordResponse(
              "final-matter-reactor",
              "All chambers stabilized and final access was granted.",
            );
            showFeedbackMessage(
              "All Matter Reactor chambers stabilize. Final Access granted.",
              "success",
            );
          }

          syncFinalMatterReactorVisuals();
        },
      })),
      ...molecularPlaqueTargets.map<Interactable>((plaque) => ({
        id: plaque.id,
        object: plaque.object,
        prompt: "Press E to collect molecule plaque",
        interact: () => {
          const alreadyCollected = getGameState().inventoryItems.some(
            ({ id }) => id === plaque.item.id,
          );

          if (alreadyCollected) {
            showFeedbackMessage("That plaque is already in your inventory.", "success");
            return;
          }

          plaque.collect();
          addInventoryItem(plaque.item);
          recordResponse("molecular-plaque-collection", `Collected ${plaque.item.name}.`);
          showFeedbackMessage(`${plaque.item.name} added to inventory.`, "success");
        },
      })),
      ...molecularSlotTargets.map<Interactable>((slot) => ({
        id: slot.id,
        object: slot.object,
        prompt: `Press E to place or retrieve plaque in ${slot.formula}`,
        interact: () => {
          const placedPlaque = placedMolecularSlots.get(slot.id);

          if (placedPlaque) {
            slot.clearPlaque();
            placedMolecularSlots.delete(slot.id);
            addInventoryItem(placedPlaque.item);
            recordResponse(
              "molecular-structure-board",
              `Retrieved ${placedPlaque.item.name} from the ${slot.formula} slot.`,
            );
            showFeedbackMessage(`${placedPlaque.item.name} returned to inventory.`, "success");
            return;
          }

          const gameState = getGameState();
          const selectedItem = gameState.inventoryItems.find(
            ({ id }) => id === gameState.selectedInventoryItemId,
          );
          const selectedPlaque = molecularPlaqueTargets.find(
            ({ item }) => item.id === selectedItem?.id,
          );

          if (!selectedItem || !selectedPlaque) {
            showFeedbackMessage("Select a molecule plaque before using the board.", "failure");
            return;
          }

          slot.placePlaque(selectedPlaque.kind);
          placedMolecularSlots.set(slot.id, {
            formula: selectedPlaque.formula,
            item: selectedItem,
            kind: selectedPlaque.kind,
            slotId: slot.id,
          });
          removeInventoryItem(selectedItem.id);
          recordResponse(
            "molecular-structure-board",
            `Placed ${selectedItem.name} in the ${slot.formula} slot for verification.`,
          );
          showFeedbackMessage(`${selectedItem.name} rests in the ${slot.formula} slot.`, "success");
        },
      })),
      {
        id: "molecular-board-submit-lever",
        object: molecularSubmitLever.object,
        prompt: "Press E to pull verification lever",
        interact: () => {
          molecularSubmitLever.pull();

          if (placedMolecularSlots.size < molecularSlotTargets.length) {
            showFeedbackMessage("The board refuses to run: every slot must be filled.", "failure");
            return;
          }

          const isCorrect = molecularSlotTargets.every((slot) => {
            const placed = placedMolecularSlots.get(slot.id);

            return placed?.formula === slot.formula;
          });

          if (!isCorrect) {
            placedMolecularSlots.forEach(({ item }, slotId) => {
              addInventoryItem(item);
              molecularSlotTargets
                .find((slot) => slot.id === slotId)
                ?.clearPlaque();
            });
            placedMolecularSlots.clear();
            recordResponse(
              "molecular-structure-board",
              "Submitted an incorrect molecule plaque arrangement.",
            );
            showFeedbackMessage("The board buzzes and ejects the plaques back to inventory.", "failure");
            return;
          }

          recordResponse(
            "molecular-structure-board",
            "Submitted the correct molecule plaque arrangement.",
          );
          showFeedbackMessage(
            "Molecular board solved. New lab note added: the Particle Lens reveals before/after particle diagrams at the final door.",
            "success",
          );
          completeMolecularPuzzle();
        },
      },
      ...evidenceLabTargets.map((target) => ({
        id: target.id,
        object: target.object,
        prompt: target.item
          ? `Press E to collect ${target.label}`
          : `Press E to inspect ${target.label}`,
        interact: () => {
          if (target.item) {
            const alreadyCollected = getGameState().inventoryItems.some(
              ({ id }) => id === target.item?.id,
            );

            if (alreadyCollected) {
              showFeedbackMessage(`${target.label} is already in your inventory.`, "success");
              return;
            }

            target.collect?.();
            addInventoryItem(target.item);
            recordResponse("evidence-lab", `Collected ${target.label}.`);
            showFeedbackMessage(`${target.label} added to inventory.`, "success");
            return;
          }

          if (target.id === "evidence-lab-sealed-reaction-tube") {
            const gameState = getGameState();

            if (gameState.evidenceLab.evidenceVerified) {
              showFeedbackMessage("Evidence already verified.", "success");
              return;
            }

            const selectedItem = gameState.inventoryItems.find(
              ({ id }) => id === gameState.selectedInventoryItemId,
            );

            if (
              !selectedItem ||
              !["vinegar_cartridge", "baking_soda_cartridge"].includes(
                selectedItem.id,
              )
            ) {
              showFeedbackMessage(
                "Select vinegar or baking soda cartridge to load the tube.",
                "failure",
              );
              return;
            }

            const reactantKey =
              selectedItem.id === "vinegar_cartridge"
                ? "vinegar"
                : "bakingSoda";

            if (gameState.evidenceLab.loadedReactants[reactantKey]) {
              showFeedbackMessage(`${selectedItem.name} is already locked into the tube.`, "success");
              return;
            }

            loadEvidenceReactant(reactantKey);
            recordResponse(
              "evidence-lab",
              `Locked ${selectedItem.id} into the sealed reaction tube.`,
            );
            showFeedbackMessage(`${selectedItem.name} seats into the tube clamp.`, "success");
            return;
          }

          if (target.id === "evidence-lab-evidence-engine") {
            const gameState = getGameState();

            if (gameState.evidenceLab.evidenceVerified) {
              showFeedbackMessage("Evidence already verified.", "success");
              return;
            }

            if (!gameState.evidenceLab.pressureTestComplete) {
              showFeedbackMessage("Tube not tested yet.", "failure");
              return;
            }

            const selectedItem = gameState.inventoryItems.find(
              ({ id }) => id === gameState.selectedInventoryItemId,
            );

            if (selectedItem?.id !== "bubble_evidence_token") {
              showFeedbackMessage("No evidence token available.", "failure");
              return;
            }

            removeInventoryItem(selectedItem.id);
            addInventoryItem({
              id: "bubble_token",
              name: "Bubble Token",
              description: "A verified token stamped with rising bubbles from the Evidence Lab reaction.",
            });
            markEvidenceVerified();
            completePuzzle("evidence-lab");
            addLabNotebookEntry(
              "Evidence Lab — Gas Production",
              "Gas production/bubbles indicate that a chemical reaction may have occurred because a new substance formed.",
            );
            recordResponse(
              "evidence-lab",
              "Verified bubble evidence token in the Evidence Engine.",
            );
            showFeedbackMessage("Evidence Engine verifies the gas evidence. Bubble Token awarded.", "success");
            return;
          }

          if (target.id === "evidence-lab-pressure-gauge") {
            const gameState = getGameState();

            if (gameState.evidenceLab.evidenceVerified) {
              showFeedbackMessage("Evidence already verified.", "success");
              return;
            }

            if (!gameState.evidenceLab.loadedReactants.vinegar) {
              showFeedbackMessage("Missing vinegar.", "failure");
              return;
            }

            if (!gameState.evidenceLab.loadedReactants.bakingSoda) {
              showFeedbackMessage("Missing baking soda.", "failure");
              return;
            }

            if (gameState.evidenceLab.pressureTestComplete) {
              showFeedbackMessage("Pressure test already complete. Take the evidence token to the Evidence Engine.", "success");
              return;
            }

            evidenceLabMachine.activateReaction();
            markEvidencePressureTestComplete();
            addInventoryItem({
              id: "bubble_evidence_token",
              name: "Bubble Evidence Token",
              description: "Unverified evidence from the pressure test: bubbling gas collected from the sealed tube.",
            });
            recordResponse(
              "evidence-lab",
              "Ran the pressure test after loading vinegar and baking soda; bubbles formed and pressure rose.",
            );
            showFeedbackMessage("Pressure test complete: bubbles detected, pressure high, evidence token released.", "success");
            return;
          }

          showFeedbackMessage(`${target.label} is installed as a placeholder object.`, "success");
        },
      })),
      // evidence-lab-chamber and evidence-lab-lens-slot are temporarily disabled.
      ...cabinetDoors.map<Interactable>((door) => ({
        id: door.id,
        object: door.object,
        prompt: `Press E to open/close ${door.label}`,
        interact: () => {
          const isOpen = door.toggle();

          recordResponse(
            "east-room-cabinet",
            `${isOpen ? "opened" : "closed"} ${door.label}.`,
          );
          showFeedbackMessage(
            `${door.label} swings ${isOpen ? "open" : "closed"}.`,
            "success",
          );
        },
      })),
      {
        id: "evidence-lab-water-cartridge",
        object: waterBeaker,
        prompt: "Press E to collect Water Cartridge",
        interact: () => {
          const hasWater = getGameState().inventoryItems.some(
            ({ id }) => id === "water_cartridge",
          );

          if (hasWater) {
            showFeedbackMessage("You already collected the water cartridge.", "success");
            return;
          }

          waterBeaker.visible = false;
          const waterLiquid = waterBeaker.userData.linkedLiquid;
          if (waterLiquid instanceof THREE.Object3D) {
            waterLiquid.visible = false;
          }
          const glassDetails = waterBeaker.userData.glassDetails;
          if (Array.isArray(glassDetails)) {
            glassDetails.forEach((detail) => {
              if (detail instanceof THREE.Object3D) {
                detail.visible = false;
              }
            });
          }
          waterBeaker.raycast = () => {};
          addInventoryItem({
            id: "water_cartridge",
            name: "Water Cartridge",
            description: "A sealed cartridge of distilled water for the evidence-lab analysis station.",
          });
          recordResponse("evidence-lab", "Collected the water cartridge.");
          showFeedbackMessage("Collected Water Cartridge.", "success");
        },
      },
    ];

    const pressedKeys = new Set<string>();
    const moveDirection = new THREE.Vector3();
    const nextPosition = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    let yaw = 0;
    let pitch = 0;
    let sprinting = false;
    const interactableObjects = interactables.map(({ object }) => object);

    const requestPointerLock = (event: MouseEvent) => {
      if (
        isPlayerPausedRef.current ||
        event.target !== renderer.domElement ||
        document.pointerLockElement === renderer.domElement
      ) {
        return;
      }

      void renderer.domElement.requestPointerLock().catch(() => {});
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
      if (isPlayerPausedRef.current && activeInterfaceRef.current === null) {
        return;
      }

      if (event.code === "KeyJ" && !event.repeat) {
        event.preventDefault();

        if (activeInterfaceRef.current === "notebook") {
          closeNotebook();
        } else if (isPlayerPausedRef.current) {
          return;
        } else {
          pressedKeys.clear();
          sprinting = false;
          openNotebook();
        }

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

      if (
        (event.code === "ShiftLeft" || event.code === "ShiftRight") &&
        !event.repeat
      ) {
        sprinting = !sprinting;
        return;
      }

      if (event.code === "KeyE" && !event.repeat) {
        event.preventDefault();
        pressedKeys.clear();
        sprinting = false;
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
      evidenceLabMachine.update(now / 1000);
      updateHeldItemVisual();

      if (heldItemGroup.visible) {
        const elapsedSeconds = now / 1000;

        heldItemGroup.position.y = -0.32 + Math.sin(elapsedSeconds * 2.2) * 0.035;
        heldItemPivot.rotation.y += deltaSeconds * 0.55;
        heldItemPivot.rotation.z = Math.sin(elapsedSeconds * 1.6) * 0.08;
      }

      if (!isPlayerPausedRef.current) {
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
          interactableObjects,
        );

        if (targetedInteractableRef.current !== targetedInteractable) {
          targetedInteractableRef.current = targetedInteractable;
          setInteractionPrompt(targetedInteractable?.prompt ?? null);
        }
      }

      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      mount.removeEventListener("click", requestPointerLock);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      camera.remove(heldItemGroup);
      heldBodyGeometry.dispose();
      heldFaceGeometry.dispose();
      heldGenericGeometry.dispose();
      heldCartridgeGeometry.dispose();
      heldCartridgeCapGeometry.dispose();
      heldLensDiscGeometry.dispose();
      heldLensRingGeometry.dispose();
      heldLensTraceGeometry.dispose();
      heldBodyMaterial.dispose();
      heldGenericMaterial.dispose();
      heldCartridgeShellMaterial.dispose();
      heldCartridgeCapMaterial.dispose();
      heldLensBodyMaterial.dispose();
      heldLensCircuitMaterial.dispose();
      if (heldFace.material instanceof THREE.MeshBasicMaterial) {
        heldFace.material.map?.dispose();
        heldFace.material.dispose();
      }
      world.dispose();
      rendererCanvasRef.current = null;
    };
  }, [
    closeNotebook,
    completeMolecularPuzzle,
    openNotebook,
    releasePointerLock,
    showFeedbackMessage,
  ]);

  const isInterfaceOpen = isNotebookOpen;

  return (
    <div ref={mountRef} className="fixed inset-0 cursor-crosshair">
      {startScreen !== "gone" ? (
        <StartOverlay
          onBackToMenu={() => setStartScreen("menu")}
          onPlay={handlePlay}
          onShowInstructions={() => setStartScreen("instructions")}
          screen={startScreen}
        />
      ) : (
        <GameOverlay
          escapeSeconds={escapeSeconds}
          feedbackMessages={feedbackMessages}
          interactionPrompt={interactionPrompt}
          isInterfaceOpen={isInterfaceOpen || escapeSeconds !== null}
        />
      )}

      <GameHud
        isNotebookOpen={isNotebookOpen}
        onCloseNotebook={closeNotebook}
      />
    </div>
  );
}

type StartOverlayProps = {
  onBackToMenu: () => void;
  onPlay: () => void;
  onShowInstructions: () => void;
  screen: Exclude<StartScreen, "gone">;
};

function StartOverlay({
  onBackToMenu,
  onPlay,
  onShowInstructions,
  screen,
}: StartOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-lg border border-slate-600/60 bg-slate-900/95 px-10 py-10 shadow-2xl"
        style={{
          boxShadow:
            "0 0 60px rgba(14,165,233,0.08), 0 25px 50px rgba(0,0,0,0.7)",
        }}
      >
        <div className="absolute left-0 top-0 h-px w-full rounded-t-lg bg-gradient-to-r from-transparent via-cyan-500/60 to-transparent" />

        {screen === "menu" ? (
          <>
            <div className="mb-1 text-center">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-cyan-500/70">
                Escape Room
              </p>
              <h1
                className="text-4xl font-bold tracking-tight text-slate-100"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  letterSpacing: "-0.02em",
                }}
              >
                Chemistry Escape
              </h1>
              <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-slate-500 to-transparent" />
            </div>
            <div className="mt-10 flex flex-col gap-3">
              <button
                className="group relative w-full overflow-hidden rounded border border-cyan-500/40 bg-cyan-950/50 px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-widest text-cyan-300 transition-all duration-200 hover:border-cyan-400/70 hover:bg-cyan-900/60 hover:text-cyan-100 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                onClick={onPlay}
                type="button"
              >
                <span className="relative z-10">Play</span>
              </button>
              <button
                className="w-full rounded border border-slate-600/50 bg-slate-800/50 px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-widest text-slate-400 transition-all duration-200 hover:border-slate-500/70 hover:bg-slate-700/50 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                onClick={onShowInstructions}
                type="button"
              >
                Instructions
              </button>
            </div>
            <p className="mt-8 text-center font-mono text-xs text-slate-600">
              A game-based assessment for chemistry skills.
            </p>
          </>
        ) : (
          <>
            <button
              className="mb-6 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-300 focus:outline-none"
              onClick={onBackToMenu}
              type="button"
            >
              <span>Back</span>
            </button>
            <p className="text-sm leading-relaxed text-slate-300">
              You have found yourself lost in an abandoned science laboratory
              whose doors are all locked, requiring strange mechanisms to open.
              Fortunately, as an expert chemist, these symbols and puzzles seem
              familiar and may even be solvable. Use your knowledge to escape
              from this predicament.
            </p>
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-700/80" />
              <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
                How to Play
              </span>
              <div className="h-px flex-1 bg-slate-700/80" />
            </div>
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
            <button
              className="mt-8 w-full rounded border border-cyan-500/40 bg-cyan-950/50 px-6 py-3 font-mono text-sm font-semibold uppercase tracking-widest text-cyan-300 transition-all duration-200 hover:border-cyan-400/70 hover:bg-cyan-900/60 hover:text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              onClick={onPlay}
              type="button"
            >
              Play
            </button>
          </>
        )}

        <div className="absolute bottom-0 left-0 h-px w-full rounded-b-lg bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      </div>
    </div>
  );
}

type GameOverlayProps = {
  escapeSeconds: number | null;
  feedbackMessages: FeedbackMessage[];
  interactionPrompt: string | null;
  isInterfaceOpen: boolean;
};

function GameOverlay({
  escapeSeconds,
  feedbackMessages,
  interactionPrompt,
  isInterfaceOpen,
}: GameOverlayProps) {
  const escapedMinutes = escapeSeconds === null ? 0 : Math.floor(escapeSeconds / 60);
  const escapedSeconds =
    escapeSeconds === null ? 0 : Math.floor(escapeSeconds % 60);

  return (
    <>
      {isInterfaceOpen ? (
        <div className="pointer-events-none fixed inset-0 z-10 bg-black/55" />
      ) : null}
      {escapeSeconds !== null ? (
        <section className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-cyan-300/40 bg-slate-950/95 p-8 text-center text-white shadow-2xl shadow-cyan-950/50">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-300/70">
            Final Door Opened
          </p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">You Escaped!</h2>
          <p className="mt-5 text-sm uppercase tracking-[0.25em] text-slate-400">
            Time
          </p>
          <p className="mt-2 font-mono text-3xl text-cyan-200">
            {escapedMinutes}:{escapedSeconds.toString().padStart(2, "0")}
          </p>
        </section>
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
      <div className="pointer-events-none fixed left-6 top-6 z-20 flex max-w-sm flex-col gap-2">
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
  );
}
