// utils/helpers.js

function formatRWF(amount) {
  const n = Number(amount) || 0;
  return 'RWF ' + n.toLocaleString('en-US');
}

function requireBuyer(req, res, next) {
  if (req.session && req.session.buyerId) return next();
  // A POST target (like /cart/buy) can't be safely replayed via a GET
  // redirect after login, so send the buyer back to a page they can
  // act from instead (usually the cart, where "Buy" lives).
  req.session.redirectAfterLogin = req.method === 'GET' ? req.originalUrl : '/cart';
  return res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

function redirectIfBuyerLoggedIn(req, res, next) {
  if (req.session && req.session.buyerId) return res.redirect('/');
  next();
}

// Builds a wa.me deep link pre-filled with order details so the admin
// gets notified on WhatsApp the moment a buyer confirms a purchase.
function buildWhatsAppLink(whatsappNumber, order, buyer) {
  const lines = [];
  lines.push(`New order on JayB Shop`);
  lines.push(`Order #${order.id}`);
  lines.push(`Buyer: ${buyer.fullName}`);
  lines.push(`Phone: ${buyer.phone}`);
  lines.push(`Items:`);
  order.items.forEach((it) => {
    lines.push(`- ${it.productName} x${it.quantity} bundle(s) = ${formatRWF(it.subtotal)}`);
  });
  lines.push(`Total: ${formatRWF(order.total)}`);
  lines.push(`I would like to confirm this order and arrange payment.`);
  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${whatsappNumber}?text=${text}`;
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

module.exports = {
  formatRWF,
  requireBuyer,
  requireAdmin,
  redirectIfBuyerLoggedIn,
  buildWhatsAppLink,
  slugify
};
