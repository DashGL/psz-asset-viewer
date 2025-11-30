import { useGLTF } from '@react-three/drei';
import { useState, useEffect } from 'react';
import * as THREE from 'three';

interface UVPoint {
  u: number;
  v: number;
}

interface MeshData {
  name: string;
  materialName: string;
  vertexCount: number;
  faceCount: number;
  uvs: UVPoint[];
  hasTexture: boolean;
  textureName?: string;
}

interface ModelLoaderProps {
  modelUrl: string;
  onMeshData: (meshes: MeshData[]) => void;
}

function ModelLoader({ modelUrl, onMeshData }: ModelLoaderProps) {
  const gltf = useGLTF(modelUrl);

  useEffect(() => {
    const meshes: MeshData[] = [];

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        const material = child.material as THREE.MeshStandardMaterial;

        // Get all UV coordinates
        const uvAttribute = geometry.attributes.uv;
        const uvs: UVPoint[] = [];

        if (uvAttribute) {
          for (let i = 0; i < uvAttribute.count; i++) {
            uvs.push({
              u: uvAttribute.getX(i),
              v: uvAttribute.getY(i),
            });
          }
        }

        meshes.push({
          name: child.name || 'Unnamed',
          materialName: material.name || 'Unnamed Material',
          vertexCount: geometry.attributes.position.count,
          faceCount: geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3,
          uvs,
          hasTexture: !!material.map,
          textureName: material.map?.name || material.map?.source?.data?.src,
        });
      }
    });

    onMeshData(meshes);
  }, [gltf.scene, onMeshData]);

  return null;
}

interface ModelComparisonSceneProps {
  lndmdModelUrl: string;
  fixedModelUrl: string;
}

interface MeshComparison {
  materialName: string;
  lndmdMesh?: MeshData;
  fixedMesh?: MeshData;
  uvChanged: boolean;
  geometryChanged: boolean;
}

