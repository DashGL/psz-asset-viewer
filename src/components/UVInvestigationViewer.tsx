import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';

interface MeshInfo {
  name: string;
  materialName: string;
  textureName: string;
  visible: boolean;
  mesh: THREE.Mesh;
  faceCount: number;
  uvBounds: {
    min: { u: number; v: number };
    max: { u: number; v: number };
  };
}

function Model({ modelUrl, meshVisibility }: { modelUrl: string; meshVisibility: Map<string, boolean> }) {
  const gltf = useGLTF(modelUrl);

  useEffect(() => {
    // Update visibility for each mesh
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const meshName = child.name || child.uuid;
        child.visible = meshVisibility.get(meshName) ?? true;
      }
    });
  }, [gltf, meshVisibility]);

  return <primitive object={gltf.scene} />;
}

interface UVInvestigationViewerProps {
  modelUrl: string;
}

export default function UVInvestigationViewer({ modelUrl }: UVInvestigationViewerProps) {
  const [meshes, setMeshes] = useState<MeshInfo[]>([]);
  const [meshVisibility, setMeshVisibility] = useState<Map<string, boolean>>(new Map());
  const [selectedMesh, setSelectedMesh] = useState<string | null>(null);
  const [showUVDetails, setShowUVDetails] = useState(false);

  // Load and analyze the model
  useEffect(() => {
    import('three/examples/jsm/loaders/GLTFLoader').then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => {
        const meshInfos: MeshInfo[] = [];

        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshStandardMaterial;
            const texture = material.map;

            const meshName = child.name || child.uuid;
            const materialName = material.name || 'Unnamed Material';
            const textureName = texture?.name || texture?.image?.src?.split('/').pop() || 'No Texture';

            // Calculate face count and UV bounds
            const geometry = child.geometry;
            const faceCount = geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;

            let uvBounds = {
              min: { u: Infinity, v: Infinity },
              max: { u: -Infinity, v: -Infinity }
            };

            if (geometry.attributes.uv) {
              const uvAttribute = geometry.attributes.uv;
              for (let i = 0; i < uvAttribute.count; i++) {
                const u = uvAttribute.getX(i);
                const v = uvAttribute.getY(i);
                uvBounds.min.u = Math.min(uvBounds.min.u, u);
                uvBounds.min.v = Math.min(uvBounds.min.v, v);
                uvBounds.max.u = Math.max(uvBounds.max.u, u);
                uvBounds.max.v = Math.max(uvBounds.max.v, v);
              }
            }

            meshInfos.push({
              name: meshName,
              materialName,
              textureName,
              visible: true,
              mesh: child,
              faceCount: Math.floor(faceCount),
              uvBounds,
            });
          }
        });

        setMeshes(meshInfos);

        // Initialize visibility map
        const visMap = new Map<string, boolean>();
        meshInfos.forEach(m => visMap.set(m.name, true));
        setMeshVisibility(visMap);
      });
    });
  }, [modelUrl]);

  const toggleMesh = (meshName: string) => {
    setMeshVisibility(prev => {
      const newMap = new Map(prev);
      newMap.set(meshName, !prev.get(meshName));
      return newMap;
    });
  };

  const toggleAll = (visible: boolean) => {
    setMeshVisibility(prev => {
      const newMap = new Map(prev);
      meshes.forEach(m => newMap.set(m.name, visible));
      return newMap;
    });
  };

  const selectedMeshInfo = useMemo(() => {
    return meshes.find(m => m.name === selectedMesh);
  }, [meshes, selectedMesh]);

  // Group meshes by material
  const groupedMeshes = useMemo(() => {
    const groups = new Map<string, MeshInfo[]>();
    meshes.forEach(mesh => {
      const key = mesh.materialName;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(mesh);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [meshes]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', height: '100vh', gap: '1rem' }}>
      {/* Control Panel */}
      <div style={{
        background: '#1a1a1a',
        padding: '1rem',
        overflowY: 'auto',
        borderRadius: '8px',
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>UV Investigation</h2>

        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => toggleAll(true)}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Show All
          </button>
          <button
            onClick={() => toggleAll(false)}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Hide All
          </button>
        </div>

        <div style={{
          fontSize: '0.85rem',
          marginBottom: '1rem',
          padding: '0.75rem',
          background: '#2a2a2a',
          borderRadius: '4px',
        }}>
          <strong>Total Meshes:</strong> {meshes.length}<br />
          <strong>Visible:</strong> {Array.from(meshVisibility.values()).filter(v => v).length}
        </div>

        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Meshes by Material</h3>

        {groupedMeshes.map(([materialName, meshGroup]) => (
          <div key={materialName} style={{ marginBottom: '1.5rem' }}>
            <div style={{
              fontSize: '0.9rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: '#4a90e2',
            }}>
              {materialName}
              <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '0.5rem' }}>
                ({meshGroup.length})
              </span>
            </div>

            <div style={{ paddingLeft: '0.5rem' }}>
              {meshGroup.map((mesh) => (
                <div
                  key={mesh.name}
                  style={{
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    background: selectedMesh === mesh.name ? '#3a4a5a' : '#2a2a2a',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: meshVisibility.get(mesh.name) ? '1px solid #4a90e2' : '1px solid #444',
                  }}
                  onClick={() => setSelectedMesh(mesh.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={meshVisibility.get(mesh.name) || false}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleMesh(mesh.name);
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem' }}>
                        {mesh.name || 'Unnamed'}
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                        {mesh.textureName}
                      </div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                        {mesh.faceCount} faces
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 3D Viewer */}
      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
        <Canvas camera={{ position: [10, 5, 10], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <Model modelUrl={modelUrl} meshVisibility={meshVisibility} />
          <OrbitControls />
          <gridHelper args={[20, 20]} />
        </Canvas>

        {/* Selected Mesh Info Overlay */}
        {selectedMeshInfo && (
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            right: '1rem',
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Selected: {selectedMeshInfo.name}
            </div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
              <strong>Material:</strong> {selectedMeshInfo.materialName}<br />
              <strong>Texture:</strong> {selectedMeshInfo.textureName}<br />
              <strong>Faces:</strong> {selectedMeshInfo.faceCount}<br />
              <strong>Vertices:</strong> {selectedMeshInfo.mesh.geometry.attributes.position?.count || 0}<br />
              <strong>UV Count:</strong> {selectedMeshInfo.mesh.geometry.attributes.uv?.count || 0}<br />
              <strong>Indexed:</strong> {selectedMeshInfo.mesh.geometry.index ? 'Yes' : 'No'}<br />
              {selectedMeshInfo.mesh.geometry.index && (
                <span><strong>Indices:</strong> {selectedMeshInfo.mesh.geometry.index.count}<br /></span>
              )}
              <strong>Visible:</strong> {meshVisibility.get(selectedMeshInfo.name) ? 'Yes' : 'No'}
            </div>

            {/* UV Bounds */}
            <div style={{
              marginTop: '0.75rem',
              padding: '0.5rem',
              background: (selectedMeshInfo.uvBounds.min.u < -0.1 || selectedMeshInfo.uvBounds.max.u > 1.1 ||
                           selectedMeshInfo.uvBounds.min.v < -0.1 || selectedMeshInfo.uvBounds.max.v > 1.1)
                ? 'rgba(255, 69, 58, 0.3)' : 'rgba(74, 144, 226, 0.2)',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                UV Bounds:
                {(selectedMeshInfo.uvBounds.min.u < -0.1 || selectedMeshInfo.uvBounds.max.u > 1.1 ||
                  selectedMeshInfo.uvBounds.min.v < -0.1 || selectedMeshInfo.uvBounds.max.v > 1.1) && (
                  <span style={{ marginLeft: '0.5rem', color: '#ff453a', fontSize: '0.75rem' }}>⚠️ OUT OF RANGE</span>
                )}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                Min: ({selectedMeshInfo.uvBounds.min.u.toFixed(4)}, {selectedMeshInfo.uvBounds.min.v.toFixed(4)})<br />
                Max: ({selectedMeshInfo.uvBounds.max.u.toFixed(4)}, {selectedMeshInfo.uvBounds.max.v.toFixed(4)})<br />
                <div style={{ marginTop: '0.25rem', opacity: 0.8 }}>
                  Range: U=[{selectedMeshInfo.uvBounds.min.u.toFixed(2)} to {selectedMeshInfo.uvBounds.max.u.toFixed(2)}],
                  V=[{selectedMeshInfo.uvBounds.min.v.toFixed(2)} to {selectedMeshInfo.uvBounds.max.v.toFixed(2)}]
                </div>
              </div>
            </div>

            {/* UV Details Toggle */}
            <div style={{ marginTop: '0.75rem' }}>
              <button
                onClick={() => setShowUVDetails(!showUVDetails)}
                style={{
                  padding: '0.5rem 1rem',
                  background: showUVDetails ? '#4a90e2' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  width: '100%',
                }}
              >
                {showUVDetails ? 'Hide' : 'Show'} All UV Coordinates
              </button>

              {showUVDetails && selectedMeshInfo.mesh.geometry.attributes.uv && (
                <div style={{
                  marginTop: '0.5rem',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  background: 'rgba(0, 0, 0, 0.5)',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem'
                }}>
                  {(() => {
                    const uvAttr = selectedMeshInfo.mesh.geometry.attributes.uv;
                    const uvList = [];
                    for (let i = 0; i < Math.min(uvAttr.count, 100); i++) {
                      const u = uvAttr.getX(i);
                      const v = uvAttr.getY(i);
                      uvList.push(
                        <div key={i} style={{ padding: '2px 0' }}>
                          UV[{i}]: ({u.toFixed(4)}, {v.toFixed(4)})
                        </div>
                      );
                    }
                    if (uvAttr.count > 100) {
                      uvList.push(
                        <div key="more" style={{ padding: '2px 0', opacity: 0.6 }}>
                          ... and {uvAttr.count - 100} more
                        </div>
                      );
                    }
                    return uvList;
                  })()}
                </div>
              )}
            </div>

            {/* Show texture if available */}
            {selectedMeshInfo.mesh.material instanceof THREE.MeshStandardMaterial &&
             selectedMeshInfo.mesh.material.map && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Texture Preview:</div>
                <img
                  src={selectedMeshInfo.mesh.material.map.image.src}
                  alt="Texture"
                  style={{
                    maxWidth: '200px',
                    maxHeight: '200px',
                    imageRendering: 'pixelated',
                    border: '1px solid #4a90e2',
                    borderRadius: '4px',
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
