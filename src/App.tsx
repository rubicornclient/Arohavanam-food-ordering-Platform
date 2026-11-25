import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, Banknote, CalendarDays, Check, CheckCircle2,
  ChevronRight, Clock3, CreditCard, Flame, ListFilter, MapPin, Menu as MenuIcon,
  LogOut, Minus, PackageCheck, Plus, Search, ShoppingBag, ShoppingBasket, Sparkles, Star, MessageSquare, Camera, Trash2, Truck, Utensils,
  X, XCircle, type LucideIcon,
} from 'lucide-react'
import {
  getData, getUploadedImage, readCart, readCategories, readCombos, readMenu, readOrders,
  readPayments, readSettings, resetDemoData, saveUploadedImage, setData, STORE_KEYS,
} from './storage'
import type { CartLine, Category, Combo, ComboItem, CustomerFeedback, MenuItem, Order, OrderLine, PaymentRecord, RestaurantSettings } from './types'

const inr = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
const randomId = (prefix = '') => `${prefix}${crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`
const byOrder = (a: Category, b: Category) => a.order - b.order

function go(to: string) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new Event('rrr-navigation'))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname + window.location.search)
  useEffect(() => {
    const update = () => setPath(window.location.pathname + window.location.search)
    window.addEventListener('popstate', update)
    window.addEventListener('rrr-navigation', update)
    return () => { window.removeEventListener('popstate', update); window.removeEventListener('rrr-navigation', update) }
  }, [])
  return path
}

function useRevision() {
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const update = () => setRevision((value) => value + 1)
    window.addEventListener('rrr-storage-change', update)
    window.addEventListener('storage', update)
    return () => { window.removeEventListener('rrr-storage-change', update); window.removeEventListener('storage', update) }
  }, [])
  return revision
}

function Image({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const [resolved, setResolved] = useState('')
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    let alive = true
    let objectUrl = ''
    setBroken(false)
    if (src.startsWith('idb:')) {
      getUploadedImage(src).then((url) => { if (alive && url) { objectUrl = url; setResolved(url) } })
    } else setResolved(src)
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [src])
  if (broken) return <div className={`image-missing ${className}`} role="img" aria-label={`${alt} image unavailable`}><Utensils size={22} /><span>Photo can be added in demo admin</span></div>
  return <img className={className} src={resolved || '/assets/food/placeholder-vegetarian.svg'} alt={alt} loading="lazy" onError={() => setBroken(true)} />
}

function ProductImage({ item, className = '' }: { item: MenuItem; className?: string }) {
  const placeholders: Record<string, string> = { breakfast: 'breakfast', starters: 'starters', soups: 'soups', vegetarian: 'vegetarian', 'non-vegetarian': 'nonveg', 'biryani-rice': 'biryani', chinese: 'chinese', tandoori: 'tandoori', 'indian-breads': 'indian-breads', beverages: 'beverages', desserts: 'desserts' }
  const fallback = `/assets/food/placeholder-${placeholders[item.categoryId] ?? 'menu'}.svg`
  const [src, setSrc] = useState(item.image)
  useEffect(() => setSrc(item.image), [item.image])
  const finalSource = src || fallback
  return <Image src={finalSource} alt={`${item.name}${finalSource.includes('placeholder-') ? ' demonstration illustration' : ''}`} className={className} />
}

type CartProps = { lines: CartLine[]; onChange: (id: string, amount: number) => void; onRemove: (id: string, kind: 'item' | 'combo') => void; onClear: () => void; onClose: () => void; onCheckout: () => void; items: MenuItem[]; combos: Combo[]; settings: RestaurantSettings }

function resolveLine(line: CartLine, items: MenuItem[], combos: Combo[]) {
  const entity = line.kind === 'item' ? items.find((item) => item.id === line.id) : combos.find((combo) => combo.id === line.id)
  if (!entity) return null
  if (line.kind === 'item' && !(entity as MenuItem).available) return null
  if (line.kind === 'combo' && !(entity as Combo).active) return null
  const price = entity.price
  return { entity, price, total: price * line.quantity }
}

function CartDrawer({ lines, onChange, onRemove, onClear, onClose, onCheckout, items, combos, settings }: CartProps) {
  const active = lines.map((line) => ({ line, resolved: resolveLine(line, items, combos) })).filter((x) => x.resolved)
  const unavailable = lines.filter((line) => !resolveLine(line, items, combos))
  const subtotal = active.reduce((sum, entry) => sum + entry.resolved!.total, 0)
  const tax = Math.round(subtotal * settings.gstPercent / 100)
  const total = subtotal + tax + settings.extraCharge
  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="cart-drawer" aria-label="Your cart">
      <div className="drawer-head"><div><p className="eyebrow">YOUR ORDER</p><h2>Your cart <span className="muted-count">({active.reduce((n, x) => n + x.line.quantity, 0)})</span></h2></div><div className="drawer-head-actions">{lines.length > 0 && <button className="cart-clear" onClick={onClear}>Clear cart</button>}<button className="icon-button" onClick={onClose} aria-label="Close cart"><X /></button></div></div>
      {!active.length && !unavailable.length ? <div className="empty-state"><span className="empty-icon"><ShoppingBasket /></span><h3>Your cart is waiting</h3><p>Choose something delicious from the menu.</p><button className="button button-cream" onClick={onClose}>Continue browsing</button></div> : <>
        {unavailable.length > 0 && <div className="cart-warning"><strong>Some cart items changed</strong><p>These items were removed or marked unavailable in the demo menu. Remove them before checkout.</p>{unavailable.map((line) => { const name = line.kind === 'item' ? items.find((item) => item.id === line.id)?.name : combos.find((combo) => combo.id === line.id)?.name; return <div key={`${line.kind}-${line.id}`}><span>{name ?? 'Menu item no longer available'}</span><button onClick={() => onRemove(line.id, line.kind)}>Remove</button></div> })}</div>}
        {active.length > 0 ? <>
        <div className="cart-lines">{active.map(({ line, resolved }) => <div className="cart-line" key={`${line.kind}-${line.id}`}>
          <Image src={resolved!.entity.image} alt={resolved!.entity.name} className="cart-line-image" />
          <div className="cart-line-copy"><strong>{resolved!.entity.name}</strong><span>{inr(resolved!.price)} each</span><div className="qty-control"><button onClick={() => onChange(line.id, -1)} aria-label={`Remove one ${resolved!.entity.name}`}><Minus size={14} /></button><span>{line.quantity}</span><button onClick={() => onChange(line.id, 1)} aria-label={`Add one ${resolved!.entity.name}`}><Plus size={14} /></button></div></div>
          <div className="cart-line-end"><b>{inr(resolved!.total)}</b><button className="quiet-icon" onClick={() => onRemove(line.id, line.kind)} aria-label={`Remove ${resolved!.entity.name}`}><Trash2 size={15} /></button></div>
        </div>)}</div>
        <div className="cart-summary"><div><span>Subtotal</span><b>{inr(subtotal)}</b></div><div><span>GST · {settings.gstPercent}%</span><b>{inr(tax)}</b></div>{settings.extraCharge > 0 && <div><span>Additional charge</span><b>{inr(settings.extraCharge)}</b></div>}<div className="grand-total"><span>Total</span><b>{inr(total)}</b></div><p className="demo-note">Demonstration prices · no payment is collected</p><button className="button button-primary full-width" onClick={onCheckout}>Continue to checkout <ArrowRight size={17} /></button><button className="text-button full-width" onClick={onClose}>Continue browsing</button></div>
        </> : <div className="empty-state"><span className="empty-icon"><ShoppingBasket /></span><h3>Nothing is available to order</h3><p>Remove the unavailable item above and choose another dish.</p><button className="button button-cream" onClick={onClose}>Continue browsing</button></div>}
      </>}
    </aside>
  </div>
}

function Quantity({ value, onChange }: { value: number; onChange: (change: number) => void }) {
  return <div className="qty-control product-qty"><button onClick={() => onChange(-1)} aria-label="Decrease quantity"><Minus size={14} /></button><span>{value}</span><button onClick={() => onChange(1)} aria-label="Increase quantity"><Plus size={14} /></button></div>
}

function ProductCard({ item, quantity, onChange }: { item: MenuItem; quantity: number; onChange: (change: number) => void }) {
  return <article className={`product-card ${!item.available ? 'is-unavailable' : ''}`}>
    <div className="product-photo"><ProductImage item={item} className="product-image" />{item.bestseller && <span className="photo-badge"><Flame size={12} /> Guest favourite</span>}{!item.available && <span className="unavailable-cover">Currently unavailable</span>}</div>
    <div className="product-info"><div className="product-title-line"><h3>{item.name}</h3><span className={`food-mark ${item.type}`} title={item.type === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}><i /></span></div><p>{item.description}</p><div className="product-card-bottom"><strong>{inr(item.price)}</strong>{quantity ? <Quantity value={quantity} onChange={onChange} /> : <button className="add-button" disabled={!item.available} onClick={() => onChange(1)}><Plus size={15} /> Add</button>}</div></div>
  </article>
}

function ComboCard({ combo, quantity, onChange }: { combo: Combo; quantity: number; onChange: (change: number) => void }) {
  const saving = Math.max(0, (combo.originalPrice ?? combo.price) - combo.price)
  return <article className="combo-card"><div className="combo-photo"><Image src={combo.image} alt={`${combo.name} demonstration combo`} className="combo-image" /><span className="combo-ribbon">COMBO</span></div><div className="combo-details"><p className="eyebrow">A LITTLE MORE, TOGETHER</p><h3>{combo.name}</h3><p className="combo-items">{combo.description}</p><div className="combo-footer"><div><strong>{inr(combo.price)}</strong>{saving > 0 && <span className="old-price">{inr(combo.originalPrice!)}</span>}<span className="saving">Save {inr(saving)}</span></div>{quantity ? <Quantity value={quantity} onChange={onChange} /> : <button className="add-button" onClick={() => onChange(1)}><Plus size={15} /> Add combo</button>}</div></div></article>
}