export default function ModelComparisonScene({
  lndmdModelUrl,
  fixedModelUrl
}: ModelComparisonSceneProps) {
  const [lndmdMeshes, setLndmdMeshes] = useState<MeshData[]>([]);
  const [fixedMeshes, setFixedMeshes] = useState<MeshData[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [showDetailedUVs, setShowDetailedUVs] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'summary' | 'detailed'>('summary');

  // Create mesh comparisons by matching materials
  const comparisons: MeshComparison[] = [];
  const materialNames = new Set<string>();

  lndmdMeshes.forEach(mesh => materialNames.add(mesh.materialName));
  fixedMeshes.forEach(mesh => materialNames.add(mesh.materialName));

  Array.from(materialNames).sort().forEach(materialName => {
    const lndmdMesh = lndmdMeshes.find(m => m.materialName === materialName);
    const fixedMesh = fixedMeshes.find(m => m.materialName === materialName);

    // Check if UVs changed
    let uvChanged = false;
    let geometryChanged = false;

    if (lndmdMesh && fixedMesh) {
      geometryChanged = lndmdMesh.vertexCount !== fixedMesh.vertexCount;

      if (!geometryChanged && lndmdMesh.uvs.length === fixedMesh.uvs.length) {
        for (let i = 0; i < lndmdMesh.uvs.length; i++) {
          const lUV = lndmdMesh.uvs[i];
          const fUV = fixedMesh.uvs[i];
          if (Math.abs(lUV.u - fUV.u) > 0.0001 || Math.abs(lUV.v - fUV.v) > 0.0001) {
            uvChanged = true;
            break;
          }
        }
      } else {
        uvChanged = true;
      }
    }

    comparisons.push({
      materialName,
      lndmdMesh,
      fixedMesh,
      uvChanged,
      geometryChanged,
    });
  });

  const filteredComparisons = selectedMaterial === 'all'
    ? comparisons
    : comparisons.filter(c => c.materialName === selectedMaterial);

  const changedCount = comparisons.filter(c => c.uvChanged || c.geometryChanged).length;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#0a0a0a', overflow: 'hidden' }}>
      {/* Hidden model loaders - just for data extraction */}
      <div style={{ display: 'none' }}>
        <ModelLoader modelUrl={lndmdModelUrl} onMeshData={setLndmdMeshes} />
        <ModelLoader modelUrl={fixedModelUrl} onMeshData={setFixedMeshes} />
      </div>

      {/* Control Panel */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #333',
        color: '#fff',
        width: '320px',
      }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', color: '#667eea' }}>UV Comparison</h2>

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
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '0.9rem',
            }}
          >
            <option value="all">All Materials ({comparisons.length})</option>
            {Array.from(materialNames).sort().map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#aaa' }}>
            View Mode:
          </label>
          <select
            value={comparisonMode}
            onChange={(e) => setComparisonMode(e.target.value as any)}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '0.9rem',
            }}
          >
            <option value="summary">Summary</option>
            <option value="detailed">Detailed UVs</option>
          </select>
        </div>

        <div style={{ borderTop: '1px solid #333', paddingTop: '1rem', marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#667eea' }}>Statistics</h3>
          <div style={{ fontSize: '0.85rem', lineHeight: '1.8', color: '#ccc' }}>
            <div>Total Materials: {comparisons.length}</div>
            <div style={{ color: changedCount > 0 ? '#ff6b6b' : '#51cf66' }}>
              Changed: {changedCount}
            </div>
            <div style={{ color: '#aaa' }}>
              Unchanged: {comparisons.length - changedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        left: '360px',
        bottom: '1rem',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid #333',
        padding: '2rem',
        borderRadius: '8px',
        color: '#fff',
        overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          {comparisonMode === 'summary' ? 'UV Summary Comparison' : 'Detailed UV Data'}
        </h2>

        {filteredComparisons.map((comparison, idx) => {
          const { materialName, lndmdMesh, fixedMesh, uvChanged, geometryChanged } = comparison;

          return (
            <div key={idx} style={{
              background: '#1a1a1a',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: `2px solid ${uvChanged || geometryChanged ? '#ff6b6b' : '#51cf66'}`,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{materialName}</h3>
                <div style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  background: uvChanged || geometryChanged ? '#ff6b6b22' : '#51cf6622',
                  color: uvChanged || geometryChanged ? '#ff6b6b' : '#51cf66',
                  border: `1px solid ${uvChanged || geometryChanged ? '#ff6b6b' : '#51cf66'}`,
                }}>
                  {uvChanged ? 'UVs Changed' : geometryChanged ? 'Geometry Changed' : 'Unchanged'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* lndmd Data */}
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#ff6b6b' }}>lndmd (Original)</h4>
                  {lndmdMesh ? (
                    <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#ccc' }}>
                      <div>Mesh: {lndmdMesh.name}</div>
                      <div>Vertices: {lndmdMesh.vertexCount}</div>
                      <div>Faces: {lndmdMesh.faceCount}</div>
                      <div>Texture: {lndmdMesh.textureName || 'None'}</div>

                      {comparisonMode === 'summary' ? (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#0a0a0a', borderRadius: '4px' }}>
                          <div style={{ color: '#667eea', marginBottom: '0.5rem', fontWeight: 'bold' }}>UV Range:</div>
                          <div>Min U: {Math.min(...lndmdMesh.uvs.map(uv => uv.u)).toFixed(6)}</div>
                          <div>Max U: {Math.max(...lndmdMesh.uvs.map(uv => uv.u)).toFixed(6)}</div>
                          <div>Min V: {Math.min(...lndmdMesh.uvs.map(uv => uv.v)).toFixed(6)}</div>
                          <div>Max V: {Math.max(...lndmdMesh.uvs.map(uv => uv.v)).toFixed(6)}</div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#0a0a0a', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto' }}>
                          <div style={{ color: '#667eea', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            All UV Coordinates ({lndmdMesh.uvs.length}):
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {lndmdMesh.uvs.slice(0, 100).map((uv, i) => (
                              <div key={i}>
                                [{i}] u: {uv.u.toFixed(6)}, v: {uv.v.toFixed(6)}
                              </div>
                            ))}
                            {lndmdMesh.uvs.length > 100 && (
                              <div style={{ color: '#aaa', marginTop: '0.5rem' }}>
                                ... and {lndmdMesh.uvs.length - 100} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#888', fontSize: '0.9rem' }}>Not found in lndmd model</div>
                  )}
                </div>

                {/* fixed Data */}
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', color: '#51cf66' }}>fixed (Corrected)</h4>
                  {fixedMesh ? (
                    <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#ccc' }}>
                      <div>Mesh: {fixedMesh.name}</div>
                      <div>Vertices: {fixedMesh.vertexCount}</div>
                      <div>Faces: {fixedMesh.faceCount}</div>
                      <div>Texture: {fixedMesh.textureName || 'None'}</div>

                      {comparisonMode === 'summary' ? (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#0a0a0a', borderRadius: '4px' }}>
                          <div style={{ color: '#667eea', marginBottom: '0.5rem', fontWeight: 'bold' }}>UV Range:</div>
                          <div>Min U: {Math.min(...fixedMesh.uvs.map(uv => uv.u)).toFixed(6)}</div>
                          <div>Max U: {Math.max(...fixedMesh.uvs.map(uv => uv.u)).toFixed(6)}</div>
                          <div>Min V: {Math.min(...fixedMesh.uvs.map(uv => uv.v)).toFixed(6)}</div>
                          <div>Max V: {Math.max(...fixedMesh.uvs.map(uv => uv.v)).toFixed(6)}</div>
                        </div>
                      ) : (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#0a0a0a', borderRadius: '4px', maxHeight: '300px', overflowY: 'auto' }}>
                          <div style={{ color: '#667eea', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                            All UV Coordinates ({fixedMesh.uvs.length}):
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {fixedMesh.uvs.slice(0, 100).map((uv, i) => {
                              const lUV = lndmdMesh?.uvs[i];
                              const changed = lUV && (Math.abs(lUV.u - uv.u) > 0.0001 || Math.abs(lUV.v - uv.v) > 0.0001);
                              return (
                                <div key={i} style={{ color: changed ? '#ff6b6b' : '#ccc' }}>
                                  [{i}] u: {uv.u.toFixed(6)}, v: {uv.v.toFixed(6)}
                                  {changed && lUV && (
                                    <span style={{ color: '#888', marginLeft: '1rem' }}>
                                      (Δu: {(uv.u - lUV.u).toFixed(6)}, Δv: {(uv.v - lUV.v).toFixed(6)})
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {fixedMesh.uvs.length > 100 && (
                              <div style={{ color: '#aaa', marginTop: '0.5rem' }}>
                                ... and {fixedMesh.uvs.length - 100} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ color: '#888', fontSize: '0.9rem' }}>Not found in fixed model</div>
                  )}
                </div>
              </div>

              {/* Difference Summary */}
              {lndmdMesh && fixedMesh && !geometryChanged && comparisonMode === 'summary' && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#0a0a0a', borderRadius: '4px' }}>
                  <div style={{ color: '#667eea', marginBottom: '0.5rem', fontWeight: 'bold' }}>Differences:</div>
                  <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#ccc' }}>
                    <div>ΔMin U: {(Math.min(...fixedMesh.uvs.map(uv => uv.u)) - Math.min(...lndmdMesh.uvs.map(uv => uv.u))).toFixed(6)}</div>
                    <div>ΔMax U: {(Math.max(...fixedMesh.uvs.map(uv => uv.u)) - Math.max(...lndmdMesh.uvs.map(uv => uv.u))).toFixed(6)}</div>
                    <div>ΔMin V: {(Math.min(...fixedMesh.uvs.map(uv => uv.v)) - Math.min(...lndmdMesh.uvs.map(uv => uv.v))).toFixed(6)}</div>
                    <div>ΔMax V: {(Math.max(...fixedMesh.uvs.map(uv => uv.v)) - Math.max(...lndmdMesh.uvs.map(uv => uv.v))).toFixed(6)}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
