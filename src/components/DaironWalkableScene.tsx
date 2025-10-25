import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import type { Group } from 'three';

function DaironModel({ modelUrl }: { modelUrl: string }) {
  const gltf = useGLTF(modelUrl);

  return <primitive object={gltf.scene} />;
}

interface PlayerCharacterProps {
  characterUrl: string;
  textureUrl?: string;
  animationsUrl?: string;
  position: THREE.Vector3;
  rotationRef: { current: number };
  isMoving: boolean;
}

function PlayerCharacter({ characterUrl, textureUrl, animationsUrl, position, rotationRef, isMoving }: PlayerCharacterProps) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(characterUrl);

  const animGltf = animationsUrl ? useGLTF(animationsUrl) : null;
  const animationsToUse = animGltf?.animations || gltf.animations;
  const { actions } = useAnimations(animationsToUse, group);

  useEffect(() => {
    if (!textureUrl || !gltf.scene) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      textureUrl,
      (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;

        gltf.scene.traverse((child: any) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat: any) => {
                mat.map = texture;
                mat.needsUpdate = true;
              });
            } else {
              child.material.map = texture;
              child.material.needsUpdate = true;
            }
          }
        });
      }
    );
  }, [textureUrl, gltf.scene]);

  useEffect(() => {
    if (isMoving && actions['pmsa_run']) {
      actions['pmsa_run']?.reset().fadeIn(0.2).play();
    } else {
      actions['pmsa_run']?.fadeOut(0.2);
    }
  }, [isMoving, actions]);

  useFrame(() => {
    if (group.current) {
      group.current.position.copy(position);
      group.current.rotation.y = rotationRef.current;
    }
  });

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

interface ThirdPersonControlsProps {
  playerPosition: THREE.Vector3;
  playerRotation: { current: number };
  onMove: (isMoving: boolean) => void;
}

function ThirdPersonControls({ playerPosition, playerRotation, onMove }: ThirdPersonControlsProps) {
  const { camera } = useThree();
  const moveSpeed = 0.1;
  const rotateSpeed = 0.005;

  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const lastMouseY = useRef(0);
  const cameraAngle = useRef(0);
  const cameraPitch = useRef(0.3);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true;
          keys.current.backward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true;
          keys.current.forward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true;
          keys.current.right = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true;
          keys.current.left = false;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false;
          break;
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button === 0) {
        isDragging.current = true;
        lastMouseX.current = event.clientX;
        lastMouseY.current = event.clientY;
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = event.clientX - lastMouseX.current;
        const deltaY = event.clientY - lastMouseY.current;

        cameraAngle.current -= deltaX * rotateSpeed;
        cameraPitch.current += deltaY * rotateSpeed;
        cameraPitch.current = Math.max(-0.5, Math.min(1.2, cameraPitch.current));

        lastMouseX.current = event.clientX;
        lastMouseY.current = event.clientY;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useFrame(() => {
    const moving = keys.current.forward || keys.current.backward || keys.current.left || keys.current.right;
    onMove(moving);

    let moveForward = 0;
    let moveRight = 0;

    if (keys.current.forward) moveForward = 1;
    if (keys.current.backward) moveForward = -1;
    if (keys.current.right) moveRight = -1;
    if (keys.current.left) moveRight = 1;

    if (moveForward !== 0 || moveRight !== 0) {
      const length = Math.sqrt(moveForward * moveForward + moveRight * moveRight);
      const normalizedForward = moveForward / length;
      const normalizedRight = moveRight / length;

      const forwardX = Math.sin(cameraAngle.current);
      const forwardZ = Math.cos(cameraAngle.current);

      const rightX = Math.cos(cameraAngle.current);
      const rightZ = -Math.sin(cameraAngle.current);

      const moveX = (normalizedForward * forwardX + normalizedRight * rightX) * moveSpeed;
      const moveZ = (normalizedForward * forwardZ + normalizedRight * rightZ) * moveSpeed;

      playerPosition.x += moveX;
      playerPosition.z += moveZ;

      const movementAngle = Math.atan2(moveX, moveZ);
      playerRotation.current = movementAngle;
    }

    const cameraDistance = 3;
    const horizontalDistance = cameraDistance * Math.cos(cameraPitch.current);
    const verticalOffset = cameraDistance * Math.sin(cameraPitch.current);

    camera.position.x = playerPosition.x - Math.sin(cameraAngle.current) * horizontalDistance;
    camera.position.y = playerPosition.y + 1 + verticalOffset;
    camera.position.z = playerPosition.z - Math.cos(cameraAngle.current) * horizontalDistance;

    camera.lookAt(playerPosition.x, playerPosition.y + 1, playerPosition.z);
  });

  return null;
}

interface DaironWalkableSceneProps {
  modelUrl: string;
  characterUrl?: string;
  textureUrl?: string;
  animationsUrl?: string;
}

export default function DaironWalkableScene({
  modelUrl,
  characterUrl,
  textureUrl,
  animationsUrl
}: DaironWalkableSceneProps) {
  const playerPosition = useRef(new THREE.Vector3(0, 0, 0));
  const playerRotation = useRef(0);
  const [isMoving, setIsMoving] = useState(false);
  const [displayPosition, setDisplayPosition] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayPosition({
        x: playerPosition.current.x,
        y: playerPosition.current.y,
        z: playerPosition.current.z
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0a0a0a' }}>
      {/* Controls Info */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '1rem',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '0.85rem',
        pointerEvents: 'none',
      }}>
        <div><strong>Controls:</strong></div>
        <div>W/↑ - Forward</div>
        <div>S/↓ - Backward</div>
        <div>A/← - Left</div>
        <div>D/→ - Right</div>
        <div>Click + Drag - Rotate Camera</div>
      </div>

      {/* Position Display */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '1rem',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '0.85rem',
        pointerEvents: 'none',
        fontFamily: 'monospace',
      }}>
        <div><strong>Position:</strong></div>
        <div>X: {displayPosition.x.toFixed(2)}</div>
        <div>Y: {displayPosition.y.toFixed(2)}</div>
        <div>Z: {displayPosition.z.toFixed(2)}</div>
      </div>

      {/* Scene Info */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '1rem',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '0.85rem',
        pointerEvents: 'none',
      }}>
        <div><strong>Scene:</strong> Dairon</div>
        <div><strong>Status:</strong> {isMoving ? 'Running' : 'Idle'}</div>
      </div>

      <Canvas
        camera={{ position: [0, 2, 3], fov: 75 }}
        shadows
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[50, 50, 25]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-30, 20, -30]} intensity={0.3} />

        {/* Third Person Controls */}
        <ThirdPersonControls
          playerPosition={playerPosition.current}
          playerRotation={playerRotation}
          onMove={setIsMoving}
        />

        {/* Dairon Model */}
        <Suspense fallback={null}>
          <DaironModel modelUrl={modelUrl} />
        </Suspense>

        {/* Player Character */}
        {characterUrl && (
          <Suspense fallback={null}>
            <PlayerCharacter
              characterUrl={characterUrl}
              textureUrl={textureUrl}
              animationsUrl={animationsUrl}
              position={playerPosition.current}
              rotationRef={playerRotation}
              isMoving={isMoving}
            />
          </Suspense>
        )}

        {/* Ground plane for reference */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
      </Canvas>
    </div>
  );
}
