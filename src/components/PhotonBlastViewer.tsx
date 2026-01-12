import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, useAnimations } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import type { Group } from 'three';

interface PhotonBlastInfo {
  id: string;
  name: string;
  displayName: string;
  modelFile: string;
  animations: string[];
}

interface ModelProps {
  url: string;
  animationName?: string;
  onAnimationsLoaded?: (names: string[]) => void;
}

function AnimatedModel({ url, animationName, onAnimationsLoaded }: ModelProps) {
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

interface PhotonBlastViewerProps {
  pbName: string;
  basePath?: string;
}

export default function PhotonBlastViewer({ pbName, basePath = '/photon-blasts' }: PhotonBlastViewerProps) {
  const [pbInfo, setPbInfo] = useState<PhotonBlastInfo | null>(null);
  const [selectedAnimation, setSelectedAnimation] = useState<string | undefined>();
  const [glbAnimations, setGlbAnimations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const modelPath = `${basePath}/${pbName}`;

  useEffect(() => {
    const loadPbData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load info.json
        const infoResponse = await fetch(`${modelPath}/info.json`);
        if (infoResponse.ok) {
          const info = await infoResponse.json();
          setPbInfo(info);
        } else {
          throw new Error('Could not load photon blast info');
        }

        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load photon blast data');
        setIsLoading(false);
      }
    };

    loadPbData();
  }, [pbName, modelPath]);

  const currentModelUrl = pbInfo ? `${modelPath}/${pbInfo.modelFile}` : '';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Controls */}
      <div style={{
        padding: '1rem',
        background: '#2a2a2a',
        borderRadius: '8px',
        display: 'flex',
        gap: '2rem',
        flexWrap: 'wrap'
      }}>
        {/* Animation Selection */}
        {glbAnimations.length > 0 && (
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
        )}

        {/* Stats */}
        <div style={{ color: '#aaa', fontSize: '0.9rem', alignSelf: 'center' }}>
          {glbAnimations.length > 0 && (
            <div>{glbAnimations.length} animations available</div>
          )}
        </div>
      </div>

      {/* 3D Viewer */}
      <div style={{ width: '100%', height: '600px', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '2rem', color: '#ff6b6b', textAlign: 'center' }}>
            Error: {error}
          </div>
        ) : isLoading || !pbInfo ? (
          <div style={{ padding: '2rem', color: '#aaa', textAlign: 'center' }}>
            Loading...
          </div>
        ) : (
          <Canvas shadows>
            <PerspectiveCamera makeDefault position={[3, 2, 3]} />
            <OrbitControls enableDamping dampingFactor={0.05} />

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <hemisphereLight intensity={0.3} groundColor="#080808" />

            {/* Grid */}
            <gridHelper args={[10, 10]} />

            {/* Model */}
            <Suspense fallback={null}>
              <AnimatedModel
                url={currentModelUrl}
                animationName={selectedAnimation}
                onAnimationsLoaded={setGlbAnimations}
              />
            </Suspense>
          </Canvas>
        )}
      </div>
    </div>
  );
}
