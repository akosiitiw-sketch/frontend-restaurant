import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle, ArrowDownRight, BarChart3, Boxes, BrainCircuit, Briefcase, CalendarDays,
  Check, CheckCircle2, ChefHat, ChevronDown, ChevronRight, CircleDollarSign, Clock3,
  CreditCard, DoorOpen, FileBarChart2, Flame, LayoutDashboard, Loader2, LockKeyhole,
  LogOut, Mail, Menu, Minus, PackageCheck, Plus, ReceiptText, RefreshCw, Search,
  ShoppingBag, ShoppingCart, Soup, Sparkles, Table2, TrendingUp, Truck,
  User, Users, Utensils, Wallet, X, ClipboardList
} from 'lucide-react'
import { request, setToken, getToken } from './api'

const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(Number(value || 0))
const compactMoney = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0))
const dateTime = value => value ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'
const shortDate = value => value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'
const roleLabel = role => ({ admin: 'Administrator', manager: 'Manager', cashier: 'Cashier', kitchen: 'Kitchen staff' }[role] || role || 'Staff')

const navigation = [
  { group: 'WORKSPACE', items: [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of sale', icon: ShoppingCart, badge: 'POS' },
    { id: 'kitchen', label: 'Kitchen display', icon: ChefHat },
    { id: 'orders', label: 'Orders', icon: ReceiptText },
  ] },
  { group: 'MANAGEMENT', items: [
    { id: 'menu', label: 'Menu & products', icon: Utensils },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'forecast', label: 'AI forecast', icon: BrainCircuit },
    { id: 'purchasing', label: 'Purchase orders', icon: Truck },
    { id: 'tables', label: 'Dining tables', icon: Table2 },
    { id: 'reports', label: 'Sales reports', icon: FileBarChart2 },
    { id: 'team', label: 'Team & shifts', icon: Users },
  ] },
]

function Notice({ notice, dismiss }) {
  if (!notice) return null
  const danger = notice.type === 'error'
  return <div className={`fixed right-5 top-5 z-[80] flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl ${danger ? 'border-red-200 bg-white text-red-800' : 'border-emerald-200 bg-white text-emerald-800'}`}>
    {danger ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
    <p className="max-w-sm text-sm font-medium">{notice.message}</p><button onClick={dismiss} className="ml-2 text-slate-400 hover:text-slate-700"><X size={16}/></button>
  </div>
}

function StatusPill({ value }) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200', queued: 'bg-amber-50 text-amber-700 ring-amber-200',
    preparing: 'bg-violet-50 text-violet-700 ring-violet-200', ready: 'bg-sky-50 text-sky-700 ring-sky-200',
    served: 'bg-emerald-50 text-emerald-700 ring-emerald-200', completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200', available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    occupied: 'bg-orange-50 text-orange-700 ring-orange-200', reserved: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    cleaning: 'bg-slate-100 text-slate-600 ring-slate-200', cancelled: 'bg-red-50 text-red-700 ring-red-200',
    ordered: 'bg-sky-50 text-sky-700 ring-sky-200', received: 'bg-emerald-50 text-emerald-700 ring-emerald-200', draft: 'bg-slate-100 text-slate-600 ring-slate-200'
  }
  const label = value || 'unknown'
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ring-1 ring-inset ${map[label] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{label.replaceAll('_', ' ')}</span>
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-brand-600">{eyebrow}</div><h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{title}</h1>{subtitle && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{subtitle}</p>}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
}

function EmptyState({ icon: Icon = ClipboardList, title, detail }) {
  return <div className="flex flex-col items-center justify-center px-5 py-12 text-center"><div className="mb-3 rounded-2xl bg-slate-50 p-3.5 text-slate-400"><Icon size={24}/></div><p className="font-semibold text-ink">{title}</p><p className="mt-1 max-w-sm text-sm text-slate-500">{detail}</p></div>
}

function LoadingBlock() { return <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400"><Loader2 className="animate-spin" size={18}/> Loading restaurant data…</div> }

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@noahpos.local')
  const [password, setPassword] = useState('Admin123!')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try { await onLogin(email, password) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  // Position helper: coordinates are pixels of the 1672x941 sign-in artwork, converted to percentages.
  const at = (x, y, w, h) => ({ left: `${x / 16.72}%`, top: `${y / 9.41}%`, width: `${w / 16.72}%`, height: `${h / 9.41}%` })
  const fs = n => ({ fontSize: `calc(var(--u) * ${n})` })
  const fieldClass = 'absolute flex items-center bg-white'
  return <>
    {/* Desktop: the Food Hub artwork is the page; real controls sit exactly over the drawn form. */}
    <div className="relative hidden h-screen w-full overflow-hidden bg-white lg:block">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 'max(100vw, 177.69vh)', aspectRatio: '1672 / 941', '--u': 'calc(max(100vw, 177.69vh) / 1672)' }}>
        <img src="/images/foodhub_signin.jpg" alt="Food Hub sign in" draggable={false} className="absolute inset-0 h-full w-full select-none"/>
        <form onSubmit={submit} className="absolute inset-0 text-ink">
          <div className="absolute bg-white text-center" style={at(930, 178, 480, 96)}>
            <div className="font-display font-extrabold leading-tight" style={fs(40)}>Welcome back</div>
            <div className="text-slate-500" style={fs(19)}>Sign in to your restaurant workspace</div>
          </div>
          <div className={fieldClass} style={at(1024, 289, 362, 54)}>
            <input aria-label="Email address" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" placeholder="Email" className="h-full w-full bg-white text-ink outline-none placeholder:text-slate-400" style={fs(25)}/>
          </div>
          <div className={fieldClass} style={at(1024, 382, 302, 54)}>
            <input aria-label="Password" type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="Password" className="h-full w-full bg-white text-ink outline-none placeholder:text-slate-400" style={fs(25)}/>
          </div>
          <button type="button" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(v => !v)} className="absolute rounded-full" style={at(1328, 384, 54, 52)}/>
          <button disabled={busy} className="absolute flex items-center justify-center gap-2 rounded-full font-bold tracking-wide text-white shadow-lg shadow-orange-500/30 transition hover:brightness-105 disabled:opacity-70" style={{ ...at(1064, 479, 219, 69), ...fs(24), background: 'linear-gradient(90deg,#FC5C04,#FD6A03)' }}>
            {busy ? <><Loader2 className="animate-spin" style={{ width: '1em', height: '1em' }}/> SIGNING IN…</> : 'SIGN IN'}
          </button>
          <div className="absolute flex items-center justify-center bg-white px-2 text-center" style={at(960, 566, 420, 170)}>
            {error
              ? <div className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700" style={fs(20)}>{error}</div>
              : <div className="text-slate-500" style={fs(20)}><div className="font-semibold text-ink">Demo admin account is pre-filled</div><div className="mt-1" style={fs(17)}>Change demo passwords before real use.</div></div>}
          </div>
        </form>
      </div>
    </div>
    {/* Phones and small tablets: plain card (the artwork does not fit narrow screens). */}
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-8 lg:hidden">
      <form onSubmit={submit} className="w-full max-w-[410px] space-y-5 rounded-3xl bg-white p-7 shadow-soft">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white"><Utensils size={22}/></div><div><div className="font-display text-lg font-extrabold">NOAH POS</div><div className="text-xs text-slate-500">Restaurant operations</div></div></div>
        <div><h2 className="font-display text-2xl font-extrabold tracking-tight">Welcome back</h2><p className="mt-1 text-sm text-slate-500">Sign in to manage your restaurant workspace.</p></div>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Email address</span><div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="input pl-10" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required/></div></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold">Password</span><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17}/><input className="input pl-10" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required/></div></label>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <button className="btn-primary w-full py-3" disabled={busy}>{busy ? <Loader2 size={17} className="animate-spin"/> : <DoorOpen size={17}/>} Sign in to workspace</button>
        <p className="text-center text-xs text-slate-400">Demo admin pre-filled · change demo passwords before real use</p>
      </form>
    </div>
  </>
}

function Modal({ title, description, onClose, children, wide = false }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[3px]" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className={`my-auto w-full ${wide?'max-w-2xl':'max-w-lg'} rounded-3xl bg-white p-5 shadow-2xl sm:p-7`}><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-extrabold">{title}</h2>{description&&<p className="mt-1 text-sm text-slate-500">{description}</p>}</div><button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-ink" onClick={onClose}><X size={19}/></button></div>{children}</div></div>
}

