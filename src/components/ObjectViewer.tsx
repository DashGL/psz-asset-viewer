import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useGLTF } from '@react-three/drei';
import { Suspense, useState, useEffect, useRef } from 'react';
import type { Group } from 'three';

interface ObjectInfo {
  id: string;
  modelCount: number;
  totalModels: number;
  textureCount: number;
  models?: string[];
}

interface ObjectData {
  info: ObjectInfo | null;
}

interface ModelProps {
  url: string;
}

function ObjectModel({ url }: ModelProps) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(url);

  return (
    <group ref={group}>
      <primitive object={gltf.scene} />
    </group>
  );
}

interface ObjectViewerProps {
  objectId: string;
  basePath?: string;
}

export default function ObjectViewer({ objectId, basePath = '/objects' }: ObjectViewerProps) {
  const [objectData, setObjectData] = useState<ObjectData>({ info: null });
  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mainObjectPath = `${basePath}/${objectId}`;

  useEffect(() => {
    const loadObjectData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load info.json
        const infoResponse = await fetch(`${mainObjectPath}/info.json`);
        if (!infoResponse.ok) {
          throw new Error(`File not found: info.json`);
        }
        const info: ObjectInfo = await infoResponse.json();

        setObjectData({ info });
        if (info.models && info.models.length > 0) {
          setSelectedModel(info.models[0]);
        } else {
          setSelectedModel(undefined);
        }
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load object data');
        setIsLoading(false);
      }
    };

    loadObjectData();
  }, [objectId, mainObjectPath]);

  const modelUrl = selectedModel
    ? `${mainObjectPath}/${selectedModel}/${selectedModel.replace('.imd', '')}.glb`
    : '';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Model Selector */}
      {objectData.info?.models && objectData.info.models.length > 0 && (
        <div style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px' }}>
          <label htmlFor="model-selector" style={{ color: '#aaa', marginRight: '1rem' }}>Select Model:</label>
          <select
            id="model-selector"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              background: '#1a1a1a',
              color: 'white',
              border: '1px solid #444',
              borderRadius: '4px',
              padding: '0.5rem'
            }}
          >
            {objectData.info.models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>
      )}

      {/* 3D Viewer */}
      <div style={{ width: '100%', height: '600px', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '2rem', color: '#ff6b6b', textAlign: 'center' }}>
            Error: {error}
          </div>
        ) : isLoading ? (
          <div style={{ padding: '2rem', color: '#aaa', textAlign: 'center' }}>
            Loading...
          </div>
        ) : modelUrl ? (
          <Canvas>
            <PerspectiveCamera makeDefault position={[2, 2, 2]} />
            <OrbitControls enableDamping dampingFactor={0.05} />

            {/* Lighting for objects */}
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <directionalLight position={[-5, 3, -5]} intensity={0.3} />

            {/* Grid */}
            <gridHelper args={[10, 10]} />

            {/* Model */}
            <Suspense fallback={null}>
              <ObjectModel url={modelUrl} />
            </Suspense>
          </Canvas>
        ) : (
          <div style={{ padding: '2rem', color: '#aaa', textAlign: 'center' }}>
            No models available for this object.
          </div>
        )}
      </div>

      {/* Object Info */}
      {objectData.info && (
        <div style={{
          padding: '1rem',
          background: '#2a2a2a',
          borderRadius: '8px'
        }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#667eea' }}>Object Info</h3>
          <div style={{ fontSize: '0.9rem', color: '#aaa', display: 'grid', gap: '0.5rem' }}>
            <div><strong>ID:</strong> {objectData.info.id}</div>
            <div><strong>Models:</strong> {objectData.info.modelCount}/{objectData.info.totalModels} converted</div>
            <div><strong>Textures:</strong> {objectData.info.textureCount}</div>
          </div>
        </div>
      )}
    </div>
  );
}