function ProductGrid({ title, kicker, items, lines, onChange, id }: { title: string; kicker?: string; items: MenuItem[]; lines: CartLine[]; onChange: (id: string, change: number) => void; id?: string }) {
  return <section id={id} className="menu-category-section"><div className="section-title-row"><div>{kicker && <p className="eyebrow">{kicker}</p>}<h2>{title}</h2></div><span className="section-count">{items.length} dishes</span></div>{items.length ? <div className="product-grid">{items.map((item) => <ProductCard key={item.id} item={item} quantity={lines.find((line) => line.id === item.id && line.kind === 'item')?.quantity ?? 0} onChange={(change) => onChange(item.id, change)} />)}</div> : <p className="category-empty">No dishes in this section yet. Add or feature menu items in the demo admin.</p>}</section>
}

function Header({ settings, cartCount, onCart, admin = false }: { settings: RestaurantSettings; cartCount: number; onCart: () => void; admin?: boolean }) {
  return <><header className="site-header"><a href="/" className="brand" onClick={(event) => { event.preventDefault(); go('/') }}><Image src={settings.logo || '/assets/aaroha-vanam-logo.svg'} alt={`${settings.name} logo`} className="brand-logo" /><span><strong>{settings.name}</strong><small>{settings.tagline}</small></span></a><nav className="main-nav" aria-label="Main navigation"><a href="/#menu" onClick={(e) => { e.preventDefault(); if (window.location.pathname !== '/') go('/#menu'); else document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }) }}>Order food</a><a href="/checkout#feedback" onClick={(e) => { e.preventDefault(); if (window.location.pathname !== '/checkout') go('/checkout#feedback'); else document.getElementById('feedback')?.scrollIntoView({ behavior: 'smooth' }) }}>Feedback</a><a href="/track-order" onClick={(e) => { e.preventDefault(); go('/track-order') }}>Track order</a></nav><div className="header-actions"><button className="header-cart" onClick={onCart} aria-label={`Open cart with ${cartCount} items`}><ShoppingBag size={17} /><span>Your order</span><b>{cartCount}</b></button>{admin && <a className="admin-shortcut" href="/" onClick={(e) => { e.preventDefault(); go('/') }}>Customer site</a>}</div></header></>
}

function Footer({ settings }: { settings: RestaurantSettings }) {
  return <footer className="site-footer" id="contact"><div className="footer-main"><div className="footer-brand"><Image src={settings.logo || '/assets/aaroha-vanam-logo.svg'} alt={`${settings.name} logo`} className="brand-logo footer-logo" /><div><h3>{settings.name}</h3><p>{settings.tagline}</p></div></div><div className="footer-contact"><span><MapPin size={16} /> {settings.address}</span>{settings.openingHours && <span><Clock3 size={16} /> {settings.openingHours}</span>}{settings.phone && <span><Utensils size={16} /> {settings.phone}</span>}<span><Camera size={16} /><a href="https://www.instagram.com/aaroha.vanam/" target="_blank" rel="noreferrer">@aaroha.vanam</a></span></div></div><div className="footer-bottom"><span>&#169; {new Date().getFullYear()} {settings.name}</span><a href="/assets/image-manifest.json" target="_blank" rel="noreferrer">Food photo credits &amp; licenses</a><span>Developed by we4u media</span><a className="footer-admin-link" href="/admin" onClick={(event) => { event.preventDefault(); go('/admin') }}>Admin login</a></div></footer>
}

const feedbackOptions = ['The food was aromatic and freshly prepared.', 'The taste was authentic and full of flavor.', 'The atmosphere was relaxing and welcoming.', 'I loved the open-air dining.', 'The visit made me happy.', 'The ambience was beautiful.']

function FeedbackSection() {
  const [rating, setRating] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rating) return setError('Please choose a star rating.')
    if (!comment.trim()) return setError('Choose a ready-made sentence or write your own comment.')
    const sentences = comment.trim().split('\n')
    const entry: CustomerFeedback = { id: randomId('AV-FB-'), rating, presetComments: selected.filter((sentence) => sentences.includes(sentence)), comment: comment.trim(), createdAt: new Date().toISOString() }
    setData(STORE_KEYS.feedback, [entry, ...getData<CustomerFeedback[]>(STORE_KEYS.feedback)])
    setRating(0); setSelected([]); setComment(''); setError(''); setSaved(true)
  }
  function toggle(sentence: string) {
    setSaved(false); setError('')
    const wasSelected = selected.includes(sentence)
    setSelected((current) => wasSelected ? current.filter((value) => value !== sentence) : [...current, sentence])
    setComment((current) => {
      const lines = current.split('\n')
      if (wasSelected) return lines.filter((line) => line.trim() !== sentence).join('\n')
      if (lines.some((line) => line.trim() === sentence)) return current
      return [...lines.filter((line) => line.trim()), sentence].join('\n')
    })
  }
  return <section className="feedback-section" id="feedback"><div className="feedback-heading"><div><p className="eyebrow">CUSTOMER FEEDBACK</p><h2>How was your order?</h2><p>Rate your experience and tell us what you enjoyed.</p></div><span className="feedback-mark"><MessageSquare size={21} /></span></div>
    {saved && <p className="feedback-success" role="status">Thank you. Your feedback has been saved.</p>}
    <form className="feedback-form" onSubmit={submit}>
      <fieldset className="feedback-rating"><legend>Rate your experience <span className="required">REQUIRED</span></legend><div className="feedback-stars">{[1, 2, 3, 4, 5].map((value) => <button className={`feedback-star ${rating >= value ? 'selected' : ''}`} type="button" key={value} aria-label={`${value} out of 5 stars`} aria-pressed={rating === value} onClick={() => { setRating(value); setError(''); setSaved(false) }}><Star size={25} fill={rating >= value ? 'currentColor' : 'none'} /></button>)}<span>{rating ? `${rating} / 5` : 'Select a rating'}</span></div></fieldset>
      <fieldset className="feedback-presets"><legend>Suggestions</legend><div className="feedback-chips">{feedbackOptions.map((option) => <button type="button" key={option} className={`feedback-chip ${selected.includes(option) ? 'selected' : ''}`} aria-pressed={selected.includes(option)} onClick={() => toggle(option)}>{option}</button>)}</div><p className="feedback-guidance">Tap a sentence to put it in the comment box. You can edit it or add your own words.</p></fieldset>
      <label className="field-label feedback-manual">Write your own comment <span>OPTIONAL</span><textarea value={comment} onChange={(event) => { const value = event.target.value; setComment(value); setSelected((current) => current.filter((sentence) => value.split('\n').includes(sentence))); setError(''); setSaved(false) }} placeholder="Add a comment in your own words" rows={3} maxLength={500} /></label>
      <div className="feedback-submit-row">{error && <p className="form-error feedback-error" role="alert">{error}</p>}<button className="button button-primary" type="submit">Send feedback <ArrowRight size={16} /></button></div>
    </form><p className="feedback-note">Feedback is saved in this browser for the restaurant demo.</p>
  </section>
}

