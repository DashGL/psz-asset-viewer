import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Group } from 'three';

interface StageModelProps {
  stageUrl: string;
}

function SingleStageAsset({ url }: { url: string }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} />;
}

function StageModel({ stageUrl }: StageModelProps) {
  const [modelUrls, setModelUrls] = useState<string[]>([]);

  useEffect(() => {
    // For wetlands_b, we'll load some of the stage models
    // In a real implementation, you might want to load all models or implement LOD
    const sampleModels = [
      `${stageUrl}/s02b_ga1/lndmd/s02b_ga1_m.glb`,
      `${stageUrl}/s02b_ib1/lndmd/s02b_ib1_m.glb`,
      `${stageUrl}/s02b_lb1/lndmd/s02b_lb1_m.glb`,
      `${stageUrl}/s02b_na1/lndmd/s02b_na1_m.glb`,
    ];
    setModelUrls(sampleModels);
  }, [stageUrl]);

  return (
    <group>
      {/* Ground plane as fallback */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#2a4a2a" />
      </mesh>

      {/* Load stage models */}
      {modelUrls.map((url, index) => (
        <Suspense key={url} fallback={null}>
          <SingleStageAsset url={url} />
        </Suspense>
      ))}
    </group>
  );
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

  // Load external animations if provided
  const animGltf = animationsUrl ? useGLTF(animationsUrl) : null;
  const animationsToUse = animGltf?.animations || gltf.animations;
  const { actions } = useAnimations(animationsToUse, group);

  // Apply texture when available
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
            // Instead of replacing material, just update the texture
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
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', textureUrl, error);
      }
    );
  }, [textureUrl, gltf.scene]);

  // Play run animation when moving
  useEffect(() => {
    if (isMoving && actions['pmsa_run']) {
      actions['pmsa_run']?.reset().fadeIn(0.2).play();
    } else {
      actions['pmsa_run']?.fadeOut(0.2);
    }
  }, [isMoving, actions]);

  // Update position and rotation
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
  const moveSpeed = 0.1; // Increased speed
  const rotateSpeed = 0.005;

  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const cameraAngle = useRef(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true;
          keys.current.backward = false; // Ensure opposite is false
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true;
          keys.current.forward = false; // Ensure opposite is false
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true;
          keys.current.right = false; // Ensure opposite is false
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true;
          keys.current.left = false; // Ensure opposite is false
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
      if (event.button === 0) { // Left click
        isDragging.current = true;
        lastMouseX.current = event.clientX;
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging.current) {
        const deltaX = event.clientX - lastMouseX.current;
        cameraAngle.current -= deltaX * rotateSpeed;
        lastMouseX.current = event.clientX;
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

    // Calculate movement direction relative to camera
    // In camera space: forward = away from camera, right = camera's right
    let moveForward = 0;
    let moveRight = 0;

    if (keys.current.forward) moveForward = 1;
    if (keys.current.backward) moveForward = -1;
    if (keys.current.right) moveRight = -1;
    if (keys.current.left) moveRight = 1;

    if (moveForward !== 0 || moveRight !== 0) {
      // Normalize diagonal movement
      const length = Math.sqrt(moveForward * moveForward + moveRight * moveRight);
      const normalizedForward = moveForward / length;
      const normalizedRight = moveRight / length;

      // Convert camera-relative movement to world space
      // Camera angle tells us where the camera is positioned around the player
      // Forward movement should be away from camera (in the direction camera looks at player)
      const forwardX = Math.sin(cameraAngle.current);
      const forwardZ = Math.cos(cameraAngle.current);

      const rightX = Math.cos(cameraAngle.current);
      const rightZ = -Math.sin(cameraAngle.current);

      const moveX = (normalizedForward * forwardX + normalizedRight * rightX) * moveSpeed;
      const moveZ = (normalizedForward * forwardZ + normalizedRight * rightZ) * moveSpeed;

      playerPosition.x += moveX;
      playerPosition.z += moveZ;

      // Update player rotation to face movement direction
      // Calculate the angle based on the actual movement direction
      const movementAngle = Math.atan2(moveX, moveZ);
      playerRotation.current = movementAngle;
    }

    // Camera follows player from behind and above
    const cameraDistance = 3;
    const cameraHeight = 2;

    camera.position.x = playerPosition.x - Math.sin(cameraAngle.current) * cameraDistance;
    camera.position.y = playerPosition.y + cameraHeight;
    camera.position.z = playerPosition.z - Math.cos(cameraAngle.current) * cameraDistance;

    camera.lookAt(playerPosition.x, playerPosition.y + 1, playerPosition.z);
  });

  return null;
}

