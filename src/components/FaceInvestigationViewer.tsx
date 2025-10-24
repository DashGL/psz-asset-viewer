import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';

interface FaceInfo {
  faceIndex: number;
  materialName: string;
  uvs: [
    { u: number; v: number },
    { u: number; v: number },
    { u: number; v: number }
  ];
  vertices: [
    { x: number; y: number; z: number },
    { x: number; y: number; z: number },
    { x: number; y: number; z: number }
  ];
  meshName: string;
  visible: boolean;
}

function Model({ modelUrl, visibleFaces }: { modelUrl: string; visibleFaces: Set<string> }) {
  const gltf = useGLTF(modelUrl);

  useEffect(() => {
    // Update face visibility by setting material opacity
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const meshName = child.name || child.uuid;
        const geometry = child.geometry;

        // Create color attribute for face visibility
        if (!geometry.attributes.color) {
          const colors = new Float32Array(geometry.attributes.position.count * 3);
          colors.fill(1); // Default white
          geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        }

        const colorAttr = geometry.attributes.color;
        const faceCount = geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;

        for (let i = 0; i < faceCount; i++) {
          const faceKey = `${meshName}_face_${i}`;
          const visible = visibleFaces.has(faceKey);
          const alpha = visible ? 1 : 0.1;

          // Set color for this face's vertices
          const vertexIndices = geometry.index
            ? [geometry.index.getX(i * 3), geometry.index.getX(i * 3 + 1), geometry.index.getX(i * 3 + 2)]
            : [i * 3, i * 3 + 1, i * 3 + 2];

          vertexIndices.forEach(vi => {
            colorAttr.setXYZ(vi, alpha, alpha, alpha);
          });
        }

        colorAttr.needsUpdate = true;

        // Update material to use vertex colors
        if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.vertexColors = true;
          child.material.needsUpdate = true;
        }
      }
    });
  }, [gltf, visibleFaces]);

  return <primitive object={gltf.scene} />;
}

interface FaceInvestigationViewerProps {
  modelUrl: string;
}

