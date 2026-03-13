/**
 * nft.js - Symbol NFTデコードモジュール (v3: rxjs廃止・fetch統一)
 *
 * 対応NFT:
 *   - NFTDrive  (nftdrive)
 *   - COMSA UNIQUE v1.0/v1.1 (comsaNFT)
 *   - COMSA BUNDLE / NCFT (comsaNCFT)
 *   - Ukraine NFT (ukraineNFT)
 *   - XYM Monster → 保留（metal-on-symbol v2依存のため）
 *
 * Mosaic Center は SDK 非依存の plain fetch のため変更不要
 *
 * v3改善点 (Mosaic_Viewer.html と同等):
 *   - IndexedDB NFTキャッシュ（2回目以降は即時表示）
 *   - Ukraine NFT: blob URL → data URL (キャッシュ可能)
 *   - 3D NFT: nftdrive-ex.net iframe → <model-viewer> + blob URL (外部サーバー不要)
 *   - fetchJson: 429 / 5xx 自動リトライ機能
 */

import { NODE } from './config.js';
import { getMosaicInfo, searchMetadata, getTransactionsByIds, searchConfirmedTransactions, hexToAddress } from './symbolApi.js';

// ─────────────────────────────────────────────────────────────────────────────
// IndexedDB NFT キャッシュ
// ─────────────────────────────────────────────────────────────────────────────
//
//  NFTデータ（data URL）をブラウザ内DBに保存し、2回目以降の読み込みを瞬時にする
//  容量: Chrome は数百MB〜GB（localStorage の 5MB とは段違い）
//  キー形式: "{type}_{mosaicIdHex}"  例: "comsa10_1A2B3C..."
//  値:       data URL 文字列 "data:image/jpeg;base64,..."
//

const NFT_DB_NAME = 'nft-viewer-cache';
const NFT_DB_STORE = 'nft';
let _nftDB = null; // DB接続をキャッシュ

function openNFTDB() {
    if (_nftDB) return Promise.resolve(_nftDB);
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(NFT_DB_NAME, 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore(NFT_DB_STORE);
        req.onsuccess = e => { _nftDB = e.target.result; resolve(_nftDB); };
        req.onerror = () => reject(req.error);
    });
}

async function nftCacheGet(key) {
    try {
        const db = await openNFTDB();
        return new Promise(resolve => {
            const req = db.transaction(NFT_DB_STORE, 'readonly')
                .objectStore(NFT_DB_STORE).get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => resolve(null);
        });
    } catch { return null; }
}

async function nftCacheSet(key, dataUrl) {
    try {
        const db = await openNFTDB();
        db.transaction(NFT_DB_STORE, 'readwrite')
            .objectStore(NFT_DB_STORE).put(dataUrl, key);
    } catch { /* キャッシュ失敗は無視 */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchJson リトライ付き（Mosaic_Viewer.html と同等）
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_MAX_RETRIES = 3;
const FETCH_RETRY_DELAY = 600;   // ms（通常リトライ間隔）
const FETCH_RATE_DELAY = 1500;   // ms（429 Too Many Requests 時）

async function fetchJsonWithRetry(url, retries = FETCH_MAX_RETRIES) {
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        if (res.status === 429 && retries > 0) {
            await new Promise(r => setTimeout(r, FETCH_RATE_DELAY));
            return fetchJsonWithRetry(url, retries - 1);
        }
        if (!res.ok) {
            if (res.status >= 500 && retries > 0) {
                await new Promise(r => setTimeout(r, FETCH_RETRY_DELAY));
                return fetchJsonWithRetry(url, retries - 1);
            }
            throw new Error(`fetchJson error: ${res.status} ${url}`);
        }
        return res.json();
    } catch (e) {
        if (retries > 0 && e instanceof TypeError) {
            await new Promise(r => setTimeout(r, FETCH_RETRY_DELAY));
            return fetchJsonWithRetry(url, retries - 1);
        }
        throw e;
    }
}

async function postJsonWithRetry(url, body, retries = FETCH_MAX_RETRIES) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json;charset=utf-8' },
            body: JSON.stringify(body),
        });
        if (res.status === 429 && retries > 0) {
            await new Promise(r => setTimeout(r, FETCH_RATE_DELAY));
            return postJsonWithRetry(url, body, retries - 1);
        }
        if (!res.ok) {
            if (res.status >= 500 && retries > 0) {
                await new Promise(r => setTimeout(r, FETCH_RETRY_DELAY));
                return postJsonWithRetry(url, body, retries - 1);
            }
            throw new Error(`postJson error: ${res.status} ${url}`);
        }
        return res.json();
    } catch (e) {
        if (retries > 0 && e instanceof TypeError) {
            await new Promise(r => setTimeout(r, FETCH_RETRY_DELAY));
            return postJsonWithRetry(url, body, retries - 1);
        }
        throw e;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────────────────────────

// Symbol v3 REST API は metadataEntry.value を hex エンコードで返すのでデコードが必要
function hexToUtf8(hex) {
    if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) return hex;
    try {
        return new TextDecoder().decode(
            new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
        );
    } catch {
        return hex;
    }
}