// Rain particle effect component
function Rain() {
  const dropCount = 1500;
  const rainRef = useRef<THREE.LineSegments>(null);

  const [positions, velocities] = useMemo(() => {
    // Each raindrop is a line segment (2 vertices = 6 position values)
    const positions = new Float32Array(dropCount * 6);
    const velocities = new Float32Array(dropCount);

    for (let i = 0; i < dropCount; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = Math.random() * 30;
      const z = (Math.random() - 0.5) * 100;

      // Top vertex of raindrop line
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;

      // Bottom vertex (create a vertical streak)
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y - 0.3; // Streak length
      positions[i * 6 + 5] = z;

      // Random fall speed for each raindrop
      velocities[i] = 0.2 + Math.random() * 0.2;
    }

    return [positions, velocities];
  }, []);

  useFrame(() => {
    if (!rainRef.current) return;

    const posArray = rainRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < dropCount; i++) {
      // Update both vertices of the line segment
      posArray[i * 6 + 1] -= velocities[i]; // Top Y
      posArray[i * 6 + 4] -= velocities[i]; // Bottom Y

      // Reset raindrop to top when it falls below ground
      if (posArray[i * 6 + 1] < 0) {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 100;

        posArray[i * 6] = x;
        posArray[i * 6 + 1] = 30;
        posArray[i * 6 + 2] = z;

        posArray[i * 6 + 3] = x;
        posArray[i * 6 + 4] = 30 - 0.3;
        posArray[i * 6 + 5] = z;
      }
    }

    rainRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={dropCount * 2}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#b8d4e8"
        transparent
        opacity={0.5}
        linewidth={1}
      />
    </lineSegments>
  );
}

interface WalkableSceneProps {
  stageUrl: string;
  characterUrl: string;
  textureUrl?: string;
  animationsUrl?: string;
}

export default function WalkableScene({ stageUrl, characterUrl, textureUrl, animationsUrl }: WalkableSceneProps) {
  const playerPosition = useRef(new THREE.Vector3(0, 0, 0));
  const playerRotation = useRef(0);
  const [isMoving, setIsMoving] = useState(false);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Controls Info */}
      <div
        style={{
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
        }}
      >
        <div><strong>Controls:</strong></div>
        <div>W/↑ - Forward</div>
        <div>S/↓ - Backward</div>
        <div>A/← - Left</div>
        <div>D/→ - Right</div>
        <div>Click + Drag - Rotate Camera</div>
      </div>

      {/* Scene Info */}
      <div
        style={{
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
        }}
      >
        <div><strong>Scene:</strong> Wetlands B</div>
        <div><strong>Weather:</strong> Rain</div>
        <div><strong>Character:</strong> pc_000</div>
        <div><strong>Status:</strong> {isMoving ? 'Running' : 'Idle'}</div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 2, 3], fov: 75 }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#6b8e9e');
          // Add fog for atmospheric marsh effect
          scene.fog = new THREE.Fog('#6b8e9e', 5, 50);
        }}
      >
        {/* Lighting - Darker ambient with stronger directional for dramatic highlights */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 15, 10]} intensity={2.5} castShadow />
        <directionalLight position={[-10, 10, -5]} intensity={0.4} color="#b8d4e8" />
        <hemisphereLight args={['#6b8e9e', '#2a3f3a', 0.3]} />

        {/* Rain Particle Effect */}
        <Rain />

        {/* Third Person Movement Controls */}
        <ThirdPersonControls
          playerPosition={playerPosition.current}
          playerRotation={playerRotation}
          onMove={setIsMoving}
        />

        {/* Stage */}
        <Suspense fallback={null}>
          <StageModel stageUrl={stageUrl} />
        </Suspense>

        {/* Player Character */}
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

        {/* Fog for atmosphere */}
        <fog attach="fog" args={['#87ceeb', 10, 50]} />
      </Canvas>
    </div>
  );
}
