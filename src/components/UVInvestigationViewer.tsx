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

            meshInfos.push({
              name: meshName,
              materialName,
              textureName,
              visible: true,
              mesh: child,
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
              <strong>Visible:</strong> {meshVisibility.get(selectedMeshInfo.name) ? 'Yes' : 'No'}
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
