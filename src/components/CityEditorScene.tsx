import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

const MATERIALS_TO_HIDE = [
  'itemshop',
  'itemshop_1',
  'kantei01',
  'kantei02',
  'kawara',
  'Material__766',
  '1_wave2',
  '1_wave',
  '1_ppl',
  'house',
  'set05',
  'wood',
  'set04'
];

interface PlacedAsset {
  id: string;
  assetPath: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

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

            if (MATERIALS_TO_HIDE.includes(materialName)) {
              return;
            }

            const geometry = child.geometry.clone();
            let newMaterial: THREE.MeshStandardMaterial;

            if (materialName === 'Material__794') {
              newMaterial = new THREE.MeshStandardMaterial({
                color: 0x6b7a8a,
                roughness: 0.8,
                metalness: 0.2,
              });
            } else {
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

        setCityScene(newScene);
      });
    });
  }, [modelUrl]);

  return cityScene ? <primitive object={cityScene} /> : null;
}

function PlacedAssetModel({ asset }: { asset: PlacedAsset }) {
  const gltf = useGLTF(asset.assetPath);

  return (
    <group
      position={[asset.position.x, asset.position.y, asset.position.z]}
      rotation={[asset.rotation.x, asset.rotation.y, asset.rotation.z]}
      scale={[asset.scale.x, asset.scale.y, asset.scale.z]}
    >
      <primitive object={gltf.scene.clone()} />
    </group>
  );
}

function EditorCamera() {
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
  const cameraPosition = useRef(new THREE.Vector3(0, 2, 5));

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

      cameraPosition.current.x += moveX;
      cameraPosition.current.z += moveZ;
    }

    const lookAtDistance = 3;
    const horizontalDistance = lookAtDistance * Math.cos(cameraPitch.current);
    const verticalOffset = lookAtDistance * Math.sin(cameraPitch.current);

    const lookAtX = cameraPosition.current.x + Math.sin(cameraAngle.current) * horizontalDistance;
    const lookAtY = cameraPosition.current.y + verticalOffset;
    const lookAtZ = cameraPosition.current.z + Math.cos(cameraAngle.current) * horizontalDistance;

    camera.position.copy(cameraPosition.current);
    camera.lookAt(lookAtX, lookAtY, lookAtZ);
  });

  return null;
}

interface CityEditorSceneProps {
  modelUrl: string;
  availableAssets: string[];
}

