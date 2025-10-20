import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, useAnimations } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import type { Group } from 'three';

interface AnimationInfo {
  name: string;
  file: string;
}

interface EffectInfo {
  name: string;
  file: string;
}

interface EnemyInfo {
  name: string;
  modelBaseName: string;
  animationCount: number;
  effectCount: number;
}

interface EnemyData {
  info: EnemyInfo | null;
  animations: AnimationInfo[];
  effects: EffectInfo[];
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

function StaticModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} />;
}

interface EnemyViewerProps {
  enemyName: string;
  basePath?: string;
}

export default function EnemyViewer({ enemyName, basePath = '/enemies' }: EnemyViewerProps) {
  const [enemyData, setEnemyData] = useState<EnemyData>({ info: null, animations: [], effects: [] });
  const [selectedAnimation, setSelectedAnimation] = useState<string | undefined>();
  const [selectedModel, setSelectedModel] = useState<'main' | string>('main');
  const [glbAnimations, setGlbAnimations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mainModelPath = `${basePath}/${enemyName}`;

  useEffect(() => {
    const loadEnemyData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load info.json first to get modelBaseName
        let info: EnemyInfo | null = null;
        try {
          const infoResponse = await fetch(`${mainModelPath}/info.json`);
          if (infoResponse.ok) {
            info = await infoResponse.json();
          }
        } catch (e) {
          console.log('No info.json found');
        }

        // Try to load animations.json
        let animations: AnimationInfo[] = [];
        try {
          const animResponse = await fetch(`${mainModelPath}/animations.json`);
          if (animResponse.ok) {
            animations = await animResponse.json();
          }
        } catch (e) {
          console.log('No animations.json found');
        }

        // Try to load effects.json
        let effects: EffectInfo[] = [];
        try {
          const effectsResponse = await fetch(`${mainModelPath}/effects.json`);
          if (effectsResponse.ok) {
            effects = await effectsResponse.json();
          }
        } catch (e) {
          console.log('No effects.json found');
        }

        setEnemyData({ info, animations, effects });
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load enemy data');
        setIsLoading(false);
      }
    };

    loadEnemyData();
  }, [enemyName, mainModelPath]);

  const currentModelUrl = selectedModel === 'main'
    ? `${mainModelPath}/${enemyData.info?.modelBaseName}/${enemyData.info?.modelBaseName}.glb`
    : `${mainModelPath}/effects/${selectedModel}/${selectedModel}.glb`;

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
        {/* Model Selection */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff', fontWeight: 'bold' }}>
            Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value as 'main' | string);
              setSelectedAnimation(undefined);
            }}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px'
            }}
          >
            <option value="main">Main Model</option>
            {enemyData.effects.map((effect) => (
              <option key={effect.name} value={effect.name}>
                Effect: {effect.name}
              </option>
            ))}
          </select>
        </div>

        {/* Animation Selection */}
        {selectedModel === 'main' && glbAnimations.length > 0 && (
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
          {enemyData.animations.length > 0 && (
            <div>{enemyData.animations.length} animations</div>
          )}
          {enemyData.effects.length > 0 && (
            <div>{enemyData.effects.length} effects</div>
          )}
        </div>
      </div>

      {/* 3D Viewer */}
      <div style={{ width: '100%', height: '600px', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '2rem', color: '#ff6b6b', textAlign: 'center' }}>
            Error: {error}
          </div>
        ) : isLoading || !enemyData.info ? (
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
              {selectedModel === 'main' ? (
                <AnimatedModel
                  url={currentModelUrl}
                  animationName={selectedAnimation}
                  onAnimationsLoaded={setGlbAnimations}
                />
              ) : (
                <StaticModel url={currentModelUrl} />
              )}
            </Suspense>
          </Canvas>
        )}
      </div>
    </div>
  );
}
