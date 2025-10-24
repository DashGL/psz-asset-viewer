import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import type { Group } from 'three';

const MATERIALS_TO_HIDE = [
  'itemshop',
  'itemshop_1',
  'kantei01',
  'kantei02',
  'kawara',
  'Material__766'
];

function CityModel({ modelUrl }: { modelUrl: string }) {
  const [cityScene, setCityScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    import('three/examples/jsm/loaders/GLTFLoader').then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => {
        const newScene = new THREE.Group();

        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshStandardMaterial;
            const materialName = material.name || 'Unnamed Material';

            // Skip materials we want to hide
            if (MATERIALS_TO_HIDE.includes(materialName)) {
              console.log(`Hiding material: ${materialName}`);
              return;
            }

            const geometry = child.geometry.clone();
            let newMaterial: THREE.MeshStandardMaterial;

            if (materialName === 'house') {
              // For house material, keep texture but add diffuse color for transparent areas
              newMaterial = material.clone();
              newMaterial.color = new THREE.Color(0x8b7355); // Brown color for houses
              newMaterial.transparent = false;
              newMaterial.opacity = 1.0;
              console.log(`Modified material: ${materialName} (added brown diffuse color)`);
            } else if (materialName === 'Material__794') {
              // For Material__794, remove texture and use solid color for floor
              newMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a5a6a, // Gray-blue floor color
                roughness: 0.8,
                metalness: 0.2,
              });
              console.log(`Modified material: ${materialName} (solid gray-blue for floor)`);
            } else {
              // Keep other materials as-is
              newMaterial = material.clone();
            }

            const newMesh = new THREE.Mesh(geometry, newMaterial);
            newMesh.position.copy(child.position);
            newMesh.rotation.copy(child.rotation);
            newMesh.scale.copy(child.scale);
            newMesh.castShadow = true;
            newMesh.receiveShadow = true;
            newScene.add(newMesh);
          }
        });

        console.log(`City scene created with ${newScene.children.length} meshes`);
        setCityScene(newScene);
      });
    });
  }, [modelUrl]);

  return cityScene ? <primitive object={cityScene} /> : null;
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
  const cameraAngle = useRef(0);

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
    const cameraHeight = 2;

    camera.position.x = playerPosition.x - Math.sin(cameraAngle.current) * cameraDistance;
    camera.position.y = playerPosition.y + cameraHeight;
    camera.position.z = playerPosition.z - Math.cos(cameraAngle.current) * cameraDistance;

    camera.lookAt(playerPosition.x, playerPosition.y + 1, playerPosition.z);
  });

  return null;
}

interface CityWalkableSceneProps {
  modelUrl: string;
  characterUrl?: string;
  textureUrl?: string;
  animationsUrl?: string;
}

export default function CityWalkableScene({
  modelUrl,
  characterUrl,
  textureUrl,
  animationsUrl
}: CityWalkableSceneProps) {
  const playerPosition = useRef(new THREE.Vector3(0, 0, 0));
  const playerRotation = useRef(0);
  const [isMoving, setIsMoving] = useState(false);

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
        <div><strong>Scene:</strong> City E</div>
        <div><strong>Status:</strong> {isMoving ? 'Running' : 'Idle'}</div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.8 }}>
          <strong>Hidden Materials:</strong><br />
          {MATERIALS_TO_HIDE.slice(0, 3).map(mat => (
            <div key={mat}>• {mat}</div>
          ))}
          <div>• +{MATERIALS_TO_HIDE.length - 3} more</div>
        </div>
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

        {/* City Model */}
        <Suspense fallback={null}>
          <CityModel modelUrl={modelUrl} />
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