export default function CityEditorScene({ modelUrl, availableAssets }: CityEditorSceneProps) {
  const [placedAssets, setPlacedAssets] = useState<PlacedAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 2, z: 5 });

  useEffect(() => {
    const saved = localStorage.getItem('city-editor-assets');
    if (saved) {
      try {
        setPlacedAssets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved assets', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('city-editor-assets', JSON.stringify(placedAssets));
  }, [placedAssets]);

  const addAsset = (assetPath: string) => {
    const newAsset: PlacedAsset = {
      id: `asset-${Date.now()}`,
      assetPath,
      position: { x: cameraPosition.x, y: 0, z: cameraPosition.z },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    };
    setPlacedAssets([...placedAssets, newAsset]);
    setSelectedAssetId(newAsset.id);
  };

  const removeAsset = (id: string) => {
    setPlacedAssets(placedAssets.filter(a => a.id !== id));
    if (selectedAssetId === id) {
      setSelectedAssetId(null);
    }
  };

  const updateAsset = (id: string, updates: Partial<PlacedAsset>) => {
    setPlacedAssets(placedAssets.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const selectedAsset = placedAssets.find(a => a.id === selectedAssetId);

  const exportScene = () => {
    const json = JSON.stringify(placedAssets, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'city-scene.json';
    a.click();
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0a0a0a', display: 'flex' }}>
      {/* 3D Canvas */}
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 2, 5], fov: 75 }} shadows>
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[50, 50, 25]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-30, 20, -30]} intensity={0.3} />

          <EditorCamera />

          <Suspense fallback={null}>
            <CityModel modelUrl={modelUrl} />
          </Suspense>

          {placedAssets.map(asset => (
            <Suspense key={asset.id} fallback={null}>
              <PlacedAssetModel asset={asset} />
            </Suspense>
          ))}

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        </Canvas>
      </div>

      {/* Editor UI Panel */}
      <div style={{
        width: '350px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        padding: '1rem',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '0.85rem',
      }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>City Editor</h2>

        {/* Controls */}
        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
          <strong>Controls:</strong>
          <div>WASD - Move camera</div>
          <div>Click + Drag - Rotate view</div>
        </div>

        {/* Camera Position */}
        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
          <strong>Camera:</strong>
          <div>X: {cameraPosition.x.toFixed(2)}</div>
          <div>Y: {cameraPosition.y.toFixed(2)}</div>
          <div>Z: {cameraPosition.z.toFixed(2)}</div>
        </div>

        {/* Available Assets */}
        <div style={{ marginBottom: '1rem' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Add Asset:</strong>
          {availableAssets.map(asset => (
            <button
              key={asset}
              onClick={() => addAsset(asset)}
              style={{
                display: 'block',
                width: '100%',
                padding: '0.5rem',
                marginBottom: '0.25rem',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {asset.split('/').pop()}
            </button>
          ))}
        </div>

        {/* Placed Assets List */}
        <div style={{ marginBottom: '1rem' }}>
          <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
            Placed Assets ({placedAssets.length}):
          </strong>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {placedAssets.map(asset => (
              <div
                key={asset.id}
                style={{
                  padding: '0.5rem',
                  marginBottom: '0.25rem',
                  background: selectedAssetId === asset.id ? '#4a90e2' : '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={() => setSelectedAssetId(asset.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{asset.assetPath.split('/').pop()}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAsset(asset.id);
                    }}
                    style={{
                      background: '#d9534f',
                      color: '#fff',
                      border: 'none',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '3px',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asset Transform Editor */}
        {selectedAsset && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(74, 144, 226, 0.2)', borderRadius: '4px' }}>
            <strong style={{ display: 'block', marginBottom: '0.75rem' }}>
              Edit: {selectedAsset.assetPath.split('/').pop()}
            </strong>

            {/* Position */}
            <div style={{ marginBottom: '0.75rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Position:</strong>
              {(['x', 'y', 'z'] as const).map(axis => (
                <label key={axis} style={{ display: 'block', marginBottom: '0.25rem' }}>
                  {axis.toUpperCase()}:
                  <input
                    type="number"
                    step="0.1"
                    value={selectedAsset.position[axis].toFixed(2)}
                    onChange={(e) => updateAsset(selectedAsset.id, {
                      position: { ...selectedAsset.position, [axis]: parseFloat(e.target.value) }
                    })}
                    style={{
                      width: '80px',
                      marginLeft: '0.5rem',
                      padding: '0.25rem',
                      background: '#1a1a1a',
                      color: '#fff',
                      border: '1px solid #444',
                      borderRadius: '3px',
                    }}
                  />
                </label>
              ))}
            </div>

            {/* Rotation */}
            <div style={{ marginBottom: '0.75rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Rotation (radians):</strong>
              {(['x', 'y', 'z'] as const).map(axis => (
                <label key={axis} style={{ display: 'block', marginBottom: '0.25rem' }}>
                  {axis.toUpperCase()}:
                  <input
                    type="number"
                    step="0.1"
                    value={selectedAsset.rotation[axis].toFixed(2)}
                    onChange={(e) => updateAsset(selectedAsset.id, {
                      rotation: { ...selectedAsset.rotation, [axis]: parseFloat(e.target.value) }
                    })}
                    style={{
                      width: '80px',
                      marginLeft: '0.5rem',
                      padding: '0.25rem',
                      background: '#1a1a1a',
                      color: '#fff',
                      border: '1px solid #444',
                      borderRadius: '3px',
                    }}
                  />
                </label>
              ))}
            </div>

            {/* Scale */}
            <div style={{ marginBottom: '0.75rem' }}>
              <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Scale:</strong>
              {(['x', 'y', 'z'] as const).map(axis => (
                <label key={axis} style={{ display: 'block', marginBottom: '0.25rem' }}>
                  {axis.toUpperCase()}:
                  <input
                    type="number"
                    step="0.1"
                    value={selectedAsset.scale[axis].toFixed(2)}
                    onChange={(e) => updateAsset(selectedAsset.id, {
                      scale: { ...selectedAsset.scale, [axis]: parseFloat(e.target.value) }
                    })}
                    style={{
                      width: '80px',
                      marginLeft: '0.5rem',
                      padding: '0.25rem',
                      background: '#1a1a1a',
                      color: '#fff',
                      border: '1px solid #444',
                      borderRadius: '3px',
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={exportScene}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#5cb85c',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold',
          }}
        >
          Export Scene JSON
        </button>
      </div>
    </div>
  );
}