function FeedbackManager({ entries }: { entries: CustomerFeedback[] }) {
  return <><div className="admin-page-heading"><div><p className="eyebrow">CUSTOMER VOICES</p><h1>Customer feedback</h1><p>Ratings and comments saved in this browser.</p></div><span className="admin-demo-pill">{entries.length} RESPONSES</span></div>{entries.length ? <div className="feedback-admin-list">{entries.map((entry) => <article className="feedback-admin-card" key={entry.id}><div className="feedback-admin-top"><div className="feedback-admin-stars" aria-label={`${entry.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} size={15} fill={index < entry.rating ? 'currentColor' : 'none'} />)}<b>{entry.rating}/5</b></div><time>{new Date(entry.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</time></div>{(entry.comment || entry.presetComments.length > 0) && <p>{entry.comment || entry.presetComments.join('\n')}</p>}</article>)}</div> : <div className="admin-empty card-empty"><MessageSquare /><h3>No feedback yet</h3><p>Customer ratings and comments will appear here after they submit the form.</p><button className="button button-outline" onClick={() => go('/#feedback')}>Open feedback form</button></div>}<p className="feedback-storage-note">Local demo feedback is not sent to a server.</p></>
}

function HomePage({ settings, categories, items, combos, lines, onChange, onCart }: { settings: RestaurantSettings; categories: Category[]; items: MenuItem[]; combos: Combo[]; lines: CartLine[]; onChange: (id: string, change: number, kind?: 'item' | 'combo') => void; onCart: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return items
    return items.filter((item) => {
      const categoryName = categories.find((category) => category.id === item.categoryId)?.name ?? item.categoryId
      const featured = [item.special ? "today's specials" : '', item.bestseller ? 'best sellers' : ''].join(' ')
      return `${item.name} ${item.description} ${item.categoryId} ${categoryName} ${featured} ${(item.keywords ?? []).join(' ')}`.toLowerCase().includes(search)
    })
  }, [query, items, categories])
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)
  const activeCategories = categories.filter((category) => category.active).sort(byOrder)
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])
  useEffect(() => {
    if (query) return
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-menu-category]'))
    const observer = new IntersectionObserver((entries) => {
      const top = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (top) setActive(top.target.getAttribute('data-menu-category') ?? '')
    }, { rootMargin: '-120px 0px -68% 0px' })
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [query, activeCategories.length, items.length])
  return <>
    <Header settings={settings} cartCount={itemCount} onCart={onCart} />
    <main>



      <section className="menu-area" id="menu"><div className="menu-heading order-heading"><div><h1>Order food</h1><p>Choose dishes and add them to your order.</p></div><div className="menu-search"><Search size={18} /><input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes, ingredients..." aria-label="Search food menu" />{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={16} /></button>}<kbd>CTRL K</kbd></div></div>
        {!query && <div className="category-nav-wrap"><nav className="category-nav" aria-label="Food categories">{activeCategories.map((category) => <button key={category.id} className={active === category.id ? 'selected' : ''} onClick={() => { setActive(category.id); const targetId = category.id === 'combos-meal-deals' ? 'category-combos-meal-deals' : `category-${category.id}`; document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>{category.name}</button>)}</nav><span className="category-scroll"><ChevronRight size={15} /></span></div>}
        {query ? <div className="search-results"><div className="section-title-row"><div><p className="eyebrow">SEARCH RESULTS</p><h2>{filtered.length ? `Found ${filtered.length} ${filtered.length === 1 ? 'dish' : 'dishes'}` : 'No dishes found'}</h2></div></div>{filtered.length ? <div className="product-grid">{filtered.map((item) => <ProductCard key={item.id} item={item} quantity={lines.find((line) => line.id === item.id && line.kind === 'item')?.quantity ?? 0} onChange={(n) => onChange(item.id, n, 'item')} />)}</div> : <div className="no-results"><Search size={26} /><h3>No match just yet</h3><p>Try a dish name like “biryani”, “paneer” or “lassi”.</p><button className="button button-cream" onClick={() => setQuery('')}>Clear your search</button></div>}</div> : <div className="menu-content">{activeCategories.filter((category) => category.id !== 'combos-meal-deals').map((category) => { const categoryItems = items.filter((item) => category.id === 'todays-specials' ? item.special : category.id === 'best-sellers' ? item.bestseller : item.categoryId === category.id); return <div id={`category-${category.id}`} data-menu-category={category.id} key={category.id}><ProductGrid title={category.name} kicker={category.id === 'biryani-rice' ? 'A SIGNATURE, STEAMING HOT' : undefined} items={categoryItems} lines={lines} onChange={(id, amount) => onChange(id, amount, 'item')} /></div> })}</div>}
      </section>

      <section className="combos-section" id="category-combos-meal-deals" data-menu-category="combos-meal-deals"><span id="combos" className="scroll-anchor" /><div className="combo-heading"><div><h2>Meal combos</h2><p>Add a combo to your order.</p></div><span className="combo-deal-seal">THE<br /><b>ROYAL</b><br />DEAL</span></div><div className="combo-grid">{combos.filter((combo) => combo.active).map((combo) => <ComboCard key={combo.id} combo={combo} quantity={lines.find((line) => line.id === combo.id && line.kind === 'combo')?.quantity ?? 0} onChange={(amount) => onChange(combo.id, amount, 'combo')} />)}</div><p className="combo-disclaimer"><BadgeCheck size={15} /> All offers and savings shown are demonstration values.</p></section>


    </main><Footer settings={settings} />
  </>
}

function createSnapshot(lines: CartLine[], items: MenuItem[], combos: Combo[], settings: RestaurantSettings) {
  const resolved = lines.map((line) => ({ line, value: resolveLine(line, items, combos) })).filter((entry) => entry.value)
  const orderLines: OrderLine[] = resolved.map(({ line, value }) => {
    const entity = value!.entity
    const combo = line.kind === 'combo' ? entity as Combo : undefined
    const product = line.kind === 'item' ? entity as MenuItem : undefined
    return { id: line.id, kind: line.kind, name: entity.name, description: product?.description ?? combo?.description ?? '', image: entity.image, unitPrice: value!.price, quantity: line.quantity, total: value!.total, ...(combo ? { contents: combo.includedItems.map((included) => ({ ...included })) } : {}) }
  })
  const subtotal = orderLines.reduce((sum, line) => sum + line.total, 0)
  const tax = Math.round(subtotal * settings.gstPercent / 100)
  return { lines: orderLines, subtotal, tax, extraCharge: settings.extraCharge, total: subtotal + tax + settings.extraCharge }
}

function CheckoutPage({ settings, items, combos, lines }: { settings: RestaurantSettings; items: MenuItem[]; combos: Combo[]; lines: CartLine[] }) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [table, setTable] = useState('')
  const [method, setMethod] = useState('UPI · Simulated')
  const [error, setError] = useState('')
  const snapshot = createSnapshot(lines, items, combos, settings)
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!settings.open) return setError('The demo restaurant is marked closed. Reopen it in Demo admin settings to place a test order.')
    if (!table) return setError('Please choose a table number to continue.')
    if (name.trim().length < 2) return setError('Enter your full name to continue.')
    if (!/^[6-9]\d{9}$/.test(mobile.trim())) return setError('Enter a valid 10-digit Indian mobile number.')
    if (!snapshot.lines.length) return setError('Your cart has no available items. Return to the menu and add something fresh.')
    const pending = { ...snapshot, customerName: name.trim(), mobile: mobile.trim(), tableNumber: table, paymentMethod: method }
    sessionStorage.setItem('rrr_pending_checkout', JSON.stringify(pending))
    go('/payment')
  }
  return <><Header settings={settings} cartCount={lines.reduce((n, line) => n + line.quantity, 0)} onCart={() => go('/')} /><main className="checkout-page"><button className="back-link" onClick={() => go('/#menu')}><ArrowLeft size={15} /> Back to the menu</button><div className="checkout-heading"><p className="eyebrow">ORDER DETAILS</p><h1>Place your order</h1><p>Enter your contact details and table number to continue.</p></div><div className="checkout-layout"><form className="checkout-form" onSubmit={submit}><div className="form-step"><div className="step-number">01</div><div><h2>Customer details</h2><p>Required for this order.</p></div></div><label className="field-label">Full name <span className="required">REQUIRED</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" autoComplete="name" maxLength={80} required /></label><label className="field-label">Mobile number <span className="required">REQUIRED</span><input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" maxLength={10} required /></label>
      <div className="form-step table-step"><div className="step-number">02</div><div><h2>Dine-in table</h2><p>Select your table number.</p></div></div><label className="field-label">Dine-in table <span className="required">REQUIRED</span><select value={table} onChange={(e) => setTable(e.target.value)} required><option value="">Select your table</option>{settings.tables.map((value) => <option key={value} value={value}>{value.replace(/^T/, 'Table ')}</option>)}</select></label>
      <div className="form-step payment-step"><div className="step-number">03</div><div><h2>Payment method</h2><p>This payment is simulated. No money will be collected.</p></div></div><div className="payment-options">{[{ id: 'UPI - Simulated', label: 'PhonePe, GPay or any UPI app', Icon: CreditCard }, { id: 'Card - Simulated', label: 'Debit or credit card', Icon: Banknote }].map(({ id, label, Icon }) => <label className={`payment-option ${method === id ? 'chosen' : ''}`} key={id}><input type="radio" name="payment-method" value={id} checked={method === id} onChange={() => setMethod(id)} /><span className="payment-option-icon"><Icon size={18} /></span><span><b>{id.split(' -')[0]}</b><small>{label}</small></span><span className="radio-dot" /></label>)}</div>
      {error && <div className="form-error" role="alert"><XCircle size={17} />{error}</div>}<div className="checkout-disclosure"><BadgeCheck size={17} /><span><b>This is a demonstration checkout.</b> The order stays in this browser and is not sent to the restaurant.</span></div><button className="button button-primary checkout-submit" type="submit">Continue to simulated payment <ArrowRight size={16} /></button></form>
      <aside className="checkout-aside"><div className="order-summary-card"><div className="summary-card-head"><div><p className="eyebrow">AT A GLANCE</p><h2>Your order</h2></div><span className="summary-items-pill">{snapshot.lines.reduce((n, line) => n + line.quantity, 0)} items</span></div><div className="checkout-lines">{snapshot.lines.map((line) => <div className="checkout-line" key={line.id}><Image src={line.image} alt={line.name} className="checkout-line-image" /><div><b>{line.name} <span>× {line.quantity}</span></b><small>{line.kind === 'combo' ? line.contents?.map((content) => `${content.name} ×${content.quantity}`).join(' · ') : line.description}</small></div><strong>{inr(line.total)}</strong></div>)}</div><div className="checkout-totals"><div><span>Subtotal</span><b>{inr(snapshot.subtotal)}</b></div><div><span>GST · {settings.gstPercent}%</span><b>{inr(snapshot.tax)}</b></div>{snapshot.extraCharge > 0 && <div><span>Additional charge</span><b>{inr(snapshot.extraCharge)}</b></div>}<div className="grand-total"><span>Total</span><b>{inr(snapshot.total)}</b></div></div><p className="demo-note">Sample prices · demo order only</p></div><div className="summary-reassurance"><span><Truck size={16} /> Served at your table</span><span><PackageCheck size={16} /> Order status tracking included</span></div></aside></div><FeedbackSection /></main><Footer settings={settings} /></>
}

function PaymentPage({ settings }: { settings: RestaurantSettings }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'success' | 'pending' | 'failed' | 'cancelled' | ''>('')
  const [scenario, setScenario] = useState<'success' | 'pending' | 'failed' | 'cancelled'>('success')
  const pending = useMemo(() => { try { return JSON.parse(sessionStorage.getItem('rrr_pending_checkout') || 'null') as { lines: OrderLine[]; subtotal: number; tax: number; extraCharge: number; total: number; customerName: string; mobile: string; tableNumber: string; paymentMethod: string } | null } catch { return null } }, [])
  useEffect(() => { if (!pending) go('/checkout') }, [pending])
  if (!pending) return <div className="loading-page">Returning to checkout…</div>
  async function processPayment() {
    if (busy) return
    setBusy(true); setResult('')
    await new Promise((resolve) => setTimeout(resolve, 1150))
    const now = new Date().toISOString()
    if (scenario !== 'success') {
      const payment: PaymentRecord = { id: randomId('TXN-DEMO-'), orderId: null, amount: pending!.total, method: pending!.paymentMethod, status: scenario === 'failed' ? 'Failed' : scenario === 'cancelled' ? 'Cancelled' : 'Pending', createdAt: now, demo: true }
      setData(STORE_KEYS.payments, [...readPayments(), payment])
      setResult(scenario); setBusy(false); return
    }
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('-', '')
    const orderId = `AV-DEMO-${date}-${randomId().slice(0, 6)}`
    const order: Order = { id: orderId, createdAt: now, customerName: pending!.customerName, mobile: pending!.mobile, tableNumber: pending!.tableNumber, lines: pending!.lines, subtotal: pending!.subtotal, tax: pending!.tax, extraCharge: pending!.extraCharge, total: pending!.total, paymentMethod: pending!.paymentMethod, paymentStatus: 'DEMO PAID', status: 'Confirmed', statusHistory: [{ status: 'Confirmed', at: now }], demo: true }
    const payment: PaymentRecord = { id: randomId('TXN-DEMO-'), orderId, amount: order.total, method: order.paymentMethod, status: 'Success', createdAt: now, demo: true }
    setData(STORE_KEYS.orders, [order, ...readOrders()])
    setData(STORE_KEYS.payments, [payment, ...readPayments()])
    setData(STORE_KEYS.cart, [])
    sessionStorage.removeItem('rrr_pending_checkout')
    sessionStorage.setItem('rrr_recent_order', orderId)
    go(`/order-success?order=${encodeURIComponent(orderId)}`)
  }
  return <><Header settings={settings} cartCount={0} onCart={() => go('/')} /><main className="payment-page"><button className="back-link" onClick={() => go('/checkout')}><ArrowLeft size={15} /> Back to checkout</button><div className="payment-layout"><section className="payment-main"><div className="payment-intro"><span className="payment-lock"><CreditCard size={22} /></span><p className="eyebrow">DEMO PAYMENT</p><h1>One last <em>little step.</em></h1><p>You’re testing a simulated payment for your table order.</p></div><div className="payment-amount"><span>DEMO ORDER TOTAL</span><strong>{inr(pending.total)}</strong><small>{settings.name}</small></div><div className="scenario-card"><div><p className="eyebrow">CHOOSE A DEMO RESULT</p><p>Use each outcome to show how the payment flow behaves.</p></div><div className="scenario-options">{([{ id: 'success', title: 'Successful', icon: CheckCircle2 }, { id: 'pending', title: 'Pending', icon: Clock3 }, { id: 'failed', title: 'Failed', icon: XCircle }, { id: 'cancelled', title: 'Cancelled', icon: X } ] as const).map((entry) => <button key={entry.id} className={`scenario-option ${scenario === entry.id ? `active ${entry.id}` : ''}`} onClick={() => { setScenario(entry.id); setResult('') }}><entry.icon size={16} /> {entry.title}</button>)}</div></div>{result && <div className={`payment-feedback ${result}`}><span>{result === 'failed' ? <XCircle /> : result === 'pending' ? <Clock3 /> : <X />}</span><div><b>{result === 'failed' ? 'The simulated payment failed.' : result === 'pending' ? 'The payment is pending confirmation.' : 'The simulated payment was cancelled.'}</b><p>{result === 'pending' ? 'No order has been created yet. This amount will appear in pending payments.' : result === 'failed' ? 'No order has been created. You can try again or select a different demo result.' : 'No order has been created. You can return to checkout or try again.'}</p></div></div>}<button className="button button-primary pay-now" onClick={processPayment} disabled={busy}>{busy ? <><span className="button-spinner" /> Processing demo payment…</> : <>{result ? 'Try demo payment again' : `Pay ${inr(pending.total)} · Demo only`} <ArrowRight size={16} /></>}</button><p className="payment-legal"><BadgeCheck size={14} /> Simulated only · no real payment is processed or collected.</p></section><aside className="payment-summary"><p className="eyebrow">ORDER SUMMARY</p><h2>Order details</h2><div className="payment-summary-contact"><b>{pending.customerName}</b><span>{pending.mobile} | Table {pending.tableNumber.replace(/^T/, '')}</span></div><div className="payment-summary-items">{pending.lines.map((line) => <div key={line.id}><span>{line.quantity} × {line.name}</span><b>{inr(line.total)}</b></div>)}</div><div className="payment-summary-total"><span>Amount due</span><b>{inr(pending.total)}</b></div><p><CreditCard size={15} /> {pending.paymentMethod} · Simulated</p><div className="demo-only-stamp">DEMO<br /><b>ONLY</b></div></aside></div></main><Footer settings={settings} /></>
}

function OrderDetails({ order }: { order: Order }) {
  const names = ['Confirmed', 'Preparing', 'Ready to Serve', 'Completed']
  return <div className="order-detail-card"><div className="order-card-top"><div><p className="eyebrow">DEMO ORDER</p><h2>{order.id}</h2></div><span className="status-pill"><i />{order.status}</span></div><div className="order-meta order-meta-customer"><span><small>CUSTOMER</small><b>{order.customerName}</b></span><span><small>MOBILE</small><b>{order.mobile}</b></span><span><small>TABLE</small><b>{order.tableNumber.replace(/^T/, 'Table ')}</b></span><span><small>ORDERED</small><b>{new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</b></span><span><small>PAYMENT</small><b>{order.paymentStatus}</b></span></div><div className="order-track"><div className="track-line" /><div className="track-line-active" style={{ width: `${Math.max(0, names.indexOf(order.status)) / 3 * 100}%` }} />{names.map((status, index) => { const done = names.indexOf(order.status) >= index; return <div className={`track-step ${done ? 'done' : ''} ${order.status === status ? 'current' : ''}`} key={status}><span>{done ? <Check size={14} /> : index + 1}</span><small>{status}</small></div> })}</div><div className="order-snapshot"><h3>In this order</h3>{order.lines.map((line) => <div className="snapshot-line" key={line.id}><Image src={line.image} alt={line.name} className="snapshot-photo" /><div><b>{line.quantity} × {line.name}</b>{line.kind === 'combo' && <small>{line.contents?.map((value) => `${value.name} × ${value.quantity}`).join(' · ')}</small>}</div><strong>{inr(line.total)}</strong></div>)}</div><div className="snapshot-total"><span>Subtotal</span><b>{inr(order.subtotal)}</b><span>GST & charges</span><b>{inr(order.tax + order.extraCharge)}</b><strong>Total paid · simulated</strong><strong>{inr(order.total)}</strong></div></div>
}

function SuccessPage({ settings }: { settings: RestaurantSettings }) {
  const id = new URLSearchParams(window.location.search).get('order') || sessionStorage.getItem('rrr_recent_order')
  const [order, setOrder] = useState<Order | undefined>(() => readOrders().find((record) => record.id === id))
  useEffect(() => { const refresh = () => setOrder(readOrders().find((record) => record.id === id)); window.addEventListener('rrr-storage-change', refresh); window.addEventListener('storage', refresh); return () => { window.removeEventListener('rrr-storage-change', refresh); window.removeEventListener('storage', refresh) } }, [id])
  return <><Header settings={settings} cartCount={0} onCart={() => go('/')} /><main className="confirmation-page"><div className="confirmation-banner"><div className="confirmation-check"><Check size={35} /></div><p className="eyebrow">ORDER CONFIRMED</p><h1>Your order is <em>confirmed.</em></h1><p>Your food order is confirmed in this demo.</p><span className="demo-tag"><BadgeCheck size={14} /> DEMONSTRATION ORDER · NOT SENT TO THE RESTAURANT</span></div>{order ? <div className="confirmation-grid"><OrderDetails order={order} /><aside className="confirmation-aside"><span className="confirmation-seal"><Utensils size={19} /></span><p className="eyebrow">ORDER DETAILS</p><h2>Thank you for choosing {settings.name}.</h2><p>This demo saves the order and simulated payment only in this browser. It does not notify the restaurant.</p><button className="button button-primary full-width" onClick={() => go(`/track-order?order=${encodeURIComponent(order.id)}`)}>Track this order <ArrowRight size={16} /></button><button className="button button-outline full-width" onClick={() => go('/')}>Return to the menu</button></aside></div> : <div className="no-results"><XCircle /><h2>We couldn’t find this demo order</h2><p>It may have been cleared from this browser.</p><button className="button button-primary" onClick={() => go('/')}>Return to the menu</button></div>}</main><Footer settings={settings} /></>
}

function TrackPage({ settings }: { settings: RestaurantSettings }) {
  const searchOrder = new URLSearchParams(window.location.search).get('order') || ''
  const [lookup, setLookup] = useState(searchOrder)
  const [order, setOrder] = useState<Order | undefined>(() => readOrders().find((record) => record.id === searchOrder) || (!searchOrder ? readOrders()[0] : undefined))
  const [didSearch, setDidSearch] = useState(Boolean(searchOrder))
  useEffect(() => { const refresh = () => setOrder(readOrders().find((record) => record.id === lookup) || (!lookup ? readOrders()[0] : undefined)); window.addEventListener('rrr-storage-change', refresh); window.addEventListener('storage', refresh); return () => { window.removeEventListener('rrr-storage-change', refresh); window.removeEventListener('storage', refresh) } }, [lookup])
  function submit(event: FormEvent) { event.preventDefault(); setDidSearch(true); setOrder(readOrders().find((record) => record.id.toLowerCase() === lookup.trim().toLowerCase())) }
  return <><Header settings={settings} cartCount={readCart().reduce((n, line) => n + line.quantity, 0)} onCart={() => go('/')} /><main className="track-page"><button className="back-link" onClick={() => go('/')}><ArrowLeft size={15} /> Return to the menu</button><div className="track-heading"><span className="track-heading-icon"><PackageCheck size={22} /></span><p className="eyebrow">FROM OUR KITCHEN, TO YOUR TABLE</p><h1>Follow the <em>good stuff.</em></h1><p>Enter an order ID from this browser’s demo history to see its progress.</p></div><form className="track-lookup" onSubmit={submit}><Search size={18} /><input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="e.g. AV-DEMO-20261125-ABC123" aria-label="Order ID" /><button className="button button-primary" type="submit">Find order <ArrowRight size={15} /></button></form>{order ? <OrderDetails order={order} /> : didSearch ? <div className="no-results track-empty"><Search /><h3>We couldn’t find that order</h3><p>Demo orders stay in the browser where they were placed. Check the ID and try again.</p></div> : <div className="no-results track-empty"><PackageCheck /><h3>Your order will appear here</h3><p>Place a demo order to see its local status timeline.</p></div>}<p className="track-local-note"><BadgeCheck size={15} /> These are local demonstration updates. LocalStorage is specific to this browser and is not shared across devices.</p></main><Footer settings={settings} /></>
}

type AdminTab = 'overview' | 'menu' | 'categories' | 'combos' | 'orders' | 'payments' | 'feedback' | 'settings'
const adminItems: { id: AdminTab; name: string; icon: LucideIcon }[] = [
  { id: 'overview', name: 'Overview', icon: ListFilter }, { id: 'menu', name: 'Food menu', icon: Utensils }, { id: 'categories', name: 'Categories', icon: MenuIcon }, { id: 'combos', name: 'Combos & offers', icon: Sparkles }, { id: 'orders', name: 'Orders', icon: ShoppingBag }, { id: 'payments', name: 'Payments', icon: CreditCard }, { id: 'feedback', name: 'Customer feedback', icon: MessageSquare }, { id: 'settings', name: 'Restaurant settings', icon: MapPin },
]

function AdminShell({ settings, tab, children, onLogout }: { settings: RestaurantSettings; tab: AdminTab; children: ReactNode; onLogout: () => void }) {
  return <div className="admin-frame"><aside className="admin-sidebar"><a className="admin-logo" href="/admin" onClick={(e) => { e.preventDefault(); go('/admin') }}><Image src={settings.logo || '/assets/aaroha-vanam-logo.svg'} alt={`${settings.name} logo`} className="brand-logo admin-brand-logo" /><span><b>{settings.name}</b><small>OWNER DASHBOARD</small></span></a><div className="sidebar-label">RESTAURANT MANAGEMENT</div><nav className="admin-nav">{adminItems.map((item) => <a className={tab === item.id ? 'active' : ''} key={item.id} href={`/admin/${item.id === 'overview' ? '' : item.id}`} onClick={(e) => { e.preventDefault(); go(`/admin${item.id === 'overview' ? '' : `/${item.id}`}`) }}><item.icon size={17} /><span>{item.name}</span>{item.id === 'orders' && readOrders().length > 0 && <i>{readOrders().length}</i>}</a>)}</nav><div className="sidebar-bottom"><div className="admin-restaurant-badge"><span className="online-dot" /><span><b>{settings.name}</b></span></div><a className="back-store-link" href="/" onClick={(e) => { e.preventDefault(); go('/') }}><ArrowLeft size={15} /> Back to customer site</a></div></aside><main className="admin-main"><div className="admin-topbar"><div>OWNER DASHBOARD</div><div className="admin-topbar-actions"><button className="admin-logout" onClick={onLogout}><LogOut size={14} /> Log out</button><button onClick={() => go('/')}><ArrowLeft size={14} /> Customer site</button></div></div>{children}</main></div>
}

function AdminLogin({ settings, onSuccess }: { settings: RestaurantSettings; onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const result = await response.json() as { error?: string; authenticated?: boolean }
      if (!response.ok || !result.authenticated) { setError(result.error || 'Could not sign in. Please try again.'); return }
      onSuccess()
    } catch {
      setError('Could not connect to sign-in. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return <main className="admin-auth-page"><a className="admin-auth-brand" href="/" onClick={(event) => { event.preventDefault(); go('/') }}><Image src={settings.logo || '/assets/aaroha-vanam-logo.svg'} alt={`${settings.name} logo`} className="brand-logo" /><span><b>{settings.name}</b><small>OWNER SIGN IN</small></span></a><form className="admin-auth-card" onSubmit={submit}><p className="eyebrow">RESTAURANT MANAGEMENT</p><h1>Admin login</h1><p className="admin-auth-intro">Sign in to open the dashboard.</p><label className="field-label">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label><label className="field-label">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary full-width" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button><button className="text-button full-width" type="button" onClick={() => go('/')}>Return to the customer site</button></form></main>
}

function AdminGate({ settings, tab }: { settings: RestaurantSettings; tab: AdminTab }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  useEffect(() => {
    let current = true
    fetch('/api/admin/auth', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.json() as Promise<{ authenticated?: boolean }>).then((result) => { if (current) setAuthenticated(Boolean(result.authenticated)) }).catch(() => { if (current) setAuthenticated(false) })
    return () => { current = false }
  }, [])
  if (authenticated === null) return <main className="admin-auth-page"><div className="admin-auth-loading">Checking sign-in…</div></main>
  if (!authenticated) return <AdminLogin settings={settings} onSuccess={() => setAuthenticated(true)} />
  async function logout() {
    try { await fetch('/api/admin/auth', { method: 'DELETE', credentials: 'same-origin' }) } catch { /* keep the sign-in screen visible if sign-out is offline */ } finally { setAuthenticated(false) }
  }
  return <AdminPage key={tab} tab={tab} onLogout={() => { void logout() }} />
}
function AdminPage({ tab, onLogout }: { tab: AdminTab; onLogout: () => void }) {
  const revision = useRevision()
  const settings = readSettings(); const categories = readCategories().slice().sort(byOrder); const menu = readMenu(); const combos = readCombos(); const orders = readOrders(); const payments = readPayments(); const feedback = getData<CustomerFeedback[]>(STORE_KEYS.feedback)
  const [modalItem, setModalItem] = useState<MenuItem | null>(null)
  const [modalNew, setModalNew] = useState(false)
  const [toast, setToast] = useState('')
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()))
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 2600); return () => clearTimeout(timeout) }, [toast])
  function saveMenuItem(item: MenuItem) { const next = menu.some((record) => record.id === item.id) ? menu.map((record) => record.id === item.id ? item : record) : [...menu, item]; setData(STORE_KEYS.menu, next); setModalItem(null); setModalNew(false); setToast('Menu item saved. It is live on the customer site.') }
  function deleteMenuItem(id: string) { if (!window.confirm('Delete this menu item from the demo menu? Existing order snapshots will remain unchanged.')) return; setData(STORE_KEYS.menu, menu.filter((item) => item.id !== id)); setToast('Menu item deleted.') }
  function changeOrder(order: Order, status: Order['status']) { const now = new Date().toISOString(); setData(STORE_KEYS.orders, orders.map((record) => record.id === order.id ? { ...record, status, statusHistory: [...record.statusHistory, { status, at: now }] } : record)); const history = getData<{ orderId: string; status: string; at: string }[]>(STORE_KEYS.history); setData(STORE_KEYS.history, [{ orderId: order.id, status, at: now }, ...history]); setToast('Order status updated; customer tracking will reflect it.') }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const yesterdayDate = (() => { const date = new Date(`${today}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() - 1); return date.toISOString().slice(0, 10) })()
  const indiaDate = (value: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
  const selectedDateLabel = new Date(`${selectedPaymentDate}T12:00:00.000Z`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'long' })
  const selectedOrders = orders.filter((order) => indiaDate(order.createdAt) === selectedPaymentDate)
  const selectedPayments = payments.filter((payment) => indiaDate(payment.createdAt) === selectedPaymentDate)
  const pendingPayments = selectedPayments.filter((payment) => payment.status === 'Pending')
  const completedPayments = selectedPayments.filter((payment) => payment.status === 'Success')
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const receivedTotal = completedPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const thisMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).slice(0, 7)
  const monthlyRevenue = orders.filter((order) => new Date(order.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).slice(0, 7) === thisMonth).reduce((sum, order) => sum + order.total, 0)
  return <AdminShell settings={settings} tab={tab} onLogout={onLogout}><div className="admin-content" key={revision}>
    {tab === 'overview' && <><div className="admin-page-heading"><div><p className="eyebrow">RESTAURANT OVERVIEW</p><h1>Good evening.</h1><p>Manage menu, orders and customer feedback.</p></div><button className="button button-primary" onClick={() => go('/')}>View customer site <ArrowRight size={16} /></button></div><div className="admin-payment-summary"><div className="payment-summary-heading"><div><p className="eyebrow">PAYMENTS</p><h2>Payments for {selectedDateLabel}</h2></div><div className="payment-date-controls"><button type="button" className={selectedPaymentDate === today ? 'selected' : ''} onClick={() => setSelectedPaymentDate(today)}>Today</button><button type="button" className={selectedPaymentDate === yesterdayDate ? 'selected' : ''} onClick={() => setSelectedPaymentDate(yesterdayDate)}>Yesterday</button><label className="payment-date-picker" aria-label="Choose a payment date"><CalendarDays size={16} /><input type="date" value={selectedPaymentDate} max={today} onChange={(event) => setSelectedPaymentDate(event.target.value)} /></label></div></div><div className="payment-summary-cards"><div className="admin-stat-card payment-stat payment-stat-pending"><span className="admin-stat-icon"><Clock3 size={18} /></span><span className="stat-label">Pending payments</span><strong>{pendingPayments.length}</strong><small>{inr(pendingAmount)} awaiting confirmation</small></div><div className="admin-stat-card payment-stat payment-stat-completed"><span className="admin-stat-icon"><CheckCircle2 size={18} /></span><span className="stat-label">Completed payments</span><strong>{completedPayments.length}</strong><small>{inr(receivedTotal)} received</small></div><div className="admin-stat-card payment-stat payment-stat-received"><span className="admin-stat-icon"><Banknote size={18} /></span><span className="stat-label">Total payments received</span><strong>{inr(receivedTotal)}</strong><small>{completedPayments.length} completed payments</small></div></div></div><div className="admin-stat-grid">{[{ label: 'Orders on this date', value: selectedOrders.length, icon: ShoppingBag, detail: selectedDateLabel }, { label: 'Revenue received', value: inr(receivedTotal), icon: Banknote, detail: `${completedPayments.length} completed payments` }, { label: 'Revenue this month', value: inr(monthlyRevenue), icon: Clock3, detail: 'Monthly total' }, { label: 'Available menu items', value: menu.filter((item) => item.available).length, icon: Utensils, detail: `across ${categories.filter((category) => category.active).length} categories` }].map((stat) => <div className="admin-stat-card" key={stat.label}><span className="admin-stat-icon"><stat.icon size={18} /></span><span className="stat-label">{stat.label}</span><strong>{stat.value}</strong><small>{stat.detail}</small></div>)}</div><div className="admin-dashboard-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">LATEST ACTIVITY</p><h2>Recent orders</h2></div><button className="admin-view-link" onClick={() => go('/admin/orders')}>All orders <ArrowRight size={14} /></button></div>{selectedOrders.length ? <div className="admin-table-wrap"><table><thead><tr><th>ORDER</th><th>TABLE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>{selectedOrders.slice(0, 5).map((order) => <tr key={order.id}><td><b>{order.id}</b><small>{new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}</small></td><td>{order.tableNumber.replace(/^T/, 'Table ')}</td><td>{inr(order.total)}</td><td><span className="status-pill small-status"><i />{order.status}</span></td></tr>)}</tbody></table></div> : <div className="admin-empty"><ShoppingBag /><h3>No orders on this date</h3><p>Choose another date to view its orders.</p><button className="button button-outline" onClick={() => go('/')}>Explore customer site</button></div>}</section><section className="admin-panel side-panel"><div className="admin-panel-heading"><div><p className="eyebrow">ORDER PROGRESS</p><h2>Kitchen board</h2></div></div>{(['Confirmed', 'Preparing', 'Ready to Serve', 'Completed'] as const).map((status, i) => <div className="kitchen-row" key={status}><span className={`kitchen-icon k-${i}`}><PackageCheck size={16} /></span><div><b>{status}</b><small>{i === 0 ? 'Newly confirmed' : i === 1 ? 'Being prepared' : i === 2 ? 'Ready at the table' : 'Served and complete'}</small></div><strong>{selectedOrders.filter((order) => order.status === status).length}</strong></div>)}</section></div></>}

    {tab === 'menu' && <><div className="admin-page-heading"><div><p className="eyebrow">THE CUSTOMER CATALOGUE</p><h1>Food menu</h1><p>Edit items, demonstration pricing, photographs and availability.</p></div><button className="button button-primary" onClick={() => { setModalNew(true); setModalItem(null) }}><Plus size={16} /> Add a menu item</button></div><div className="admin-toolbar"><span><b>{menu.length}</b> menu items · changes update the customer site right away</span><span className="admin-demo-pill">SAMPLE MENU & PRICES</span></div><div className="admin-table-card"><div className="admin-table-wrap"><table><thead><tr><th>MENU ITEM</th><th>CATEGORY</th><th>PRICE</th><th>TYPE</th><th>AVAILABILITY</th><th>ACTIONS</th></tr></thead><tbody>{menu.map((item) => <tr key={item.id}><td><div className="admin-menu-item"><ProductImage item={item} className="admin-thumb" /><span><b>{item.name}</b><small>{item.description}</small></span></div></td><td>{categories.find((category) => category.id === item.categoryId)?.name ?? 'Uncategorized'}</td><td><b>{inr(item.price)}</b></td><td><span className={`food-mark ${item.type}`} title={item.type}><i /></span></td><td><button className={`availability-toggle ${item.available ? 'on' : ''}`} onClick={() => saveMenuItem({ ...item, available: !item.available })}><i /> {item.available ? 'Available' : 'Hidden'}</button></td><td><div className="row-actions"><button onClick={() => { setModalItem(item); setModalNew(false) }}>Edit</button><button className="delete-action" onClick={() => deleteMenuItem(item.id)} aria-label={`Delete ${item.name}`}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div></div>{(modalNew || modalItem) && <MenuEditor key={modalItem?.id ?? 'new'} item={modalItem} categories={categories} onClose={() => { setModalNew(false); setModalItem(null) }} onSave={saveMenuItem} />}</>}

    {tab === 'categories' && <CategoryManager categories={categories} menu={menu} combos={combos} />}
    {tab === 'combos' && <ComboManager combos={combos} menu={menu} />}
    {tab === 'orders' && <><div className="admin-page-heading"><div><p className="eyebrow">TABLE SERVICE FLOW</p><h1>Demo orders</h1><p>Review customer orders and move them through the kitchen.</p></div><span className="admin-demo-pill">{orders.length} LOCAL ORDERS</span></div>{orders.length ? <div className="orders-admin-list">{orders.map((order) => <AdminOrderCard key={order.id} order={order} onStatus={(status) => changeOrder(order, status)} />)}</div> : <div className="admin-empty card-empty"><ShoppingBag /><h3>No demo orders just yet</h3><p>Complete a demo checkout on the customer site. It will be listed here automatically.</p><button className="button button-primary" onClick={() => go('/')}>Open customer site</button></div>}</>}
    {tab === 'feedback' && <FeedbackManager entries={feedback} />}
    {tab === 'payments' && <><div className="admin-page-heading"><div><p className="eyebrow">TRANSACTION HISTORY</p><h1>Demo payments</h1><p>Records created by the payment simulation in this browser.</p></div><span className="simulated-chip"><BadgeCheck size={14} /> SIMULATED ONLY</span></div>{payments.length ? <div className="admin-table-card"><div className="admin-table-wrap"><table><thead><tr><th>TRANSACTION</th><th>ORDER</th><th>METHOD</th><th>AMOUNT</th><th>RESULT</th><th>WHEN</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><b>{payment.id}</b></td><td>{payment.orderId ?? '—'}</td><td>{payment.method}</td><td><b>{inr(payment.amount)}</b></td><td><span className={`payment-status ${payment.status.toLowerCase()}`}><i />{payment.status}</span></td><td>{new Date(payment.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}</td></tr>)}</tbody></table></div></div> : <div className="admin-empty card-empty"><CreditCard /><h3>No payment attempts yet</h3><p>Successful, failed and cancelled simulation attempts will be listed here.</p></div>}</>}
    {tab === 'settings' && <SettingsForm settings={settings} onSave={(next) => { setData(STORE_KEYS.settings, next); setData(STORE_KEYS.tables, next.tables); setToast('Restaurant settings saved and applied to the customer site.') }} onReset={() => { if (window.confirm('Reset every demo setting, cart, order and payment in this browser to the original sample data?')) { resetDemoData(); setToast('Demo data reset to the original sample.'); } }} />}
  </div>{toast && <div className="toast-message"><CheckCircle2 size={16} />{toast}</div>}</AdminShell>
}

function MenuEditor({ item, categories, onClose, onSave }: { item: MenuItem | null; categories: Category[]; onClose: () => void; onSave: (item: MenuItem) => void }) {
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [price, setPrice] = useState(String(item?.price ?? ''))
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories.find((category) => category.active)?.id ?? '')
  const [type, setType] = useState<'veg' | 'nonveg'>(item?.type ?? 'veg')
  const [image, setImage] = useState(item?.image ?? '')
  const [available, setAvailable] = useState(item?.available ?? true)
  const [bestseller, setBestseller] = useState(item?.bestseller ?? false)
  const [special, setSpecial] = useState(item?.special ?? false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const file = (event.currentTarget.elements.namedItem('photo') as HTMLInputElement)?.files?.[0]; try { const finalImage = file ? await saveUploadedImage(file) : image; onSave({ id: item?.id ?? `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomId().slice(0, 4).toLowerCase()}`, name: name.trim(), description: description.trim(), price: Number(price), categoryId, type, image: finalImage, available, bestseller, special }); } catch { setError('The image could not be saved. Try a smaller image file.'); } }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}><form className="editor-modal" onSubmit={submit}><div className="modal-header"><div><p className="eyebrow">MENU MANAGEMENT</p><h2>{item ? 'Edit menu item' : 'Add a menu item'}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div><div className="editor-body"><label className="field-label">Food name<input value={name} required onChange={(e) => setName(e.target.value)} placeholder="e.g. Royal Paneer Tikka" /></label><label className="field-label">Short description<textarea value={description} required onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="A short, appetizing description" /></label><div className="field-row"><label className="field-label">Demo price (₹)<input type="number" min="0" step="1" required value={price} onChange={(e) => setPrice(e.target.value)} /></label><label className="field-label">Category<select value={categoryId} required onChange={(e) => setCategoryId(e.target.value)}>{categories.filter((category) => category.active).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><label className="field-label">Food photograph<input name="photo" type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) setImage(URL.createObjectURL(e.target.files[0])) }} /><small className="field-hint">Images are resized to WebP and saved in this browser’s IndexedDB.</small></label>{image && <Image src={image} alt="Menu image preview" className="editor-image-preview" />}<div className="field-row"><label className="field-label">Dish type<select value={type} onChange={(e) => setType(e.target.value as 'veg' | 'nonveg')}><option value="veg">Vegetarian</option><option value="nonveg">Non-vegetarian</option></select></label><div className="toggle-stack"><label><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> Available to order</label><label><input type="checkbox" checked={bestseller} onChange={(e) => setBestseller(e.target.checked)} /> Guest favourite</label><label><input type="checkbox" checked={special} onChange={(e) => setSpecial(e.target.checked)} /> Today’s special</label></div></div>{error && <p className="form-error"><XCircle size={16} />{error}</p>}</div><div className="modal-footer"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">Save menu item <Check size={16} /></button></div></form></div>
}

