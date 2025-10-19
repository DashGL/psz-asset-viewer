import { useState } from 'react';
import ModelViewer from './ModelViewer';

interface Asset {
  name: string;
  glbFiles: string[];
  textures: string[];
}

interface CityGalleryProps {
  cityName: string;
  assets: Asset[];
}

export default function CityGallery({ cityName, assets }: CityGalleryProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(
    assets.length > 0 ? assets[0] : null
  );
  const [selectedModel, setSelectedModel] = useState<string | null>(
    assets.length > 0 && assets[0].glbFiles.length > 0 ? assets[0].glbFiles[0] : null
  );

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    setSelectedModel(asset.glbFiles.length > 0 ? asset.glbFiles[0] : null);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '1rem' }}>{cityName}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        {/* Asset List */}
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Assets</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {assets.map((asset) => (
              <button
                key={asset.name}
                onClick={() => handleAssetSelect(asset)}
                style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  background: selectedAsset?.name === asset.name ? '#4a90e2' : '#2a2a2a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {asset.name}
                <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                  {asset.glbFiles.length} model{asset.glbFiles.length !== 1 ? 's' : ''}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Viewer */}
        <div>
          {selectedAsset && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                  {selectedAsset.name}
                </h2>
                {selectedAsset.glbFiles.length > 1 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedAsset.glbFiles.map((glb) => {
                      const modelName = glb.split('/').pop()?.replace('.glb', '') || glb;
                      return (
                        <button
                          key={glb}
                          onClick={() => setSelectedModel(glb)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: selectedModel === glb ? '#4a90e2' : '#3a3a3a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          {modelName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedModel && <ModelViewer modelUrl={selectedModel} />}

              {selectedAsset.textures.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Textures</h3>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    {selectedAsset.textures.map((texture) => {
                      const textureName = texture.split('/').pop() || texture;
                      return (
                        <div
                          key={texture}
                          style={{
                            background: '#2a2a2a',
                            padding: '0.5rem',
                            borderRadius: '4px',
                          }}
                        >
                          <img
                            src={texture}
                            alt={textureName}
                            style={{
                              width: '100%',
                              height: 'auto',
                              display: 'block',
                              imageRendering: 'pixelated',
                            }}
                          />
                          <div
                            style={{
                              fontSize: '0.75rem',
                              marginTop: '0.25rem',
                              opacity: 0.7,
                              wordBreak: 'break-all',
                            }}
                          >
                            {textureName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {!selectedAsset && (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#888',
              }}
            >
              No assets available. Run the processing script first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
