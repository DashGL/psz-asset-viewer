import { useState } from 'react';

interface Weapon {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  description: string;
  attack: number;
  special?: string;
}

interface InventoryWeapon extends Weapon {
  quantity: number;
}

// Placeholder weapon shop items
const SHOP_WEAPONS: Weapon[] = [
  { id: 'saber', name: 'Saber', buyPrice: 500, sellPrice: 250, description: 'Basic sword', attack: 50 },
  { id: 'brand', name: 'Brand', buyPrice: 1500, sellPrice: 750, description: 'Long sword with decent power', attack: 100 },
  { id: 'buster', name: 'Buster', buyPrice: 3500, sellPrice: 1750, description: 'Heavy sword with high damage', attack: 180, special: 'Ground damage +10%' },
  { id: 'calibur', name: 'Calibur', buyPrice: 7000, sellPrice: 3500, description: 'Legendary blade', attack: 280, special: 'Critical +15%' },
  { id: 'handgun', name: 'Handgun', buyPrice: 800, sellPrice: 400, description: 'Basic ranged weapon', attack: 60 },
  { id: 'autogun', name: 'Autogun', buyPrice: 2500, sellPrice: 1250, description: 'Automatic firearm', attack: 120, special: 'Multi-hit' },
  { id: 'beam', name: 'Beam', buyPrice: 5000, sellPrice: 2500, description: 'Energy weapon', attack: 200, special: 'Light damage' },
  { id: 'spread', name: 'Spread', buyPrice: 8500, sellPrice: 4250, description: 'Shotgun-type weapon', attack: 300, special: 'Wide area' },
  { id: 'cane', name: 'Cane', buyPrice: 1200, sellPrice: 600, description: 'Technique amplifier', attack: 40, special: 'TP +5%' },
  { id: 'rod', name: 'Rod', buyPrice: 4000, sellPrice: 2000, description: 'Advanced technique weapon', attack: 80, special: 'TP +10%' },
];

// Placeholder player inventory
const INITIAL_INVENTORY: InventoryWeapon[] = [
  { id: 'saber', name: 'Saber', buyPrice: 500, sellPrice: 250, description: 'Basic sword', attack: 50, quantity: 1 },
  { id: 'handgun', name: 'Handgun', buyPrice: 800, sellPrice: 400, description: 'Basic ranged weapon', attack: 60, quantity: 1 },
];

