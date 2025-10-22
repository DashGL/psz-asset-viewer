import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import type { Group } from 'three';
import * as THREE from 'three';
import { CHARACTER_RACES, getTextureName, getModelPath, getTexturePath, type CharacterClass, type RaceConfig } from '../config/characterConfig';
import { loadGLB, loadTexture, getCacheStats } from '../utils/assetCache';

interface CharacterCreatorProps {
  basePath: string;
}

interface ModelProps {
  url: string;
  textureUrl?: string;
}

function CharacterModel({ url, textureUrl }: ModelProps) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(url);

  useEffect(() => {
    if (!textureUrl || !gltf.scene) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      textureUrl,
      (texture) => {
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace;

        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => {
                  mat.map = texture;
                  mat.needsUpdate = true;
                });
              } else {
                mesh.material.map = texture;
                mesh.material.needsUpdate = true;
              }
            }
          }
        });
      },
      undefined,
      (error) => console.error('Error loading texture:', error)
    );
  }, [textureUrl, gltf.scene]);

  return <primitive ref={group} object={gltf.scene} />;
}

export default function CharacterCreator({ basePath }: CharacterCreatorProps) {
  const [selectedRace, setSelectedRace] = useState<RaceConfig | null>(null);
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSkinTone, setSelectedSkinTone] = useState(0);

  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState({ glbCount: 0, textureCount: 0 });

  // Update cache stats
  useEffect(() => {
    const updateStats = async () => {
      const stats = await getCacheStats();
      setCacheStats(stats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load model when variation changes
  useEffect(() => {
    if (!selectedVariation) return;

    const loadModel = async () => {
      try {
        const modelPath = basePath + getModelPath(selectedVariation);
        const cachedUrl = await loadGLB(modelPath);
        setModelUrl(cachedUrl);
      } catch (error) {
        console.error('Error loading model:', error);
      }
    };

    loadModel();
  }, [selectedVariation, basePath]);

  // Load texture when color or skin tone changes
  useEffect(() => {
    if (!selectedVariation) return;

    const loadTextureFn = async () => {
      try {
        const textureName = getTextureName(selectedVariation, selectedColor, selectedSkinTone);
        const texturePath = basePath + getTexturePath(selectedVariation, textureName);
        const cachedUrl = await loadTexture(texturePath);
        setTextureUrl(cachedUrl);
      } catch (error) {
        console.error('Error loading texture:', error);
      }
    };

    loadTextureFn();
  }, [selectedVariation, selectedColor, selectedSkinTone, basePath]);

  const handleRaceSelect = (race: RaceConfig) => {
    setSelectedRace(race);
    setSelectedClass(null);
    setSelectedVariation(null);
    setModelUrl(null);
    setTextureUrl(null);
  };

  const handleClassSelect = (cls: CharacterClass) => {
    setSelectedClass(cls);
    setSelectedVariation(cls.variations[0]);
    setSelectedColor(0);
    setSelectedSkinTone(0);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', height: 'calc(100vh - 100px)', gap: 0 }}>
      {/* Sidebar */}
      <div style={{
        background: '#111',
        borderRight: '1px solid #333',
        overflowY: 'auto',
        padding: '2rem'
      }}>
        {/* Race Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '1rem', color: '#667eea', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            Race
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {CHARACTER_RACES.map(race => (
              <button
                key={race.id}
                onClick={() => handleRaceSelect(race)}
                className={`option-btn ${selectedRace?.id === race.id ? 'active' : ''}`}
                style={{
                  background: selectedRace?.id === race.id ? 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)' : '#1a1a1a',
                  border: selectedRace?.id === race.id ? '1px solid #667eea' : '1px solid #333',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: selectedRace?.id === race.id ? '#fff' : '#aaa',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  textAlign: 'center',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  boxShadow: selectedRace?.id === race.id ? '0 0 20px rgba(102, 126, 234, 0.3)' : 'none'
                }}
              >
                {race.name}
              </button>
            ))}
          </div>
        </div>

        {/* Class Selection */}
        {selectedRace && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '1rem', color: '#667eea', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Class
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {selectedRace.classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => handleClassSelect(cls)}
                  style={{
                    background: selectedClass?.id === cls.id ? 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)' : '#1a1a1a',
                    border: selectedClass?.id === cls.id ? '1px solid #667eea' : '1px solid #333',
                    borderRadius: '8px',
                    padding: '1rem',
                    color: selectedClass?.id === cls.id ? '#fff' : '#aaa',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    boxShadow: selectedClass?.id === cls.id ? '0 0 20px rgba(102, 126, 234, 0.3)' : 'none'
                  }}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Variation Selection */}
        {selectedClass && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '1rem', color: '#667eea', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Variation
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {selectedClass.variations.map((variation, index) => (
                <button
                  key={variation}
                  onClick={() => setSelectedVariation(variation)}
                  style={{
                    background: selectedVariation === variation ? 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)' : '#1a1a1a',
                    border: selectedVariation === variation ? '1px solid #667eea' : '1px solid #333',
                    borderRadius: '8px',
                    padding: '1rem',
                    color: selectedVariation === variation ? '#fff' : '#aaa',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    textAlign: 'center',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    boxShadow: selectedVariation === variation ? '0 0 20px rgba(102, 126, 234, 0.3)' : 'none'
                  }}
                >
                  Variation {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Selection */}
        {selectedClass && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '1rem', color: '#667eea', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Color
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
              {selectedClass.colors.map((color, index) => (
                <div key={color.name}>
                  <div
                    onClick={() => setSelectedColor(index)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: selectedColor === index ? '2px solid #667eea' : '2px solid #333',
                      background: '#1a1a1a',
                      transition: 'all 0.2s ease',
                      transform: selectedColor === index ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: selectedColor === index ? '0 0 20px rgba(102, 126, 234, 0.5)' : 'none'
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#888', textAlign: 'center', marginTop: '0.25rem' }}>
                    {color.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skin Tone Selection */}
        {selectedClass && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '1rem', color: '#667eea', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Skin Tone
            </div>
            <div style={{ marginTop: '1rem' }}>
              <input
                type="range"
                min="0"
                max="8"
                value={selectedSkinTone}
                onChange={(e) => setSelectedSkinTone(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'linear-gradient(90deg, #f5d5c0, #8b7355)',
                  borderRadius: '4px',
                  outline: 'none',
                  WebkitAppearance: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
                <span>Light</span>
                <span>{selectedSkinTone + 1}</span>
                <span>Dark</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div style={{ position: 'relative', background: '#0a0a0a' }}>
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 1, 3]} />
          <OrbitControls
            enableDamping
            dampingFactor={0.05}
            target={[0, 0.8, 0]}
          />

          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 7.5]} intensity={0.8} />
          <directionalLight position={[-5, 5, -5]} intensity={0.3} />

          {modelUrl && textureUrl && (
            <Suspense fallback={null}>
              <CharacterModel url={modelUrl} textureUrl={textureUrl} />
            </Suspense>
          )}
        </Canvas>

        {!modelUrl && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#667eea',
            fontSize: '1.2rem'
          }}>
            {selectedClass ? 'Loading character...' : 'Select a character class to begin'}
          </div>
        )}

        <div style={{
          position: 'absolute',
          bottom: '1rem',
          right: '1rem',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid #333',
          fontSize: '0.8rem',
          color: '#aaa'
        }}>
          <div>
            <strong style={{ color: '#667eea' }}>Cache:</strong> {cacheStats.glbCount} models, {cacheStats.textureCount} textures
          </div>
        </div>
      </div>
    </div>
  );
}
