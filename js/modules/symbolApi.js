/**
 * symbolApi.js - Symbol REST API ラッパー (v3: rxjs廃止・fetch統一)
 *
 * v2: txRepo.search(criteria).subscribe() / .toPromise()
 * v3: fetch(NODE + '/endpoint?' + params).then(r => r.json())
 */

import { NODE, epochAdjustment } from './config.js';

// ─────────────────────────────────────────────────────────────────────────────
// 共通 fetch ヘルパー
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET リクエストを投げてJSONを返す
 * @param {string|URL} url
 * @returns {Promise<any>}
 */
export async function fetchJson(url) {
    const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`fetchJson error: ${res.status} ${url}`);
    return res.json();
}

/**
 * Symbol REST API が返す hex エンコードアドレス（48文字）を
 * human-readable 形式（NXXXXX... 39文字）に変換する
 * @param {string} hex - 48文字の16進数アドレス
 * @returns {string} - 39文字のSymbolアドレス
 */
export function hexToAddress(hex) {
    if (!hex || hex.length !== 48) return hex; // 変換不要ならそのまま返す
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    let result = '';
    let buffer = 0;
    let bitsLeft = 0;
    for (const byte of bytes) {
        buffer = (buffer << 8) | byte;
        bitsLeft += 8;
        while (bitsLeft >= 5) {
            bitsLeft -= 5;
            result += alphabet[(buffer >> bitsLeft) & 31];
        }
    }
    if (bitsLeft > 0) result += alphabet[(buffer << (5 - bitsLeft)) & 31];
    return result; // 39文字
}

/**
 * POST リクエストを投げてJSONを返す
 * @param {string|URL} url
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function postJson(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`postJson error: ${res.status} ${url}`);
    return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// アカウント
// ─────────────────────────────────────────────────────────────────────────────

/**
 * アカウント情報を取得する
 * v2: accountRepo.getAccountInfo(address).toPromise()
 * @param {string} address - 39文字のアドレス文字列
 */
export async function getAccountInfo(address) {
    const data = await fetchJson(new URL(`/accounts/${address}`, NODE));
    return data.account;
}

/**
 * マルチシグアカウント情報を取得する
 * v2: msigRepo.getMultisigAccountInfo(address).toPromise()
 */
export async function getMultisigAccountInfo(address) {
    return fetchJson(new URL(`/account/${address}/multisig`, NODE));
}

// ─────────────────────────────────────────────────────────────────────────────
// モザイク
// ─────────────────────────────────────────────────────────────────────────────

/**
 * モザイク情報を取得する
 * v2: mosaicRepo.getMosaic(mosaicId).toPromise()
 * @param {string} mosaicIdHex - 16進数のモザイクID
 */
export async function getMosaicInfo(mosaicIdHex) {
    const data = await fetchJson(new URL(`/mosaics/${mosaicIdHex}`, NODE));
    return data.mosaic;
}

/**
 * 複数モザイクの名前（ネームスペース）を取得する
 * v2: nsRepo.getMosaicsNames([mosaicId]).toPromise()
 * @param {string[]} mosaicIdHexArray
 */
export async function getMosaicsNames(mosaicIdHexArray) {
    const data = await postJson(new URL('/namespaces/mosaic/names', NODE), {
        mosaicIds: mosaicIdHexArray,
    });
    return data.mosaicNames; // [{ mosaicId, names: [{name}] }]
}

/**
 * アカウントが保有するモザイク一覧（詳細付き）を取得する
 * v2: mosaicRepo.getMosaics(ids).toPromise()
 * @param {string[]} mosaicIdHexArray
 */
export async function getMosaics(mosaicIdHexArray) {
    const data = await postJson(new URL('/mosaics', NODE), {
        mosaicIds: mosaicIdHexArray,
    });
    return data; // [{id, mosaic: {...}}]
}

/**
 * モザイクの保有者リストを取得する
 * v2: mosaicRepo.search({mosaicId}).toPromise()
 * @param {object} params - { mosaicId, pageNumber, pageSize, ... }
 */
export async function searchMosaics(params) {
    const q = new URLSearchParams(params);
    return fetchJson(new URL(`/mosaics?${q}`, NODE));
}

// ─────────────────────────────────────────────────────────────────────────────
// ネームスペース
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ネームスペース情報を取得する
 * v2: nsRepo.getNamespace(namespaceId).toPromise()
 * @param {string} namespaceIdHex
 */
export async function getNamespaceInfo(namespaceIdHex) {
    const data = await fetchJson(new URL(`/namespaces/${namespaceIdHex}`, NODE));
    return data.namespace;
}

/**
 * ネームスペース名を取得する
 * v2: nsRepo.getNamespacesNames([namespaceId]).toPromise()
 * @param {string[]} namespaceIdHexArray
 */
export async function getNamespacesNames(namespaceIdHexArray) {
    const data = await postJson(new URL('/namespaces/names', NODE), {
        namespaceIds: namespaceIdHexArray,
    });
    return data.namespaceNames; // [{ id, name }]
}

