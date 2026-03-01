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
 */

import { NODE } from './config.js';
import { getMosaicInfo, searchMetadata, getTransactionsByIds, searchConfirmedTransactions, hexToAddress } from './symbolApi.js';

// ─────────────────────────────────────────────────────────────────────────────
// メディア挿入ヘルパー（SDKに完全非依存・そのまま移植）
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

function append3D(mosaicIdHex, dom) {
    const tag = document.createElement('iframe');
    tag.src = `https://nftdrive-ex.net/3dload.php?address=${mosaicIdHex}`;
    tag.width = 300;
    tag.height = 300;
    tag.className = 'mosaic_img';
    dom.appendChild(tag);
}

function renderMedia(dataStr, mosaicIdHex, dom) {
    if (dataStr.startsWith('data:image/')) appendImg(dataStr, dom);
    else if (dataStr.startsWith('data:audio/')) appendAudio(dataStr, dom);
    else if (dataStr.startsWith('data:video/')) appendVideo(dataStr, dom);
    else if (dataStr.startsWith('data:application/pdf')) appendPdf(dataStr, dom);
    else if (dataStr.startsWith('data:text/html')) appendHtml(dataStr, dom);
    else if (dataStr.startsWith('data:application/octet-stream')) append3D(mosaicIdHex, dom);
}

// hex文字列からBase64文字列へ変換（Buffer.from代替）
function hexToBase64(hex) {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return window.btoa(binary);
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
 * v3: getMosaicInfo (fetch) + searchConfirmedTransactions (fetch) + getTransactionsByIds (POST fetch)
 *
 * @param {string} mosaicIdHex
 * @param {HTMLElement} dom
 */
export async function nftdrive(mosaicIdHex, dom) {
    try {
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
            const full = await fetch(new URL(`/transactions/confirmed/${tx.meta.hash}`, NODE)).then(r => r.json());
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
 * v3: getMosaicInfo + searchMetadata + fetch (getTransactionsByIds) で置き換え
 */
export async function comsaNFT(mosaicIdHex, dom) {
    try {
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

        const headerJSON = JSON.parse(headerEntry.metadataEntry.value);

        // データキーからhash一覧を結合
        let aggTxHashes = [];
        for (const key of COMSA_DATA_KEYS) {
            const entry = metaRes.data.find(tx => tx.metadataEntry.scopedMetadataKey === key);
            if (!entry) continue;
            aggTxHashes = aggTxHashes.concat(JSON.parse(entry.metadataEntry.value));
        }

        const dataType = `data:${headerJSON.mime_type};base64,`;

        if (headerJSON.version === 'comsa-nft-1.0') {
            // v1.0: txRepo.getTransaction (toPromise) → fetch POST /transactions/confirmed
            let nftData = '';
            for (const hash of aggTxHashes) {
                const txRes = await getTransactionsByIds([hash]);
                const inners = txRes[0].transaction.transactions;
                for (let i = 1; i < inners.length; i++) {
                    nftData += inners[i].transaction.message.slice(6); // 先頭6文字スキップ
                }
            }
            dom.innerHTML = `<br><div style="text-align: center;color: yellow;"><a class="btn-style-link_3" href="https://explorer.comsa.io/mosaic/${mosaicIdHex}" target="_blank">COMSA < UNIQUE ></a></div><br>`;
            renderMedia(dataType + nftData, mosaicIdHex, dom);

        } else if (headerJSON.version === 'comsa-nft-1.1') {
            // v1.1: すでにfetchを使用 → そのまま移植
            let nftData = '';
            for (const hash of aggTxHashes) {
                const res = await fetch(new URL('/transactions/confirmed', NODE), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json;charset=utf-8' },
                    body: JSON.stringify({ transactionIds: [hash] }),
                });
                const json = await res.json();
                const inners = json[0].transaction.transactions;
                let isSkip = true;
                for (const inner of inners) {
                    if (isSkip) { isSkip = false; continue; }
                    nftData += inner.transaction.message;
                }
            }
            dom.innerHTML = `<br><div style="text-align: center;color: yellow;"><a class="btn-style-link_3" href="https://explorer.comsa.io/mosaic/${mosaicIdHex}" target="_blank">COMSA < UNIQUE ></a></div><br>`;
            renderMedia(dataType + hexToBase64(nftData), mosaicIdHex, dom);
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

        const headerJSON = JSON.parse(headerEntry.metadataEntry.value);

        let aggTxHashes = [];
        for (const key of COMSA_NCFT_DATA_KEYS) {
            const entry = metaRes.data.find(tx => tx.metadataEntry.scopedMetadataKey === key);
            if (!entry) continue;
            aggTxHashes = aggTxHashes.concat(JSON.parse(entry.metadataEntry.value));
        }

        const dataType = `data:${headerJSON.mime_type};base64,`;
        let nftData = '';

        for (const hash of aggTxHashes) {
            const res = await fetch(new URL('/transactions/confirmed', NODE), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json;charset=utf-8' },
                body: JSON.stringify({ transactionIds: [hash] }),
            });
            const json = await res.json();
            const inners = json[0].transaction.transactions;
            let isSkip = true;
            for (const inner of inners) {
                if (isSkip) { isSkip = false; continue; }
                nftData += inner.transaction.message;
            }
        }

        dom.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_4" href="https://explorer.comsa.io/mosaic/${mosaicIdHex}" target="_blank">COMSA < BUNDLE ></a></div><br>`;
        renderMedia(dataType + hexToBase64(nftData), mosaicIdHex, dom);

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
 */
export async function ukraineNFT(mosaicIdHex, dom) {
    try {
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

        const rootTxHash = JSON.parse(headerEntry.metadataEntry.value).info.rootTransactionHash;

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
            const res = await fetch(new URL('/transactions/confirmed', NODE), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json;charset=utf-8' },
                body: JSON.stringify({ transactionIds: [hash] }),
            });
            const json = await res.json();
            const inners = json[0].transaction.transactions;
            for (const inner of inners) {
                nftData += inner.transaction.message;
            }
        }

        // hex → Blob → ObjectURL
        const bytes = Uint8Array.from(nftData.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const blob = new Blob([bytes], { type: 'image/png' });
        const objectUrl = URL.createObjectURL(blob);

        dom.innerHTML = `<br><a class="btn-style-link" href="https://symbol-ukraine.org/nft/${mosaicIdHex}" target="_blank">Ukraine</a><br><br>`;
        appendImg(objectUrl, dom);

    } catch (e) {
        console.error('[ukraineNFT]', e);
    }
}