export default function FaceInvestigationViewer({ modelUrl }: FaceInvestigationViewerProps) {
  const [faces, setFaces] = useState<FaceInfo[]>([]);
  const [visibleFaces, setVisibleFaces] = useState<Set<string>>(new Set());
  const [selectedFace, setSelectedFace] = useState<string | null>(null);
  const [filterMaterial, setFilterMaterial] = useState<string>('');

  // Load and analyze faces
  useEffect(() => {
    import('three/examples/jsm/loaders/GLTFLoader').then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => {
        const faceInfos: FaceInfo[] = [];
        const visibleSet = new Set<string>();

        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshStandardMaterial;
            const geometry = child.geometry;
            const meshName = child.name || child.uuid;
            const materialName = material.name || 'Unnamed Material';

            const posAttr = geometry.attributes.position;
            const uvAttr = geometry.attributes.uv;
            const faceCount = geometry.index ? geometry.index.count / 3 : posAttr.count / 3;

            for (let i = 0; i < faceCount; i++) {
              const vertexIndices = geometry.index
                ? [geometry.index.getX(i * 3), geometry.index.getX(i * 3 + 1), geometry.index.getX(i * 3 + 2)]
                : [i * 3, i * 3 + 1, i * 3 + 2];

              const vertices: FaceInfo['vertices'] = [
                { x: posAttr.getX(vertexIndices[0]), y: posAttr.getY(vertexIndices[0]), z: posAttr.getZ(vertexIndices[0]) },
                { x: posAttr.getX(vertexIndices[1]), y: posAttr.getY(vertexIndices[1]), z: posAttr.getZ(vertexIndices[1]) },
                { x: posAttr.getX(vertexIndices[2]), y: posAttr.getY(vertexIndices[2]), z: posAttr.getZ(vertexIndices[2]) }
              ];

              const uvs: FaceInfo['uvs'] = uvAttr ? [
                { u: uvAttr.getX(vertexIndices[0]), v: uvAttr.getY(vertexIndices[0]) },
                { u: uvAttr.getX(vertexIndices[1]), v: uvAttr.getY(vertexIndices[1]) },
                { u: uvAttr.getX(vertexIndices[2]), v: uvAttr.getY(vertexIndices[2]) }
              ] : [
                { u: 0, v: 0 },
                { u: 0, v: 0 },
                { u: 0, v: 0 }
              ];

              const faceKey = `${meshName}_face_${i}`;

              faceInfos.push({
                faceIndex: i,
                materialName,
                meshName,
                vertices,
                uvs,
                visible: true
              });

              visibleSet.add(faceKey);
            }
          }
        });

        setFaces(faceInfos);
        setVisibleFaces(visibleSet);
      });
    });
  }, [modelUrl]);

  const toggleFace = (meshName: string, faceIndex: number) => {
    const faceKey = `${meshName}_face_${faceIndex}`;
    setVisibleFaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(faceKey)) {
        newSet.delete(faceKey);
      } else {
        newSet.add(faceKey);
      }
      return newSet;
    });
  };

  const toggleAll = (visible: boolean) => {
    if (visible) {
      const allFaces = new Set<string>();
      faces.forEach(f => {
        const faceKey = `${f.meshName}_face_${f.faceIndex}`;
        allFaces.add(faceKey);
      });
      setVisibleFaces(allFaces);
    } else {
      setVisibleFaces(new Set());
    }
  };

  const filteredFaces = useMemo(() => {
    if (!filterMaterial) return faces;
    return faces.filter(f => f.materialName === filterMaterial);
  }, [faces, filterMaterial]);

  const materials = useMemo(() => {
    const mats = new Set<string>();
    faces.forEach(f => mats.add(f.materialName));
    return Array.from(mats).sort();
  }, [faces]);

  const selectedFaceInfo = useMemo(() => {
    if (!selectedFace) return null;
    const [meshName, , faceIndexStr] = selectedFace.split('_face_');
    const faceIndex = parseInt(faceIndexStr);
    return faces.find(f => f.meshName.includes(meshName) && f.faceIndex === faceIndex);
  }, [faces, selectedFace]);

  const isUVOutOfRange = (uv: { u: number; v: number }) => {
    return uv.u < -0.1 || uv.u > 1.1 || uv.v < -0.1 || uv.v > 1.1;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', height: '100vh', gap: '1rem' }}>
      {/* Control Panel */}
      <div style={{
        background: '#1a1a1a',
        padding: '1rem',
        overflowY: 'auto',
        borderRadius: '8px',
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Face Investigation</h2>

        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => toggleAll(true)} style={{
              flex: 1, padding: '0.5rem', background: '#4a90e2', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
            }}>Show All</button>
            <button onClick={() => toggleAll(false)} style={{
              flex: 1, padding: '0.5rem', background: '#666', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
            }}>Hide All</button>
          </div>

          <select
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            style={{
              padding: '0.5rem',
              background: '#2a2a2a',
              color: 'white',
              border: '1px solid #444',
              borderRadius: '4px',
              fontSize: '0.85rem'
            }}
          >
            <option value="">All Materials</option>
            {materials.map(mat => (
              <option key={mat} value={mat}>{mat}</option>
            ))}
          </select>
        </div>

        <div style={{
          fontSize: '0.85rem',
          marginBottom: '1rem',
          padding: '0.75rem',
          background: '#2a2a2a',
          borderRadius: '4px',
        }}>
          <strong>Total Faces:</strong> {faces.length}<br />
          <strong>Filtered:</strong> {filteredFaces.length}<br />
          <strong>Visible:</strong> {visibleFaces.size}
        </div>

        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Faces</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredFaces.map((face) => {
            const faceKey = `${face.meshName}_face_${face.faceIndex}`;
            const isVisible = visibleFaces.has(faceKey);
            const hasOutOfRangeUVs = face.uvs.some(isUVOutOfRange);

            return (
              <div
                key={faceKey}
                style={{
                  padding: '0.5rem',
                  background: selectedFace === faceKey ? '#3a4a5a' : '#2a2a2a',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: isVisible ? '1px solid #4a90e2' : '1px solid #444',
                }}
                onClick={() => setSelectedFace(faceKey)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleFace(face.meshName, face.faceIndex);
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      Face {face.faceIndex}
                      {hasOutOfRangeUVs && <span style={{ marginLeft: '0.5rem', color: '#ff453a' }}>⚠️</span>}
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                      {face.materialName}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3D Viewer */}
      <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
        <Canvas camera={{ position: [10, 5, 10], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.3} />
          <Model modelUrl={modelUrl} visibleFaces={visibleFaces} />
          <OrbitControls />
          <gridHelper args={[20, 20]} />
        </Canvas>

        {/* Selected Face Info Overlay */}
        {selectedFaceInfo && (
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            right: '1rem',
            background: 'rgba(0, 0, 0, 0.9)',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            backdropFilter: 'blur(10px)',
            maxHeight: '50vh',
            overflowY: 'auto',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
              Face {selectedFaceInfo.faceIndex} - {selectedFaceInfo.materialName}
            </div>

            <div style={{
              marginTop: '0.75rem',
              padding: '0.5rem',
              background: 'rgba(74, 144, 226, 0.2)',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.8rem'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>UV Coordinates:</div>
              {selectedFaceInfo.uvs.map((uv, i) => (
                <div
                  key={i}
                  style={{
                    padding: '2px 0',
                    color: isUVOutOfRange(uv) ? '#ff453a' : 'inherit'
                  }}
                >
                  Vertex {i}: U={uv.u.toFixed(4)}, V={uv.v.toFixed(4)}
                  {isUVOutOfRange(uv) && ' ⚠️ OUT OF RANGE'}
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '0.75rem',
              padding: '0.5rem',
              background: 'rgba(74, 144, 226, 0.1)',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.75rem'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Vertex Positions:</div>
              {selectedFaceInfo.vertices.map((v, i) => (
                <div key={i} style={{ padding: '2px 0' }}>
                  V{i}: ({v.x.toFixed(2)}, {v.y.toFixed(2)}, {v.z.toFixed(2)})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