function CategoryManager({ categories, menu, combos }: { categories: Category[]; menu: MenuItem[]; combos: Combo[] }) {
  const [list, setList] = useState(categories)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => setList(categories), [categories])
  function save(next: Category[]) { setList(next); setData(STORE_KEYS.categories, next); setMessage('Category changes applied to the customer menu.') }
  function add(event: FormEvent) { event.preventDefault(); const clean = name.trim(); if (!clean) return; const id = `${clean.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomId().slice(0, 4).toLowerCase()}`; save([...list, { id, name: clean, active: true, order: Math.max(0, ...list.map((category) => category.order)) + 1 }]); setName('') }
  function move(id: string, direction: -1 | 1) { const index = list.findIndex((category) => category.id === id); const target = index + direction; if (target < 0 || target >= list.length) return; const ordered = [...list].sort(byOrder); [ordered[index], ordered[target]] = [ordered[target], ordered[index]]; save(ordered.map((category, i) => ({ ...category, order: i + 1 }))) }
  function remove(category: Category) { const hasItems = menu.some((item) => item.categoryId === category.id || category.id === 'todays-specials' && item.special || category.id === 'best-sellers' && item.bestseller); const hasCombos = category.id === 'combos-meal-deals' && combos.length > 0; if (hasItems || hasCombos) return setMessage('This category still has items or offers. Move, remove or unfeature them before deleting it.'); if (!window.confirm(`Delete the ${category.name} category from the demo?`)) return; save(list.filter((value) => value.id !== category.id)) }
  return <><div className="admin-page-heading"><div><p className="eyebrow">ORGANIZE THE MENU</p><h1>Categories</h1><p>Reorder and manage the sections customers browse on one page.</p></div></div><div className="category-admin-layout"><section className="admin-panel category-admin-list"><div className="admin-panel-heading"><div><p className="eyebrow">MENU ORDER</p><h2>{list.length} categories</h2></div></div>{list.slice().sort(byOrder).map((category, index) => <div className="category-admin-row" key={category.id}><span className="category-index">{String(index + 1).padStart(2, '0')}</span>{editing === category.id ? <input className="inline-edit-input" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(list.map((entry) => entry.id === category.id ? { ...entry, name: editName.trim() || entry.name } : entry)); setEditing(null) } }} /> : <span className="category-admin-name"><b>{category.name}</b><small>{menu.filter((item) => item.categoryId === category.id).length} menu items</small></span>}<button className={`availability-toggle ${category.active ? 'on' : ''}`} onClick={() => save(list.map((entry) => entry.id === category.id ? { ...entry, active: !entry.active } : entry))}><i />{category.active ? 'Visible' : 'Hidden'}</button><div className="row-actions"><button title="Move up" onClick={() => move(category.id, -1)} disabled={index === 0}><ArrowUp size={15} /></button><button title="Move down" onClick={() => move(category.id, 1)} disabled={index === list.length - 1}><ArrowDown size={15} /></button><button onClick={() => { if (editing === category.id) { save(list.map((entry) => entry.id === category.id ? { ...entry, name: editName.trim() || entry.name } : entry)); setEditing(null) } else { setEditing(category.id); setEditName(category.name) } }}>{editing === category.id ? 'Save' : 'Rename'}</button><button className="delete-action" onClick={() => remove(category)} aria-label={`Delete ${category.name}`}><Trash2 size={15} /></button></div></div>)}</section><aside className="admin-panel add-category-panel"><span className="add-category-icon"><Plus /></span><p className="eyebrow">GROW YOUR MENU</p><h2>Add a category</h2><p>Keep all sections on the same customer menu page.</p><form onSubmit={add}><label className="field-label">Category name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chef’s specials" required /></label><button className="button button-primary full-width" type="submit">Add category <Plus size={15} /></button></form><div className="category-rule"><span>TIP</span>Categories with menu items can’t be deleted until those items are moved or removed.</div>{message && <p className="inline-message"><CheckCircle2 size={14} />{message}</p>}</aside></div></>
}

