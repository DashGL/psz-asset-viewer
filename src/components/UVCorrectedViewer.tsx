import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

function CorrectedModel({ modelUrl, materialFilter }: { modelUrl: string; materialFilter: string }) {
  const [correctedScene, setCorrectedScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    import('three/examples/jsm/loaders/GLTFLoader').then(({ GLTFLoader }) => {
      const loader = new GLTFLoader();
      loader.load(modelUrl, (gltf) => {
        const newScene = new THREE.Group();

        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshStandardMaterial;
            const materialName = material.name || 'Unnamed Material';

            // Only process the filtered material
            if (materialName === materialFilter) {
              const geometry = child.geometry.clone();

              // Apply UV corrections
              if (geometry.attributes.uv) {
                const uvAttr = geometry.attributes.uv;
                const posAttr = geometry.attributes.position;
                const faceCount = geometry.index ? geometry.index.count / 3 : posAttr.count / 3;

                console.log(`Processing ${materialName}: ${faceCount} faces`);

                for (let i = 0; i < faceCount; i++) {
                  const vertexIndices = geometry.index
                    ? [geometry.index.getX(i * 3), geometry.index.getX(i * 3 + 1), geometry.index.getX(i * 3 + 2)]
                    : [i * 3, i * 3 + 1, i * 3 + 2];

                  // Get Y positions for this face
                  const y0 = posAttr.getY(vertexIndices[0]);
                  const y1 = posAttr.getY(vertexIndices[1]);
                  const y2 = posAttr.getY(vertexIndices[2]);

                  // Check if face is horizontal (all Y values within 0.01 tolerance)
                  const isHorizontal = Math.abs(y0 - y1) < 0.01 && Math.abs(y1 - y2) < 0.01 && Math.abs(y0 - y2) < 0.01;

                  // Apply UV correction
                  for (const vertexIndex of vertexIndices) {
                    const u = uvAttr.getX(vertexIndex);
                    const v = uvAttr.getY(vertexIndex);

                    let newV = v;
                    if (isHorizontal) {
                      // Floor faces: scale to top half (0.0-0.5)
                      // UVs are relative to atlas region, so scale by 0.5
                      newV = v * 0.5;
                    } else {
                      // Vertical faces (billboards): scale to bottom half (0.5-1.0)
                      // UVs are relative to atlas region, so scale by 0.5 and offset by 0.5
                      newV = v * 0.5 + 0.5;
                    }

                    uvAttr.setXY(vertexIndex, u, newV);
                  }
                }

                uvAttr.needsUpdate = true;
              }

              // Clone the material and create new mesh
              const newMaterial = material.clone();
              const newMesh = new THREE.Mesh(geometry, newMaterial);
              newMesh.position.copy(child.position);
              newMesh.rotation.copy(child.rotation);
              newMesh.scale.copy(child.scale);
              newScene.add(newMesh);
            }
          }
        });

        console.log(`Created scene with ${newScene.children.length} meshes`);
        setCorrectedScene(newScene);
      });
    });
  }, [modelUrl, materialFilter]);

  return correctedScene ? <primitive object={correctedScene} /> : null;
}

interface UVCorrectedViewerProps {
  modelUrl: string;
  materialFilter?: string;
}

export default function UVCorrectedViewer({ modelUrl, materialFilter = 'Material__794' }: UVCorrectedViewerProps) {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#000' }}>
      <Canvas camera={{ position: [10, 5, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <CorrectedModel modelUrl={modelUrl} materialFilter={materialFilter} />
        <OrbitControls />
        <gridHelper args={[20, 20]} />
      </Canvas>

      {/* Info Overlay */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '1rem',
        borderRadius: '8px',
        color: 'white',
        fontSize: '0.9rem',
        backdropFilter: 'blur(10px)',
        maxWidth: '400px',
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>UV Corrected Viewer</h2>
        <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
          <strong>Material:</strong> {materialFilter}<br />
          <strong>UV Corrections Applied:</strong><br />
          <div style={{ marginLeft: '1rem', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            • Horizontal faces: V = V × 0.5<br />
            • Vertical faces: V = V × 0.5 + 0.5
          </div>
        </div>
        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem',
          background: 'rgba(74, 144, 226, 0.2)',
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          <strong>Expected Result:</strong><br />
          • Floor tiles should show correctly<br />
          • Character billboards should show correctly
        </div>
      </div>
    </div>
  );
}
