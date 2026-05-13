"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  collidesWithStaticGeometry,
  createAabbCollider,
  staticColliderDefinitions,
} from "@/src/game/collision";
import {
  getTargetedInteractable,
  type Interactable,
} from "@/src/game/interactions";
import {
  addInventoryItem,
  completePuzzle,
  recordResponse,
  selectInventoryItemByIndex,
} from "@/src/state";
import { GameHud } from "@/src/ui/GameHud";
import { PuzzleModal } from "@/src/ui/PuzzleModal";

const playerHeight = 1.7;
const playerRadius = 0.35;
const walkSpeed = 4;
const sprintSpeed = 7;
const mouseSensitivity = 0.002;
const maxPitch = Math.PI / 2 - 0.05;
const interactionRange = 3;

export function ThreeScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeInterfaceRef = useRef<"notebook" | "puzzle" | null>(null);
  const isPlayerPausedRef = useRef(false);
  const rendererCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetedInteractableRef = useRef<Interactable | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [isPuzzleOpen, setIsPuzzleOpen] = useState(false);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(
    null,
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

  const openNotebook = useCallback(() => {
    activeInterfaceRef.current = "notebook";
    pausePlayerForInterface();
    setIsNotebookOpen(true);
  }, [pausePlayerForInterface]);

  const closeNotebook = useCallback(() => {
    setIsNotebookOpen(false);
    resumePlayerFromInterface();
  }, [resumePlayerFromInterface]);

  const openPuzzle = useCallback(() => {
    activeInterfaceRef.current = "puzzle";
    pausePlayerForInterface();
    setIsPuzzleOpen(true);
  }, [pausePlayerForInterface]);

  const closePuzzle = useCallback(() => {
    setIsPuzzleOpen(false);
    resumePlayerFromInterface();
  }, [resumePlayerFromInterface]);

  const completeTestPuzzle = useCallback(() => {
    console.log("Completed the test puzzle.");
    completePuzzle("test-cube-puzzle");
    addInventoryItem({
      id: "amber-test-cube",
      name: "Amber Cube",
      description: "A warm, geometric sample from the interaction test.",
    });
    recordResponse("test-cube-puzzle", "Player completed the test puzzle.");
    closePuzzle();
  }, [closePuzzle]);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, playerHeight, 6);
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererCanvasRef.current = renderer.domElement;
    mount.appendChild(renderer.domElement);

    const floorGeometry = new THREE.PlaneGeometry(24, 24);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x243042,
      roughness: 0.82,
      metalness: 0.08,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const interactableGeometry = new THREE.BoxGeometry(1, 1, 1);
    const interactableMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.5,
      metalness: 0.12,
    });
    const interactableCube = new THREE.Mesh(
      interactableGeometry,
      interactableMaterial,
    );
    interactableCube.position.set(0, playerHeight, 3.4);
    interactableCube.castShadow = true;
    scene.add(interactableCube);

    const ambientLight = new THREE.HemisphereLight(0xe0f2fe, 0x1f2937, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(4, 6, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xfbbf24, 28, 16);
    fillLight.position.set(-3, 2.5, -2);
    scene.add(fillLight);

    const pressedKeys = new Set<string>();
    const moveDirection = new THREE.Vector3();
    const nextPosition = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const staticColliders = staticColliderDefinitions.map(createAabbCollider);
    const raycaster = new THREE.Raycaster();
    raycaster.far = interactionRange;
    const interactables: Interactable[] = [
      {
        id: "test-cube",
        object: interactableCube,
        prompt: "Press E to interact",
        interact: () => {
          console.log("Interacted with the test cube.");
          openPuzzle();
        },
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
      if (event.code === "KeyJ" && !event.repeat) {
        event.preventDefault();

        if (activeInterfaceRef.current === "notebook") {
          closeNotebook();
        } else if (isPlayerPausedRef.current) {
          return;
        } else {
          pressedKeys.clear();
          sprinting = false;
          setIsSprinting(false);
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

      floorGeometry.dispose();
      floorMaterial.dispose();
      interactableGeometry.dispose();
      interactableMaterial.dispose();
      renderer.dispose();
      rendererCanvasRef.current = null;
    };
  }, [closeNotebook, openNotebook, openPuzzle]);

  const isInterfaceOpen = isNotebookOpen || isPuzzleOpen;

  return (
    <div ref={mountRef} className="fixed inset-0 cursor-crosshair">
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
      <div className="pointer-events-none fixed left-6 top-6 z-10 rounded border border-white/15 bg-black/35 px-4 py-3 text-sm text-white/85 backdrop-blur">
        <p>{isPointerLocked ? "Pointer locked" : "Click to lock pointer"}</p>
        <p className="text-white/55">
          {isSprinting ? "Sprint on" : "Sprint off"}
        </p>
        <p className="text-white/55">J opens journal</p>
      </div>
      <GameHud
        isNotebookOpen={isNotebookOpen}
        onCloseNotebook={closeNotebook}
      />
      <PuzzleModal
        body="This is a reusable puzzle overlay opened from a Three.js raycast interaction."
        isOpen={isPuzzleOpen}
        onClose={closePuzzle}
        onComplete={completeTestPuzzle}
        title="Test Puzzle"
      />
    </div>
  );
}