function ComboManager({ combos, menu }: { combos: Combo[]; menu: MenuItem[] }) {
  const [list, setList] = useState(combos)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')
  const [image, setImage] = useState('')
  const [included, setIncluded] = useState<ComboItem[]>([])
  const [addItem, setAddItem] = useState('')
  const [active, setActive] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => setList(combos), [combos])
  function open(combo?: Combo) { setEditing(combo?.id ?? 'new'); setName(combo?.name ?? ''); setDescription(combo?.description ?? ''); setPrice(combo ? String(combo.price) : ''); setOriginalPrice(combo?.originalPrice ? String(combo.originalPrice) : ''); setImage(combo?.image ?? ''); setIncluded(combo?.includedItems.map((entry) => ({ ...entry })) ?? []); setActive(combo?.active ?? true); setError('') }
  function clear() { setEditing(null); setAddItem('') }
  function remove(combo: Combo) { if (!window.confirm(`Delete the ${combo.name} offer from the demo? Existing orders keep their original combo snapshot.`)) return; const next = list.filter((entry) => entry.id !== combo.id); setList(next); setData(STORE_KEYS.combos, next) }
  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!included.length) return setError('Add at least one included item to this combo.'); const combo: Combo = { id: editing === 'new' ? `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomId().slice(0, 4).toLowerCase()}` : editing!, name: name.trim(), description: description.trim(), price: Number(price), originalPrice: originalPrice ? Number(originalPrice) : undefined, image, includedItems: included, active }; const next = list.some((entry) => entry.id === combo.id) ? list.map((entry) => entry.id === combo.id ? combo : entry) : [...list, combo]; setList(next); setData(STORE_KEYS.combos, next); clear() }
  async function upload(file?: File) { if (!file) return; try { setImage(await saveUploadedImage(file)) } catch { setError('Could not save that image. Try a smaller photo.') } }
  return <><div className="admin-page-heading"><div><p className="eyebrow">SHARE A LITTLE MORE</p><h1>Combos & offers</h1><p>Update set meals, prices, included items and promotional photos.</p></div><button className="button button-primary" onClick={() => open()}><Plus size={16} /> Create a combo</button></div><div className="combo-admin-grid">{list.map((combo) => <article className={`combo-admin-card ${!combo.active ? 'dimmed' : ''}`} key={combo.id}><Image src={combo.image} alt={combo.name} className="combo-admin-photo" /><div className="combo-admin-card-body"><div className="combo-admin-title"><h2>{combo.name}</h2><span className={`availability-dot ${combo.active ? 'enabled' : ''}`} /></div><p>{combo.description}</p><div className="combo-admin-price"><b>{inr(combo.price)}</b>{combo.originalPrice && <del>{inr(combo.originalPrice)}</del>}<small>sample offer price</small></div><div className="combo-admin-actions"><button className={`availability-toggle ${combo.active ? 'on' : ''}`} onClick={() => { const next = list.map((entry) => entry.id === combo.id ? { ...entry, active: !entry.active } : entry); setList(next); setData(STORE_KEYS.combos, next) }}><i />{combo.active ? 'Active offer' : 'Hidden offer'}</button><button onClick={() => open(combo)}>Edit combo <ArrowRight size={14} /></button><button className="combo-delete" onClick={() => remove(combo)} aria-label={`Delete ${combo.name}`}><Trash2 size={14} /></button></div></div></article>)}</div>{editing && <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) clear() }}><form className="editor-modal combo-editor" onSubmit={save}><div className="modal-header"><div><p className="eyebrow">COMBO MANAGEMENT</p><h2>{editing === 'new' ? 'Create a combo' : 'Edit combo offer'}</h2></div><button className="icon-button" type="button" onClick={clear}><X /></button></div><div className="editor-body"><label className="field-label">Combo name<input value={name} required onChange={(e) => setName(e.target.value)} placeholder="e.g. Royal Family Feast" /></label><label className="field-label">Included items summary<input value={description} required onChange={(e) => setDescription(e.target.value)} placeholder="Biryani · Starter · Drinks" /></label><div className="field-row"><label className="field-label">Offer price (₹)<input type="number" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} /></label><label className="field-label">Original price (₹)<input type="number" min="0" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="Optional" /></label></div><label className="field-label">Combo photograph<input type="file" accept="image/*" onChange={(e) => upload(e.target.files?.[0])} /><small className="field-hint">Optimized to WebP and saved in browser IndexedDB.</small></label>{image && <Image src={image} alt="Combo preview" className="editor-image-preview" />}<div className="included-admin"><div className="included-heading"><h3>What’s in this combo?</h3><span>{included.length} items</span></div>{included.map((entry, index) => <div className="included-row" key={`${entry.itemId}-${index}`}><span>{entry.name}</span><div className="qty-control"><button type="button" onClick={() => setIncluded(included.map((value, i) => i === index ? { ...value, quantity: Math.max(1, value.quantity - 1) } : value))}><Minus size={13} /></button><span>{entry.quantity}</span><button type="button" onClick={() => setIncluded(included.map((value, i) => i === index ? { ...value, quantity: value.quantity + 1 } : value))}><Plus size={13} /></button></div><button className="quiet-icon" type="button" onClick={() => setIncluded(included.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div>)}<div className="add-included-row"><select value={addItem} onChange={(e) => setAddItem(e.target.value)}><option value="">Choose a menu item to add</option>{menu.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button type="button" className="button button-cream" disabled={!addItem} onClick={() => { const item = menu.find((value) => value.id === addItem); if (item) setIncluded([...included, { itemId: item.id, name: item.name, quantity: 1 }]); setAddItem('') }}><Plus size={15} /> Add</button></div></div><label className="toggle-label"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Offer is active on customer site</label>{error && <p className="form-error"><XCircle size={16} />{error}</p>}</div><div className="modal-footer"><button type="button" className="button button-outline" onClick={clear}>Cancel</button><button className="button button-primary" type="submit">Save combo <Check size={16} /></button></div></form></div>}</>
}

function AdminOrderCard({ order, onStatus }: { order: Order; onStatus: (status: Order['status']) => void }) {
  return <article className="admin-order-card"><div className="admin-order-top"><div><p className="eyebrow">{new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}</p><h2>{order.id}</h2></div><span className="status-pill"><i />{order.status}</span></div><div className="admin-order-grid"><div><small>TABLE</small><b>{order.tableNumber.replace(/^T/, 'Table ')}</b></div><div><small>CUSTOMER</small><b>{order.customerName}</b></div><div><small>MOBILE</small><b>{order.mobile}</b></div><div><small>PAYMENT</small><b>{order.paymentStatus}</b></div><div><small>TOTAL</small><b>{inr(order.total)}</b></div></div><div className="admin-order-lines">{order.lines.map((line) => <div key={line.id}><span>{line.quantity} × {line.name}{line.kind === 'combo' && <small> ({line.contents?.map((content) => `${content.name} ×${content.quantity}`).join(' · ')})</small>}</span><b>{inr(line.total)}</b></div>)}</div><div className="admin-order-bottom"><span><BadgeCheck size={15} /> Demo transaction · {order.paymentMethod}</span><label>UPDATE STATUS<select value={order.status} onChange={(e) => onStatus(e.target.value as Order['status'])}>{(['Confirmed', 'Preparing', 'Ready to Serve', 'Completed'] as const).map((status) => <option key={status} value={status}>{status}</option>)}</select></label></div></article>
}

function SettingsForm({ settings, onSave, onReset }: { settings: RestaurantSettings; onSave: (settings: RestaurantSettings) => void; onReset: () => void }) {
  const [form, setForm] = useState(settings)
  const [tablesText, setTablesText] = useState(settings.tables.join(', '))
  const [logo, setLogo] = useState(settings.logo)
  const [saved, setSaved] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const file = (event.currentTarget.elements.namedItem('logo-upload') as HTMLInputElement)?.files?.[0]; let finalLogo = logo; if (file) { try { finalLogo = await saveUploadedImage(file) } catch { setSaved('Could not save the logo image. Try a smaller image file.'); return } } const next = { ...form, logo: finalLogo, tables: tablesText.split(',').map((value) => value.trim()).filter(Boolean) }; onSave(next); setForm(next); setSaved('Settings saved. Customer site updated.'); setTimeout(() => setSaved(''), 2600) }
  function field<K extends keyof RestaurantSettings>(key: K, value: RestaurantSettings[K]) { setForm({ ...form, [key]: value }) }
  return <><div className="admin-page-heading"><div><p className="eyebrow">MAKE IT YOURS</p><h1>Restaurant settings</h1><p>Replace sample details with the restaurant’s real information.</p></div><span className="admin-demo-pill">DEMO BUSINESS DETAILS</span></div><form className="settings-layout" onSubmit={submit}><div className="settings-main"><section className="admin-panel settings-panel"><div className="admin-panel-heading"><div><p className="eyebrow">YOUR IDENTITY</p><h2>Restaurant information</h2></div><span className="settings-index">01</span></div><div className="settings-fields"><label className="field-label">Restaurant name<input value={form.name} onChange={(e) => field('name', e.target.value)} required /></label><label className="field-label">Tagline<input value={form.tagline} onChange={(e) => field('tagline', e.target.value)} /></label><label className="field-label">Contact number<input value={form.phone} onChange={(e) => field('phone', e.target.value)} placeholder="Add actual restaurant phone" /></label><label className="field-label">Restaurant address<input value={form.address} onChange={(e) => field('address', e.target.value)} placeholder="Add actual restaurant address" /></label><label className="field-label">Opening hours<input value={form.openingHours} placeholder="Enter actual restaurant hours" onChange={(e) => field('openingHours', e.target.value)} /></label><label className="field-label">Logo photograph<input name="logo-upload" type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) setLogo(URL.createObjectURL(e.target.files[0])) }} /><small className="field-hint">Upload is stored locally in this browser for the demo.</small></label>{logo && <Image src={logo} alt="Restaurant logo preview" className="settings-logo-preview" />}</div></section><section className="admin-panel settings-panel"><div className="admin-panel-heading"><div><p className="eyebrow">TABLE SERVICE</p><h2>Tables & ordering</h2></div><span className="settings-index">02</span></div><label className="field-label">Table numbers <small>Comma-separated. Customers must choose one at checkout.</small><textarea rows={3} value={tablesText} onChange={(e) => setTablesText(e.target.value)} /></label><label className="toggle-label restaurant-open-toggle"><input type="checkbox" checked={form.open} onChange={(e) => field('open', e.target.checked)} /> Restaurant open to demo orders</label></section><section className="admin-panel settings-panel"><div className="admin-panel-heading"><div><p className="eyebrow">TAXES & CHARGES</p><h2>Checkout settings</h2></div><span className="settings-index">03</span></div><div className="field-row"><label className="field-label">GST rate (%)<input type="number" min="0" max="100" value={form.gstPercent} onChange={(e) => field('gstPercent', Number(e.target.value))} /></label><label className="field-label">Additional charges (₹)<input type="number" min="0" value={form.extraCharge} onChange={(e) => field('extraCharge', Number(e.target.value))} /></label></div><p className="field-hint">Demo configuration only. Confirm tax and service-charge rules with the restaurant before publishing.</p></section></div><aside className="settings-aside"><div className="settings-save-card"><span className="settings-save-icon"><CheckCircle2 /></span><p className="eyebrow">READY WHEN YOU ARE</p><h3>Save your demo details</h3><p>Changes will update the customer site immediately in this browser.</p>{saved && <p className="inline-message"><CheckCircle2 size={14} />{saved}</p>}<button className="button button-primary full-width" type="submit">Save settings <Check size={16} /></button></div><div className="settings-reset-card"><p className="eyebrow">START THE DEMO FRESH</p><h3>Reset demo data</h3><p>Restore sample menu, settings, offers and remove all saved orders from this browser.</p><button className="button button-outline full-width" type="button" onClick={onReset}>Reset browser demo</button></div><p className="settings-local-note"><BadgeCheck size={15} /> All changes are stored in this browser. Demo admin has no production authentication or cross-device sync.</p></aside></form></>
}

