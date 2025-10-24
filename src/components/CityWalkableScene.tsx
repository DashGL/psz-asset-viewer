import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

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
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0a0a0a' }}>
      <Canvas
        camera={{ position: [20, 10, 20], fov: 60 }}
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
          shadow-camera-far={100}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <directionalLight position={[-30, 20, -30]} intensity={0.3} />

        {/* City Model */}
        <CityModel modelUrl={modelUrl} />

        {/* Ground plane for reference */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />

        <gridHelper args={[100, 50, '#444', '#222']} position={[0, -0.1, 0]} />
      </Canvas>

      {/* Info Overlay */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '1rem',
        borderRadius: '8px',
        color: 'white',
        fontSize: '0.85rem',
        backdropFilter: 'blur(10px)',
        maxWidth: '350px',
      }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>City Scene (Cleaned)</h2>
        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
          <strong>Hidden Materials:</strong><br />
          <div style={{ marginLeft: '1rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
            {MATERIALS_TO_HIDE.map(mat => (
              <div key={mat}>• {mat}</div>
            ))}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Modified Materials:</strong><br />
            <div style={{ marginLeft: '1rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
              • house: brown diffuse<br />
              • Material__794: gray-blue floor
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '0.75rem',
        borderRadius: '8px',
        color: 'white',
        fontSize: '0.8rem',
        backdropFilter: 'blur(10px)',
      }}>
        <strong>Controls:</strong><br />
        • Left Mouse: Rotate<br />
        • Right Mouse: Pan<br />
        • Scroll: Zoom
      </div>
    </div>
  );
}
