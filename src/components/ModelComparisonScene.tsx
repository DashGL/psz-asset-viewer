import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useState, useEffect } from 'react';
import * as THREE from 'three';

interface ModelViewerProps {
  modelUrl: string;
  onMeshData: (meshes: MeshData[]) => void;
}

interface MeshData {
  name: string;
  materialName: string;
  vertexCount: number;
  faceCount: number;
  uvData: { min: THREE.Vector2; max: THREE.Vector2 };
  hasTexture: boolean;
  textureName?: string;
}

function ModelViewer({ modelUrl, onMeshData }: ModelViewerProps) {
  const gltf = useGLTF(modelUrl);

  useEffect(() => {
    const meshes: MeshData[] = [];

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        const material = child.material as THREE.MeshStandardMaterial;

        // Get UV data
        const uvAttribute = geometry.attributes.uv;
        let uvMin = new THREE.Vector2(Infinity, Infinity);
        let uvMax = new THREE.Vector2(-Infinity, -Infinity);

        if (uvAttribute) {
          for (let i = 0; i < uvAttribute.count; i++) {
            const u = uvAttribute.getX(i);
            const v = uvAttribute.getY(i);
            uvMin.x = Math.min(uvMin.x, u);
            uvMin.y = Math.min(uvMin.y, v);
            uvMax.x = Math.max(uvMax.x, u);
            uvMax.y = Math.max(uvMax.y, v);
          }
        }

        meshes.push({
          name: child.name || 'Unnamed',
          materialName: material.name || 'Unnamed Material',
          vertexCount: geometry.attributes.position.count,
          faceCount: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3,
          uvData: { min: uvMin, max: uvMax },
          hasTexture: !!material.map,
          textureName: material.map?.name || material.map?.source?.data?.src,
        });
      }
    });

    onMeshData(meshes);
  }, [gltf.scene, onMeshData]);

  return <primitive object={gltf.scene} />;
}

interface ModelComparisonSceneProps {
  lndmdModelUrl: string;
  fixedModelUrl: string;
}