function Dashboard({ summary, onNavigate, loading }) {
  const stats = [
    { label: "Today's sales", value: money(summary?.today_sales), icon: Wallet, tint: 'bg-brand-50 text-brand-600', note: 'Recorded POS revenue', trend: true },
    { label: 'Orders today', value: summary?.today_orders ?? 0, icon: ShoppingBag, tint: 'bg-sky-50 text-sky-700', note: 'Including open tickets' },
    { label: 'Active kitchen tickets', value: summary?.active_orders ?? 0, icon: ChefHat, tint: 'bg-violet-50 text-violet-700', note: 'Pending, preparing, ready' },
    { label: 'Low stock items', value: summary?.low_stock_count ?? 0, icon: Boxes, tint: 'bg-amber-50 text-amber-700', note: 'At or below reorder level', alert: (summary?.low_stock_count || 0) > 0 },
  ]
  const chart = summary?.sales_last_7_days || []
  const max = Math.max(1, ...chart.map(x=>Number(x.sales||0)))
  return <>
    <PageHeading eyebrow="Restaurant overview" title="Good service starts here." subtitle="Here's what is happening at your restaurant today." action={<button className="btn-secondary" onClick={()=>onNavigate('pos')}><Plus size={16}/> New order</button>}/>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({label,value,icon:Icon,tint,note,alert})=><div className="panel p-5" key={label}><div className="flex items-start justify-between"><div className={`rounded-xl p-2.5 ${tint}`}><Icon size={19}/></div>{alert&&<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700"><AlertTriangle size={11}/> Attention</span>}</div><div className="mt-5 font-display text-[27px] font-extrabold tracking-tight">{loading?'—':value}</div><div className="mt-1 text-sm font-semibold text-slate-600">{label}</div><div className="mt-2 text-xs text-slate-400">{note}</div></div>)}</div>
    <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_1fr]">
      <div className="panel p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-base font-extrabold">Sales performance</h2><p className="mt-1 text-xs text-slate-500">Completed and served orders · last 7 days</p></div><span className="rounded-lg bg-slate-50 p-2 text-slate-400"><BarChart3 size={18}/></span></div>
        {loading?<LoadingBlock/>:<div className="mt-6"><div className="flex h-48 items-end gap-2 sm:gap-4">{chart.map((d,i)=><div key={d.date} className="flex h-full flex-1 flex-col justify-end"><div className="mb-2 text-center text-[10px] font-semibold text-slate-500">{d.sales>0?compactMoney(d.sales):''}</div><div title={`${d.date}: ${money(d.sales)}`} className={`mx-auto w-full max-w-11 rounded-t-lg transition-all ${i===chart.length-1?'bg-brand-500':'bg-orange-100 hover:bg-orange-200'}`} style={{height:`${Math.max(d.sales>0?7:2,Number(d.sales||0)/max*75)}%`}}/><div className="mt-3 text-center text-[10px] font-semibold text-slate-400">{d.label}</div></div>)}</div><div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-brand-500"/> Daily recorded sales <span className="ml-auto font-semibold text-slate-500">{money(chart.reduce((sum,d)=>sum+Number(d.sales||0),0))} total</span></div></div>}
      </div>
      <div className="panel p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-base font-extrabold">Top selling items</h2><p className="mt-1 text-xs text-slate-500">By units sold in the last 30 days</p></div><button className="text-xs font-bold text-brand-600 hover:text-brand-700" onClick={()=>onNavigate('reports')}>View report</button></div>
        {!summary?.top_products?.length?<EmptyState icon={TrendingUp} title="Waiting for your first sale" detail="Product sales will show here once orders have been served or completed."/>:<div className="mt-4 space-y-4">{summary.top_products.map((p,i)=><div key={p.name} className="flex items-center gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${['bg-brand-50 text-brand-600','bg-sky-50 text-sky-700','bg-violet-50 text-violet-700','bg-amber-50 text-amber-700','bg-emerald-50 text-emerald-700'][i%5]}`}><Utensils size={17}/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{p.name}</div><div className="mt-0.5 text-xs text-slate-400">{p.units_sold} sold</div></div><div className="text-right text-sm font-bold">{money(p.revenue)}</div></div>)}</div>}
      </div>
    </div>
    <div className="panel mt-5 overflow-hidden"><div className="flex items-center justify-between px-5 py-4 sm:px-6"><div><h2 className="font-display text-base font-extrabold">Recent orders</h2><p className="mt-1 text-xs text-slate-500">Latest restaurant transactions</p></div><button className="btn-secondary !px-3 !py-2 text-xs" onClick={()=>onNavigate('orders')}>All orders <ChevronRight size={14}/></button></div>
      {summary?.recent_orders?.length?<div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-slate-50/70"><tr><th className="table-head">Order</th><th className="table-head">Time</th><th className="table-head">Table</th><th className="table-head">Total</th><th className="table-head">Status</th></tr></thead><tbody>{summary.recent_orders.map(o=><tr key={o.id} className="hover:bg-slate-50/60"><td className="table-cell font-bold">{o.order_number}</td><td className="table-cell text-slate-500">{dateTime(o.created_at)}</td><td className="table-cell">{o.table_number}</td><td className="table-cell font-bold">{money(o.total)}</td><td className="table-cell"><StatusPill value={o.status}/></td></tr>)}</tbody></table></div>:<EmptyState title="No orders yet" detail="Create your first order using the Point of sale screen."/>}
    </div>
  </>
}

function ProductImage({ product, className = 'h-[76px] w-[76px] rounded-2xl', tint = 'bg-brand-50 text-brand-500', iconSize = 29 }) {
  const [failed, setFailed] = useState(false)
  if (product?.image_url && !failed) return <img src={product.image_url} alt={product.name} loading="lazy" onError={()=>setFailed(true)} className={`${className} shrink-0 bg-slate-50 object-cover`}/>
  return <div className={`${className} flex shrink-0 items-center justify-center ${tint}`}><Soup size={iconSize} strokeWidth={1.6}/></div>
}

function POSPage({ products, categories, tables, onCheckout, busy }) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState({})
  const [tableId, setTableId] = useState('')
  const [payment, setPayment] = useState('cash')
  const [notes, setNotes] = useState('')
  const [showMobileCart, setShowMobileCart] = useState(false)
  const shown = products.filter(p=>p.is_available && (category==='all'||String(p.category_id)===String(category)) && `${p.name} ${p.description||''}`.toLowerCase().includes(search.toLowerCase()))
  const cartRows = Object.values(cart)
  const subtotal = cartRows.reduce((sum,row)=>sum+row.product.price*row.quantity,0)
  const tax = subtotal*0.12
  const total = subtotal+tax
  function add(product) { setCart(old=>({...old,[product.id]:{product,quantity:(old[product.id]?.quantity||0)+1}})) }
  function setQty(id,q) { setCart(old=>{const next={...old};if(q<=0)delete next[id];else next[id]={...next[id],quantity:q};return next}) }
  async function checkout() {
    if(!cartRows.length)return
    const payload={table_id:tableId?Number(tableId):null,items:cartRows.map(r=>({product_id:r.product.id,quantity:r.quantity})),notes:notes||null,payment_method:payment}
    const success=await onCheckout(payload)
    if(success){setCart({});setTableId('');setNotes('');setPayment('cash');setShowMobileCart(false)}
  }
  const cartBody = <div className="flex h-full min-h-0 flex-col"><div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="font-display text-base font-extrabold">Current order</h2><p className="mt-1 text-xs text-slate-400">{cartRows.reduce((sum,r)=>sum+r.quantity,0)} items · {tableId?`Table ${tables.find(t=>String(t.id)===String(tableId))?.table_number||''}`:'Takeout'}</p></div><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={()=>setCart({})} title="Clear cart"><X size={17}/></button></div>
    <div className="space-y-4 border-b border-line p-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Dining table</span><select className="input" value={tableId} onChange={e=>setTableId(e.target.value)}><option value="">Takeout / no table</option>{tables.filter(t=>t.status==='available'||String(t.id)===String(tableId)).map(t=><option key={t.id} value={t.id}>{t.table_number} · seats {t.capacity}</option>)}</select></label>
    <div><span className="mb-2 block text-xs font-bold text-slate-500">Payment method</span><div className="grid grid-cols-3 gap-2">{[['cash','Cash',Wallet],['gcash','GCash',CreditCard],['card','Card',CreditCard]].map(([v,l,I])=><button type="button" key={v} onClick={()=>setPayment(v)} className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs font-bold transition ${payment===v?'border-brand-500 bg-brand-50 text-brand-700':'border-line text-slate-500 hover:bg-slate-50'}`}><I size={16}/>{l}</button>)}</div></div></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-4">{cartRows.length===0?<div className="flex h-full min-h-[150px] flex-col items-center justify-center text-center"><div className="rounded-2xl bg-slate-50 p-4 text-slate-300"><ShoppingCart size={25}/></div><p className="mt-3 text-sm font-bold">Your cart is empty</p><p className="mt-1 text-xs text-slate-400">Select menu items to start an order.</p></div>:<div className="space-y-4">{cartRows.map(({product,quantity})=><div className="flex gap-3" key={product.id}><ProductImage product={product} className="h-12 w-12 rounded-xl" tint="bg-brand-50 text-brand-600" iconSize={20}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{product.name}</p><p className="mt-0.5 text-xs text-slate-400">{money(product.price)} each</p><div className="mt-2 flex items-center gap-2"><button onClick={()=>setQty(product.id,quantity-1)} className="rounded-lg border border-line p-1 text-slate-500 hover:bg-slate-100"><Minus size={13}/></button><span className="w-5 text-center text-xs font-bold">{quantity}</span><button onClick={()=>setQty(product.id,quantity+1)} className="rounded-lg border border-line p-1 text-slate-500 hover:bg-slate-100"><Plus size={13}/></button></div></div><div className="pt-1 text-sm font-extrabold">{money(product.price*quantity)}</div></div>)}</div>}</div>
    <div className="space-y-3 border-t border-line p-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-500">Order note <span className="font-normal text-slate-400">(optional)</span></span><input className="input" placeholder="Special instructions…" value={notes} onChange={e=>setNotes(e.target.value)}/></label><div className="space-y-2 text-sm"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(subtotal)}</span></div><div className="flex justify-between text-slate-500"><span>VAT (12%)</span><span>{money(tax)}</span></div><div className="flex justify-between border-t border-dashed border-line pt-3 text-base font-extrabold"><span>Total due</span><span>{money(total)}</span></div></div><button onClick={checkout} disabled={!cartRows.length||busy} className="btn-primary w-full py-3"><ReceiptText size={17}/>{busy?'Processing order…':`Pay ${money(total)}`}</button><p className="text-center text-[10px] leading-4 text-slate-400">Order and inventory changes are saved to the MySQL database.</p></div>
  </div>
  return <><PageHeading eyebrow="Sales terminal" title="Point of sale" subtitle="Build the order, select payment, and send tickets to the kitchen." action={<div className="flex items-center gap-2"><span className="hidden rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 sm:inline-flex"><span className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500"/> POS connected</span><button className="btn-secondary xl:hidden" onClick={()=>setShowMobileCart(true)}><ShoppingCart size={16}/> Cart ({cartRows.reduce((a,r)=>a+r.quantity,0)})</button></div>}/>
    <div className="grid min-h-[70vh] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]"><div className="min-w-0"><div className="panel p-4"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input className="input pl-10" placeholder="Search menu…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="flex items-center gap-2 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Menu available</div></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1"><button onClick={()=>setCategory('all')} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold ${category==='all'?'bg-ink text-white':'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>All items</button>{categories.map(c=><button key={c.id} onClick={()=>setCategory(String(c.id))} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold ${String(category)===String(c.id)?'bg-ink text-white':'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{c.name}</button>)}</div></div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">{shown.map((p,i)=><button onClick={()=>add(p)} key={p.id} className="panel group flex min-w-0 items-center gap-3 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"><ProductImage product={p} tint={['bg-brand-50 text-brand-500','bg-amber-50 text-amber-600','bg-sky-50 text-sky-600','bg-emerald-50 text-emerald-600','bg-violet-50 text-violet-600'][i%5]}/><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-extrabold leading-5">{p.name}</p><p className="mt-1 line-clamp-1 text-xs text-slate-400">{p.category_name}</p><div className="mt-2 flex items-center justify-between"><span className="text-sm font-extrabold text-brand-600">{money(p.price)}</span><span className="rounded-lg bg-slate-50 p-1.5 text-slate-500 transition group-hover:bg-brand-500 group-hover:text-white"><Plus size={15}/></span></div></div></button>)}{!shown.length&&<div className="panel col-span-full"><EmptyState icon={Soup} title="No menu items found" detail="Try another search or category filter."/></div>}</div>
    </div><div className="panel hidden min-h-[650px] flex-col overflow-hidden xl:flex">{cartBody}</div></div>
    {showMobileCart&&<div className="fixed inset-0 z-[60] bg-ink/45 p-3 backdrop-blur-sm xl:hidden"><div className="ml-auto flex h-full max-w-md flex-col overflow-hidden rounded-3xl bg-white">{cartBody}<button className="absolute right-7 top-6 rounded-lg bg-slate-100 p-2 text-slate-500" onClick={()=>setShowMobileCart(false)}><X size={18}/></button></div></div>}
  </>
}

function KitchenPage({ tickets, onKitchenStatus, busyIds }) {
  const [filter, setFilter] = useState('all')
  const filtered = tickets.filter(o=>filter==='all'||o.status===filter)
  const itemsByStatus = s => tickets.reduce((n,o)=>n+o.items.filter(i=>i.kitchen_status===s).length,0)
  const nextAction = { queued: ['preparing','Start preparing'], preparing: ['ready','Mark ready'], ready: ['served','Mark served'] }
  return <><PageHeading eyebrow="Kitchen operations" title="Kitchen display" subtitle="Keep prep moving with real-time order tickets." action={<div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Live database</div>}/>
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Open tickets',tickets.length,ClipboardList,'bg-slate-100 text-slate-700'],['Queued',itemsByStatus('queued'),Clock3,'bg-amber-50 text-amber-700'],['Preparing',itemsByStatus('preparing'),Flame,'bg-violet-50 text-violet-700'],['Ready',itemsByStatus('ready'),CheckCircle2,'bg-sky-50 text-sky-700']].map(([l,n,I,c])=><div key={l} className="panel flex items-center gap-3 p-4"><div className={`rounded-xl p-2.5 ${c}`}><I size={18}/></div><div><div className="font-display text-xl font-extrabold">{n}</div><div className="text-xs text-slate-500">{l}</div></div></div>)}</div>
    <div className="mb-4 flex gap-2 overflow-x-auto">{[['all','All tickets'],['pending','New'],['preparing','Preparing'],['ready','Ready']].map(([v,l])=><button key={v} onClick={()=>setFilter(v)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold ${filter===v?'bg-ink text-white':'border border-line bg-white text-slate-500'}`}>{l}</button>)}</div>
    {!filtered.length?<div className="panel"><EmptyState icon={ChefHat} title="Kitchen is clear" detail="New POS orders will appear here as soon as they are placed."/></div>:<div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">{filtered.map(order=><div key={order.id} className="panel overflow-hidden"><div className="flex items-start justify-between border-b border-line bg-slate-50/70 p-4"><div><div className="flex items-center gap-2"><span className="font-display text-base font-extrabold">{order.order_number}</span><StatusPill value={order.status}/></div><p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={13}/>{dateTime(order.created_at)} <span className="mx-1">·</span><Table2 size={13}/>{order.table_number}</p></div><span className="rounded-xl bg-white p-2 text-slate-400"><ChefHat size={19}/></span></div>
      <div className="space-y-3 p-4">{order.items.map(item=><div key={item.id} className="rounded-xl border border-line p-3"><div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-extrabold text-brand-700">{item.quantity}×</div><div className="min-w-0 flex-1"><div className="text-sm font-bold">{item.product_name}</div>{item.notes&&<div className="mt-1 text-xs text-brand-700">Note: {item.notes}</div>}</div><StatusPill value={item.kitchen_status}/></div>
          {nextAction[item.kitchen_status]&&<button disabled={busyIds.includes(item.id)} onClick={()=>onKitchenStatus(item.id,nextAction[item.kitchen_status][0])} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50">{busyIds.includes(item.id)?<Loader2 size={14} className="animate-spin"/>:<Check size={14}/>} {nextAction[item.kitchen_status][1]}</button>}</div>)}
      </div><div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs"><span className="text-slate-400">{order.items.reduce((s,i)=>s+i.quantity,0)} items total</span><span className="font-extrabold text-ink">{money(order.total)}</span></div></div>)}</div>}
  </>
}

function OrdersPage({ orders, onOrderStatus, search, setSearch, onRefresh, user }) {
  const [filter,setFilter]=useState('all')
  const rows=orders.filter(o=>(filter==='all'||o.status===filter)&&`${o.order_number} ${o.table_number} ${o.status}`.toLowerCase().includes(search.toLowerCase()))
  return <><PageHeading eyebrow="Transactions" title="Orders" subtitle="Review order tickets, payment records, and service progress." action={<button className="btn-secondary" onClick={onRefresh}><RefreshCw size={15}/> Refresh</button>}/>
    <div className="panel overflow-hidden"><div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative max-w-sm flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input className="input pl-10" placeholder="Search order or table…" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="flex gap-2 overflow-x-auto">{['all','pending','preparing','ready','served','completed','cancelled'].map(s=><button key={s} onClick={()=>setFilter(s)} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold capitalize ${filter===s?'bg-ink text-white':'bg-slate-50 text-slate-500'}`}>{s==='all'?'All statuses':s}</button>)}</div></div>
      {!rows.length?<EmptyState icon={ReceiptText} title="No matching orders" detail="New POS transactions will be available here."/>:<div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left"><thead className="bg-slate-50/70"><tr><th className="table-head">Order reference</th><th className="table-head">Created</th><th className="table-head">Table</th><th className="table-head">Items</th><th className="table-head">Payment</th><th className="table-head">Total</th><th className="table-head">Status</th><th className="table-head">Action</th></tr></thead><tbody>{rows.map(o=><tr key={o.id} className="hover:bg-slate-50/50"><td className="table-cell"><div className="font-bold">{o.order_number}</div><div className="mt-1 text-[10px] text-slate-400">Cashier: {o.cashier_name}</div></td><td className="table-cell text-slate-500">{dateTime(o.created_at)}</td><td className="table-cell">{o.table_number}</td><td className="table-cell">{o.items.reduce((n,i)=>n+i.quantity,0)} items</td><td className="table-cell"><span className="capitalize">{o.payments?.[0]?.method||'—'}</span><div className="mt-1 text-[10px] text-slate-400">{o.payments?.[0]?.status||'No payment'}</div></td><td className="table-cell font-extrabold">{money(o.total)}</td><td className="table-cell"><StatusPill value={o.status}/></td><td className="table-cell">{['pending','preparing','ready','served'].includes(o.status)&&<select aria-label="Update order status" className="max-w-[120px] rounded-lg border border-line bg-white px-2 py-1.5 text-xs" value={o.status} onChange={e=>onOrderStatus(o.id,e.target.value)}><option value={o.status}>{o.status}</option>{(o.status==='pending'?['preparing','cancelled']:o.status==='preparing'?['ready','cancelled']:o.status==='ready'?['served','cancelled']:['completed']).map(s=><option key={s} value={s}>{s}</option>)}</select>}</td></tr>)}</tbody></table></div>}
    </div><p className="mt-3 text-xs text-slate-400">Showing {rows.length} of {orders.length} loaded orders. Order records are stored in MySQL.</p>
  </>
}

function MenuPage({ products, categories, ingredients, onCreate, onUpdateAvailable, loading, canManage }) {
  const [search,setSearch]=useState(''); const [category,setCategory]=useState('all'); const [modal,setModal]=useState(false)
  const rows=products.filter(p=>(category==='all'||String(category)===String(p.category_id))&&`${p.name} ${p.category_name}`.toLowerCase().includes(search.toLowerCase()))
  return <><PageHeading eyebrow="Catalog" title="Menu & products" subtitle="Manage sellable items, menu prices, preparation times, and recipe consumption." action={canManage&&<button className="btn-primary" onClick={()=>setModal(true)}><Plus size={16}/> Add product</button>}/>
    <div className="panel overflow-hidden"><div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input className="input pl-10" placeholder="Find a menu item…" value={search} onChange={e=>setSearch(e.target.value)}/></div><select className="input sm:max-w-52" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      {loading?<LoadingBlock/>:!rows.length?<EmptyState icon={Utensils} title="No products found" detail="Create a product or change your filters."/>:<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-slate-50/70"><tr><th className="table-head">Product</th><th className="table-head">Category</th><th className="table-head">Price</th><th className="table-head">Prep time</th><th className="table-head">Recipe</th><th className="table-head">Availability</th><th className="table-head">Action</th></tr></thead><tbody>{rows.map((p,i)=><tr key={p.id} className="hover:bg-slate-50/50"><td className="table-cell"><div className="flex items-center gap-3"><ProductImage product={p} className="h-10 w-10 rounded-xl" tint={['bg-brand-50 text-brand-600','bg-sky-50 text-sky-700','bg-amber-50 text-amber-700','bg-emerald-50 text-emerald-700'][i%4]} iconSize={18}/><div><div className="font-bold">{p.name}</div><div className="mt-0.5 max-w-60 truncate text-xs text-slate-400">{p.description||'No description'}</div></div></div></td><td className="table-cell text-slate-500">{p.category_name}</td><td className="table-cell font-extrabold">{money(p.price)}</td><td className="table-cell text-slate-500">{p.prep_time_minutes} min</td><td className="table-cell"><span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-semibold">{p.recipe?.length||0} ingredients</span></td><td className="table-cell"><StatusPill value={p.is_available?'available':'cancelled'}/></td><td className="table-cell">{canManage&&<button onClick={()=>onUpdateAvailable(p.id,!p.is_available)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold hover:bg-slate-50">{p.is_available?'Archive':'Enable'}</button>}</td></tr>)}</tbody></table></div>}
    </div>
    {modal&&<ProductModal categories={categories} ingredients={ingredients} onClose={()=>setModal(false)} onSubmit={async v=>{await onCreate(v);setModal(false)}}/>}
  </>
}

function ProductModal({categories,ingredients,onClose,onSubmit}) {
  const [form,setForm]=useState({name:'',description:'',category_id:categories[0]?.id||'',price:'',prep_time_minutes:10})
  const [recipe,setRecipe]=useState([]); const [busy,setBusy]=useState(false); const [error,setError]=useState('')
  function change(k,v){setForm(old=>({...old,[k]:v}))}
  function addRecipe(){const available=ingredients.find(i=>!recipe.some(r=>String(r.ingredient_id)===String(i.id)));if(available)setRecipe(old=>[...old,{ingredient_id:available.id,quantity_per_unit:'1'}])}
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{await onSubmit({...form,category_id:Number(form.category_id),price:Number(form.price),prep_time_minutes:Number(form.prep_time_minutes),is_available:true,recipe:recipe.map(r=>({ingredient_id:Number(r.ingredient_id),quantity_per_unit:Number(r.quantity_per_unit)}))})}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <Modal title="Add menu product" description="Set the menu details and link ingredients to inventory." onClose={onClose} wide><form onSubmit={submit} className="space-y-4"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-bold">Product name *</span><input className="input" value={form.name} onChange={e=>change('name',e.target.value)} required minLength={2}/></label><label><span className="mb-1.5 block text-xs font-bold">Category *</span><select className="input" value={form.category_id} onChange={e=>change('category_id',e.target.value)} required>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><span className="mb-1.5 block text-xs font-bold">Price (₱) *</span><input className="input" type="number" min="0.01" step="0.01" value={form.price} onChange={e=>change('price',e.target.value)} required/></label><label><span className="mb-1.5 block text-xs font-bold">Prep time (minutes)</span><input className="input" type="number" min="1" max="240" value={form.prep_time_minutes} onChange={e=>change('prep_time_minutes',e.target.value)} required/></label></div><label className="block"><span className="mb-1.5 block text-xs font-bold">Description</span><textarea className="input min-h-[76px] resize-y" value={form.description} onChange={e=>change('description',e.target.value)} placeholder="Short description for staff…"/></label>
    <div className="rounded-2xl border border-line p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-bold">Recipe ingredients</p><p className="mt-1 text-xs text-slate-400">Optional, but required for automatic ingredient consumption.</p></div><button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={addRecipe} disabled={!ingredients.length}><Plus size={14}/> Add ingredient</button></div>
      {!recipe.length?<p className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">No recipe linked. The item can still be sold, but inventory forecasting will not include its ingredient usage.</p>:<div className="mt-3 space-y-2">{recipe.map((r,i)=><div className="grid grid-cols-[minmax(0,1fr)_100px_32px] gap-2" key={i}><select className="input" value={r.ingredient_id} onChange={e=>setRecipe(old=>old.map((x,j)=>i===j?{...x,ingredient_id:Number(e.target.value)}:x))}>{ingredients.map(ing=><option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>)}</select><input className="input" type="number" min="0.001" step="0.001" value={r.quantity_per_unit} onChange={e=>setRecipe(old=>old.map((x,j)=>i===j?{...x,quantity_per_unit:e.target.value}:x))} aria-label="Quantity per product"/><button type="button" className="rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={()=>setRecipe(old=>old.filter((_,j)=>j!==i))}><X size={15}/></button></div>)}</div>}
    </div>{error&&<p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2 pt-1"><button className="btn-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy||!categories.length}>{busy&&<Loader2 size={15} className="animate-spin"/>} Save product</button></div></form></Modal>
}

function InventoryPage({ingredients,suppliers,onCreateIngredient,onMovement,loading,canManage}) {
  const [search,setSearch]=useState(''); const [lowOnly,setLowOnly]=useState(false); const [modal,setModal]=useState('');
  const [ingredientId,setIngredientId]=useState('');const [movementType,setMovementType]=useState('IN');const [quantity,setQuantity]=useState('');const [reason,setReason]=useState('Stock received');const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  const [form,setForm]=useState({name:'',unit:'g',stock_qty:'',reorder_level:'',unit_cost:'',supplier_id:''})
  const rows=ingredients.filter(i=>(!lowOnly||i.is_low_stock)&&`${i.name} ${i.unit} ${i.supplier_name||''}`.toLowerCase().includes(search.toLowerCase()))
  async function addIngredient(e){e.preventDefault();setBusy(true);setError('');try{await onCreateIngredient({...form,stock_qty:Number(form.stock_qty||0),reorder_level:Number(form.reorder_level||0),unit_cost:Number(form.unit_cost||0),supplier_id:form.supplier_id?Number(form.supplier_id):null,is_active:true});setModal('');setForm({name:'',unit:'g',stock_qty:'',reorder_level:'',unit_cost:'',supplier_id:''})}catch(err){setError(err.message)}finally{setBusy(false)}}
  async function saveMovement(e){e.preventDefault();setBusy(true);setError('');try{await onMovement({ingredient_id:Number(ingredientId),quantity:Number(quantity),movement_type:movementType,reason});setModal('');setQuantity('')}catch(err){setError(err.message)}finally{setBusy(false)}}
  const stockValue=ingredients.reduce((sum,i)=>sum+Number(i.stock_qty)*Number(i.unit_cost),0)
  return <><PageHeading eyebrow="Ingredient control" title="Inventory" subtitle="Keep ingredient balances, costs, and reorder points accurate." action={canManage&&<div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={()=>{setModal('movement');setError('')}}><ArrowDownRight size={16}/> Stock movement</button><button className="btn-primary" onClick={()=>{setModal('ingredient');setError('')}}><Plus size={16}/> Add ingredient</button></div>}/>
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="panel p-4"><div className="text-xs font-semibold text-slate-500">Active ingredients</div><div className="mt-2 font-display text-2xl font-extrabold">{ingredients.length}</div></div><div className="panel p-4"><div className="text-xs font-semibold text-slate-500">Need restocking</div><div className="mt-2 flex items-center gap-2 font-display text-2xl font-extrabold">{ingredients.filter(i=>i.is_low_stock).length}<AlertTriangle size={18} className="text-amber-500"/></div></div><div className="panel p-4"><div className="text-xs font-semibold text-slate-500">Estimated stock value</div><div className="mt-2 font-display text-2xl font-extrabold">{money(stockValue)}</div></div></div>
    <div className="panel overflow-hidden"><div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center"><div className="relative flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input className="input pl-10" placeholder="Search ingredients or supplier…" value={search} onChange={e=>setSearch(e.target.value)}/></div><label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600"><input type="checkbox" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)} className="accent-orange-500"/> Low stock only</label></div>
      {loading?<LoadingBlock/>:!rows.length?<EmptyState icon={Boxes} title="No inventory records found" detail="Create ingredients and link them to recipes to track usage."/>:<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50/70"><tr><th className="table-head">Ingredient</th><th className="table-head">On hand</th><th className="table-head">Reorder at</th><th className="table-head">Unit cost</th><th className="table-head">Supplier</th><th className="table-head">Stock status</th><th className="table-head">Action</th></tr></thead><tbody>{rows.map(i=><tr key={i.id} className="hover:bg-slate-50/50"><td className="table-cell"><div className="font-bold">{i.name}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{i.unit}</div></td><td className="table-cell font-extrabold">{Number(i.stock_qty).toLocaleString('en-PH',{maximumFractionDigits:3})} <span className="text-xs font-medium text-slate-400">{i.unit}</span></td><td className="table-cell text-slate-500">{Number(i.reorder_level).toLocaleString('en-PH',{maximumFractionDigits:3})} {i.unit}</td><td className="table-cell">{money(i.unit_cost)}<div className="mt-1 text-[10px] text-slate-400">per {i.unit}</div></td><td className="table-cell text-slate-500">{i.supplier_name||'Not assigned'}</td><td className="table-cell">{i.is_low_stock?<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700"><AlertTriangle size={12}/> Reorder</span>:<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 size={12}/> In stock</span>}</td><td className="table-cell">{canManage&&<button onClick={()=>{setIngredientId(String(i.id));setModal('movement');setError('')}} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold hover:bg-slate-50">Adjust</button>}</td></tr>)}</tbody></table></div>}
    </div>
    {modal==='ingredient'&&<Modal title="Add ingredient" description="Opening stock is recorded as an inventory movement." onClose={()=>setModal('')}><form onSubmit={addIngredient} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold">Ingredient name *</span><input className="input" required minLength="2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="grid grid-cols-2 gap-3"><label><span className="mb-1.5 block text-xs font-bold">Unit *</span><select className="input" value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{['g','kg','ml','L','pc','pack','bottle','portion'].map(u=><option key={u}>{u}</option>)}</select></label><label><span className="mb-1.5 block text-xs font-bold">Unit cost (₱)</span><input className="input" type="number" min="0" step="0.01" value={form.unit_cost} onChange={e=>setForm({...form,unit_cost:e.target.value})}/></label><label><span className="mb-1.5 block text-xs font-bold">Opening stock</span><input className="input" type="number" min="0" step="0.001" value={form.stock_qty} onChange={e=>setForm({...form,stock_qty:e.target.value})}/></label><label><span className="mb-1.5 block text-xs font-bold">Reorder level</span><input className="input" type="number" min="0" step="0.001" value={form.reorder_level} onChange={e=>setForm({...form,reorder_level:e.target.value})}/></label></div><label className="block"><span className="mb-1.5 block text-xs font-bold">Supplier</span><select className="input" value={form.supplier_id} onChange={e=>setForm({...form,supplier_id:e.target.value})}><option value="">No supplier selected</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={()=>setModal('')}>Cancel</button><button className="btn-primary" disabled={busy}>{busy&&<Loader2 size={15} className="animate-spin"/>} Save ingredient</button></div></form></Modal>}
    {modal==='movement'&&<Modal title="Record stock movement" description="Use incoming stock for deliveries, outgoing for waste or use, and adjustment for reconciliation." onClose={()=>setModal('')}><form onSubmit={saveMovement} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold">Ingredient *</span><select className="input" value={ingredientId} onChange={e=>setIngredientId(e.target.value)} required><option value="">Select ingredient…</option>{ingredients.map(i=><option key={i.id} value={i.id}>{i.name} · {i.stock_qty} {i.unit} on hand</option>)}</select></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Movement type</span><select className="input" value={movementType} onChange={e=>setMovementType(e.target.value)}><option value="IN">Stock in — delivery/restock</option><option value="OUT">Stock out — waste/manual use</option><option value="ADJUST">Positive adjustment</option></select></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Quantity *</span><input className="input" type="number" min={movementType==='ADJUST'?undefined:0.001} step="0.001" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Reason *</span><input className="input" required minLength="2" value={reason} onChange={e=>setReason(e.target.value)}/></label>{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button className="btn-secondary" type="button" onClick={()=>setModal('')}>Cancel</button><button className="btn-primary" disabled={busy||!ingredientId}>{busy&&<Loader2 size={15} className="animate-spin"/>} Save movement</button></div></form></Modal>}
  </>
}

function TablesPage({tables,onUpdate,onCreate,canManage}) {
  const [modal,setModal]=useState(false);const [form,setForm]=useState({table_number:'',capacity:2,location_note:''});const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  const statusColor={available:'border-emerald-200 bg-emerald-50/60',occupied:'border-brand-200 bg-brand-50/60',reserved:'border-indigo-200 bg-indigo-50/60',cleaning:'border-slate-200 bg-slate-50'}
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{await onCreate({...form,capacity:Number(form.capacity),status:'available'});setModal(false);setForm({table_number:'',capacity:2,location_note:''})}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <><PageHeading eyebrow="Floor plan" title="Dining tables" subtitle="Set table status so cashiers can quickly seat dine-in orders." action={canManage&&<button className="btn-primary" onClick={()=>setModal(true)}><Plus size={16}/> Add table</button>}/>
    <div className="mb-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">{[['available','Available'],['occupied','Occupied'],['reserved','Reserved'],['cleaning','Cleaning']].map(([s,l])=><span key={s} className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${s==='available'?'bg-emerald-500':s==='occupied'?'bg-brand-500':s==='reserved'?'bg-indigo-500':'bg-slate-400'}`}/>{l} · {tables.filter(t=>t.status===s).length}</span>)}</div>
    {!tables.length?<div className="panel"><EmptyState icon={Table2} title="No dining tables configured" detail="Add the tables in your restaurant to enable dine-in orders."/></div>:<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{tables.map(t=><div key={t.id} className={`rounded-2xl border p-5 ${statusColor[t.status]||'border-line bg-white'}`}><div className="flex items-start justify-between"><img src="/images/dining_table.jpg" alt="" loading="lazy" className="h-16 w-16 rounded-xl bg-white object-contain shadow-sm"/><StatusPill value={t.status}/></div><div className="mt-5 flex items-end justify-between"><div><h2 className="font-display text-2xl font-extrabold">{t.table_number}</h2><p className="mt-1 text-xs text-slate-500">Seats {t.capacity}{t.location_note?` · ${t.location_note}`:''}</p></div><div className="text-xs font-semibold text-slate-400">ID {t.id}</div></div><div className="mt-5 border-t border-black/5 pt-4"><label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Set table status</label><select className="input !border-white/80 !bg-white/80" value={t.status} onChange={e=>onUpdate(t.id,{status:e.target.value})}><option value="available">Available</option><option value="occupied">Occupied</option><option value="reserved">Reserved</option><option value="cleaning">Cleaning</option></select></div></div>)}</div>}
    {modal&&<Modal title="Add dining table" description="Give each table a unique reference number." onClose={()=>setModal(false)}><form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold">Table number *</span><input className="input" placeholder="e.g. T08" required value={form.table_number} onChange={e=>setForm({...form,table_number:e.target.value})}/></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Seating capacity *</span><input className="input" type="number" min="1" max="50" required value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})}/></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Location note</span><input className="input" placeholder="e.g. Window side" value={form.location_note} onChange={e=>setForm({...form,location_note:e.target.value})}/></label>{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy&&<Loader2 size={15} className="animate-spin"/>} Create table</button></div></form></Modal>}
  </>
}

function ForecastPage({forecast,loading,onRefresh,canManage,onCreateOrders,creatingOrders}) {
  const items=forecast?.items||[];const sorted=items.filter(i=>i.recommended_purchase_qty>0)
  return <><PageHeading eyebrow="AI-assisted operations" title="Predictive purchasing" subtitle="Estimate next week's ingredient needs from the last 28 days of recorded order volume." action={<div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={onRefresh}><RefreshCw size={15}/> Recalculate</button>{canManage&&<button className="btn-primary" onClick={onCreateOrders} disabled={creatingOrders||!(forecast?.summary?.items_to_reorder>0)}>{creatingOrders?<Loader2 size={15} className="animate-spin"/>:<PackageCheck size={15}/>} Create suggested POs</button>}</div>}/>
    <div className="mb-5 rounded-2xl bg-ink p-5 text-white sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-orange-200"><BrainCircuit size={14}/> SALES-BASED FORECAST</div><h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Buy smarter, waste less.</h2><p className="mt-2 text-sm leading-6 text-slate-300">A transparent moving-average model estimates weekly ingredient demand, adds a 15% buffer, and compares it with stock on hand. Forecast accuracy improves as real sales history grows.</p></div><div className="flex h-24 w-24 shrink-0 items-center justify-center self-center rounded-3xl bg-brand-500/15 text-brand-300 sm:self-auto"><BarChart3 size={42}/></div></div></div>
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{[{l:'Ingredients analyzed',v:forecast?.summary?.ingredients_analyzed??0,I:Boxes},{l:'Suggested to reorder',v:forecast?.summary?.items_to_reorder??0,I:ShoppingBag},{l:'Estimated purchase cost',v:money(forecast?.summary?.estimated_purchase_cost),I:CircleDollarSign}].map(x=><div className="panel flex items-center gap-3 p-4" key={x.l}><div className="rounded-xl bg-brand-50 p-3 text-brand-600"><x.I size={19}/></div><div><div className="font-display text-xl font-extrabold">{x.v}</div><div className="mt-1 text-xs text-slate-500">{x.l}</div></div></div>)}</div>
    <div className="panel overflow-hidden"><div className="flex flex-col gap-1 border-b border-line px-5 py-4 sm:px-6"><h2 className="font-display text-base font-extrabold">Recommended purchase plan</h2><p className="text-xs text-slate-500">Suggested quantity = projected 7-day usage + 15% buffer − current inventory</p></div>{loading?<LoadingBlock/>:!items.length?<EmptyState icon={BrainCircuit} title="No ingredients to forecast" detail="Add ingredient records and connect product recipes to start forecasting."/>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50/70"><tr><th className="table-head">Ingredient</th><th className="table-head">On hand</th><th className="table-head">Weekly forecast</th><th className="table-head">Buffer</th><th className="table-head">Suggested qty</th><th className="table-head">Supplier</th><th className="table-head">Est. cost</th></tr></thead><tbody>{items.map(i=><tr key={i.ingredient_id} className="hover:bg-slate-50/50"><td className="table-cell"><div className="font-bold">{i.ingredient_name}</div><div className="mt-1 text-[10px] text-slate-400">28-day usage: {i.observed_usage_28_days} {i.unit}</div></td><td className="table-cell">{i.stock_qty} {i.unit}</td><td className="table-cell">{i.forecast_weekly_usage} {i.unit}</td><td className="table-cell text-slate-500">+{i.safety_buffer} {i.unit}</td><td className="table-cell">{i.recommended_purchase_qty>0?<span className="font-extrabold text-brand-700">{i.recommended_purchase_qty} {i.unit}</span>:<span className="text-xs font-bold text-emerald-700">No purchase needed</span>}</td><td className="table-cell text-slate-500">{i.supplier_name}</td><td className="table-cell font-bold">{money(i.estimated_purchase_cost)}</td></tr>)}</tbody></table></div>}
    </div><div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><AlertTriangle size={17} className="mt-0.5 shrink-0"/><div><p className="text-sm font-bold">Use forecasts as purchasing guidance</p><p className="mt-1 text-xs leading-5 text-amber-800">{forecast?.notice||'Forecasts are estimates, not guaranteed demand. Consider promotions, menu changes, holidays and supplier lead time before placing an order.'} Model confidence is marked low when there is no recorded usage history.</p></div></div>
  </>
}

function ReportsPage({summary,orders,onRefresh}) {
  const [report,setReport]=useState('sales')
  const chart=summary?.sales_last_7_days||[];const max=Math.max(1,...chart.map(d=>Number(d.sales||0)))
  const rows=[...orders].filter(o=>['served','completed'].includes(o.status))
  const sum=rows.reduce((n,o)=>n+Number(o.total||0),0)
  const payments={cash:0,gcash:0,card:0,other:0};rows.forEach(o=>o.payments?.forEach(p=>{if(p.status==='paid')payments[p.method]=(payments[p.method]||0)+Number(p.amount||0)}))
  const paymentTotal=Object.values(payments).reduce((a,b)=>a+b,0)||1
  return <><PageHeading eyebrow="Business intelligence" title="Sales reports" subtitle="Review completed-order performance and how customers pay." action={<button className="btn-secondary" onClick={onRefresh}><RefreshCw size={15}/> Refresh data</button>}/>
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">{[{label:'Orders loaded',value:rows.length,icon:ReceiptText},{label:'Completed sales',value:money(sum),icon:CircleDollarSign},{label:'Average order',value:money(rows.length?sum/rows.length:0),icon:TrendingUp}].map(s=><div className="panel flex items-center gap-3 p-4" key={s.label}><div className="rounded-xl bg-brand-50 p-3 text-brand-600"><s.icon size={19}/></div><div><div className="font-display text-xl font-extrabold">{s.value}</div><div className="mt-1 text-xs text-slate-500">{s.label}</div></div></div>)}</div>
    <div className="panel p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="font-display text-base font-extrabold">Daily revenue</h2><p className="mt-1 text-xs text-slate-500">Last seven days of served or completed orders</p></div><span className="rounded-xl bg-slate-50 p-2 text-slate-400"><FileBarChart2 size={18}/></span></div><div className="mt-8 flex h-56 items-end gap-3 sm:gap-5">{chart.map(d=><div key={d.date} className="flex h-full flex-1 flex-col justify-end"><div className="mb-2 text-center text-[10px] font-semibold text-slate-500">{d.sales?compactMoney(d.sales):'—'}</div><div title={`${d.date} · ${money(d.sales)}`} className="mx-auto w-full max-w-20 rounded-t-xl bg-brand-500 transition hover:bg-brand-600" style={{height:`${Math.max(d.sales?5:1,Number(d.sales||0)/max*78)}%`}}/><div className="mt-3 text-center text-[11px] font-semibold text-slate-400">{d.label}</div></div>)}</div></div>
    <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2"><div className="panel p-5"><h2 className="font-display text-base font-extrabold">Payment mix</h2><p className="mt-1 text-xs text-slate-500">Paid transactions in loaded completed orders</p><div className="mt-5 space-y-4">{Object.entries(payments).map(([method,val])=><div key={method}><div className="mb-2 flex justify-between text-sm"><span className="font-semibold capitalize">{method}</span><span className="font-bold">{money(val)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{width:`${val/paymentTotal*100}%`}}/></div></div>)}</div></div>
      <div className="panel p-5"><h2 className="font-display text-base font-extrabold">Sales data notes</h2><div className="mt-4 space-y-3 text-sm leading-6 text-slate-600"><p className="flex gap-2"><CheckCircle2 size={17} className="mt-1 shrink-0 text-emerald-600"/> Revenue chart uses served and completed orders from the API.</p><p className="flex gap-2"><CheckCircle2 size={17} className="mt-1 shrink-0 text-emerald-600"/> Order reports join product, order, and payment records.</p><p className="flex gap-2"><AlertTriangle size={17} className="mt-1 shrink-0 text-amber-600"/> This screen summarizes the latest loaded orders. For formal financial statements, export and reconcile all payment records.</p></div></div></div>
  </>
}

function PurchasingPage({purchaseOrders,suppliers,forecast,onCreateOrders,onReceive,onCreateSupplier,creatingOrders,loading}) {
  const [supplierModal,setSupplierModal]=useState(false)
  const openCount=purchaseOrders.filter(p=>['draft','ordered'].includes(p.status)).length
  const outstanding=purchaseOrders.filter(p=>p.status!=='cancelled').reduce((s,p)=>s+Number(p.total_cost||0),0)
  return <><PageHeading eyebrow="Supplier operations" title="Purchase orders" subtitle="Turn stock forecasts into supplier orders, then record receipt to update ingredient balances." action={<div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={()=>setSupplierModal(true)}><Plus size={15}/> Add supplier</button><button className="btn-primary" onClick={onCreateOrders} disabled={creatingOrders||!(forecast?.summary?.items_to_reorder>0)}>{creatingOrders?<Loader2 size={15} className="animate-spin"/>:<BrainCircuit size={15}/>} Create from AI forecast</button></div>}/>
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="panel p-4"><div className="text-xs font-semibold text-slate-500">Supplier accounts</div><div className="mt-2 font-display text-2xl font-extrabold">{suppliers.length}</div><div className="mt-1 text-xs text-slate-400">Registered vendors</div></div><div className="panel p-4"><div className="text-xs font-semibold text-slate-500">Open orders</div><div className="mt-2 font-display text-2xl font-extrabold">{openCount}</div><div className="mt-1 text-xs text-slate-400">Draft or awaiting receipt</div></div><div className="panel p-4"><div className="text-xs font-semibold text-slate-500">Order value · non-cancelled</div><div className="mt-2 font-display text-2xl font-extrabold">{money(outstanding)}</div><div className="mt-1 text-xs text-slate-400">Purchase cost, not sales revenue</div></div></div>
    <div className="panel overflow-hidden"><div className="border-b border-line px-5 py-4 sm:px-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-base font-extrabold">Purchase order register</h2><p className="mt-1 text-xs text-slate-500">Receiving an order posts stock-in movements to the inventory ledger.</p></div><span className="rounded-lg bg-slate-50 p-2 text-slate-400"><Truck size={18}/></span></div></div>
      {loading?<LoadingBlock/>:!purchaseOrders.length?<EmptyState icon={PackageCheck} title="No purchase orders yet" detail="Use the AI forecast to generate supplier orders for ingredients that need replenishment."/>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-slate-50/70"><tr><th className="table-head">PO number</th><th className="table-head">Supplier</th><th className="table-head">Created</th><th className="table-head">Items</th><th className="table-head">Expected</th><th className="table-head">Total cost</th><th className="table-head">Status</th><th className="table-head">Action</th></tr></thead><tbody>{purchaseOrders.map(po=><tr key={po.id} className="hover:bg-slate-50/50"><td className="table-cell font-extrabold">PO-{String(po.id).padStart(4,'0')}</td><td className="table-cell"><div className="font-bold">{po.supplier_name}</div><div className="mt-1 max-w-60 truncate text-[10px] text-slate-400">{po.notes||'No notes'}</div></td><td className="table-cell text-slate-500">{dateTime(po.order_date)}</td><td className="table-cell"><div className="font-semibold">{po.items.length} ingredients</div><div className="mt-1 max-w-56 truncate text-[10px] text-slate-400">{po.items.map(i=>i.ingredient_name).join(', ')}</div></td><td className="table-cell text-slate-500">{shortDate(po.expected_date)}</td><td className="table-cell font-extrabold">{money(po.total_cost)}</td><td className="table-cell"><StatusPill value={po.status}/></td><td className="table-cell">{po.status==='ordered'?<button onClick={()=>onReceive(po.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"><PackageCheck size={13}/> Receive</button>:po.status==='received'?<span className="text-xs font-semibold text-emerald-700">Received {shortDate(po.received_at)}</span>:<span className="text-xs text-slate-400">No action</span>}</td></tr>)}</tbody></table></div>}
    </div>
    <div className="mt-5 panel p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-brand-50 p-3 text-brand-600"><Sparkles size={19}/></div><div><h2 className="font-display text-base font-extrabold">Purchasing from predicted demand</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">The forecast action creates one order per assigned supplier and includes ingredients with a positive recommended buy quantity. Ingredients without a supplier are skipped; assign vendors to those ingredients before generating the purchase plan.</p></div></div><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">{suppliers.map(s=><div key={s.id} className="flex items-center gap-3 rounded-xl border border-line p-3"><div className="rounded-lg bg-slate-50 p-2.5 text-slate-500"><Truck size={17}/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{s.name}</p><p className="mt-0.5 truncate text-xs text-slate-400">{s.contact_person||s.email||s.phone||'Supplier contact not added'}</p></div><StatusPill value={s.is_active?'available':'cancelled'}/></div>)}</div></div>
    {supplierModal&&<SupplierModal onClose={()=>setSupplierModal(false)} onSubmit={async payload=>{await onCreateSupplier(payload);setSupplierModal(false)}}/>}
  </>
}

function SupplierModal({onClose,onSubmit}) {
  const [form,setForm]=useState({name:'',contact_person:'',phone:'',email:'',address:''});const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{await onSubmit({...form,email:form.email.trim()||null,is_active:true})}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <Modal title="Add supplier" description="Supplier contacts are used for inventory purchase planning." onClose={onClose}><form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold">Supplier name *</span><input className="input" required minLength={2} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Contact person</span><input className="input" value={form.contact_person} onChange={e=>setForm({...form,contact_person:e.target.value})}/></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-bold">Phone</span><input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label><span className="mb-1.5 block text-xs font-bold">Email</span><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label></div><label className="block"><span className="mb-1.5 block text-xs font-bold">Address</span><textarea className="input min-h-16" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy&&<Loader2 size={15} className="animate-spin"/>} Save supplier</button></div></form></Modal>
}

function TeamPage({users, onCreate, canManage, isAdmin, loading, shifts, assignments, onCreateShift, onDeleteShift, onAssign, onUnassign}) {
  const [modal,setModal]=useState(false); const [form,setForm]=useState({full_name:'',email:'',password:'',role:'cashier'});const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{await onCreate(form);setModal(false);setForm({full_name:'',email:'',password:'',role:'cashier'})}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <><PageHeading eyebrow="People operations" title="Team & shifts" subtitle="Manage staff roles, create accounts, and assign staff to shifts." action={isAdmin&&<button className="btn-primary" onClick={()=>setModal(true)}><Plus size={16}/> Add staff</button>}/>
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{['admin','manager','cashier','kitchen'].map(role=><div className="panel p-4" key={role}><div className="text-xs font-semibold text-slate-500">{roleLabel(role)}</div><div className="mt-2 font-display text-2xl font-extrabold">{users.filter(u=>u.role===role&&u.is_active).length}</div><div className="mt-1 text-xs text-slate-400">Active account(s)</div></div>)}</div>
    <div className="panel overflow-hidden"><div className="border-b border-line px-5 py-4"><h2 className="font-display text-base font-extrabold">Staff accounts</h2><p className="mt-1 text-xs text-slate-500">Role-based access to sensitive restaurant operations</p></div>{loading?<LoadingBlock/>:!users.length?<EmptyState icon={Users} title="No staff records available" detail="Sign in as an admin or manager and refresh staff records."/>:<div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="bg-slate-50/70"><tr><th className="table-head">Staff member</th><th className="table-head">Email</th><th className="table-head">Role</th><th className="table-head">Status</th><th className="table-head">Created</th></tr></thead><tbody>{users.map((u,i)=><tr key={u.id} className="hover:bg-slate-50/50"><td className="table-cell"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${['bg-brand-50 text-brand-600','bg-sky-50 text-sky-700','bg-violet-50 text-violet-700','bg-emerald-50 text-emerald-700'][i%4]}`}><User size={18}/></div><div className="font-bold">{u.full_name}</div></div></td><td className="table-cell text-slate-500">{u.email}</td><td className="table-cell"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold">{roleLabel(u.role)}</span></td><td className="table-cell"><StatusPill value={u.is_active?'available':'cancelled'}/></td><td className="table-cell text-slate-500">{shortDate(u.created_at)}</td></tr>)}</tbody></table></div>}</div>
    {canManage&&<ShiftsPanel shifts={shifts} assignments={assignments} users={users} onCreateShift={onCreateShift} onDeleteShift={onDeleteShift} onAssign={onAssign} onUnassign={onUnassign}/>}
    {modal&&<Modal title="Create staff account" description="Users receive permissions based on the selected role." onClose={()=>setModal(false)}><form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold">Full name *</span><input className="input" required minLength="2" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Email *</span><input className="input" type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Temporary password *</span><input className="input" type="password" minLength="8" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><label className="block"><span className="mb-1.5 block text-xs font-bold">Role</span><select className="input" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="cashier">Cashier</option><option value="kitchen">Kitchen staff</option><option value="manager">Manager</option><option value="admin">Administrator</option></select></label>{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy&&<Loader2 size={15} className="animate-spin"/>} Create account</button></div></form></Modal>}
  </>
}

function ShiftsPanel({shifts,assignments,users,onCreateShift,onDeleteShift,onAssign,onUnassign}) {
  const [modal,setModal]=useState(false);const [form,setForm]=useState({title:'Day shift',starts_at:'',ends_at:'',notes:''});const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [assignUser,setAssignUser]=useState({})
  async function create(e){e.preventDefault();setBusy(true);setError('');try{await onCreateShift({...form,starts_at:form.starts_at,ends_at:form.ends_at});setModal(false);setForm({title:'Day shift',starts_at:'',ends_at:'',notes:''})}catch(err){setError(err.message)}finally{setBusy(false)}}
  return <div className="mt-5 panel overflow-hidden"><div className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-base font-extrabold">Staff shifts</h2><p className="mt-1 text-xs text-slate-500">Schedule shifts and assign active staff members.</p></div><button className="btn-primary" onClick={()=>setModal(true)}><Plus size={15}/> Create shift</button></div>
    {!shifts.length?<EmptyState icon={CalendarDays} title="No shifts scheduled" detail="Create a shift and assign staff to start scheduling."/>:<div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">{shifts.map(shift=>{const staffAssignments=assignments.filter(a=>Number(a.shift_id)===Number(shift.id));const assigned=new Set(staffAssignments.map(a=>Number(a.user_id)));const availableUsers=users.filter(u=>u.is_active&&!assigned.has(Number(u.id)));return <div key={shift.id} className="rounded-2xl border border-line p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="rounded-xl bg-sky-50 p-2.5 text-sky-700"><CalendarDays size={18}/></div><div className="min-w-0"><h3 className="font-bold">{shift.title}</h3><p className="mt-1 text-xs text-slate-500">{dateTime(shift.starts_at)} – {new Date(shift.ends_at).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'})}</p>{shift.notes&&<p className="mt-1 text-xs text-slate-400">{shift.notes}</p>}</div></div><button title="Delete shift" onClick={()=>onDeleteShift(shift.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><X size={15}/></button></div>
      <div className="mt-4 border-t border-line pt-3"><div className="mb-2 flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Assigned team</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{staffAssignments.length} staff</span></div>{staffAssignments.length?<div className="space-y-2">{staffAssignments.map(a=><div key={a.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[10px] font-extrabold text-brand-600">{a.full_name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{a.full_name}</p><p className="text-[10px] text-slate-400">{roleLabel(a.role)}</p></div><button title="Remove assignment" onClick={()=>onUnassign(a.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"><X size={13}/></button></div>)}</div>:<p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">No staff assigned to this shift.</p>}
        <div className="mt-3 flex gap-2"><select className="input !py-2 text-xs" value={assignUser[shift.id]||''} onChange={e=>setAssignUser(old=>({...old,[shift.id]:e.target.value}))}><option value="">Select active staff…</option>{availableUsers.map(u=><option key={u.id} value={u.id}>{u.full_name} · {u.role}</option>)}</select><button className="btn-secondary !px-3 !py-2 text-xs" disabled={!assignUser[shift.id]} onClick={async()=>{await onAssign(shift.id,Number(assignUser[shift.id]));setAssignUser(old=>({...old,[shift.id]:''}))}}><Plus size={13}/> Assign</button></div>
      </div></div>})}</div>}
    {modal&&<Modal title="Create staff shift" description="Set the date and time, then assign staff after saving." onClose={()=>setModal(false)}><form onSubmit={create} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold">Shift title *</span><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required minLength={2}/></label><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-bold">Starts *</span><input className="input" type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})} required/></label><label><span className="mb-1.5 block text-xs font-bold">Ends *</span><input className="input" type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})} required/></label></div><label className="block"><span className="mb-1.5 block text-xs font-bold">Notes</span><textarea className="input min-h-16" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>{error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn-primary" disabled={busy}>{busy&&<Loader2 size={15} className="animate-spin"/>} Save shift</button></div></form></Modal>}
  </div>
}

function App() {
  const [authenticated,setAuthenticated]=useState(Boolean(getToken()))
  const [user,setUser]=useState(null)
  const [page,setPage]=useState('dashboard')
  const [mobileSidebar,setMobileSidebar]=useState(false)
  const [notice,setNotice]=useState(null)
  const [loading,setLoading]=useState(false)
  const [checkoutBusy,setCheckoutBusy]=useState(false)
  const [creatingOrders,setCreatingOrders]=useState(false)
  const [busyKitchen,setBusyKitchen]=useState([])
  const [summary,setSummary]=useState(null)
  const [products,setProducts]=useState([])
  const [categories,setCategories]=useState([])
  const [tables,setTables]=useState([])
  const [orders,setOrders]=useState([])
  const [tickets,setTickets]=useState([])
  const [ingredients,setIngredients]=useState([])
  const [suppliers,setSuppliers]=useState([])
  const [purchaseOrders,setPurchaseOrders]=useState([])
  const [shifts,setShifts]=useState([])
  const [assignments,setAssignments]=useState([])
  const [users,setUsers]=useState([])
  const [forecast,setForecast]=useState(null)
  const [orderSearch,setOrderSearch]=useState('')
  const [mobileTopOpen,setMobileTopOpen]=useState(false)
  const [lastRefreshed,setLastRefreshed]=useState(null)

  const flash=useCallback((message,type='success')=>{setNotice({message,type});window.setTimeout(()=>setNotice(null),5000)},[])
  const canManage=['admin','manager'].includes(user?.role)
  const isAdmin=user?.role==='admin'

  const loadData=useCallback(async (role=user?.role) => {
    setLoading(true)
    const jobs = [
      ['summary',()=>request('/dashboard/summary'),setSummary],
      ['products',()=>request('/products'),setProducts],
      ['categories',()=>request('/categories'),setCategories],
      ['tables',()=>request('/tables'),setTables],
      ['orders',()=>request('/orders?limit=200'),setOrders],
      ['tickets',()=>request('/kitchen/tickets'),setTickets],
      ['ingredients',()=>request('/ingredients'),setIngredients],
    ]
    if(['admin','manager'].includes(role)) {
      jobs.push(['suppliers',()=>request('/suppliers'),setSuppliers])
      jobs.push(['purchaseOrders',()=>request('/purchase-orders'),setPurchaseOrders])
      jobs.push(['forecast',()=>request('/inventory/forecast'),setForecast])
      jobs.push(['users',()=>request('/users'),setUsers])
      jobs.push(['shifts',()=>request('/shifts'),setShifts])
      jobs.push(['assignments',()=>request('/shift-assignments'),setAssignments])
    }
    const results=await Promise.allSettled(jobs.map(async ([key,fn,setter])=>({key,value:await fn(),setter})))
    const errors=[]
    for(let i=0;i<results.length;i++) {
      const result=results[i]
      if(result.status==='fulfilled') result.value.setter(result.value.value)
      else { const key=jobs[i][0]; if(!errors.length && !['forecast','users','suppliers'].includes(key)) errors.push(result.reason?.message||'Some data could not be loaded') }
    }
    if(errors.length) setNotice({message:errors[0],type:'error'})
    setLastRefreshed(new Date())
    setLoading(false)
  },[user?.role])

  const refreshUser=useCallback(async()=>{
    const me=await request('/auth/me');setUser(me);return me
  },[])

  useEffect(()=>{
    if(!getToken()){setAuthenticated(false);return}
    (async()=>{try{const me=await refreshUser();setAuthenticated(true);await loadData(me.role)}catch{setToken('');setAuthenticated(false);setUser(null)}})()
  },[refreshUser,loadData])

  async function handleLogin(email,password){
    const data=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})})
    setToken(data.access_token);setUser(data.user);setAuthenticated(true);setPage('dashboard');
    await loadData(data.user.role);flash(`Welcome back, ${data.user.full_name.split(' ')[0]}.`)
  }
  function logout(){setToken('');setAuthenticated(false);setUser(null);setSummary(null);setProducts([]);setOrders([]);setTickets([]);setNotice(null);setPage('dashboard')}
  const refresh=async()=>{try{await loadData(user?.role);flash('Workspace data refreshed.')}catch(e){flash(e.message,'error')}}

  async function checkoutOrder(payload){
    setCheckoutBusy(true)
    try{const order=await request('/orders',{method:'POST',body:JSON.stringify(payload)});flash(`Order ${order.order_number} created and sent to the kitchen.`);await loadData(user?.role);setPage('orders');return true}
    catch(e){flash(e.message,'error');return false}finally{setCheckoutBusy(false)}
  }
  async function kitchenStatus(itemId,statusValue){
    setBusyKitchen(old=>[...old,itemId])
    try{await request(`/order-items/${itemId}/kitchen-status`,{method:'PATCH',body:JSON.stringify({kitchen_status:statusValue})});flash(`Kitchen ticket marked ${statusValue}.`);await loadData(user?.role)}catch(e){flash(e.message,'error')}finally{setBusyKitchen(old=>old.filter(x=>x!==itemId))}
  }
  async function updateOrderStatus(orderId,statusValue){
    try{await request(`/orders/${orderId}/status`,{method:'PATCH',body:JSON.stringify({status:statusValue})});flash(`Order status updated to ${statusValue}.`);await loadData(user?.role)}catch(e){flash(e.message,'error')}
  }
  async function createProduct(payload){await request('/products',{method:'POST',body:JSON.stringify(payload)});flash('Product added to the menu.');await loadData(user?.role)}
  async function toggleProduct(id,available){
    const item=products.find(p=>p.id===id);if(!item)return
    try{await request(`/products/${id}`,{method:'PATCH',body:JSON.stringify({...item,is_available:available,recipe:item.recipe.map(r=>({ingredient_id:r.ingredient_id,quantity_per_unit:r.quantity_per_unit}))})});flash(available?'Product enabled.':'Product archived from the POS.');await loadData(user?.role)}catch(e){flash(e.message,'error')}
  }
  async function createIngredient(payload){await request('/ingredients',{method:'POST',body:JSON.stringify(payload)});flash('Ingredient saved.');await loadData(user?.role)}
  async function createMovement(payload){await request('/inventory/movements',{method:'POST',body:JSON.stringify(payload)});flash('Stock movement recorded.');await loadData(user?.role)}
  async function createTable(payload){await request('/tables',{method:'POST',body:JSON.stringify(payload)});flash('Dining table added.');await loadData(user?.role)}
  async function updateTable(id,payload){try{await request(`/tables/${id}`,{method:'PATCH',body:JSON.stringify(payload)});flash('Table status updated.');await loadData(user?.role)}catch(e){flash(e.message,'error')}}
  async function createStaff(payload){await request('/users',{method:'POST',body:JSON.stringify(payload)});flash('Staff account created.');await loadData(user?.role)}
  async function createSupplier(payload){await request('/suppliers',{method:'POST',body:JSON.stringify(payload)});flash('Supplier added.');await loadData(user?.role)}
  async function createForecastPurchaseOrders(){
    if(!forecast?.items?.length){flash('No forecast rows are available yet.','error');return}
    const buckets=new Map();let unassigned=0
    for(const item of forecast.items){
      if(Number(item.recommended_purchase_qty||0)<=0)continue
      if(!item.supplier_id){unassigned++;continue}
      const key=Number(item.supplier_id)
      if(!buckets.has(key))buckets.set(key,[])
      buckets.get(key).push({ingredient_id:Number(item.ingredient_id),quantity:Number(item.recommended_purchase_qty),unit_cost:Number(item.unit_cost||0)})
    }
    if(!buckets.size){flash(unassigned?'No suggested order created: assign suppliers to the ingredients first.':'There are no positive recommended purchase quantities.','error');return}
    setCreatingOrders(true)
    try{
      let created=0
      const expected_date=new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,10)
      for(const [supplier_id,items] of buckets.entries()){
        await request('/purchase-orders',{method:'POST',body:JSON.stringify({supplier_id,expected_date,notes:'Generated from the 28-day sales-based inventory forecast.',items})})
        created++
      }
      flash(`Created ${created} purchase order${created===1?'':'s'} from the forecast${unassigned?`; ${unassigned} ingredient${unassigned===1?'':'s'} skipped because no supplier is assigned`:''}.`)
      await loadData(user?.role)
      setPage('purchasing')
    }catch(e){flash(e.message,'error');await loadData(user?.role)}finally{setCreatingOrders(false)}
  }
  async function receivePurchaseOrder(id){try{await request(`/purchase-orders/${id}/receive`,{method:'POST'});flash(`Purchase order PO-${String(id).padStart(4,'0')} received. Stock levels updated.`);await loadData(user?.role)}catch(e){flash(e.message,'error')}}
  async function createShift(payload){await request('/shifts',{method:'POST',body:JSON.stringify(payload)});flash('Staff shift created.');await loadData(user?.role)}
  async function deleteShift(id){try{await request(`/shifts/${id}`,{method:'DELETE'});flash('Shift deleted.');await loadData(user?.role)}catch(e){flash(e.message,'error')}}
  async function assignShift(shift_id,user_id){try{await request('/shift-assignments',{method:'POST',body:JSON.stringify({shift_id,user_id})});flash('Staff member assigned to shift.');await loadData(user?.role)}catch(e){flash(e.message,'error')}}
  async function unassignShift(id){try{await request(`/shift-assignments/${id}`,{method:'DELETE'});flash('Staff member removed from shift.');await loadData(user?.role)}catch(e){flash(e.message,'error')}}

  if(!authenticated) return <><Login onLogin={handleLogin}/><Notice notice={notice} dismiss={()=>setNotice(null)}/></>

  const navTo=(target)=>{setPage(target);setMobileSidebar(false);setMobileTopOpen(false)}
  const pageTitle=navigation.flatMap(g=>g.items).find(i=>i.id===page)?.label||'Overview'
  const now=new Date()
  const pageContent=()=>{
    switch(page){
      case 'pos': return <POSPage products={products} categories={categories} tables={tables} onCheckout={checkoutOrder} busy={checkoutBusy}/>;
      case 'kitchen': return <KitchenPage tickets={tickets} onKitchenStatus={kitchenStatus} busyIds={busyKitchen}/>;
      case 'orders': return <OrdersPage orders={orders} onOrderStatus={updateOrderStatus} search={orderSearch} setSearch={setOrderSearch} onRefresh={refresh} user={user}/>;
      case 'menu': return <MenuPage products={products} categories={categories} ingredients={ingredients} onCreate={createProduct} onUpdateAvailable={toggleProduct} loading={loading} canManage={canManage}/>;
      case 'inventory': return <InventoryPage ingredients={ingredients} suppliers={suppliers} onCreateIngredient={createIngredient} onMovement={createMovement} loading={loading} canManage={canManage}/>;
      case 'forecast': return canManage?<ForecastPage forecast={forecast} loading={loading} onRefresh={refresh} canManage={canManage} onCreateOrders={createForecastPurchaseOrders} creatingOrders={creatingOrders}/>:<div className="panel"><EmptyState icon={LockKeyhole} title="Manager access required" detail="Forecasts are available to managers and administrators."/></div>;
      case 'purchasing': return canManage?<PurchasingPage purchaseOrders={purchaseOrders} suppliers={suppliers} forecast={forecast} onCreateOrders={createForecastPurchaseOrders} onReceive={receivePurchaseOrder} onCreateSupplier={createSupplier} creatingOrders={creatingOrders} loading={loading}/>:<div className="panel"><EmptyState icon={LockKeyhole} title="Manager access required" detail="Purchase orders are available to managers and administrators."/></div>;
      case 'tables': return <TablesPage tables={tables} onUpdate={updateTable} onCreate={createTable} canManage={canManage}/>;
      case 'reports': return canManage?<ReportsPage summary={summary} orders={orders} onRefresh={refresh}/>:<div className="panel"><EmptyState icon={LockKeyhole} title="Manager access required" detail="Sales reporting is available to managers and administrators."/></div>;
      case 'team': return canManage?<TeamPage users={users} onCreate={createStaff} canManage={canManage} isAdmin={isAdmin} loading={loading} shifts={shifts} assignments={assignments} onCreateShift={createShift} onDeleteShift={deleteShift} onAssign={assignShift} onUnassign={unassignShift}/>:<div className="panel"><EmptyState icon={LockKeyhole} title="Manager access required" detail="Staff accounts and shifts are restricted to management."/></div>;
      default: return <Dashboard summary={summary} onNavigate={navTo} loading={loading}/>;
    }
  }

  return <div className="min-h-screen bg-cream">
    <Notice notice={notice} dismiss={()=>setNotice(null)}/>
    {mobileSidebar&&<div onClick={()=>setMobileSidebar(false)} className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px] lg:hidden"/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-ink text-white transition-transform duration-200 lg:translate-x-0 ${mobileSidebar?'translate-x-0':'-translate-x-full'}`}>
      <div className="flex h-[80px] items-center gap-3 border-b border-white/10 px-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 shadow-lg shadow-orange-950/20"><Utensils size={21}/></div><div className="min-w-0"><div className="font-display text-lg font-extrabold tracking-tight">NOAH <span className="text-brand-400">POS</span></div><div className="text-[9px] font-bold uppercase tracking-[.2em] text-slate-400">Restaurant OS</div></div><button className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden" onClick={()=>setMobileSidebar(false)}><X size={18}/></button></div>
      <div className="mx-4 mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300"><Briefcase size={17}/></div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">NOAH Restaurant</div><div className="mt-0.5 text-[10px] text-slate-400">Main branch · Live workspace</div></div><span className="h-2 w-2 rounded-full bg-emerald-400"/></div>
      <nav className="mt-6 flex-1 space-y-6 overflow-y-auto px-3 pb-4">{navigation.map(group=><div key={group.group}><p className="mb-2 px-3 text-[9px] font-extrabold tracking-[.2em] text-slate-500">{group.group}</p><div className="space-y-1">{group.items.map(item=>{const Icon=item.icon;const blocked=(['forecast','purchasing','reports','team'].includes(item.id)&&!canManage)||(user?.role==='kitchen'&&['pos','orders','tables','inventory','menu'].includes(item.id));return <button key={item.id} disabled={blocked} onClick={()=>navTo(item.id)} className={`nav-item ${page===item.id?'nav-item-active':''} ${blocked?'cursor-not-allowed opacity-40':''}`}><Icon size={18} strokeWidth={1.8}/><span className="flex-1 text-left">{item.label}</span>{item.id==='kitchen'&&tickets.length>0&&<span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold">{tickets.length}</span>}{item.badge&&<span className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${page===item.id?'bg-white/20 text-white':'bg-brand-500/20 text-brand-300'}`}>{item.badge}</span>}</button>})}</div></div>)}</nav>
      <div className="border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-xl p-2"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-300 to-brand-600 text-xs font-extrabold text-white">{user?.full_name?.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()||'NP'}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold">{user?.full_name||'NOAH user'}</div><div className="mt-0.5 truncate text-[10px] text-slate-400">{roleLabel(user?.role)}</div></div><button title="Sign out" onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><LogOut size={16}/></button></div><div className="mt-3 flex items-center justify-between px-2 text-[9px] text-slate-500"><span>PROJECT NOAH · v1.0</span><span>● Secure</span></div></div>
    </aside>

    <div className="min-h-screen lg:pl-[264px]"><header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur-md sm:px-7 lg:px-9"><div className="flex min-w-0 items-center gap-3"><button onClick={()=>setMobileSidebar(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={20}/></button><div className="min-w-0"><div className="flex items-center gap-2 text-xs text-slate-400"><span className="hidden sm:inline">Workspace</span><ChevronRight size={12} className="hidden sm:inline"/><span className="truncate font-semibold text-slate-600">{pageTitle}</span></div><div className="mt-1 hidden text-[11px] text-slate-400 sm:block">{now.toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div></div></div><div className="flex items-center gap-2 sm:gap-3"><div className="hidden items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 md:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>{lastRefreshed?`Synced ${lastRefreshed.toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'})}`:'Workspace connected'}</div><button onClick={refresh} title="Refresh workspace" className="rounded-xl border border-line bg-white p-2.5 text-slate-500 transition hover:bg-slate-50 hover:text-ink"><RefreshCw size={16} className={loading?'animate-spin':''}/></button><div className="hidden h-8 w-px bg-line sm:block"/><button onClick={()=>setMobileTopOpen(s=>!s)} className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-xs font-extrabold text-brand-700">{user?.full_name?.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase()||'NP'}</div><ChevronDown size={14} className="hidden text-slate-400 sm:block"/></button></div>
      {mobileTopOpen&&<div className="absolute right-4 top-[62px] z-50 w-56 rounded-2xl border border-line bg-white p-2 shadow-xl sm:right-7"><div className="border-b border-line px-3 py-3"><div className="text-sm font-bold">{user?.full_name}</div><div className="mt-1 text-xs text-slate-500">{user?.email}</div></div><button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut size={16}/> Sign out</button></div>}
    </header>
    <main className="mx-auto max-w-[1680px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">{pageContent()}<footer className="mt-10 flex flex-col gap-2 border-t border-line pt-5 text-[10px] text-slate-400 sm:flex-row sm:items-center sm:justify-between"><div>© {new Date().getFullYear()} Project NOAH · Restaurant POS & Kitchen Management</div><div className="flex items-center gap-2"><span>Python + FastAPI</span><span>·</span><span>MySQL</span><span>·</span><span>React + Tailwind</span></div></footer></main></div>
  </div>
}

export default App
