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

  const copyFaceData = (face: FaceInfo) => {
    const text = `Face ${face.faceIndex} - ${face.materialName}
UV Coordinates:
  Vertex 0: U=${face.uvs[0].u.toFixed(4)}, V=${face.uvs[0].v.toFixed(4)}
  Vertex 1: U=${face.uvs[1].u.toFixed(4)}, V=${face.uvs[1].v.toFixed(4)}
  Vertex 2: U=${face.uvs[2].u.toFixed(4)}, V=${face.uvs[2].v.toFixed(4)}
Vertex Positions:
  V0: (${face.vertices[0].x.toFixed(2)}, ${face.vertices[0].y.toFixed(2)}, ${face.vertices[0].z.toFixed(2)})
  V1: (${face.vertices[1].x.toFixed(2)}, ${face.vertices[1].y.toFixed(2)}, ${face.vertices[1].z.toFixed(2)})
  V2: (${face.vertices[2].x.toFixed(2)}, ${face.vertices[2].y.toFixed(2)}, ${face.vertices[2].z.toFixed(2)})`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 500px', height: '100vh', gap: '1rem' }}>
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

        {/* Stats Overlay */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '0.75rem',
          borderRadius: '8px',
          fontSize: '0.85rem',
          backdropFilter: 'blur(10px)',
        }}>
          <strong>Total Faces:</strong> {faces.length}<br />
          <strong>Filtered:</strong> {filteredFaces.length}<br />
          <strong>Visible:</strong> {visibleFaces.size}
        </div>
      </div>

      {/* Face List Panel */}
      <div style={{
        background: '#1a1a1a',
        padding: '1rem',
        overflowY: 'auto',
        borderRadius: '8px',
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Face List</h2>

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredFaces.map((face) => {
            const faceKey = `${face.meshName}_face_${face.faceIndex}`;
            const isVisible = visibleFaces.has(faceKey);
            const hasOutOfRangeUVs = face.uvs.some(isUVOutOfRange);
            const isSelected = selectedFace === faceKey;

            return (
              <div
                key={faceKey}
                style={{
                  padding: '0.75rem',
                  background: isSelected ? '#3a4a5a' : '#2a2a2a',
                  borderRadius: '4px',
                  border: isVisible ? '2px solid #4a90e2' : '2px solid #444',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={() => toggleFace(face.meshName, face.faceIndex)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Face {face.faceIndex}
                    {hasOutOfRangeUVs && <span style={{ marginLeft: '0.5rem', color: '#ff453a' }}>⚠️</span>}
                  </div>
                  <button
                    onClick={() => {
                      copyFaceData(face);
                      setSelectedFace(faceKey);
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      background: '#4a90e2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Copy
                  </button>
                </div>

                {/* Material */}
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '0.5rem' }}>
                  {face.materialName}
                </div>

                {/* UV Coordinates */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>UVs:</div>
                  {face.uvs.map((uv, i) => (
                    <div
                      key={i}
                      style={{
                        color: isUVOutOfRange(uv) ? '#ff453a' : 'inherit',
                        padding: '1px 0'
                      }}
                    >
                      V{i}: ({uv.u.toFixed(4)}, {uv.v.toFixed(4)})
                      {isUVOutOfRange(uv) && ' ⚠️'}
                    </div>
                  ))}
                </div>

                {/* Vertex Positions (collapsed by default, expand on selection) */}
                {isSelected && (
                  <div style={{
                    marginTop: '0.5rem',
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Positions:</div>
                    {face.vertices.map((v, i) => (
                      <div key={i} style={{ padding: '1px 0' }}>
                        V{i}: ({v.x.toFixed(2)}, {v.y.toFixed(2)}, {v.z.toFixed(2)})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
