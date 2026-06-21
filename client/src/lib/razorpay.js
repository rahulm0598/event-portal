// Loads the Razorpay checkout script once.
let loaded = null;

export function loadRazorpay() {
  if (loaded) return loaded;
  loaded = new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return loaded;
}
