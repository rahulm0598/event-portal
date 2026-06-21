import { useState } from 'react';

// A demo-only modal that mimics the Razorpay checkout look.
// No real money. On "Pay" it calls onPaid() after a short fake processing delay.
export default function FakeRazorpay({ amount, eventTitle, prefill, onPaid, onClose }) {
  const [method, setMethod] = useState('card');
  const [processing, setProcessing] = useState(false);

  function pay() {
    setProcessing(true);
    setTimeout(() => { setProcessing(false); onPaid(); }, 1400);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white text-slate-800 shadow-2xl animate-fadeUp">
        {/* header */}
        <div className="flex items-center justify-between bg-[#0b2a5b] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight">Razorpay</span>
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">DEMO</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white">✕</button>
        </div>

        <div className="px-5 py-4">
          <div className="text-sm text-slate-500">{eventTitle}</div>
          <div className="text-2xl font-extrabold">₹{(amount / 100).toFixed(2)}</div>
          <div className="mt-1 text-xs text-slate-400">{prefill?.email}</div>

          {/* method tabs */}
          <div className="mt-4 flex gap-2">
            {['card', 'upi', 'netbanking'].map((m) => (
              <button key={m} onClick={() => setMethod(m)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold capitalize ${method === m ? 'border-[#0b2a5b] bg-[#0b2a5b]/5 text-[#0b2a5b]' : 'border-slate-200 text-slate-500'}`}>
                {m}
              </button>
            ))}
          </div>

          {/* dummy fields */}
          <div className="mt-4 space-y-2">
            {method === 'card' && (
              <>
                <FakeField label="Card number" value="4111 1111 1111 1111" />
                <div className="flex gap-2">
                  <FakeField label="Expiry" value="12 / 28" />
                  <FakeField label="CVV" value="•••" />
                </div>
              </>
            )}
            {method === 'upi' && <FakeField label="UPI ID" value="demo@upi" />}
            {method === 'netbanking' && <FakeField label="Bank" value="HDFC Bank — Demo" />}
          </div>

          <button onClick={pay} disabled={processing}
            className="mt-5 w-full rounded-xl bg-[#0b2a5b] py-3 font-bold text-white transition hover:bg-[#08214a] disabled:opacity-60">
            {processing ? 'Processing…' : `Pay ₹${(amount / 100).toFixed(0)}`}
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-400">Demo gateway — no real charge.</p>
        </div>
      </div>
    </div>
  );
}

function FakeField({ label, value }) {
  return (
    <div className="flex-1 rounded-lg border border-slate-200 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-700">{value}</div>
    </div>
  );
}
