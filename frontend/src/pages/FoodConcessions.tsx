import { useState, useEffect } from 'react';
import { api, type ConcessionStand, type MenuItem, type Match } from '../api/client';
import { ShoppingBag, Plus, Minus, Check, Clock, ShieldCheck, Utensils } from 'lucide-react';

export default function FoodConcessions() {
  const [stands, setStands] = useState<ConcessionStand[]>([]);
  const [selectedStandId, setSelectedStandId] = useState('');
  const [cart, setCart] = useState<{ name: string; price: number; quantity: number }[]>([]);
  const [error, setError] = useState('');

  // Match and Venue selection
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');

  // Checkout states
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'preparing' | 'ready'>('idle');
  const [orderId, setOrderId] = useState('');
  const [prepProgress, setPrepProgress] = useState(0);

  const announce = (text: string) => {
    if (typeof (window as any).announceAccessibility === 'function') {
      (window as any).announceAccessibility(text);
    }
  };

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await api.getMatches();
        setMatches(res.matches);
        if (res.matches.length > 0) {
          setSelectedMatchId(res.matches[0].id);
        }
      } catch (err) {
        console.error('Failed to load matches', err);
      }
    };
    fetchMatches();
  }, []);

  useEffect(() => {
    const fetchStands = async () => {
      try {
        const selectedMatch = matches.find(m => m.id === selectedMatchId);
        const venueId = selectedMatch?.venueId;
        const res = await api.getConcessionsStands(venueId);
        setStands(res.stands);
        if (res.stands.length > 0) {
          setSelectedStandId(res.stands[0].id);
        } else {
          setSelectedStandId('');
        }
      } catch (err) {
        setError('Failed to load concession stands');
      }
    };
    // Re-fetch stands whenever the selected match (and thus venue) changes
    if (selectedMatchId) {
      fetchStands();
      setCart([]); // Clear cart on venue change
    }
  }, [selectedMatchId, matches]);

  // Prep progress simulation loop
  useEffect(() => {
    let timer: any;
    if (orderStatus === 'preparing') {
      timer = setInterval(() => {
        setPrepProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setOrderStatus('ready');
            announce("Your concessions order is ready! Please proceed to the pick-up counter.");
            return 100;
          }
          const next = prev + 10;
          announce(`Order preparation progress: ${next}%`);
          return next;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [orderStatus]);

  const activeStand = stands.find((s) => s.id === selectedStandId);

  const handleStandChange = (id: string) => {
    setSelectedStandId(id);
    setCart([]);
    const name = stands.find((s) => s.id === id)?.name ?? '';
    announce(`Switched to stand: ${name}. Your cart has been cleared.`);
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        announce(`Increased ${item.name} quantity to ${existing.quantity + 1}`);
        return prev.map((i) => (i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i));
      }
      announce(`Added ${item.name} to cart`);
      return [...prev, { name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQuantity = (name: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.name === name);
      if (!item) return prev;
      const nextQty = item.quantity + delta;
      if (nextQty <= 0) {
        announce(`Removed ${name} from cart`);
        return prev.filter((i) => i.name !== name);
      }
      announce(`Updated ${name} quantity to ${nextQty}`);
      return prev.map((i) => (i.name === name ? { ...i, quantity: nextQty } : i));
    });
  };

  // Subtotal calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.08; // 8% sales tax
  const total = subtotal > 0 ? subtotal + tax : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setOrderStatus('submitting');
    setError('');
    announce("Submitting order to kitchen...");
    try {
      const orderPayload = {
        standId: selectedStandId,
        items: cart,
        totalPrice: parseFloat(total.toFixed(2)),
      };
      const res = await api.postConcessionsOrder(orderPayload);
      setOrderId(res.orderId);
      setOrderStatus('preparing');
      setPrepProgress(0);
      announce(`Order submitted successfully. Your order code is ${res.orderId}. Preparation in progress.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Order submission failed';
      setError(msg);
      setOrderStatus('idle');
      announce(`Checkout failed: ${msg}`);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '12px' }}>
      <header className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h2>Food & Drink Concessions</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Order food in advance to skip queue times. Queue updates reflect telemetry aggregates.
          </p>
        </div>
      </header>

      {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Match Selection Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="match-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Select Match (Determines Venue):
          </label>
          <select
            id="match-select"
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            style={{ width: '100%', minHeight: '44px', padding: '8px 12px', fontSize: '0.9rem' }}
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                Match {m.matchNumber}: {m.homeTeam} vs {m.awayTeam}
              </option>
            ))}
          </select>
        </div>

        {/* Stand Selection Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label htmlFor="concessions-select" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Select Concession Stand:
          </label>
          <select
            id="concessions-select"
            value={selectedStandId}
            onChange={(e) => handleStandChange(e.target.value)}
            style={{ width: '100%', minHeight: '44px', padding: '8px 12px', fontSize: '0.9rem' }}
            disabled={stands.length === 0}
          >
            {stands.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.zone}) — Est. Wait: {s.waitTimeMinutes} mins
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: Menu & Cart/Progress */}
      <div 
        style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: '1fr',
        }}
        className="grid-concessions"
      >
        {/* Left Column: Menu Items */}
        <section aria-labelledby="menu-heading" className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Utensils size={18} color="var(--color-primary)" />
            <h3 id="menu-heading" style={{ margin: 0, fontSize: '1.1rem' }}>Concourse Menu</h3>
            {activeStand && (
              <span 
                style={{
                  marginLeft: 'auto',
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  background: 'rgba(29, 78, 216, 0.1)',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Clock size={12} /> {activeStand.waitTimeMinutes}m wait
              </span>
            )}
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeStand?.menu.map((item, idx) => (
              <li 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg)',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                      ${item.price.toFixed(2)}
                    </span>
                    {item.tags.map((tag) => (
                      <span 
                        key={tag}
                        style={{
                          fontSize: '0.65rem',
                          background: 'rgba(34, 197, 94, 0.1)',
                          color: '#22c55e',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontWeight: 600
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-icon"
                  onClick={() => addToCart(item)}
                  disabled={orderStatus !== 'idle'}
                  aria-label={`Add ${item.name} to order`}
                  style={{ minWidth: '40px', minHeight: '40px' }}
                >
                  <Plus size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Right Column: Order Cart or Preparation Status */}
        <section aria-labelledby="status-heading">
          {orderStatus === 'idle' || orderStatus === 'submitting' ? (
            /* Cart Panel */
            <div className="card" style={{ padding: '20px', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <ShoppingBag size={18} color="var(--color-primary)" />
                <h3 id="status-heading" style={{ margin: 0, fontSize: '1.1rem' }}>Your Cart</h3>
              </div>

              {cart.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '30px 0', fontSize: '0.85rem' }}>
                  Your cart is empty. Tap items to add them.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cart.map((item, idx) => (
                      <li 
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.85rem',
                          paddingBottom: '8px',
                          borderBottom: '1px solid var(--color-border)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="btn btn-secondary btn-icon"
                            onClick={() => updateQuantity(item.name, -1)}
                            aria-label={`Decrease ${item.name} quantity`}
                            style={{ width: '28px', height: '28px' }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                          <button
                            className="btn btn-secondary btn-icon"
                            onClick={() => updateQuantity(item.name, 1)}
                            aria-label={`Increase ${item.name} quantity`}
                            style={{ width: '28px', height: '28px' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Calculations */}
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal:</span>
                      <span style={{ fontFamily: 'monospace' }}>${subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Sales Tax (8%):</span>
                      <span style={{ fontFamily: 'monospace' }}>${tax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 800, borderTop: '1px solid var(--color-border)', paddingTop: '6px' }}>
                      <span>Total:</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={handleCheckout}
                    disabled={orderStatus === 'submitting'}
                    style={{ width: '100%', minHeight: '44px', fontWeight: 700 }}
                  >
                    {orderStatus === 'submitting' ? 'Placing Order...' : 'Check Out Order'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Preparation Progress Status Panel */
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <ShieldCheck size={18} color="#22c55e" />
                <h3 id="status-heading" style={{ margin: 0, fontSize: '1.1rem' }}>Order Confirmed</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.85rem' }}>
                <div>
                  <p style={{ margin: '0 0 4px', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Order Code:</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                    {orderId}
                  </p>
                </div>

                <div>
                  <p style={{ margin: '0 0 4px', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Status:</p>
                  <p style={{ margin: 0, fontWeight: 700 }}>
                    {orderStatus === 'preparing' ? '🧑‍🍳 Preparing your food...' : '✅ Ready for Pick Up!'}
                  </p>
                </div>

                {/* Progress Bar Container */}
                <div style={{ width: '100%', background: 'rgba(0,0,0,0.1)', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${prepProgress}%`, 
                      background: 'var(--color-primary)', 
                      height: '100%', 
                      transition: 'width 0.4s ease' 
                    }} 
                  />
                </div>

                {orderStatus === 'ready' && (
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      background: 'rgba(34, 197, 94, 0.1)', 
                      padding: '10px', 
                      borderRadius: 'var(--radius-md)', 
                      color: '#22c55e', 
                      fontWeight: 600 
                    }}
                  >
                    <Check size={16} /> Order ready. Go to the {activeStand?.name} pick-up counter.
                  </div>
                )}

                <button
                  className="btn btn-secondary"
                  onClick={() => { setOrderStatus('idle'); setCart([]); }}
                  style={{ width: '100%', minHeight: '38px', marginTop: '8px' }}
                >
                  Order Something Else
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