export default function WeaponShop({ baseUrl = '/' }: { baseUrl?: string }) {
  const [mode, setMode] = useState<'menu' | 'buy' | 'sell'>('menu');
  const [meseta, setMeseta] = useState(10000); // Player currency
  const [inventory, setInventory] = useState<InventoryWeapon[]>(INITIAL_INVENTORY);
  const [selectedWeapon, setSelectedWeapon] = useState<string | null>(null);

  const getInventoryQuantity = (weaponId: string) => {
    return inventory.find(weapon => weapon.id === weaponId)?.quantity || 0;
  };

  const handleBuy = (weapon: Weapon) => {
    if (meseta >= weapon.buyPrice) {
      setMeseta(meseta - weapon.buyPrice);
      const existingWeapon = inventory.find(w => w.id === weapon.id);
      if (existingWeapon) {
        setInventory(inventory.map(w =>
          w.id === weapon.id ? { ...w, quantity: w.quantity + 1 } : w
        ));
      } else {
        setInventory([...inventory, { ...weapon, quantity: 1 }]);
      }
      setSelectedWeapon(null);
    }
  };

  const handleSell = (weapon: InventoryWeapon) => {
    if (weapon.quantity > 0) {
      setMeseta(meseta + weapon.sellPrice);
      if (weapon.quantity === 1) {
        setInventory(inventory.filter(w => w.id !== weapon.id));
      } else {
        setInventory(inventory.map(w =>
          w.id === weapon.id ? { ...w, quantity: w.quantity - 1 } : w
        ));
      }
      setSelectedWeapon(null);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#fff',
      overflow: 'hidden',
    }}>
      <div style={{
        maxWidth: '1000px',
        width: '100%',
        display: 'flex',
        gap: '2rem',
        alignItems: 'flex-start',
      }}>
        {/* NPC Sprite Section */}
        <div style={{
          flex: '0 0 300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ef444422 0%, #dc262622 100%)',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
          }}>
            <img
              src={`${baseUrl}dairon/weapon-shop-sprite.png`}
              alt="Weapon Shop Keeper"
              style={{
                width: '100%',
                height: 'auto',
                borderRadius: '8px',
              }}
            />
          </div>

          <div style={{
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '1rem',
          }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              Meseta: <span style={{ color: '#f59e0b' }}>{meseta}</span>
            </div>
          </div>
        </div>

        {/* Shop Interface */}
        <div style={{
          flex: 1,
          background: '#1a1a2e',
          border: '2px solid #333',
          borderRadius: '12px',
          padding: '2rem',
          minHeight: '500px',
        }}>
          {mode === 'menu' && (
            <div>
              <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Looking for some firepower?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  onClick={() => setMode('buy')}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    fontSize: '1.5rem',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Buy Weapons
                </button>
                <button
                  onClick={() => setMode('sell')}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    fontSize: '1.5rem',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Sell Weapons
                </button>
              </div>
            </div>
          )}

          {mode === 'buy' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem' }}>Buy Weapons</h2>
                <button
                  onClick={() => { setMode('menu'); setSelectedWeapon(null); }}
                  style={{
                    background: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '0.5rem',
              }}>
                {SHOP_WEAPONS.map(weapon => (
                  <div
                    key={weapon.id}
                    onClick={() => setSelectedWeapon(weapon.id)}
                    style={{
                      background: selectedWeapon === weapon.id ? '#ef444422' : '#0f0f1e',
                      border: selectedWeapon === weapon.id ? '2px solid #ef4444' : '1px solid #333',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {weapon.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.25rem' }}>
                          {weapon.description}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                          ATK: {weapon.attack} {weapon.special && `• ${weapon.special}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                        <div style={{ fontSize: '1.2rem', color: '#f59e0b', fontWeight: 'bold' }}>
                          {weapon.buyPrice} M
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#888' }}>
                          Owned: {getInventoryQuantity(weapon.id)}
                        </div>
                      </div>
                    </div>
                    {selectedWeapon === weapon.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBuy(weapon); }}
                        disabled={meseta < weapon.buyPrice}
                        style={{
                          marginTop: '1rem',
                          width: '100%',
                          background: meseta < weapon.buyPrice ? '#444' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          color: '#fff',
                          cursor: meseta < weapon.buyPrice ? 'not-allowed' : 'pointer',
                          fontSize: '1rem',
                        }}
                      >
                        {meseta < weapon.buyPrice ? 'Not enough Meseta' : 'Buy'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'sell' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem' }}>Sell Weapons</h2>
                <button
                  onClick={() => { setMode('menu'); setSelectedWeapon(null); }}
                  style={{
                    background: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
              </div>

              {inventory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                  Your weapon inventory is empty!
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  paddingRight: '0.5rem',
                }}>
                  {inventory.map(weapon => (
                    <div
                      key={weapon.id}
                      onClick={() => setSelectedWeapon(weapon.id)}
                      style={{
                        background: selectedWeapon === weapon.id ? '#10b98122' : '#0f0f1e',
                        border: selectedWeapon === weapon.id ? '2px solid #10b981' : '1px solid #333',
                        borderRadius: '8px',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {weapon.name} x{weapon.quantity}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '0.25rem' }}>
                            {weapon.description}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                            ATK: {weapon.attack} {weapon.special && `• ${weapon.special}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                          <div style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 'bold' }}>
                            {weapon.sellPrice} M
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#888' }}>
                            per weapon
                          </div>
                        </div>
                      </div>
                      {selectedWeapon === weapon.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSell(weapon); }}
                          style={{
                            marginTop: '1rem',
                            width: '100%',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.75rem',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '1rem',
                          }}
                        >
                          Sell
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
