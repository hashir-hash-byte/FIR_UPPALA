const now = Date.now();
const mk = (i, o) => ({ id: 's' + i, sizes: [6, 7, 8, 9, 10, 11], inStock: true, createdAt: now - i * 1000, featured: true, ...o });
module.exports = {
  settings: {
    whatsappNumber: '919999999999',
    stores: [
      { name: 'FIR – Uppala', address: 'City Center Building, Uppala' },
      { name: 'FIR – Kanhangad', address: 'Ajmal Arcade Building, Kanhangad (Opp. Nursing Home)' },
    ],
  },
  orders: [],
  products: [
    mk(1, { name: 'Nike P-6000 Running Shoes (White / Beige)', brand: 'Nike', category: 'shoes', mrp: 3999, price: 2799, rating: 4.5, ratingCount: 128, badge: 'Bestseller', popularity: 95, images: ['/img/p6k.svg', '/img/af1.svg'] }),
    mk(2, { name: 'Nike Air Force 1 Low (All White)', brand: 'Nike', category: 'shoes', mrp: 3499, price: 2499, rating: 4.6, ratingCount: 342, badge: 'Bestseller', popularity: 99, images: ['/img/af1.svg', '/img/p6k.svg'] }),
    mk(3, { name: 'New Balance 9060 (Navy / Grey)', brand: 'New Balance', category: 'shoes', mrp: 4599, price: 3299, rating: 4.4, ratingCount: 89, badge: 'New', popularity: 80, images: ['/img/nb.svg'] }),
    mk(4, { name: 'Adidas Samba OG (Cloud White)', brand: 'Adidas', category: 'shoes', mrp: 3999, price: 2999, rating: 4.3, ratingCount: 61, badge: '', popularity: 70, images: ['/img/ad.svg'] }),
    mk(5, { name: 'Comfort Slides (Sample)', brand: 'FIR', category: 'chappals', mrp: 799, price: 499, rating: 4.3, ratingCount: 18, badge: 'Sample', popularity: 40, images: ['/img/slide.svg'] }),
    mk(6, { name: 'Daily Flip-Flops (Sample)', brand: 'FIR', category: 'chappals', mrp: 599, price: 349, rating: 4.1, ratingCount: 26, badge: 'Sample', popularity: 35, images: ['/img/flip.svg'] }),
    mk(7, { name: 'Soft Strap Sandals (Sample)', brand: 'FIR', category: 'chappals', mrp: 999, price: 699, rating: 4.4, ratingCount: 11, badge: 'Sample', popularity: 30, images: ['/img/sandal.svg'] }),
  ],
};
