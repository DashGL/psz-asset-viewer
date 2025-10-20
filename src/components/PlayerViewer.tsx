import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF, useAnimations } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import type { Group } from 'three';
import * as THREE from 'three';

interface TextureInfo {
  name: string;
  file: string;
}

interface AnimationInfo {
  name: string;
  file: string;
}

interface PlayerInfo {
  name: string;
  modelFile: string;
  textureCount: number;
  textures: TextureInfo[];
}

interface PlayerData {
  info: PlayerInfo | null;
  textures: TextureInfo[];
  sharedAnimations: AnimationInfo[];
}

interface ModelProps {
  url: string;
  animationName?: string;
  onAnimationsLoaded?: (names: string[]) => void;
  texturePath?: string;
}

function AnimatedModel({ url, animationName, onAnimationsLoaded, texturePath }: ModelProps) {
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

  // Apply texture when texturePath changes
  useEffect(() => {
    if (!texturePath || !gltf.scene) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      texturePath,
      (texture) => {
        // Configure texture for pixel art
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.flipY = false;

        // Replace materials with unlit MeshBasicMaterial
        gltf.scene.traverse((child: any) => {
          if (child.isMesh) {
            // Create new basic material (unlit, ignores lighting)
            child.material = new THREE.MeshBasicMaterial({
              map: texture,
              side: THREE.DoubleSide,
            });
          }
        });
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', texturePath, error);
      }
    );
  }, [texturePath, gltf.scene]);

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

interface PlayerViewerProps {
  characterName: string;
  basePath?: string;
}

export default function PlayerViewer({ characterName, basePath = '/player' }: PlayerViewerProps) {
  const [playerData, setPlayerData] = useState<PlayerData>({ info: null, textures: [], sharedAnimations: [] });
  const [selectedAnimation, setSelectedAnimation] = useState<string | undefined>();
  const [selectedTexture, setSelectedTexture] = useState<number>(0);
  const [glbAnimations, setGlbAnimations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mainModelPath = `${basePath}/${characterName}`;

  useEffect(() => {
    const loadPlayerData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load info.json
        let info: PlayerInfo | null = null;
        let textures: TextureInfo[] = [];
        try {
          const infoResponse = await fetch(`${mainModelPath}/info.json`);
          if (infoResponse.ok) {
            info = await infoResponse.json();
          }

          // Load textures.json
          const texturesResponse = await fetch(`${mainModelPath}/textures.json`);
          if (texturesResponse.ok) {
            textures = await texturesResponse.json();
          }
        } catch (e) {
          console.log('No info.json or textures.json found');
        }

        // Load shared animations
        let sharedAnimations: AnimationInfo[] = [];
        try {
          const animResponse = await fetch(`${basePath}/animations/animations.json`);
          if (animResponse.ok) {
            sharedAnimations = await animResponse.json();
          }
        } catch (e) {
          console.log('No shared animations found');
        }

        setPlayerData({ info, textures, sharedAnimations });
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load player data');
        setIsLoading(false);
      }
    };

    loadPlayerData();
  }, [characterName, mainModelPath, basePath]);

  // Construct the model URL
  const modelBaseName = playerData.info?.name || characterName;
  const modelFileName = playerData.info?.modelFile?.replace('.nsbmd', '') || `${characterName}_000`;
  const currentModelUrl = `${mainModelPath}/${modelBaseName}/${modelFileName}.glb`;

  // Construct the texture path
  const currentTexturePath = playerData.textures.length > 0
    ? `${mainModelPath}/textures/${playerData.textures[selectedTexture]?.name}.png`
    : undefined;

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

        {/* Selected Texture Info */}
        {playerData.textures.length > 0 && (
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#fff', fontWeight: 'bold' }}>
              Selected Texture
            </label>
            <div style={{
              padding: '0.5rem',
              background: '#1a1a1a',
              border: '1px solid #667eea',
              borderRadius: '4px',
              color: '#667eea',
              fontFamily: 'monospace'
            }}>
              {playerData.textures[selectedTexture]?.name || 'None'}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
              Click texture previews below to select
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ color: '#aaa', fontSize: '0.9rem', alignSelf: 'center' }}>
          {playerData.sharedAnimations.length > 0 && (
            <div>{playerData.sharedAnimations.length} shared animations</div>
          )}
          {playerData.textures.length > 0 && (
            <div>{playerData.textures.length} texture variants</div>
          )}
        </div>
      </div>

      {/* 3D Viewer */}
      <div style={{ width: '100%', height: '600px', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '2rem', color: '#ff6b6b', textAlign: 'center' }}>
            Error: {error}
          </div>
        ) : isLoading || !playerData.info ? (
          <div style={{ padding: '2rem', color: '#aaa', textAlign: 'center' }}>
            Loading...
          </div>
        ) : (
          <Canvas>
            <PerspectiveCamera makeDefault position={[1.5, 1, 1.5]} />
            <OrbitControls enableDamping dampingFactor={0.05} />

            {/* Grid */}
            <gridHelper args={[5, 10]} />

            {/* Model */}
            <Suspense fallback={null}>
              <AnimatedModel
                url={currentModelUrl}
                animationName={selectedAnimation}
                onAnimationsLoaded={setGlbAnimations}
                texturePath={currentTexturePath}
              />
            </Suspense>
          </Canvas>
        )}
      </div>

      {/* Texture Gallery */}
      {playerData.textures.length > 0 && (
        <div style={{
          padding: '1rem',
          background: '#2a2a2a',
          borderRadius: '8px'
        }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#667eea' }}>Texture Variants</h3>
          <p style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '1rem' }}>
            This character has {playerData.textures.length} different texture variants (costumes/colors).
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '0.75rem',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {playerData.textures.map((texture, idx) => (
              <div
                key={texture.name}
                onClick={() => setSelectedTexture(idx)}
                style={{
                  background: selectedTexture === idx ? '#667eea33' : '#1a1a1a',
                  border: `2px solid ${selectedTexture === idx ? '#667eea' : '#333'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  overflow: 'hidden'
                }}
              >
                <img
                  src={`${basePath}/${characterName}/textures/${texture.name}.png`}
                  alt={texture.name}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    imageRendering: 'pixelated'
                  }}
                  onError={(e) => {
                    // Hide broken images
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div style={{
                  padding: '0.5rem',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  borderTop: `1px solid ${selectedTexture === idx ? '#667eea' : '#333'}`
                }}>
                  {texture.name.replace(/^pc_\d+_/, '')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
