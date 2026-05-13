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
  completePuzzle,
  getGameState,
  type InventoryItem,
  recordResponse,
  removeInventoryItem,
  selectInventoryItemByIndex,
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
const reactionIngredientIds = new Set([
  "ice",
  "candle",
  "vinegar",
  "baking soda",
  "baking-soda",
  "sugar",
  "iron",
  "water",
]);

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
  const targetedInteractableRef = useRef<Interactable | null>(null);
  const [startScreen, setStartScreen] = useState<StartScreen>("menu");
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
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
      addInventoryItem({
        id: "molecular-access-card",
        name: "Molecular Access Card",
        description: "A terminal-issued clearance card for molecule verification.",
      });
      addInventoryItem({
        id: "reaction-slider",
        name: "Reaction Slider",
        description: "A notched insert for the chemical reaction machine.",
      });
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
      molecularPlaqueTargets,
      molecularSubmitLever,
      molecularSlotTargets,
      reactionMachineChamber,
      reactionMachineSliderSlot,
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
    const heldBody = new THREE.Mesh(heldBodyGeometry, heldBodyMaterial);
    const heldFace = new THREE.Mesh(
      heldFaceGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    );
    const heldGenericGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const heldGeneric = new THREE.Mesh(heldGenericGeometry, heldGenericMaterial);
    const plaqueKindsByItemId = new Map(
      molecularPlaques.map((plaque) => [plaque.id, plaque.kind]),
    );
    let selectedHeldItemId: string | null = null;

    heldItemGroup.position.set(0.42, -0.32, -0.9);
    heldItemGroup.visible = false;
    heldFace.position.z = 0.026;
    heldGeneric.visible = false;
    heldItemPivot.add(heldBody, heldFace, heldGeneric);
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
        heldItemGroup.visible = true;
        return;
      }

      if (selectedItemId) {
        heldBody.visible = false;
        heldFace.visible = false;
        heldGeneric.visible = true;
        heldItemGroup.visible = true;
        return;
      }

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
        prompt: `Press E to place selected plaque in ${slot.formula}`,
        interact: () => {
          if (placedMolecularSlots.has(slot.id)) {
            showFeedbackMessage(`${slot.formula} already has a plaque.`, "success");
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
          showFeedbackMessage("Correct plaque arrangement accepted.", "success");
          completeMolecularPuzzle();
        },
      },
      {
        id: "reaction-machine-chamber",
        object: reactionMachineChamber,
        prompt: "Press E to place selected item in chamber",
        interact: () => {
          const gameState = getGameState();
          const selectedItem = gameState.inventoryItems.find(
            ({ id }) => id === gameState.selectedInventoryItemId,
          );

          if (!selectedItem) {
            showFeedbackMessage(
              "Select an inventory item before using the reaction chamber.",
              "failure",
            );
            return;
          }

          if (!reactionIngredientIds.has(selectedItem.id)) {
            showFeedbackMessage(
              "The chamber rejects that sample. Try a basic reaction material.",
              "failure",
            );
            return;
          }

          removeInventoryItem(selectedItem.id);
          recordResponse(
            "reaction-machine-sample",
            `Placed ${selectedItem.id} in the chemical reaction chamber.`,
          );
          showFeedbackMessage(
            `${selectedItem.name} drops into the reaction chamber.`,
            "success",
          );
        },
      },
      {
        id: "reaction-machine-slider-slot",
        object: reactionMachineSliderSlot,
        prompt: "Press E to insert reaction slider",
        interact: () => {
          const gameState = getGameState();
          const selectedItem = gameState.inventoryItems.find(
            ({ id }) => id === gameState.selectedInventoryItemId,
          );

          if (selectedItem?.id !== "reaction-slider") {
            showFeedbackMessage(
              "This side panel needs the Reaction Slider.",
              "failure",
            );
            return;
          }

          removeInventoryItem(selectedItem.id);
          recordResponse(
            "reaction-machine-slider",
            "Inserted the Molecular Structures slider into the reaction machine.",
          );
          showFeedbackMessage(
            "The slider locks into the side panel with a mechanical click.",
            "success",
          );
        },
      },
      ...cabinetDoors.map<Interactable>((door) => ({
        id: door.id,
        object: door.object,
        prompt: `Press E to open/close ${door.label}`,
        interact: () => {
          const isOpen = door.toggle();

          recordResponse(
            "east-room-cabinet",
            `${isOpen ? "Opened" : "Closed"} ${door.label}.`,
          );
          showFeedbackMessage(
            `${door.label} swings ${isOpen ? "open" : "closed"}.`,
            "success",
          );
        },
      })),
      {
        id: "east-room-water-beaker",
        object: waterBeaker,
        prompt: "Press E to collect water",
        interact: () => {
          const hasWater = getGameState().inventoryItems.some(
            ({ id }) => id === "water",
          );

          if (hasWater) {
            showFeedbackMessage("You already collected the water sample.", "success");
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
            id: "water",
            name: "Water",
            description: "A blue water sample from the open lab cabinet.",
          });
          recordResponse("east-room-cabinet", "Collected the water sample.");
          showFeedbackMessage("Collected water sample.", "success");
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
      updateHeldItemVisual();

      if (heldItemGroup.visible) {
        const elapsedSeconds = now / 1000;

        heldItemGroup.position.y = -0.32 + Math.sin(elapsedSeconds * 2.2) * 0.035;
        heldItemPivot.rotation.y += deltaSeconds * 1.4;
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
      heldBodyMaterial.dispose();
      heldGenericMaterial.dispose();
      if (heldFace.material instanceof THREE.MeshBasicMaterial) {
        heldFace.material.map?.dispose();
        heldFace.material.dispose();
      }
      world.dispose();
      rendererCanvasRef.current = null;
    };
  }, [closeNotebook, completeMolecularPuzzle, openNotebook, showFeedbackMessage]);

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
          feedbackMessages={feedbackMessages}
          interactionPrompt={interactionPrompt}
          isInterfaceOpen={isInterfaceOpen}
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
  feedbackMessages: FeedbackMessage[];
  interactionPrompt: string | null;
  isInterfaceOpen: boolean;
};

function GameOverlay({
  feedbackMessages,
  interactionPrompt,
  isInterfaceOpen,
}: GameOverlayProps) {
  return (
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