export default function ModelComparisonScene({
  lndmdModelUrl,
  fixedModelUrl
}: ModelComparisonSceneProps) {
  const [lndmdMeshes, setLndmdMeshes] = useState<MeshData[]>([]);
  const [fixedMeshes, setFixedMeshes] = useState<MeshData[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [view, setView] = useState<'side-by-side' | 'overlay' | 'data'>('side-by-side');

  // Get unique material names
  const materialNames = Array.from(new Set([
    ...lndmdMeshes.map(m => m.materialName),
    ...fixedMeshes.map(m => m.materialName)
  ])).sort();

  const filteredLndmdMeshes = selectedMaterial === 'all'
    ? lndmdMeshes
    : lndmdMeshes.filter(m => m.materialName === selectedMaterial);

  const filteredFixedMeshes = selectedMaterial === 'all'
    ? fixedMeshes
    : fixedMeshes.filter(m => m.materialName === selectedMaterial);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0a0a0a' }}>
      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.85)',
        padding: '1rem',
        borderRadius: '8px',
        color: '#fff',
        minWidth: '300px',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Model Comparison</h2>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#aaa' }}>
            View Mode:
          </label>
          <select
            value={view}
            onChange={(e) => setView(e.target.value as any)}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '4px',
            }}
          >
            <option value="side-by-side">Side by Side</option>
            <option value="overlay">Overlay</option>
            <option value="data">Data Comparison</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#aaa' }}>
            Material Filter:
          </label>
          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '4px',
            }}
          >
            <option value="all">All Materials</option>
            {materialNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#667eea' }}>Statistics</h3>
          <div style={{ fontSize: '0.85rem', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <strong>lndmd Model:</strong>
              <div style={{ color: '#aaa', marginLeft: '1rem' }}>
                {filteredLndmdMeshes.length} meshes, {filteredLndmdMeshes.reduce((sum, m) => sum + m.faceCount, 0)} faces
              </div>
            </div>
            <div>
              <strong>fixed Model:</strong>
              <div style={{ color: '#aaa', marginLeft: '1rem' }}>
                {filteredFixedMeshes.length} meshes, {filteredFixedMeshes.reduce((sum, m) => sum + m.faceCount, 0)} faces
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {view === 'data' ? (
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          left: '340px',
          bottom: '1rem',
          background: 'rgba(0, 0, 0, 0.85)',
          padding: '1.5rem',
          borderRadius: '8px',
          color: '#fff',
          overflowY: 'auto',
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>UV Data Comparison</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* lndmd Column */}
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#ff6b6b' }}>lndmd Model</h3>
              {filteredLndmdMeshes.map((mesh, idx) => (
                <div key={idx} style={{
                  background: '#1a1a1a',
                  padding: '1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  border: '1px solid #333',
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{mesh.materialName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: '1.6' }}>
                    <div>Mesh: {mesh.name}</div>
                    <div>Vertices: {mesh.vertexCount}</div>
                    <div>Faces: {mesh.faceCount}</div>
                    <div>Has Texture: {mesh.hasTexture ? 'Yes' : 'No'}</div>
                    {mesh.textureName && <div>Texture: {mesh.textureName}</div>}
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#0a0a0a', borderRadius: '4px' }}>
                      <div style={{ color: '#667eea', marginBottom: '0.25rem' }}>UV Range:</div>
                      <div>Min: ({mesh.uvData.min.x.toFixed(4)}, {mesh.uvData.min.y.toFixed(4)})</div>
                      <div>Max: ({mesh.uvData.max.x.toFixed(4)}, {mesh.uvData.max.y.toFixed(4)})</div>
                      <div>Width: {(mesh.uvData.max.x - mesh.uvData.min.x).toFixed(4)}</div>
                      <div>Height: {(mesh.uvData.max.y - mesh.uvData.min.y).toFixed(4)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* fixed Column */}
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#51cf66' }}>fixed Model</h3>
              {filteredFixedMeshes.map((mesh, idx) => (
                <div key={idx} style={{
                  background: '#1a1a1a',
                  padding: '1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  border: '1px solid #333',
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{mesh.materialName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: '1.6' }}>
                    <div>Mesh: {mesh.name}</div>
                    <div>Vertices: {mesh.vertexCount}</div>
                    <div>Faces: {mesh.faceCount}</div>
                    <div>Has Texture: {mesh.hasTexture ? 'Yes' : 'No'}</div>
                    {mesh.textureName && <div>Texture: {mesh.textureName}</div>}
                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#0a0a0a', borderRadius: '4px' }}>
                      <div style={{ color: '#667eea', marginBottom: '0.25rem' }}>UV Range:</div>
                      <div>Min: ({mesh.uvData.min.x.toFixed(4)}, {mesh.uvData.min.y.toFixed(4)})</div>
                      <div>Max: ({mesh.uvData.max.x.toFixed(4)}, {mesh.uvData.max.y.toFixed(4)})</div>
                      <div>Width: {(mesh.uvData.max.x - mesh.uvData.min.x).toFixed(4)}</div>
                      <div>Height: {(mesh.uvData.max.y - mesh.uvData.min.y).toFixed(4)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: view === 'side-by-side' ? 'grid' : 'block',
          gridTemplateColumns: view === 'side-by-side' ? '1fr 1fr' : '1fr',
        }}>
          {/* lndmd Model */}
          <div style={{ position: 'relative', height: '100%' }}>
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: view === 'side-by-side' ? '1rem' : '340px',
              background: 'rgba(255, 107, 107, 0.9)',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              zIndex: 10,
              fontWeight: 'bold',
            }}>
              lndmd (Original)
            </div>
            <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <Suspense fallback={null}>
                <ModelViewer modelUrl={lndmdModelUrl} onMeshData={setLndmdMeshes} />
              </Suspense>
              <OrbitControls />
              <gridHelper args={[20, 20]} />
            </Canvas>
          </div>

          {/* fixed Model */}
          {view === 'side-by-side' && (
            <div style={{ position: 'relative', height: '100%', borderLeft: '2px solid #333' }}>
              <div style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                background: 'rgba(81, 207, 102, 0.9)',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                zIndex: 10,
                fontWeight: 'bold',
              }}>
                fixed (Corrected)
              </div>
              <Canvas camera={{ position: [0, 2, 5], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[10, 10, 5]} intensity={1} />
                <Suspense fallback={null}>
                  <ModelViewer modelUrl={fixedModelUrl} onMeshData={setFixedMeshes} />
                </Suspense>
                <OrbitControls />
                <gridHelper args={[20, 20]} />
              </Canvas>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        background: 'rgba(0, 0, 0, 0.85)',
        padding: '0.75rem 1rem',
        borderRadius: '4px',
        color: '#aaa',
        fontSize: '0.85rem',
      }}>
        <strong>Controls:</strong> Left-click drag: rotate • Right-click drag: pan • Scroll: zoom
      </div>
    </div>
  );
}
