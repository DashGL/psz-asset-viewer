import { useState } from 'react';

interface Item {
  id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  description: string;
}

interface InventoryItem extends Item {
  quantity: number;
}

// Placeholder shop items
const SHOP_ITEMS: Item[] = [
  { id: 'monomate', name: 'Monomate', buyPrice: 50, sellPrice: 25, description: 'Restores 50 HP' },
  { id: 'dimate', name: 'Dimate', buyPrice: 150, sellPrice: 75, description: 'Restores 150 HP' },
  { id: 'trimate', name: 'Trimate', buyPrice: 400, sellPrice: 200, description: 'Restores all HP' },
  { id: 'monofluid', name: 'Monofluid', buyPrice: 100, sellPrice: 50, description: 'Restores 50 TP' },
  { id: 'difluid', name: 'Difluid', buyPrice: 300, sellPrice: 150, description: 'Restores 150 TP' },
  { id: 'trifluid', name: 'Trifluid', buyPrice: 600, sellPrice: 300, description: 'Restores all TP' },
  { id: 'antidote', name: 'Antidote', buyPrice: 80, sellPrice: 40, description: 'Cures poison' },
  { id: 'antiparalysis', name: 'Antiparalysis', buyPrice: 80, sellPrice: 40, description: 'Cures paralysis' },
  { id: 'moon_atomizer', name: 'Moon Atomizer', buyPrice: 500, sellPrice: 250, description: 'Revives one ally' },
  { id: 'star_atomizer', name: 'Star Atomizer', buyPrice: 1000, sellPrice: 500, description: 'Revives all allies' },
];

// Placeholder player inventory
const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'monomate', name: 'Monomate', buyPrice: 50, sellPrice: 25, description: 'Restores 50 HP', quantity: 5 },
  { id: 'dimate', name: 'Dimate', buyPrice: 150, sellPrice: 75, description: 'Restores 150 HP', quantity: 3 },
  { id: 'antidote', name: 'Antidote', buyPrice: 80, sellPrice: 40, description: 'Cures poison', quantity: 2 },
  { id: 'moon_atomizer', name: 'Moon Atomizer', buyPrice: 500, sellPrice: 250, description: 'Revives one ally', quantity: 1 },
];

export default function ItemShop() {
  const [mode, setMode] = useState<'menu' | 'buy' | 'sell'>('menu');
  const [meseta, setMeseta] = useState(5000); // Player currency
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const getInventoryQuantity = (itemId: string) => {
    return inventory.find(item => item.id === itemId)?.quantity || 0;
  };

  const handleBuy = (item: Item) => {
    if (meseta >= item.buyPrice) {
      setMeseta(meseta - item.buyPrice);
      const existingItem = inventory.find(i => i.id === item.id);
      if (existingItem) {
        setInventory(inventory.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ));
      } else {
        setInventory([...inventory, { ...item, quantity: 1 }]);
      }
      setSelectedItem(null);
    }
  };

  const handleSell = (item: InventoryItem) => {
    if (item.quantity > 0) {
      setMeseta(meseta + item.sellPrice);
      if (item.quantity === 1) {
        setInventory(inventory.filter(i => i.id !== item.id));
      } else {
        setInventory(inventory.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i
        ));
      }
      setSelectedItem(null);
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
      padding: '2rem',
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
            background: 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)',
            border: '2px solid #667eea',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
          }}>
            <div style={{
              width: '200px',
              height: '200px',
              background: 'linear-gradient(135deg, #667eea44 0%, #764ba244 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '4rem',
            }}>
              🛍️
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Item Shop</h2>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>Welcome, traveler!</p>
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
              <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>What can I do for you?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  onClick={() => setMode('buy')}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                  Buy Items
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
                  Sell Items
                </button>
              </div>
            </div>
          )}

          {mode === 'buy' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '2rem' }}>Buy Items</h2>
                <button
                  onClick={() => { setMode('menu'); setSelectedItem(null); }}
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {SHOP_ITEMS.map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item.id)}
                    style={{
                      background: selectedItem === item.id ? '#667eea22' : '#0f0f1e',
                      border: selectedItem === item.id ? '2px solid #667eea' : '1px solid #333',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                          {item.description}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                        <div style={{ fontSize: '1.2rem', color: '#f59e0b', fontWeight: 'bold' }}>
                          {item.buyPrice} M
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#888' }}>
                          Owned: {getInventoryQuantity(item.id)}
                        </div>
                      </div>
                    </div>
                    {selectedItem === item.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBuy(item); }}
                        disabled={meseta < item.buyPrice}
                        style={{
                          marginTop: '1rem',
                          width: '100%',
                          background: meseta < item.buyPrice ? '#444' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          color: '#fff',
                          cursor: meseta < item.buyPrice ? 'not-allowed' : 'pointer',
                          fontSize: '1rem',
                        }}
                      >
                        {meseta < item.buyPrice ? 'Not enough Meseta' : 'Buy'}
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
                <h2 style={{ fontSize: '2rem' }}>Sell Items</h2>
                <button
                  onClick={() => { setMode('menu'); setSelectedItem(null); }}
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
                  Your inventory is empty!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {inventory.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item.id)}
                      style={{
                        background: selectedItem === item.id ? '#10b98122' : '#0f0f1e',
                        border: selectedItem === item.id ? '2px solid #10b981' : '1px solid #333',
                        borderRadius: '8px',
                        padding: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {item.name} x{item.quantity}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                            {item.description}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginLeft: '1rem' }}>
                          <div style={{ fontSize: '1.2rem', color: '#10b981', fontWeight: 'bold' }}>
                            {item.sellPrice} M
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#888' }}>
                            per item
                          </div>
                        </div>
                      </div>
                      {selectedItem === item.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSell(item); }}
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
