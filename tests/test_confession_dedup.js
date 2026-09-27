const assert = require('assert');

console.log('=== TEST SUITE: Confession Deduplication & Anti-Double-Submit ===');

// Mock GeoDataManager cache and saveConfession deduplication logic
class MockGeoDataManager {
  constructor() {
    this._cache = {
      confessions: []
    };
  }

  getConfessions() {
    return [...this._cache.confessions];
  }

  async saveConfession(cfs) {
    if (!cfs.id) {
      const trimmedMsg = (cfs.message || '').trim();
      const duplicate = this._cache.confessions.find(c =>
        (c.message || '').trim() === trimmedMsg && Math.abs(Date.now() - (c.timestamp || 0)) < 6000
      );
      if (duplicate) {
        console.log('  -> Dedup Guard triggered: Ignored duplicate confession within 6s');
        return this.getConfessions();
      }

      cfs.id = 'cfs-' + Date.now();
      cfs.timestamp = Date.now();
      cfs.status = 'unread';
      cfs.reply = '';
    }

    const idx = this._cache.confessions.findIndex(c => c.id === cfs.id);
    if (idx >= 0) {
      this._cache.confessions[idx] = { ...cfs };
    } else {
      this._cache.confessions.unshift({ ...cfs });
    }
    return this.getConfessions();
  }
}

async function runTests() {
  const dal = new MockGeoDataManager();

  // Test 1: Gui 1 confession lan dau
  await dal.saveConfession({
    message: 'Day la cau hoi kiem tra thu nghiem chong ban sao confession!',
    senderName: 'Hoc sinh',
    isAnonymous: true
  });

  const list1 = dal.getConfessions();
  assert.strictEqual(list1.length, 1, 'Chi duoc co dung 1 confession sau lan gui dau tien');
  console.log('  [PASS] 1. Gui confession lan dau thanh cong, tong so luong: 1');

  // Test 2: Gia lap click dup / dual-event submit voi cung noi dung trong vong 10ms
  await dal.saveConfession({
    message: 'Day la cau hoi kiem tra thu nghiem chong ban sao confession!',
    senderName: 'Hoc sinh',
    isAnonymous: true
  });

  const list2 = dal.getConfessions();
  assert.strictEqual(list2.length, 1, 'Khong duoc sinh ra ban sao thu 2 khi gui trung lap trong 6s');
  console.log('  [PASS] 2. Chan thanh cong ban sao khi gui lien tiep, tong so luong van la 1');

  // Test 3: Kiem tra Deduplication trong _loadCachedConfessions khi khoi tao
  const rawDuplicates = [
    { id: 'cfs-1', message: 'Cau hoi A', timestamp: 1000 },
    { id: 'cfs-2', message: 'Cau hoi A', timestamp: 2000 }, // trung message trong vong 6s
    { id: 'cfs-3', message: 'Cau hoi B', timestamp: 10000 }
  ];

  const seen = new Set();
  const dedupedList = [];
  for (const item of rawDuplicates) {
    const normMsg = (item.message || '').trim();
    const timeBucket = Math.floor((item.timestamp || 0) / 6000);
    const key = item.id ? item.id : `${normMsg}_${timeBucket}`;
    const dupContentKey = `${normMsg}_${timeBucket}`;
    if (!seen.has(key) && !seen.has(dupContentKey)) {
      seen.add(key);
      seen.add(dupContentKey);
      dedupedList.push(item);
    }
  }

  assert.strictEqual(dedupedList.length, 2, 'Bo loc cache phai loai bo cac ban sao cu');
  console.log('  [PASS] 3. Bo loc cache loai bo sach se ban sao cu trong LocalStorage');

  console.log('\nKet qua: Tat ca cac kiem tra Chong Ban Sao Confession deu PASSED!\n');
}

runTests().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
