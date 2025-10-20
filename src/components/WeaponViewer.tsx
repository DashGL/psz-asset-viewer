import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, useAnimations } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import type { Group } from 'three';

interface WeaponInfo {
  id: string;
  name: string;
  textureCount: number;
  animationCount: number;
  variants: string[];
}

interface WeaponData {
  info: WeaponInfo | null;
}

interface ModelProps {
  url: string;
  animationName?: string;
  onAnimationsLoaded?: (names: string[]) => void;
}

function WeaponModel({ url, animationName, onAnimationsLoaded }: ModelProps) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(url);
  const { actions, names } = useAnimations(gltf.animations, group);

  useEffect(() => {
    if (names.length > 0 && onAnimationsLoaded) {
      onAnimationsLoaded(names);
    }
  }, [names, onAnimationsLoaded]);

  useEffect(() => {
    if (animationName && actions[animationName]) {
      // Stop all animations
      Object.values(actions).forEach((action) => action?.stop());
      // Play selected animation
      actions[animationName]?.reset().fadeIn(0.2).play();
    }
    return () => {
      if (animationName && actions[animationName]) {
        actions[animationName]?.fadeOut(0.2);
      }
    };
  }, [animationName, actions]);

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

interface WeaponViewerProps {
  weaponId: string;
  basePath?: string;
}

export default function WeaponViewer({ weaponId, basePath = '/weapons' }: WeaponViewerProps) {
  const [weaponData, setWeaponData] = useState<WeaponData>({ info: null });
  const [selectedAnimation, setSelectedAnimation] = useState<string | undefined>();
  const [glbAnimations, setGlbAnimations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mainWeaponPath = `${basePath}/${weaponId}`;

  useEffect(() => {
    const loadWeaponData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load info.json
        let info: WeaponInfo | null = null;
        try {
          const infoResponse = await fetch(`${mainWeaponPath}/info.json`);
          if (infoResponse.ok) {
            info = await infoResponse.json();
          }
        } catch (e) {
          console.log('No info.json found');
        }

        setWeaponData({ info });
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load weapon data');
        setIsLoading(false);
      }
    };

    loadWeaponData();
  }, [weaponId, mainWeaponPath]);

  // Construct the model URL using the actual model name from info.json
  const modelUrl = weaponData.info
    ? `${mainWeaponPath}/${weaponId}/${weaponData.info.name}.glb`
    : `${mainWeaponPath}/${weaponId}/${weaponId}.glb`;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Controls */}
      {glbAnimations.length > 0 && (
        <div style={{
          padding: '1rem',
          background: '#2a2a2a',
          borderRadius: '8px',
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap'
        }}>
          {/* Animation Selection */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff', fontWeight: 'bold' }}>
              Animation
            </label>
            <select
              value={selectedAnimation || ''}
              onChange={(e) => setSelectedAnimation(e.target.value || undefined)}
              style={{
                width: '100%',
                padding: '0.5rem',
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px'
              }}
            >
              <option value="">None</option>
              {glbAnimations.map((animName) => (
                <option key={animName} value={animName}>
                  {animName}
                </option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div style={{ color: '#aaa', fontSize: '0.9rem', alignSelf: 'center' }}>
            {glbAnimations.length} animations available
          </div>
        </div>
      )}

      {/* 3D Viewer */}
      <div style={{ width: '100%', height: '600px', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '2rem', color: '#ff6b6b', textAlign: 'center' }}>
            Error: {error}
          </div>
        ) : isLoading || !weaponData.info ? (
          <div style={{ padding: '2rem', color: '#aaa', textAlign: 'center' }}>
            Loading...
          </div>
        ) : (
          <Canvas>
            <PerspectiveCamera makeDefault position={[0.5, 0.3, 0.5]} />
            <OrbitControls enableDamping dampingFactor={0.05} />

            {/* Ambient light for weapons */}
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={0.5} />

            {/* Grid */}
            <gridHelper args={[2, 10]} />

            {/* Model */}
            <Suspense fallback={null}>
              <WeaponModel
                url={modelUrl}
                animationName={selectedAnimation}
                onAnimationsLoaded={setGlbAnimations}
              />
            </Suspense>
          </Canvas>
        )}
      </div>

      {/* Weapon Info */}
      {weaponData.info && (
        <div style={{
          padding: '1rem',
          background: '#2a2a2a',
          borderRadius: '8px'
        }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#667eea' }}>Weapon Info</h3>
          <div style={{ fontSize: '0.9rem', color: '#aaa', display: 'grid', gap: '0.5rem' }}>
            <div><strong>ID:</strong> {weaponData.info.id}</div>
            <div><strong>Textures:</strong> {weaponData.info.textureCount}</div>
            <div><strong>Animations:</strong> {weaponData.info.animationCount}</div>
            {weaponData.info.variants && weaponData.info.variants.length > 0 && (
              <div><strong>Variants:</strong> {weaponData.info.variants.length}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