function App() {
  useRevision()
  const path = usePath()
  useEffect(() => { const hash = window.location.hash.slice(1); if (!hash) return; const timeout = window.setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 60); return () => window.clearTimeout(timeout) }, [path])
  const settings = readSettings(); const categories = readCategories(); const items = readMenu(); const combos = readCombos(); const lines = readCart()
  const [cartOpen, setCartOpen] = useState(false)
  const pathOnly = path.split('?')[0]
  const isAdminPath = pathOnly.startsWith('/admin')
  function change(id: string, amount: number, kind: 'item' | 'combo' = 'item') {
    const entity = kind === 'item' ? readMenu().find((item) => item.id === id) : readCombos().find((combo) => combo.id === id)
    if (!entity || (kind === 'item' ? !(entity as MenuItem).available : !(entity as Combo).active)) return
    const current = readCart(); const match = current.find((line) => line.id === id && line.kind === kind)
    const quantity = Math.max(0, (match?.quantity ?? 0) + amount)
    const next = quantity ? match ? current.map((line) => line === match ? { ...line, quantity } : line) : [...current, { id, kind, quantity }] : current.filter((line) => !(line.id === id && line.kind === kind))
    setData(STORE_KEYS.cart, next)
  }
  function remove(id: string, kind?: 'item' | 'combo') { setData(STORE_KEYS.cart, readCart().filter((line) => line.id !== id || kind && line.kind !== kind)) }
  function routeContent() {
    if (pathOnly === '/checkout') return <CheckoutPage settings={settings} items={items} combos={combos} lines={lines} />
    if (pathOnly === '/payment') return <PaymentPage settings={settings} />
    if (pathOnly === '/order-success') return <SuccessPage settings={settings} />
    if (pathOnly === '/track-order') return <TrackPage settings={settings} />
    if (isAdminPath) {
      const segment = pathOnly.split('/')[2] as AdminTab | undefined
      const tab: AdminTab = adminItems.find((item) => item.id === segment)?.id ?? 'overview'
      return <AdminGate settings={settings} tab={tab} />
    }
    return <HomePage settings={settings} categories={categories} items={items} combos={combos} lines={lines} onChange={change} onCart={() => setCartOpen(true)} />
  }
  return <>{routeContent()}{cartOpen && <CartDrawer lines={lines} onChange={(id, amount) => { const line = readCart().find((entry) => entry.id === id); if (line) change(id, amount, line.kind) }} onRemove={(id, kind) => remove(id, kind)} onClear={() => setData(STORE_KEYS.cart, [])} onClose={() => setCartOpen(false)} onCheckout={() => { setCartOpen(false); go('/checkout') }} items={items} combos={combos} settings={settings} />}</>
}

export default App