/**
 * アカウントのネームスペース一覧を取得する
 * v2: nsRepo.search({ownerAddress}).toPromise()
 * @param {object} params
 */
export async function searchNamespaces(params) {
    const q = new URLSearchParams(params);
    return fetchJson(new URL(`/namespaces?${q}`, NODE));
}

// ─────────────────────────────────────────────────────────────────────────────
// トランザクション
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 確認済みトランザクション一覧を取得する
 * v2: txRepo.search({group:Confirmed,...}).toPromise()
 * @param {object} params - { address, pageNumber, pageSize, order, embedded, ... }
 */
export async function searchConfirmedTransactions(params) {
    const q = new URLSearchParams(params);
    return fetchJson(new URL(`/transactions/confirmed?${q}`, NODE));
}

/**
 * 未確認トランザクション一覧を取得する
 * v2: txRepo.search({group:Unconfirmed,...}).toPromise()
 */
export async function searchUnconfirmedTransactions(params) {
    const q = new URLSearchParams(params);
    return fetchJson(new URL(`/transactions/unconfirmed?${q}`, NODE));
}

/**
 * Partial（署名待ち）トランザクション一覧を取得する
 * v2: txRepo.search({group:Partial,...}).toPromise()
 */
export async function searchPartialTransactions(params) {
    const q = new URLSearchParams(params);
    return fetchJson(new URL(`/transactions/partial?${q}`, NODE));
}

/**
 * トランザクションをハッシュで取得する
 * v2: txRepo.getTransaction(hash, group).toPromise()
 * @param {string} hash - 64文字のトランザクションハッシュ
 */
export async function getConfirmedTransaction(hash) {
    return fetchJson(new URL(`/transactions/confirmed/${hash}`, NODE));
}

/**
 * 複数トランザクションをIDで取得する（POST）
 * v2: txRepo.getTransactionsById(ids, group).toPromise()
 * @param {string[]} transactionIds
 */
export async function getTransactionsByIds(transactionIds) {
    return postJson(new URL('/transactions/confirmed', NODE), { transactionIds });
}

/**
 * トランザクションをアナウンスする
 * v2: txRepo.announce(signedTx) / announceAggregateBonded(signedTx)
 * @param {string} payloadHex - SSS requestSignで返ってきたpayload
 * @param {boolean} isBonded - Bonded（アグボン）かどうか
 */
export async function announceTransaction(payloadHex, isBonded = false) {
    const endpoint = isBonded ? '/transactions/partial' : '/transactions';
    const res = await fetch(new URL(endpoint, NODE), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: payloadHex }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`announceTransaction failed: ${JSON.stringify(err)}`);
    }
    return res.json();
}

/**
 * ハーベスト（レシート）一覧を取得する
 * v2: receiptRepo.searchAddressResolutionStatements
 * @param {object} params
 */
export async function searchAddressResolutionStatements(params) {
    const q = new URLSearchParams(params);
    return fetchJson(new URL(`/statements/resolutions/address?${q}`, NODE));
}

/**
 * ブロックのレシートを取得する
 * @param {number|string} height
 */
export async function getBlockReceipts(height) {
    return fetchJson(new URL(`/blocks/${height}/statements/receipts`, NODE));
}

// ─────────────────────────────────────────────────────────────────────────────
// メタデータ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * メタデータ一覧を取得する
 * v2: metaRepo.search({...}).toPromise()
 * @param {object} params - { targetAddress, targetId, scopedMetadataKey, metadataType, pageSize, ... }
 */
export async function searchMetadata(params) {
    const q = new URLSearchParams(params);
    return fetchJson(new URL(`/metadata?${q}`, NODE));
}

// ─────────────────────────────────────────────────────────────────────────────
// チェーン・ブロック
// ─────────────────────────────────────────────────────────────────────────────

/**
 * チェーン情報を取得する
 * v2: chainRepo.getChainInfo().toPromise()
 */
export async function getChainInfo() {
    return fetchJson(new URL('/chain/info', NODE));
}

/**
 * 特定高さのブロック情報を取得する
 * v2: blockRepo.getBlockByHeight(height).toPromise()
 * @param {number|string} height
 */
export async function getBlockByHeight(height) {
    const data = await fetchJson(new URL(`/blocks/${height}`, NODE));
    return data.block;
}

// ─────────────────────────────────────────────────────────────────────────────
// ノード
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ノード情報を取得する
 * v2: nodeRepo.getNodeInfo().toPromise()
 */
export async function getNodeInfo() {
    return fetchJson(new URL('/node/info', NODE));
}

// ─────────────────────────────────────────────────────────────────────────────
// タイムスタンプ ユーティリティ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Symbol タイムスタンプ（ミリ秒）を Date に変換する
 * @param {number} tsMsec - tx.meta.timestamp（ミリ秒）
 * @returns {Date}
 */
export function symbolTimestampToDate(tsMsec) {
    return new Date((epochAdjustment + tsMsec / 1000) * 1000);
}

/**
 * Date を "YYYY-MM-DD HH:mm:ss" 形式の文字列に変換
 * @param {Date} date
 */
export function formatDate(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