// hex文字列からBase64文字列へ変換（Buffer.from代替）
function hexToBase64(hex) {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return window.btoa(binary);
}

/** Uint8Array → Base64文字列 */
function uint8ArrayToBase64(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// ─────────────────────────────────────────────────────────────────────────────
// メディア挿入ヘルパー
// ─────────────────────────────────────────────────────────────────────────────

function appendImg(src, dom) {
    const tag = document.createElement('img');
    tag.src = src;
    tag.width = 300;
    tag.className = 'mosaic_img';
    dom.appendChild(tag);
}

function appendAudio(src, dom) {
    const source = document.createElement('source');
    source.src = src;
    source.style.textAlign = 'center';
    dom.appendChild(source);
    $(source).wrap('<audio controls>');
}

function appendVideo(src, dom) {
    const source = document.createElement('source');
    source.src = src;
    source.width = 600;
    dom.appendChild(source);
    $(source).wrap('<video controls>');
}

function appendPdf(src, dom) {
    const tag = document.createElement('embed');
    tag.src = src;
    tag.width = 600;
    tag.height = 600;
    tag.className = 'mosaic_img';
    dom.appendChild(tag);
}

function appendHtml(src, dom) {
    const tag = document.createElement('iframe');
    tag.src = src;
    tag.width = 600;
    tag.height = 700;
    tag.className = 'mosaic_img';
    dom.appendChild(tag);
}

/**
 * 3Dモデルを表示する（Mosaic_Viewer.html と同等）
 *
 * 旧実装: iframe(nftdrive-ex.net/3dload.php) → 外部サーバー依存・504リスク
 * 新実装: data URL / data:application/octet-stream;base64,... を受け取り
 *          → Blob URL に変換して <model-viewer> に直接渡す
 *          → 外部サーバー不要、CORS問題なし
 *
 * @param {string} dataStr - "data:application/octet-stream;base64,..."形式
 */
let _modelViewerLoaded = false;
function ensureModelViewer() {
    if (_modelViewerLoaded) return Promise.resolve();
    _modelViewerLoaded = true;
    return import('https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js');
}

async function append3D(dataStr, dom) {
    await ensureModelViewer();

    // base64 → Uint8Array → Blob → Object URL
    const base64 = dataStr.split(',')[1];
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }
    // .glb 形式が大半なので model/gltf-binary で渡す
    const blob = new Blob([bytes], { type: 'model/gltf-binary' });
    const objectUrl = URL.createObjectURL(blob);

    const mv = document.createElement('model-viewer');
    mv.setAttribute('src', objectUrl);
    mv.setAttribute('camera-controls', '');
    mv.setAttribute('shadow-intensity', '1');
    mv.setAttribute('loading', 'lazy');
    mv.style.width = '300px';
    mv.style.height = '300px';
    mv.style.display = 'block';
    mv.style.margin = '0 auto';
    mv.className = 'mosaic_img';

    // メモリリーク防止: DOMから外れたら Object URLを解放
    const observer = new MutationObserver(() => {
        if (!document.body.contains(mv)) {
            URL.revokeObjectURL(objectUrl);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    dom.appendChild(mv);
}

function renderMedia(dataStr, mosaicIdHex, dom) {
    if (dataStr.startsWith('data:image/')) appendImg(dataStr, dom);
    else if (dataStr.startsWith('data:audio/')) appendAudio(dataStr, dom);
    else if (dataStr.startsWith('data:video/')) appendVideo(dataStr, dom);
    else if (dataStr.startsWith('data:application/pdf')) appendPdf(dataStr, dom);
    else if (dataStr.startsWith('data:text/html')) appendHtml(dataStr, dom);
    else if (dataStr.startsWith('data:application/octet-stream')) append3D(dataStr, dom); // dataStrを直接渡す
}

// ─────────────────────────────────────────────────────────────────────────────
// NFTDrive
// ─────────────────────────────────────────────────────────────────────────────

// NG リスト（NFTDriveブラックリスト）
let nftDriveNgList = [];
fetch('https://nftdrive-explorer.info/black_list/')
    .then(res => res.text())
    .then(text => { nftDriveNgList = JSON.parse(text); })
    .catch(() => { });

/**
 * NFTDrive NFT をデコードして dom に挿入する
 * v2: mosaicRepo.getMosaic().subscribe(), txRepo.search().toPromise(), txRepo.getTransaction().toPromise()
 * v3: getMosaicInfo (fetch) + searchConfirmedTransactions (fetch) + fetch GET /transactions/confirmed/{hash}
 *
 * @param {string} mosaicIdHex
 * @param {HTMLElement} dom
 */
export async function nftdrive(mosaicIdHex, dom) {
    try {
        // ── キャッシュチェック ──────────────────────────────────────────────────
        const cached = await nftCacheGet(`nftdrive_${mosaicIdHex}`);
        if (cached) {
            dom.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_2" href="https://nftdrive-explorer.info/chart.html?net=main&mosaic=${mosaicIdHex}" target="_blank">NFTDrive</a></div><br>`;
            renderMedia(cached, mosaicIdHex, dom);
            return;
        }

        const mo = await getMosaicInfo(mosaicIdHex);

        // NG リストチェック
        if (nftDriveNgList.find(elem => elem[1] === mosaicIdHex)) return;

        // v3: ownerAddressはhex形式（48文字）で返るのでSymbol形式（39文字）に変換
        const ownerAddress = hexToAddress(mo.ownerAddress);

        // TRANSFER Txを検索（v3: typeパラメータはaddressと組み合わせると409になる場合があるため除外）
        const preTxes = await searchConfirmedTransactions({
            address: ownerAddress,
            pageSize: 20,
            order: 'asc',
        });

        const isNFT = preTxes.data.some(tx => {
            if (tx.transaction.type !== 16724) return false; // クライアント側でtypeフィルタ
            const msg = tx.transaction.message;
            if (!msg) return false;
            try {
                const decoded = new TextDecoder().decode(
                    Uint8Array.from(msg.match(/.{1,2}/g).map(b => parseInt(b, 16))).slice(1)
                );
                return decoded === 'Please note that this mosaic is an NFT.';
            } catch { return false; }
        });

        if (!isNFT) return;

        // Aggregate Txを取得（typeパラメータを除外してクライアント側でフィルタ）
        const aggTxRes = await searchConfirmedTransactions({
            address: ownerAddress,
            pageSize: 100,
        });
        // クライアント側でAGGREGATE_COMPLETE(16705) / AGGREGATE_BONDED(16961)に絞る
        const aggTxIds = aggTxRes.data
            .filter(tx => tx.transaction.type === 16705 || tx.transaction.type === 16961);

        const aggTxes = [];
        for (const tx of aggTxIds) {
            const full = await fetchJsonWithRetry(`${NODE}/transactions/confirmed/${tx.meta.hash}`);
            if (full.transaction.transactions?.some(inner => inner.transaction.type === 16724)) {
                aggTxes.push(full);
            }
        }

        // ペイロード順にソート
        const sorted = aggTxes.sort((a, b) => {
            const pa = Number(a.transaction.transactions[0].transaction.message);
            const pb = Number(b.transaction.transactions[0].transaction.message);
            return pa - pb;
        });

        let nftData = '';
        let header = 15;
        for (const aggTx of sorted) {
            const inners = aggTx.transaction.transactions;
            for (let idx = header; idx < inners.length; idx++) {
                const msg = inners[idx].transaction.message;
                if (msg) {
                    try {
                        nftData += new TextDecoder().decode(
                            Uint8Array.from(msg.match(/.{1,2}/g).map(b => parseInt(b, 16))).slice(1)
                        );
                    } catch { nftData += msg; }
                }
            }
            header = 1;
        }

        if (!nftData) return;

        await nftCacheSet(`nftdrive_${mosaicIdHex}`, nftData);
        dom.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_2" href="https://nftdrive-explorer.info/chart.html?net=main&mosaic=${mosaicIdHex}" target="_blank">NFTDrive</a></div><br>`;
        renderMedia(nftData, mosaicIdHex, dom);

    } catch (e) {
        console.error('[nftdrive]', e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMSA UNIQUE (v1.0 / v1.1)
// ─────────────────────────────────────────────────────────────────────────────

// COMSA メタデータキー一覧
const COMSA_HEADER_KEY = 'DA030AA7795EBE75';
const COMSA_DATA_KEYS = [
    'D77BFE313AF3EF1F', 'AACFBE3CC93EABF3', 'A0B069B710B3754C', 'D75B016AA9FAC056',
    'BABD9C10F590F0F3', 'D4B5933FA2FD62E7', 'FA60A37C56457F1A', 'FEDD372E157E9CF0',
    'C9384119AD73CF95', 'EADE00D8D78AC0BD', 'F6578214308E7990',
    'CE7226A968287482', 'C2811F3B6F49C568', '886A58DBE955A788', '87300B99E5B10E2C',
    'EE553D7141B98753', 'B3084C09176CA990',
];

/**
 * COMSA UNIQUE NFT をデコードして dom に挿入する
 * v2: mosaicRepo.getMosaic().subscribe(), metaRepo.search().toPromise(), txRepo.getTransaction().toPromise()
 * v3: getMosaicInfo + searchMetadata + getTransactionsByIds (fetch)
 */
export async function comsaNFT(mosaicIdHex, dom) {
    try {
        // ── キャッシュチェック ──────────────────────────────────────────────────
        const cached10 = await nftCacheGet(`comsa10_${mosaicIdHex}`);
        const cached11 = await nftCacheGet(`comsa11_${mosaicIdHex}`);
        const cachedComsa = cached10 ?? cached11;
        if (cachedComsa) {
            dom.innerHTML = `<br><div style="text-align: center;color: yellow;"><a class="btn-style-link_3" href="https://explorer.comsa.io/mosaic/${mosaicIdHex}" target="_blank">COMSA < UNIQUE ></a></div><br>`;
            renderMedia(cachedComsa, mosaicIdHex, dom);
            return;
        }

        const mo = await getMosaicInfo(mosaicIdHex);

        const metaRes = await searchMetadata({
            targetId: mo.id,
            metadataType: 1, // Mosaic
            pageSize: 100,
        });

        const headerEntry = metaRes.data.find(
            tx => tx.metadataEntry.scopedMetadataKey === COMSA_HEADER_KEY
        );
        if (!headerEntry) return;

        const headerJSON = JSON.parse(hexToUtf8(headerEntry.metadataEntry.value));

        // データtablekeyからhash一覧を結合
        let aggTxHashes = [];
        for (const key of COMSA_DATA_KEYS) {
            const entry = metaRes.data.find(tx => tx.metadataEntry.scopedMetadataKey === key);
            if (!entry) continue;
            aggTxHashes = aggTxHashes.concat(JSON.parse(hexToUtf8(entry.metadataEntry.value)));
        }

        const dataType = `data:${headerJSON.mime_type};base64,`;

        if (headerJSON.version === 'comsa-nft-1.0') {
            // v1.0 メッセージ形式: [\0 型バイト][ASCIIファイルサイズ(可変長)][#区切り][base64データ]
            // → 型バイトを除去して hex デコードし、「#」以降を取り出す
            let nftData = '';
            for (const hash of aggTxHashes) {
                const txRes = await getTransactionsByIds([hash]);
                const inners = txRes[0].transaction.transactions;
                for (let i = 1; i < inners.length; i++) {
                    const raw = inners[i].transaction.message;
                    const msgText = new TextDecoder().decode(
                        Uint8Array.from(raw.slice(2).match(/.{1,2}/g).map(b => parseInt(b, 16)))
                    );
                    const hashIdx = msgText.indexOf('#');
                    nftData += hashIdx >= 0 ? msgText.slice(hashIdx + 1) : msgText;
                }
            }
            const finalUrl10 = dataType + nftData;
            await nftCacheSet(`comsa10_${mosaicIdHex}`, finalUrl10);
            dom.innerHTML = `<br><div style="text-align: center;color: yellow;"><a class="btn-style-link_3" href="https://explorer.comsa.io/mosaic/${mosaicIdHex}" target="_blank">COMSA < UNIQUE ></a></div><br>`;
            renderMedia(finalUrl10, mosaicIdHex, dom);

        } else if (headerJSON.version === 'comsa-nft-1.1') {
            // v1.1: v3の message には型バイト '00' (2 hex文字) が先頭に付くので除去してから hexToBase64
            let nftData = '';
            for (const hash of aggTxHashes) {
                const json = await postJsonWithRetry(`${NODE}/transactions/confirmed`, { transactionIds: [hash] });
                const inners = json[0].transaction.transactions;
                let isSkip = true;
                for (const inner of inners) {
                    if (isSkip) { isSkip = false; continue; }
                    nftData += inner.transaction.message.slice(2); // '00' 型バイトを除去
                }
            }
            const finalUrl11 = dataType + hexToBase64(nftData);
            await nftCacheSet(`comsa11_${mosaicIdHex}`, finalUrl11);
            dom.innerHTML = `<br><div style="text-align: center;color: yellow;"><a class="btn-style-link_3" href="https://explorer.comsa.io/mosaic/${mosaicIdHex}" target="_blank">COMSA < UNIQUE ></a></div><br>`;
            renderMedia(finalUrl11, mosaicIdHex, dom);
        }

    } catch (e) {
        console.error('[comsaNFT]', e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMSA BUNDLE / NCFT
// ─────────────────────────────────────────────────────────────────────────────

const COMSA_NCFT_HEADER_KEY = '8E0823CEF8A40075';
const COMSA_NCFT_DATA_KEYS = [
    'D77BFE313AF3EF1F', 'AACFBE3CC93EABF3', 'A0B069B710B3754C', 'D75B016AA9FAC056',
];

/**
 * COMSA BUNDLE NFT をデコードして dom に挿入する
 * v2: mosaicRepo.getMosaic().subscribe(), metaRepo.search().toPromise()
 * v3: getMosaicInfo + searchMetadata + fetch POST /transactions/confirmed
 */
export async function comsaNCFT(mosaicIdHex, dom) {
    try {
        // ── キャッシュチェック ──────────────────────────────────────────────────
        const cachedNcft = await nftCacheGet(`comsancft_${mosaicIdHex}`);
        if (cachedNcft) {
            dom.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_4" href="https://explorer.comsa.io/mosaic/${mosaicIdHex}" target="_blank">COMSA < BUNDLE ></a></div><br>`;
            renderMedia(cachedNcft, mosaicIdHex, dom);
            return;
        }

        const mo = await getMosaicInfo(mosaicIdHex);

        const metaRes = await searchMetadata({
            targetId: mo.id,
            metadataType: 1,
            pageSize: 100,
        });

        const headerEntry = metaRes.data.find(
            tx => tx.metadataEntry.scopedMetadataKey === COMSA_NCFT_HEADER_KEY
        );
        if (!headerEntry) return;

        const headerJSON = JSON.parse(hexToUtf8(headerEntry.metadataEntry.value));

        let aggTxHashes = [];
        for (const key of COMSA_NCFT_DATA_KEYS) {
            const entry = metaRes.data.find(tx => tx.metadataEntry.scopedMetadataKey === key);
            if (!entry) continue;
            aggTxHashes = aggTxHashes.concat(JSON.parse(hexToUtf8(entry.metadataEntry.value)));
        }

        const dataType = `data:${headerJSON.mime_type};base64,`;
        let nftData = '';

        for (const hash of aggTxHashes) {
            const json = await postJsonWithRetry(`${NODE}/transactions/confirmed`, { transactionIds: [hash] });
            const inners = json[0].transaction.transactions;
            let isSkip = true;
            for (const inner of inners) {
                if (isSkip) { isSkip = false; continue; }
                nftData += inner.transaction.message;
            }
        }

        const finalUrlNcft = dataType + hexToBase64(nftData);
        await nftCacheSet(`comsancft_${mosaicIdHex}`, finalUrlNcft);
        dom.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_4" href="https://explorer.comsa.io/mosaic/${mosaicIdHex}" target="_blank">COMSA < BUNDLE ></a></div><br>`;
        renderMedia(finalUrlNcft, mosaicIdHex, dom);

    } catch (e) {
        console.error('[comsaNCFT]', e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ukraine NFT
// ─────────────────────────────────────────────────────────────────────────────

const UKRAINE_HEADER_KEY = '8AFD95A719B1BB90';

/**
 * Ukraine NFT をデコードして dom に挿入する
 * v2: mosaicRepo.getMosaic().subscribe(), metaRepo.search().toPromise(), txRepo.getTransactionsById().toPromise()
 * v3: getMosaicInfo + searchMetadata + fetch POST /transactions/confirmed
 *
 * 改善: blob URL → data URL（ページリロードでも有効・IndexedDBキャッシュ可能）
 */
export async function ukraineNFT(mosaicIdHex, dom) {
    try {
        // ── キャッシュチェック ──────────────────────────────────────────────────
        const cachedUkraine = await nftCacheGet(`ukraine_${mosaicIdHex}`);
        if (cachedUkraine) {
            dom.innerHTML = `<br><a class="btn-style-link" href="https://symbol-ukraine.org/nft/${mosaicIdHex}" target="_blank">Ukraine</a><br><br>`;
            appendImg(cachedUkraine, dom);
            return;
        }

        const mo = await getMosaicInfo(mosaicIdHex);

        const metaRes = await searchMetadata({
            targetId: mo.id,
            metadataType: 1,
            pageSize: 100,
        });

        const headerEntry = metaRes.data.find(
            tx => tx.metadataEntry.scopedMetadataKey === UKRAINE_HEADER_KEY
        );
        if (!headerEntry) return;

        const rootTxHash = JSON.parse(hexToUtf8(headerEntry.metadataEntry.value)).info.rootTransactionHash;

        // ルートTxを取得（POST）
        const txRes = await getTransactionsByIds([rootTxHash]);
        const payloadStr = txRes[0].transaction.transactions[1].transaction.message;

        // 64文字ずつのhash一覧を取得
        const aggTxHashes = [];
        for (let i = 0; i < payloadStr.length / 64; i++) {
            aggTxHashes.push(payloadStr.substr(i * 64, 64));
        }

        let nftData = '';
        for (const hash of aggTxHashes) {
            const json = await postJsonWithRetry(`${NODE}/transactions/confirmed`, { transactionIds: [hash] });
            const inners = json[0].transaction.transactions;
            for (const inner of inners) {
                nftData += inner.transaction.message;
            }
        }

        // hex → Uint8Array → data URL（旧: blob URL → ページリロードで消える）
        const bytes = Uint8Array.from(nftData.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const ukraineDataUrl = 'data:image/png;base64,' + uint8ArrayToBase64(bytes);

        // IndexedDBにキャッシュ保存
        await nftCacheSet(`ukraine_${mosaicIdHex}`, ukraineDataUrl);

        dom.innerHTML = `<br><a class="btn-style-link" href="https://symbol-ukraine.org/nft/${mosaicIdHex}" target="_blank">Ukraine</a><br><br>`;
        appendImg(ukraineDataUrl, dom);

    } catch (e) {
        console.error('[ukraineNFT]', e);
    }
}
