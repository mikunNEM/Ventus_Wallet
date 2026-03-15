
// モザイク情報キャッシュ（Promiseを格納して並行呼び出しの重複リクエストを防ぐ）
// null = 404確認済み / Promise = 取得中or完了
const _mosaicInfoCache = new Map();

async function getMosaicInfoCached(mosaicIdHex) {
    // null = 404確認済み → すぐエラー
    if (_mosaicInfoCache.get(mosaicIdHex) === null) {
        throw new Error(`mosaic ${mosaicIdHex} not found (cached 404)`);
    }
    // Promise が既にある → 同じ結果を待つ（並行リクエストを1本に束ねる）
    if (_mosaicInfoCache.has(mosaicIdHex)) {
        return _mosaicInfoCache.get(mosaicIdHex);
    }
    // 初回: Promise を即座にキャッシュしてから実行
    const promise = (async () => {
        const moInfo = await getMosaicInfo(mosaicIdHex);
        const names = (await getMosaicsNames([mosaicIdHex]).catch(() => null))?.[0]?.names ?? [];
        return { moInfo, names };
    })();
    _mosaicInfoCache.set(mosaicIdHex, promise);
    try {
        return await promise;
    } catch (e) {
        _mosaicInfoCache.set(mosaicIdHex, null); // 404等はnullキャッシュ
        throw e;
    }
}
/**
 * main.js - Ventus ウォレット メインエントリポイント (Symbol SDK v3)
 *
 * v2: require('symbol-sdk') + RepositoryFactoryHttp + rxjs
 * v3: import('symbol-sdk@CDN') + fetch API + async/await
 */

import {
    loadSDK, initNetwork, publicKeyToAddress,
    sdkCore, sdkSymbol, facade,
    NODE, epochAdjustment, networkType, XYM_ID, EXPLORER, GRACE_BLOCK,
    TOTAL_CHAIN_IMPORTANCE,
} from './config.js';

import {
    fetchJson, hexToAddress,
    getAccountInfo, getMultisigAccountInfo, getMsigGraph,
    getMosaicInfo, getMosaicsNames, getMosaics, searchMosaics,
    getNamespacesNames, searchNamespaces,
    searchConfirmedTransactions, searchUnconfirmedTransactions, searchPartialTransactions,
    getConfirmedTransaction, getTransactionsByIds, announceTransaction,
    searchMetadata,
    getChainInfo, getBlockByHeight,
    symbolTimestampToDate, formatDate,
} from './symbolApi.js';

import {
    signAndAnnounce,
    buildTransferTx, buildEmbeddedTransferTx,
    buildAggregateCompleteTx, buildAggregateBondedTx,
    buildHashLockTx,
    buildAccountMetadataEmbeddedTx, buildMosaicMetadataEmbeddedTx, buildNamespaceMetadataEmbeddedTx,
    buildMosaicDefinitionEmbeddedTxs,
    buildMosaicSupplyChangeTx, buildMosaicRevocationTx, buildMosaicRevocationEmbeddedTx,
    buildRootNamespaceTx, buildSubNamespaceTx,
    buildAddressAliasTx, buildMosaicAliasTx,
    buildMultisigModificationEmbeddedTx,
} from './transactions.js';

import { nftdrive, comsaNFT, comsaNCFT, ukraineNFT } from './nft.js';

// ─────────────────────────────────────────────────────────────────────────────
// ユーティリティ（v2から移植、SDK非依存）
// ─────────────────────────────────────────────────────────────────────────────

function byteLengthUTF8(s) {
    return new TextEncoder().encode(s).length;
}

function paddingDate0(num) {
    return (num < 10) ? '0' + num : '' + num;
}

function dispTimeStamp(timeStampMs, epoch) {
    const d = new Date(timeStampMs + epoch * 1000);
    return d.getFullYear() % 100
        + '-' + paddingDate0(d.getMonth() + 1)
        + '-' + paddingDate0(d.getDate())
        + ' ' + paddingDate0(d.getHours())
        + ':' + paddingDate0(d.getMinutes());
}

function dispAmount(amount, divisibility) {
    const strNum = amount.toString();
    if (divisibility > 0) {
        if (amount < Math.pow(10, divisibility)) {
            return '0.' + strNum.padStart(divisibility, '0');
        }
        const r = strNum.slice(-divisibility);
        const l = strNum.slice(0, strNum.length - divisibility);
        return comma3(l) + '.' + r;
    }
    return comma3(strNum);
}


// null安全なHTML設定ヘルパー
function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
function comma3(str) {
    return str.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
}

function Onclick_Copy(copyText) {
    navigator.clipboard.writeText(copyText);
    const btn = document.querySelector('h2');
    const msg = document.createElement('div');
    msg.innerHTML = `　　　　<strong style="color: green;"><font size="6">Copied!</font></strong>`;
    btn.replaceWith(msg);
    setTimeout(() => msg.replaceWith(btn), 700);
}

// v2 の Onclick_Decryption と同等（setEncryptedMessage + requestSignDecription）
async function Onclick_Decryption(senderPubKey, encryptedHex) {
    console.log('[Onclick_Decryption] senderPubKey:', senderPubKey);
    console.log('[Onclick_Decryption] encryptedHex:', encryptedHex);
    try {
        window.SSS.setEncryptedMessage(encryptedHex, senderPubKey);
        const decrypted = await window.SSS.requestSignDecription();
        console.log('[Onclick_Decryption] decrypted:', decrypted);
        Swal.fire({
            html: `復号化メッセージ<br>< Decrypted Message ><br><br>
                   <p style="font-size: 24px;"><font color="blue">${decrypted}</font></p>`
        });
    } catch (e) {
        console.error('[Onclick_Decryption] error:', e);
        Swal.fire({ title: '復号失敗', text: e?.message ?? String(e), icon: 'error' });
    }
}

function transaction_info(url) {
    window.open(url);
}

function getTransactionType(type) {
    const types = {
        16724: 'TRANSFER', 16717: 'NAMESPACE_REGISTRATION', 16718: 'ADDRESS_ALIAS',
        16974: 'MOSAIC_ALIAS', 16973: 'MOSAIC_DEFINITION', 16717: 'MOSAIC_SUPPLY_CHANGE',
        17229: 'MOSAIC_SUPPLY_REVOCATION', 16725: 'MULTISIG_ACCOUNT_MODIFICATION',
        16712: 'HASH_LOCK', 16720: 'SECRET_LOCK', 16976: 'SECRET_PROOF',
        16708: 'ACCOUNT_ADDRESS_RESTRICTION', 16964: 'ACCOUNT_MOSAIC_RESTRICTION',
        17220: 'ACCOUNT_OPERATION_RESTRICTION', 16716: 'ACCOUNT_KEY_LINK',
        16972: 'MOSAIC_GLOBAL_RESTRICTION', 16728: 'MOSAIC_ADDRESS_RESTRICTION',
        16707: 'ACCOUNT_METADATA', 16963: 'MOSAIC_METADATA', 17219: 'NAMESPACE_METADATA',
        16705: 'AGGREGATE_COMPLETE', 16961: 'AGGREGATE_BONDED',
        16963: 'VRF_KEY_LINK', 16716: 'NODE_KEY_LINK',
    };
    return types[type] || `TYPE_${type}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ノード取得（v2の getActiveNode と同等）
// ─────────────────────────────────────────────────────────────────────────────

async function getAvailableNode() {
    // SSS の activeAddress 先頭文字で mainnet(N) / testnet(T) を判定
    const activeAddr = window.SSS?.activeAddress ?? '';
    const isTestnet = activeAddr.charAt(0) === 'T';

    const NODEWATCH_URL = isTestnet
        ? 'https://nodewatch.symbol.tools/testnet/api/symbol/nodes/peer?only_ssl=true&limit=10&order=random'
        : 'https://nodewatch.symbol.tools/api/symbol/nodes/peer?only_ssl=true&limit=10&order=random';

    const res = await fetch(NODEWATCH_URL);
    const nodes = await res.json();

    // 🇯🇵 日本ノード優先
    let pool = nodes.filter(n =>
        n.geoLocation?.country === 'Japan' &&
        n.isHealthy
    );

    // 無ければ全体から健全なものを選ぶ
    if (!pool.length) {
        pool = nodes.filter(n => n.isHealthy);
    }

    // ブロック高が最大のノードを選択
    pool.sort((a, b) => b.height - a.height);

    if (!pool.length) {
        Swal.fire('Active Node Error!!', '使用可能なノードが見つかりませんでした。');
        return undefined;
    }

    // Mosaic_Viewer.html と同様に /node/health でノードの稼動状態を確認
    // unhealthy なら次のノードを試みる
    for (const candidate of pool) {
        const nodeUrl = new URL(candidate.endpoint).origin;
        try {
            const healthRes = await fetch(`${nodeUrl}/node/health`);
            const health = await healthRes.json();
            if (health.status?.apiNode === 'up' && health.status?.db === 'up') {
                console.log('[getAvailableNode] selected:', nodeUrl, '(height:', candidate.height, ')');
                return nodeUrl;
            }
            console.warn('[getAvailableNode] unhealthy, skip:', nodeUrl, health.status);
        } catch (e) {
            console.warn('[getAvailableNode] health check failed, skip:', nodeUrl, e.message);
        }
    }

    Swal.fire('Active Node Error!!', '使用可能なノードが見つかりませんでした。');
    return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket リスナー（v3方式: 直接 WebSocket を使用）
// ─────────────────────────────────────────────────────────────────────────────

let wsConnection = null;
let wsUid = null;

function connectWebSocket(activeAddress, onConfirmed, onUnconfirmed, onPartialAdded) {
    if (wsConnection) wsConnection.close();

    const wsEndpoint = NODE.replace('https', 'wss').replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsEndpoint);
    wsConnection = ws;

    ws.onopen = () => {
        console.log('[WS] connected');
    };

    ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        // 初回接続でUIDを受け取る
        if (msg.uid) {
            wsUid = msg.uid;
            console.log('[WS] uid=', wsUid);

            // サブスクリプション登録
            ws.send(JSON.stringify({ uid: wsUid, subscribe: 'block' }));
            ws.send(JSON.stringify({ uid: wsUid, subscribe: `confirmedAdded/${activeAddress}` }));
            ws.send(JSON.stringify({ uid: wsUid, subscribe: `unconfirmedAdded/${activeAddress}` }));
            ws.send(JSON.stringify({ uid: wsUid, subscribe: `partialAdded/${activeAddress}` }));
            return;
        }

        // トピック別処理
        const topic = msg.topic;
        if (!topic) return;

        if (topic === 'block') {
            // ブロック生成: 切断防止のみ（ログなし）
        } else if (topic.startsWith('confirmedAdded/')) {
            console.log('[WS] confirmed:', msg.data);
            if (onConfirmed) onConfirmed(msg.data);
        } else if (topic.startsWith('unconfirmedAdded/')) {
            console.log('[WS] unconfirmed:', msg.data);
            if (onUnconfirmed) onUnconfirmed(msg.data);
        } else if (topic.startsWith('partialAdded/')) {
            console.log('[WS] partial (multisig sign request):', msg.data);
            if (onPartialAdded) onPartialAdded(msg.data);
        }
    };

    ws.onerror = (e) => console.error('[WS] error', e);
    ws.onclose = () => console.log('[WS] closed');

    return ws;
}

// ─────────────────────────────────────────────────────────────────────────────
// マルチシグ署名リクエスト処理
// ─────────────────────────────────────────────────────────────────────────────

async function handlePartialTx(txData, activeAddress, xymMosaicIdHex) {
    const hash = txData.meta?.hash;
    if (!hash) return;

    const confirmed = await Swal.fire({
        title: '署名リクエスト',
        html: `<p>マルチシグトランザクションへの署名が要求されています。</p>
           <p style="word-break:break-all; font-size:12px;">Hash: ${hash}</p>`,
        showCancelButton: true,
        confirmButtonText: '署名する',
        cancelButtonText: 'キャンセル',
    });
    if (!confirmed.isConfirmed) return;

    // AggregateBondedにコサインして送信
    const cosigPayload = sdkCore.utils.uint8ToHex(
        new TextEncoder().encode(JSON.stringify({ parentHash: hash }))
    );
    window.SSS.setTransactionByPayload(cosigPayload);
    try {
        const signed = await window.SSS.requestSignCosignature();
        await fetch(new URL('/transactions/cosignature', NODE), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parentHash: hash, signature: signed.signature, signerPublicKey: signed.signerPublicKey }),
        });
        Swal.fire('署名完了！', '連署が送信されました。', 'success');
    } catch (e) {
        console.error('[cosign]', e);
        Swal.fire('エラー', '署名に失敗しました。', 'error');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// アカウント情報の初期表示
// ─────────────────────────────────────────────────────────────────────────────

async function initAccountDisplay(accountData) {
    // window.SSS.activeAddress = 人間が読めるSymbolアドレス (NXXXXX...)
    // accountData.address      = REST APIが返すhex形式 (685C659E...) → 表示には使わない
    const addr = window.SSS.activeAddress;

    // アドレス表示
    setHTML('wallet-addr',
        `<div class="copy_container"> ${addr}<input type="image" src="src/copy.png" class="copy_bt" height="30px" id="${addr}" onclick="Onclick_Copy(this.id);" /></div>`);

    setHTML('aInfo-addr',
        `<div style="text-align: center;padding-top: 8px"><big><font color="green">${addr}</font></big></div>`);

    setHTML('aInfo-pubkey',
        `<div style="text-align: center;padding-top: 8px"><big><font color="green">${window.SSS.activePublicKey}</font></big></div>`);

    // エクスプローラーリンク
    setHTML('explorer',
        `<a href="${EXPLORER}/accounts/${addr}" target="_blank" rel="noopener noreferrer"> Symbol Explorer </a>`);

    // インポータンス
    let importance = Number(accountData.importance) / TOTAL_CHAIN_IMPORTANCE;
    if (importance > 0) { importance = Math.round(importance) / 1000000; }
    setHTML('importance',
        `<div style="text-align: center;padding-top: 8px"><big><font color="green">${importance} ％</font></big></div>`);

    // ファウセット（テストネットのみ）
    if (networkType === 152) {
        setHTML('faucet',
            `<a href="https://testnet.symbol.tools/?recipient=${addr}" target="_blank" rel="noopener noreferrer"> 🚰 Faucet🚰 </a>`);
    }
    if (networkType === 104) {
        setHTML('xembook',
            `<a href="https://xembook.github.io/xembook/?address=${addr}" target="_blank" rel="noopener noreferrer"> XEMBook </a>`);
    }

    // NFTDriveエクスプローラー
    setHTML('nftdrive_explorer',
        `<a href="https://nftdrive-explorer.info/?address=${addr}" target="_blank" rel="noopener noreferrer"> NFT-Drive Explorer </a>`);

    // XYM残高表示
    const xymMosaic = accountData.mosaics?.find(m => m.id.toUpperCase() === XYM_ID.toUpperCase());
    if (xymMosaic) {
        setHTML('wallet-xym',
            `<i>XYM Balance : ${(Number(xymMosaic.amount) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 })}　</i>`);
    }

    // ── モザイクセレクトボックス生成（Sendパネル）────────────────────────
    const mosaics = accountData.mosaics ?? [];
    if (mosaics.length === 0) return;

    // モザイクIDの一覧
    const mosaicIds = mosaics.map(m => m.id);

    // モザイク名を取得（NS名がある場合はNS名、なければhex ID）
    let nameMap = {}; // { id: name }
    try {
        const namesRes = await getMosaicsNames(mosaicIds);
        for (const entry of (namesRes ?? [])) {
            // names[0] はオブジェクト {name:"..."}（または文字列）どちらも対応
            const raw = entry.names?.[0];
            const resolved = raw ? (typeof raw === 'object' ? raw.name : raw) : null;
            if (resolved) nameMap[entry.mosaicId.toUpperCase()] = resolved;
        }
    } catch { }

    // select_mosaic 配列を作る（symbol.xymを先頭に）
    const selectMosaics = mosaics.map(m => ({
        id: m.id,
        name: nameMap[m.id.toUpperCase()] ?? m.id,
        amount: Number(m.amount),
    })).sort((a, b) => {
        if (a.name.includes('symbol.xym')) return -1;
        if (b.name.includes('symbol.xym')) return 1;
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });

    // セレクトボックスを生成（リストを引数で受け取る汎用版）
    const buildSelect = (container, cssClass, list) => {
        if (!container) return null;
        container.querySelectorAll('select').forEach(s => s.remove());
        const sel = document.createElement('select');
        sel.classList.add(cssClass);
        if (list.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '--- 対象なし ---';
            sel.appendChild(opt);
        }
        for (const m of list) {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            sel.appendChild(opt);
        }
        container.appendChild(sel);
        return sel;
    };

    const sel1 = buildSelect(document.querySelector('.form-mosaic_ID'), 'select_m1', selectMosaics);
    const sel2 = buildSelect(document.querySelector('.mosaic_ID2'), 'select_m1', selectMosaics);

    // ── 供給量変更・回収ダイアログ用：発行したモザイクを ownerAddress で取得 ──
    // accountData.mosaics は「保有」モザイクなので発行済みでも配布済みのものが漏れる。
    // /mosaics?ownerAddress= は「自分が作成した」モザイクの一覧なので正確。
    // このエンドポイントはレスポンスに flags を含むので getMosaicInfo 不要。
    const activeAddr = window.SSS?.activeAddress;
    let supplyMutableMosaics = [];
    let revokableMosaics     = [];
    if (activeAddr) {
        try {
            // Symbol mosaic flags: bit0=supplyMutable, bit1=transferable, bit2=restrictable, bit3=revokable
            const ownedRes = await fetchJson(new URL(
                `/mosaics?ownerAddress=${activeAddr}&pageSize=100&order=desc`, NODE
            ));
            const ownedList = (ownedRes.data ?? []).map(entry => {
                const m = entry.mosaic ?? entry;
                return { id: m.id ?? '', flags: Number(m.flags ?? 0) };
            }).filter(m => m.id);

            // ネームスペース名を一括取得
            const ownedIds = ownedList.map(m => m.id);
            let ownedNameMap = {};
            try {
                const ownedNames = await getMosaicsNames(ownedIds);
                for (const entry of (ownedNames ?? [])) {
                    const raw = entry.names?.[0];
                    const resolved = raw ? (typeof raw === 'object' ? raw.name : raw) : null;
                    if (resolved) ownedNameMap[entry.mosaicId.toUpperCase()] = resolved;
                }
            } catch { }

            const ownedMosaics = ownedList.map(m => ({
                id: m.id,
                name: ownedNameMap[m.id.toUpperCase()] ?? m.id,
                flags: m.flags,
            }));

            supplyMutableMosaics = ownedMosaics.filter(m => !!(m.flags & 1));
            revokableMosaics     = ownedMosaics.filter(m => !!(m.flags & 8));
        } catch (e) {
            console.warn('[initAccountDisplay] owned mosaics fetch failed:', e);
        }
    }
    console.log('[initAccountDisplay] supplyMutable:', supplyMutableMosaics.map(m => m.name));
    console.log('[initAccountDisplay] revokable:', revokableMosaics.map(m => m.name));

    // 供給量変更ダイアログ用セレクト（supplyMutable のみ）
    const selSup = buildSelect(document.querySelector('.select_mosaic_sup'), 'select_sup', supplyMutableMosaics);
    // 回収ダイアログ用セレクト（revokable のみ）
    const selRev = buildSelect(document.querySelector('.revoke_select'), 'select_r', revokableMosaics);
    // セレクト変更時にリッチリストを自動更新
    if (selRev) selRev.addEventListener('change', () => { if (typeof window.holder_list === 'function') window.holder_list(); });

    // 保有量・期限切れを更新する関数
    const updateHoyu = async (mosaicIdHex) => {
        const m = mosaics.find(x => x.id.toUpperCase() === mosaicIdHex.toUpperCase());
        const hoyu = document.getElementById('hoyu-ryo');
        const hoyu_agg = document.getElementById('hoyu-ryo_agg');
        const kigen = document.getElementById('kigen-gire');
        const kigen_agg = document.getElementById('kigen-gire_agg');

        if (hoyu) hoyu.textContent = '';
        if (hoyu_agg) hoyu_agg.textContent = '';
        if (kigen) kigen.textContent = '';
        if (kigen_agg) kigen_agg.textContent = '';

        if (!m) return;
        try {
            const moInfo = await getMosaicInfo(mosaicIdHex);
            const div = moInfo.divisibility;
            const dispAmt = (Number(m.amount) / 10 ** div).toLocaleString(undefined, { maximumFractionDigits: 6 });
            if (hoyu) hoyu.textContent = `保有量 : ${dispAmt}　`;
            if (hoyu_agg) hoyu_agg.textContent = `保有量 : ${dispAmt}　　　　　　`;

            // 期限切れチェック (duration=0 は無期限)
            if (moInfo.duration !== '0' && Number(moInfo.duration) > 0) {
                const chain = await getChainInfo();
                const expire = Number(moInfo.startHeight) + Number(moInfo.duration);
                if (Number(chain.height) > expire) {
                    if (kigen) kigen.textContent = '有効期限が切れています　';
                    if (kigen_agg) kigen_agg.textContent = '有効期限が切れています　　　　　　';
                }
            }
        } catch { }
    };

    // 初期表示（先頭モザイク）
    if (selectMosaics.length > 0) await updateHoyu(selectMosaics[0].id);

    // change イベント
    const handleChange = async (e) => {
        const val = e.target.value;
        // 全てのselect_m1を同期
        document.querySelectorAll('.select_m1').forEach(s => { s.value = val; });
        await updateHoyu(val);
    };
    if (sel1) sel1.addEventListener('change', handleChange);
    if (sel2) sel2.addEventListener('change', handleChange);
}

// ─────────────────────────────────────────────────────────────────────────────
// ハーベスト表示
// ─────────────────────────────────────────────────────────────────────────────

let harvestPageNumber = 0;

async function getHarvests(pageSize, address) {
    harvestPageNumber++;
    const res = await fetchJson(new URL(
        `/statements/transaction?targetAddress=${address}&pageNumber=${harvestPageNumber}&pageSize=${pageSize}&order=desc`,
        NODE
    ));

    let lastHeight = 0;
    let cnt = 0;
    for (const stmt of res.data) {
        const filtered = (stmt.receipts || []).filter(r => r.targetAddress === address);
        if (stmt.height !== lastHeight) cnt = 0;
        for (const receipt of filtered) {
            showReceiptInfo('harvest', stmt.height, receipt, cnt);
            lastHeight = stmt.height;
            cnt++;
        }
    }

    if (res.pagination?.pageNumber >= res.pagination?.totalEntries / pageSize) {
        document.getElementById('harvests_footer')?.style.setProperty('display', 'none');
    }
}

function showReceiptInfo(tag, height, receipt, cnt) {
    const cntStr = cnt === 0 ? '' : cnt;
    const table = document.getElementById(tag);
    if (!table) return;
    const row = document.createElement('tr');
    row.innerHTML = `<td id="${tag}_date${height}${receipt.type}${cntStr}"></td>`
        + `<td style="font-size:84%;">${receipt.type}</td>`
        + `<td class="text-right">${dispAmount(receipt.amount, 6)}</td>`;
    table.appendChild(row);

    // 日時を非同期で取得して埋める
    getBlockByHeight(height).then(block => {
        const el = document.getElementById(`${tag}_date${height}${receipt.type}${cntStr}`);
        if (el) el.textContent = dispTimeStamp(Number(block.timestamp), epochAdjustment);
    });
}


// ─────────────────────────────────────────────────────────────────────────────
// Tx History 表示（v3: fetch APIベース）
// ─────────────────────────────────────────────────────────────────────────────

// ── モザイク情報インメモリキャッシュ（同一セッション内で重複API呼び出しを防ぐ）──
// 上部の getMosaicInfoCached を使用（重複宣言なし）

// ── NFT画像をmosaic-center.netから取得してcontainerに追加するヘルパー ──
async function _fetchNftImage(mosaicIdHex, container) {
    // XYMはスキップ
    if (!mosaicIdHex || mosaicIdHex.toUpperCase() === '6BED913FA20223F8' || mosaicIdHex.toUpperCase() === '72C0212E67A08BCE') return;
    if (XYM_ID && mosaicIdHex.toUpperCase() === XYM_ID.toUpperCase()) return;

    // 事前存在確認: 404ならNFT試行を全てスキップ（nftdrive等の無駄な呼び出しを防ぐ）
    try { await getMosaicInfoCached(mosaicIdHex); } catch { return; }

    let found = false;

    // ① Mosaic Center でサムネ確認
    try {
        const r = await fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${mosaicIdHex}`);
        if (r.ok) {
            const data = await r.json();
            if (data && data[0] && data[0][7]) {
                const wrap = document.createElement('div');
                wrap.style.cssText = 'text-align:center;margin-top:10px;';
                wrap.innerHTML = `<a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a><br><br><a href="https://symbol.fyi/mosaics/${mosaicIdHex}" target="_blank" style="display:inline-block;width:200px;"><img class="mosaic_img" src="${data[0][7]}" width="200"></a>`;
                container.appendChild(wrap);
                found = true;
            }
        }
    } catch { }

    if (found) return;

    // ② nft.js の各デコーダを順に試す
    const nftArea = document.createElement('div');
    nftArea.style.cssText = 'text-align:center;margin-top:10px;';
    container.appendChild(nftArea);

    try { await nftdrive(mosaicIdHex, nftArea); if (nftArea.children.length) return; } catch { }
    try { await comsaNFT(mosaicIdHex, nftArea); if (nftArea.children.length) return; } catch { }
    try { await comsaNCFT(mosaicIdHex, nftArea); if (nftArea.children.length) return; } catch { }
    try { await ukraineNFT(mosaicIdHex, nftArea); if (nftArea.children.length) return; } catch { }

    // どれもヒットしなければ nftArea を削除
    if (!nftArea.children.length) nftArea.remove();
}

// ── メッセージHexをデコードして {type, text} を返す ──
function _decodeMsgPayload(msgPayload) {
    let msgType = 0, msgHex = '';
    if (typeof msgPayload === 'object' && msgPayload) {
        msgType = msgPayload.type ?? 0;
        msgHex  = msgPayload.payload ?? '';
    } else if (typeof msgPayload === 'string' && msgPayload.length >= 2) {
        msgType = parseInt(msgPayload.slice(0, 2), 16);
        msgHex  = msgPayload.slice(2);
    }
    let text = '';
    if (msgHex) {
        // 0xFE = 委任ハーベスト(PersistentDelegationRequest)バイナリ → hex表示
        if (msgType === 0xFE) {
            text = `[HEX] ${msgHex.toUpperCase()}`;
        } else {
            try {
                const bytes = new Uint8Array(msgHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
                const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
                // 制御文字（タブ・改行以外）が含まれる場合はhex表示
                const hasBinary = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(decoded);
                text = hasBinary ? `[HEX] ${msgHex.toUpperCase()}` : decoded;
            } catch {
                // UTF-8デコード失敗 → hex表示
                text = `[HEX] ${msgHex.toUpperCase()}`;
            }
        }
    }
    return { msgType, msgHex, text };
}

async function showTransactions(activeAddress, pageNumber) {
    const dom_txInfo = document.getElementById('wallet-transactions');
    if (!dom_txInfo) return;
    dom_txInfo.innerHTML = '';

    const params = new URLSearchParams({
        address: activeAddress,
        pageSize: 15,
        pageNumber,
        order: 'desc',
    });

    const res = await fetchJson(new URL(`/transactions/confirmed?${params}`, NODE));
    if (!res || !res.data) return;

    for (const item of res.data) {
        const tx   = item.transaction;
        const meta = item.meta;
        const txType = tx.type;
        const hash   = meta?.hash ?? tx.hash ?? '';

        // 日時
        const tsMs  = Number(meta?.timestamp ?? 0);
        const txDate = new Date((epochAdjustment * 1000) + tsMs);
        const pad = n => String(n).padStart(2, '0');
        const ymdhms = `${txDate.getFullYear()}-${pad(txDate.getMonth()+1)}-${pad(txDate.getDate())} ${pad(txDate.getHours())}:${pad(txDate.getMinutes())}:${pad(txDate.getSeconds())}`;

        // 送信者アドレス
        const _signerRaw = tx.signerAddress ?? tx.signerPublicKey ?? '';
        const signerAddr = (_signerRaw.length === 64) ? publicKeyToAddress(_signerRaw) : hexToAddress(_signerRaw);
        const isSender   = signerAddr === activeAddress;

        // ── カード ────────────────────────────────────────────
        const card = document.createElement('div');
        card.className = 'txh-card';

        // 左ボーダー色
        if      (txType === 16724) card.style.borderLeftColor = isSender ? '#e05080' : '#20c060';
        else if (txType === 16705 || txType === 16961) card.style.borderLeftColor = '#b8860b';

        // ── ヘッダー ─────────────────────────────────────────
        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:8px;';

        // Tx種別バッジ（Transfer は 送信 / 受取 に変更）
        let badgeLabel;
        if (txType === 16724) {
            badgeLabel = isSender ? '📤 送信' : '📥 受取';
        } else {
            badgeLabel = `< ${getTransactionType(txType)} >`;
        }
        const badge = document.createElement('span');
        badge.style.cssText = `
            display:inline-block;padding:3px 10px;border-radius:20px;
            font-size:11px;font-weight:bold;letter-spacing:.5px;
            background:linear-gradient(135deg,rgba(110,60,220,0.15),rgba(5,183,254,0.20));
            border:1px solid rgba(110,60,220,0.25);color:#5533aa;
        `;
        badge.textContent = badgeLabel;

        const dateEl = document.createElement('span');
        dateEl.style.cssText = 'font-size:13px;font-weight:700;color:#7E00FF;letter-spacing:.3px;';
        dateEl.textContent = ymdhms;

        const infoBtn = document.createElement('button');
        infoBtn.type = 'button';
        infoBtn.className = 'button-txinfo';
        infoBtn.style.cssText = 'font-size:11px;padding:3px 10px;white-space:nowrap;';
        infoBtn.id = `${EXPLORER}/transactions/${hash}`;
        infoBtn.onclick = function() { transaction_info(this.id); };
        infoBtn.innerHTML = '<i>⛓ Transaction Info ⛓</i>';

        header.appendChild(badge);
        header.appendChild(dateEl);
        header.appendChild(infoBtn);
        card.appendChild(header);

        // 区切り線
        const sep = document.createElement('div');
        sep.style.cssText = 'border-top:1px solid rgba(144,96,224,0.15);margin:0 -2px 8px;';
        card.appendChild(sep);

        // From
        const fromRow = document.createElement('div');
        fromRow.className = 'copy_container';
        fromRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px;color:#2f4f4f;line-height:1.6;';
        fromRow.innerHTML = `<span style="color:#aaa;min-width:38px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;">From</span><span style="word-break:break-all;">${signerAddr}</span><input type="image" src="src/copy.png" class="copy_bt" height="16px" id="${signerAddr}" onclick="Onclick_Copy(this.id);" style="flex-shrink:0;opacity:0.6;"/>`;
        card.appendChild(fromRow);

        // ══════════════════════════════════════════════════════
        // TRANSFER (16724)
        // ══════════════════════════════════════════════════════
        if (txType === 16724) {
            const recipientAddress = hexToAddress(tx.recipientAddress ?? '');
            const toRow = document.createElement('div');
            toRow.className = 'copy_container';
            toRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;font-size:13px;color:#2f4f4f;line-height:1.6;';
            toRow.innerHTML = `<span style="color:#aaa;min-width:38px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;">To</span><span style="word-break:break-all;">${recipientAddress}</span><input type="image" src="src/copy.png" class="copy_bt" height="16px" id="${recipientAddress}" onclick="Onclick_Copy(this.id);" style="flex-shrink:0;opacity:0.6;"/>`;
            card.appendChild(toRow);

            const mosaics = tx.mosaics ?? [];
            if (mosaics.length === 0) {
                const d = document.createElement('div');
                d.style.cssText = `font-size:13px;font-weight:bold;color:${isSender ? '#e05080' : '#20c060'};margin-bottom:4px;`;
                d.textContent = 'No mosaic';
                card.appendChild(d);
            }
            for (const m of mosaics) {
                const mosaicIdHex = m.id;
                const mosaicRow = document.createElement('div');
                mosaicRow.style.cssText = 'margin-bottom:6px;margin-top:4px;';
                const amountRow = document.createElement('div');
                amountRow.style.cssText = 'margin-bottom:8px;';
                card.appendChild(mosaicRow);
                card.appendChild(amountRow);

                (async () => {
                    try {
                        const moInfo = await getMosaicInfo(mosaicIdHex);
                        const dispAmt = (Number(m.amount) / 10 ** moInfo.divisibility).toLocaleString(undefined, { maximumFractionDigits: 6 });
                        const names = (await getMosaicsNames([mosaicIdHex]).catch(() => null))?.[0]?.names ?? [];
                        const nameStr = names.length > 0 ? (typeof names[0] === 'object' ? names[0].name : names[0]) : mosaicIdHex;
                        const color = isSender ? '#e05080' : '#20c060';
                        const arrow = isSender ? '💸 ➡️' : '💰 ➡️';
                        mosaicRow.innerHTML = `<span style="color:${color};font-size:13px;font-weight:bold;">Mosaic : <big><strong>${nameStr}</strong></big></span>`;
                        amountRow.innerHTML = `<span style="color:${color};font-size:15px;">${arrow} <i><big><strong>${dispAmt}</strong></big></i></span>`;
                        await _fetchNftImage(mosaicIdHex, card);
                    } catch { }
                })();

                // レート制限対策: 50ms待機
                await new Promise(r => setTimeout(r, 50));
            }

            // メッセージ
            const { msgType, msgHex, text } = _decodeMsgPayload(tx.message ?? '');
            if (msgType === 1) {
                const senderPubKey = tx.signerPublicKey ?? tx.signerAddress ?? '';
                card.insertAdjacentHTML('beforeend', `<div style="color:#ff00ff;font-weight:bold;margin-top:10px;padding:6px 0;">🔒 暗号化メッセージ &lt;Encrypted Message&gt;</div>`);
                const decBtn = document.createElement('button');
                decBtn.type = 'button'; decBtn.textContent = '🔓 復号する';
                decBtn.style.cssText = 'margin:4px 0 8px;padding:6px 14px;cursor:pointer;border-radius:8px;';
                decBtn.onclick = () => Onclick_Decryption(senderPubKey, msgHex);
                card.appendChild(decBtn);
            } else if (text) {
                card.insertAdjacentHTML('beforeend', `<div style="color:#4169e1;font-family:'Hiragino Maru Gothic ProN W4';margin-top:10px;padding:6px 0;font-size:13px;line-height:1.6;">💬 ${text}</div>`);
            }
        }

        // ══════════════════════════════════════════════════════
        // AGGREGATE (16705 = Complete / 16961 = Bonded)
        // ══════════════════════════════════════════════════════
        if (txType === 16705 || txType === 16961) {
            // v3 REST API: ハッシュで個別取得して正確な内部Tx一覧を得る
            let innerTxs = tx.transactions ?? tx.innerTransactions ?? [];

            // 常にハッシュで個別Txを取得し直す（embedded queryは件数が不正確なため）
            if (hash) {
                try {
                    const fullTx = await fetchJson(new URL(`/transactions/confirmed/${hash}`, NODE));
                    const txns = fullTx?.transaction?.transactions ?? fullTx?.transactions ?? [];
                    if (txns.length > 0) {
                        innerTxs = txns;
                    }
                } catch(e) { console.warn('[Aggregate] full-tx fetch error:', e); }
            }

            const aggLabel = txType === 16961 ? 'AGGREGATE_BONDED' : 'AGGREGATE_COMPLETE';

            // ── カード外に出すコンテンツを先に収集 ──────────────
            const nftMosaicIds = new Set();
            const messages = new Set();

            for (const inner of innerTxs) {
                const itx = inner.transaction ?? inner;
                for (const m of (itx.mosaics ?? [])) {
                    if (m.id && m.id !== '6BED913FA20223F8' && m.id !== '72C0212E67A08BCE') {
                        nftMosaicIds.add(m.id);
                    }
                }
                const { msgType, text } = _decodeMsgPayload(itx.message ?? '');
                if (msgType !== 1 && text) messages.add(text);
            }

            // ── アコーディオンボタン ─────────────────────────
            const accBtn = document.createElement('button');
            accBtn.type = 'button';
            accBtn.className = 'txh-accordion-btn';
            const displayTxs = innerTxs.slice(0, 100); // 表示は最大100件
            accBtn.innerHTML = `<span class="txh-acc-arrow">▶</span>&nbsp;${aggLabel}&nbsp;&nbsp;<span style="opacity:0.7;font-size:11px;">(${innerTxs.length} inner txs)</span>`;

            // ── 内部Txリスト（初期は非表示） ────────────────────
            const innerList = document.createElement('div');
            innerList.className = 'txh-inner-list';
            innerList.style.display = 'none'; // 必ず閉じた状態で開始

            // アコーディオントグル
            accBtn.addEventListener('click', () => {
                const isOpen = accBtn.classList.toggle('open');
                innerList.style.display = isOpen ? 'block' : 'none';
            });

            // アドレスを短縮表示するヘルパー
            const _shortAddr = addr => addr.length > 16
                ? `${addr.slice(0, 8)}…${addr.slice(-6)}`
                : addr;

            // 内部Txを描画（データに存在するTxを全て表示、最大100件）
            for (const inner of displayTxs) {
                const itx     = inner.transaction ?? inner;
                const itxType = itx.type;

                const item = document.createElement('div');
                item.className = 'txh-inner-item';

                const itxSigRaw = itx.signerAddress ?? itx.signerPublicKey ?? '';
                const itxSigner = (itxSigRaw.length === 64) ? publicKeyToAddress(itxSigRaw) : hexToAddress(itxSigRaw);
                const itxIsSend = itxSigner === activeAddress;
                const itxTo     = itxType === 16724 ? hexToAddress(itx.recipientAddress ?? '') : '';
                const itxIsRecv = itxTo === activeAddress;

                // ── Tx種別バッジ（3パターン） ──────────────────
                let typeBadge;
                if (itxType === 16724) {
                    if (itxIsSend) {
                        // 自分 → 他人
                        typeBadge = `<span style="background:#e05080;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:bold;">📤 送信</span>`;
                    } else if (itxIsRecv) {
                        // 他人 → 自分
                        typeBadge = `<span style="background:#20c060;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:bold;">📥 受取</span>`;
                    } else {
                        // 他人 → 他人（送信元アドレスをバッジ右に表示）
                        typeBadge = `<span style="background:#888;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:bold;">↔️ 他者送信</span> <span style="font-size:11px;color:#777;font-family:monospace;">${_shortAddr(itxSigner)}</span>`;
                    }
                } else {
                    // その他Tx: 種別名のみ
                    typeBadge = `<span style="background:rgba(122,85,10,0.12);color:#7a550a;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:bold;">${getTransactionType(itxType)}</span>`;
                }

                let html = `<div style="margin-bottom:4px;">${typeBadge}</div>`;

                // TRANSFER の場合のみ To + モザイクを表示（Fromは冗長なので省略）
                if (itxType === 16724) {
                    html += `<div style="font-size:11px;color:#888;margin-bottom:4px;">→ <span style="color:#444;font-family:monospace;font-size:11px;">${_shortAddr(itxTo)}</span></div>`;
                    for (const m of (itx.mosaics ?? [])) {
                        const color = itxIsSend ? '#e05080' : (itxIsRecv ? '#20c060' : '#888');
                        html += `<div data-mosaic="${m.id}" data-amount="${m.amount}" style="display:inline-block;background:rgba(0,0,0,0.06);border-radius:8px;padding:3px 10px;font-size:12px;color:${color};font-weight:bold;margin-top:2px;">⏳ 取得中…</div>`;
                    }

                    // 暗号化メッセージ
                    const { msgType: itxMsgType } = _decodeMsgPayload(itx.message ?? '');
                    if (itxMsgType === 1) {
                        html += `<div style="font-size:11px;color:#ff00ff;margin-top:4px;">🔒 暗号化メッセージ</div>`;
                    }
                }

                item.innerHTML = html;
                innerList.appendChild(item);

                // TRANSFER のみモザイク名を非同期で差し替え（キャッシュ利用で重複API呼び出し防止）
                if (itxType === 16724) {
                    for (const m of (itx.mosaics ?? [])) {
                        (async (mId, amt, isSend, el) => {
                            const chip = el.querySelector(`[data-mosaic="${mId}"]`);
                            try {
                                const { moInfo, names } = await getMosaicInfoCached(mId);
                                const dispAmt = (Number(amt) / 10 ** moInfo.divisibility).toLocaleString(undefined, { maximumFractionDigits: 6 });
                                const nm = names.length > 0 ? (typeof names[0] === 'object' ? names[0].name : names[0]) : mId;
                                const color = isSend ? '#e05080' : '#20c060';
                                if (chip) chip.innerHTML = `<span style="color:${color};"><strong>${nm}</strong>&nbsp;<span style="font-weight:normal;">${dispAmt}</span></span>`;
                            } catch {
                                // 404等: モザイクIDをそのまま表示 + 数量
                                const rawAmt = chip?.dataset?.amount ?? amt;
                                if (chip) chip.innerHTML = `<span style="color:#999;font-size:11px;">${mId} (${rawAmt})</span>`;
                            }
                        })(m.id, m.amount, itxIsSend, item);
                    }
                }
            }


            card.appendChild(accBtn);
            card.appendChild(innerList);

            // アコーディオン外：重複排除NFT画像
            if (nftMosaicIds.size > 0) {
                const nftArea = document.createElement('div');
                nftArea.className = 'txh-nft-center';
                card.appendChild(nftArea);
                for (const mid of nftMosaicIds) {
                    await _fetchNftImage(mid, nftArea);
                    // NFT取得間もレート制限配慮
                    await new Promise(r => setTimeout(r, 50));
                }
            }

            // アコーディオン外：重複排除メッセージ
            for (const msg of messages) {
                card.insertAdjacentHTML('beforeend', `<div style="color:#4169e1;font-family:'Hiragino Maru Gothic ProN W4';margin-top:10px;padding:6px 0;font-size:13px;line-height:1.6;">💬 ${msg}</div>`);
            }
        }


        // ══════════════════════════════════════════════════════
        // NAMESPACE_REGISTRATION (16717)
        // ══════════════════════════════════════════════════════
        if (txType === 16717) {
            const label = tx.registrationType === 0 ? 'root Namespace 登録' : 'sub Namespace 登録';
            card.insertAdjacentHTML('beforeend', `<div style="font-size:13px;color:#008b8b;margin-top:4px;">${label} : <big><strong>${tx.name}</strong></big></div>`);
        }

        // ══════════════════════════════════════════════════════
        // MOSAIC_SUPPLY_REVOCATION (17229)
        // ══════════════════════════════════════════════════════
        if (txType === 17229) {
            const mid = tx.mosaicId;
            const dm = document.createElement('div'), da = document.createElement('div');
            card.appendChild(document.createElement('div')).innerHTML =
                `<div class="copy_container"><font color="#2f4f4f">♻️回収先♻️ : ${tx.sourceAddress ?? ''}</font></div>`;
            card.appendChild(dm); card.appendChild(da);
            (async () => {
                try {
                    const moInfo = await getMosaicInfo(mid);
                    const dispAmt = (Number(tx.amount) / 10 ** moInfo.divisibility).toLocaleString(undefined, { maximumFractionDigits: 6 });
                    dm.innerHTML = `<font color="#3399FF">Mosaic 回収 : <big><strong>${mid}</strong></big></font>`;
                    da.innerHTML = `<font color="#3399FF" size="+1">💰➡️ <i><big><strong>${dispAmt}</strong></big></i></font>`;
                } catch { }
            })();
        }

        // ══════════════════════════════════════════════════════
        // MOSAIC_SUPPLY_CHANGE (16973)
        // ══════════════════════════════════════════════════════
        if (txType === 16973) {
            const label = tx.action === 0 ? '減少 ⬇️' : '増加 ⬆️';
            card.insertAdjacentHTML('beforeend', `<div style="color:#3399FF;">Mosaic : ${tx.mosaicId}<br><big><strong>${label} ${Number(tx.delta)}</strong></big></div>`);
        }

        // ══════════════════════════════════════════════════════
        // HASH_LOCK (16712)
        // ══════════════════════════════════════════════════════
        if (txType === 16712) {
            card.insertAdjacentHTML('beforeend', `<div style="font-size:13px;color:#888;margin-top:4px;">🔒 Hash Lock</div>`);
        }

        dom_txInfo.appendChild(card);
    }
}





// ─────────────────────────────────────────────────────────────────────────────
// メイン初期化
// ─────────────────────────────────────────────────────────────────────────────

async function main() {

    // バージョン表示
    setHTML('version', 'v2.0.0　|　Powered by SYMBOL (SDK v3)');

    // ハンバーガーメニュー
    const nav = document.getElementById('nav-wrapper');
    document.getElementById('js-hamburger')?.addEventListener('click', () => nav.classList.toggle('open'));
    document.getElementById('js-black-bg')?.addEventListener('click', () => nav.classList.remove('open'));

    // SSS チェック（未リンクでも return しない）
    if (typeof window.isAllowedSSS === 'function') {
        console.log('SSS_Link=', window.isAllowedSSS());
        window.requestSSS?.(); // リンクダイアログを要求
    }

    // SDK + ノード初期化（SSS link 状態に関わらず実行）
    await loadSDK();
    const node = await getAvailableNode();
    await initNetwork(node);

    // SDK 初期化完了フラグをセット
    // （SSSWindow がここより先に発火していた場合は initAccountAndUI を今すぐ呼ぶ）
    _sdkReady = true;

    // index.html内の通常<script>からNodeURLを参照できるように公開
    window.ventus_NODE = NODE;

    console.log('ノード:', NODE);

    // ネットワークタイプ表示
    const dom_netType = document.getElementById('netType');
    const dom_account_name = document.getElementById('account_name');
    if (networkType === 104) {
        dom_netType.innerHTML = `<font color="#ff00ff">< MAIN_NET ></font>`;
        dom_account_name.innerHTML = `<font color="#ff00ff">${window.SSS?.activeName}</font>`;
    } else if (networkType === 152) {
        dom_netType.innerHTML = `<font color="ff8c00">< TEST_NET ></font>`;
        dom_account_name.innerHTML = `<font color="#ff8c00">${window.SSS?.activeName}</font>`;
    }

    // SSSWindow が SDK より先に発火していた場合 → 今すぐアカウント初期化
    if (_sssWindowCaught) {
        console.log('[main] SSSWindow 既に発火済み → initAccountAndUI()');
        await initAccountAndUI();
        return;
    }

    // 現時点で既にリンク済みならすぐにアカウント情報を取得
    const activeAddress = window.SSS?.activeAddress;
    if (!activeAddress) {
        // 未リンク: UI に表示して待機（SSSWindow で initAccountAndUI が呼ばれる）
        if (dom_account_name) dom_account_name.innerHTML = `<font color="gray">SSS未接続 - SSSをリンクしてください</font>`;
        return;
    }

    // アカウント情報取得
    const accountData = await getAccountInfo(activeAddress);
    await initAccountDisplay(accountData);

    // チェーン情報取得
    const chain = await getChainInfo();
    const latestBlock = await getBlockByHeight(chain.height);
    const finalizedBlock = await getBlockByHeight(chain.latestFinalizedBlock.height);

    setHTML('chain_height',
        `[ <a target="_blank" href="${EXPLORER}/blocks/${chain.height}">${chain.height}</a> ]　日時: ${dispTimeStamp(Number(latestBlock.timestamp), epochAdjustment)}`);
    setHTML('finalized_chain_height',
        `[ <a target="_blank" href="${EXPLORER}/blocks/${chain.latestFinalizedBlock.height}">${chain.latestFinalizedBlock.height}</a> ]　日時: ${dispTimeStamp(Number(finalizedBlock.timestamp), epochAdjustment)}`);

    // Tx History 表示
    await showTransactions(activeAddress, 1);
    document.getElementById('page_num1')?.addEventListener('change', (e) => {
        showTransactions(activeAddress, Number(e.target.value));
    });

    // ハーベスト表示
    await getHarvests(15, activeAddress);
    document.getElementById('harvests_more')?.addEventListener('click', () => getHarvests(15, activeAddress));

    // WebSocket 接続
    connectWebSocket(
        activeAddress,
        (tx) => {
            const audio2 = new Audio('./src/ding2.ogg');
            audio2.currentTime = 0;
            audio2.play();
            const popup = document.getElementById('popup');
            if (popup) popup.classList.remove('is-show');
            const audioVentus = new Audio('./src/ventus.mp3');
            audioVentus.play();
            // 承認検知 → 5秒後にリロード（音が鳴り終わってから）
            setTimeout(() => location.reload(), 5000);
        },
        (tx) => {
            const audio1 = new Audio('./src/ding.ogg');
            audio1.currentTime = 0;
            audio1.play();
            const popup = document.getElementById('popup');
            if (popup) popup.classList.add('is-show');
        },
        (tx) => handlePartialTx(tx, activeAddress, XYM_ID)
    );

    // グローバル関数として公開（HTML の onclick から呼び出せるように）
    window.Onclick_Copy = Onclick_Copy;
    window.transaction_info = transaction_info;
    window.getTransactionType = getTransactionType;
    window.dispTimeStamp = dispTimeStamp;
    window.dispAmount = dispAmount;
    window.showReceiptInfo = showReceiptInfo;

    // Tx送信関数（HTMLのonclickから呼び出される）
    window.handleSSS = () => handleSSS(activeAddress);
    window.handleSSS_agg = () => handleSSS_agg(activeAddress);
    window.handleSSS_msig = () => handleSSS_msig(activeAddress);

    // 追加機能（v3移植）
    window.Onclick_mosaic = () => Onclick_mosaic(activeAddress);
    window.mosaic_supply = () => mosaic_supply();
    window.revoke_mosaic = () => revoke_mosaic(activeAddress);
    window.Onclick_Namespace = () => Onclick_Namespace();
    window.Onclick_subNamespace = () => Onclick_subNamespace();
    window.alias_Link = () => alias_Link();
    window.Metadata = () => Metadata(activeAddress);
    window.Msig_account = () => Msig_account(activeAddress);
    window.handleSSS_multisig = () => handleSSS_multisig(activeAddress);
    window.handleSSS_dona = () => handleSSS_dona(activeAddress);

    // 追加グローバル関数（v3移植・復元分）
    window.loadMsigPanelInfo  = () => loadMsigPanelInfo();
    window.loadMsigTree       = () => loadMsigTree();
    window.loadMsigSendModal  = () => loadMsigSendModal();
    window.select_Page        = () => select_Page();
    window.select_Page_mosa1  = () => select_Page_mosa1();
    window.select_Page_namespace = () => select_Page_namespace();
    window.select_Page_meta   = () => select_Page_meta();
    window.holder_list        = () => holder_list();
    window.ex_date1           = () => ex_date1();
    window.ex_date2           = () => ex_date2();
    window.feeCalc            = () => feeCalc();
    window.MetaKey_select     = () => MetaKey_select();

    // マルチシグ関連初期化
    // initMsigAddButton は未実装（将来実装予定）
    await updateMsigBadge(activeAddress);
    await loadMsigPanelInfo();

    console.log('[main] 初期化完了');
}

// SSSWindow（SSS リンク完了）後にアカウント関連の初期化を行う
// main() が SSS 未接続のまま起動した場合でも、後から呼ばれる
async function initAccountAndUI() {
    const addr = window.SSS?.activeAddress;
    if (!addr) { console.warn('[initAccountAndUI] activeAddress が取得できません'); return; }

    // ネットワーク名表示を更新
    const dom_account_name = document.getElementById('account_name');
    if (networkType === 104 && dom_account_name) {
        dom_account_name.innerHTML = `<font color="#ff00ff">${window.SSS?.activeName}</font>`;
    } else if (dom_account_name) {
        dom_account_name.innerHTML = `<font color="#ff8c00">${window.SSS?.activeName}</font>`;
    }

    try {
        const accountData = await getAccountInfo(addr);
        await initAccountDisplay(accountData);
    } catch (e) { console.error('[initAccountAndUI]', e); }

    // グローバル関数として公開
    window.handleSSS = () => handleSSS(addr);
    window.handleSSS_agg = () => handleSSS_agg(addr);
    window.handleSSS_msig = () => handleSSS_msig(addr);
    window.Onclick_mosaic = () => Onclick_mosaic(addr);
    window.mosaic_supply = () => mosaic_supply();
    window.revoke_mosaic = () => revoke_mosaic(addr);
    window.Onclick_Namespace = () => Onclick_Namespace();
    window.Onclick_subNamespace = () => Onclick_subNamespace();
    window.alias_Link = () => alias_Link();
    window.Metadata = () => Metadata(addr);
    window.Msig_account = () => Msig_account(addr);
    window.handleSSS_multisig = () => handleSSS_multisig(addr);
    window.handleSSS_dona = () => handleSSS_dona(addr);
    window.loadMsigPanelInfo = () => loadMsigPanelInfo();
    window.loadMsigTree = () => loadMsigTree();
    window.loadMsigSendModal = () => loadMsigSendModal();
    window.select_Page = () => select_Page();
    window.select_Page_mosa1 = () => select_Page_mosa1();
    window.select_Page_namespace = () => select_Page_namespace();
    window.select_Page_meta = () => select_Page_meta();
    window.holder_list = () => holder_list();
    window.ex_date1 = () => ex_date1();
    window.ex_date2 = () => ex_date2();
    window.feeCalc = () => feeCalc();
    window.MetaKey_select = () => MetaKey_select();

    console.log('[initAccountAndUI] step: window assignments done');
    // initMsigAddButton は未実装（将来実装予定）
    console.log('[initAccountAndUI] step: before updateMsigBadge');
    try { await updateMsigBadge(addr); } catch(e) { console.warn('[initAccountAndUI] updateMsigBadge error:', e); }
    console.log('[initAccountAndUI] アカウント初期化完了:', addr);
}

// ─────────────────────────────────────────────────────────────────────────────
// 通常転送トランザクション送信
// ─────────────────────────────────────────────────────────────────────────────

async function handleSSS(activeAddress) {
    // フォーム値を取得
    const toAddress = (document.getElementById('form-addr')?.value ?? '').trim();
    const mosaicIdHex = document.querySelector('.select_m1')?.value ?? '';
    const amountRaw = document.getElementById('form-amount')?.value ?? '';
    const message = document.getElementById('form-message')?.value ?? '';
    const isEncrypted = document.getElementById('form-enc')?.checked ?? false;

    // 入力バリデーション
    if (!toAddress) {
        Swal.fire({ title: '宛先アドレスを入力してください。', icon: 'warning' });
        return;
    }
    if (!mosaicIdHex) {
        Swal.fire({ title: 'モザイクを選択してください。', icon: 'warning' });
        return;
    }
    if (!amountRaw || Number(amountRaw) <= 0) {
        Swal.fire({ title: '数量を入力してください。', icon: 'warning' });
        return;
    }
    if (byteLengthUTF8(message) > 1023) {
        Swal.fire({ title: `メッセージが${byteLengthUTF8(message)}バイト。1023バイト以下にしてください。` });
        return;
    }

    try {
        let msgData = message; // string(平文) または Uint8Array(暗号化済み)
        let amount;

        if (isEncrypted && message) {
            // ─ 暗号化送信 ─────────────────────────────────────────────────────
            // 公開鍵を取得したらすぐ1つ目のダイアログを開く
            // モザイク情報はダイアログと並行して取得
            let recipientPubKey = null;
            try {
                const accInfo = await getAccountInfo(toAddress);
                recipientPubKey = accInfo.publicKey;
            } catch {
                Swal.fire({ title: '暗号化失敗', text: '宛先の公開鍵を取得できません。', icon: 'warning' });
                return;
            }

            // 1つ目のSSSダイアログ（暗号化）と getMosaicInfo を同時に実行
            window.SSS.setMessage(message, recipientPubKey);
            const [encMsg, mo] = await Promise.all([
                window.SSS.requestSignEncription(),   // ← すぐにダイアログが開く
                getMosaicInfo(mosaicIdHex),            // ← その間にモザイク情報取得
            ]);

            const div = mo.divisibility;
            amount = BigInt(Math.round(Number(amountRaw) * Math.pow(10, div)));

            // encMsg の戻り値を正規化して 0x01 + 暗号バイト の Uint8Array にする
            console.log('[handleSSS] encMsg type:', typeof encMsg, encMsg);
            if (encMsg instanceof Uint8Array) {
                msgData = (encMsg[0] === 0x01) ? encMsg : new Uint8Array([0x01, ...encMsg]);
            } else if (typeof encMsg === 'string' && encMsg.length > 0) {
                const hexBytes = encMsg.replace(/^0x/i, '').match(/.{1,2}/g).map(b => parseInt(b, 16));
                msgData = (hexBytes[0] === 0x01) ? new Uint8Array(hexBytes) : new Uint8Array([0x01, ...hexBytes]);
            } else if (encMsg && typeof encMsg === 'object' && encMsg.payload) {
                const hexBytes = encMsg.payload.replace(/^0x/i, '').match(/.{1,2}/g).map(b => parseInt(b, 16));
                msgData = (hexBytes[0] === 0x01) ? new Uint8Array(hexBytes) : new Uint8Array([0x01, ...hexBytes]);
            } else {
                console.warn('[handleSSS] 暗号化メッセージの形式が不明。平文で送信します。', encMsg);
            }

            // SSS 1つ目のダイアログが閉じてから 2つ目を開くまでの待機（race condition 防止）
            // v2 の script.js も setTimeout 1000ms を使用していた
            await new Promise(r => setTimeout(r, 1000));

        } else {
            // ─ 平文送信 ───────────────────────────────────────────────────────
            const mo = await getMosaicInfo(mosaicIdHex);
            const div = mo.divisibility;
            amount = BigInt(Math.round(Number(amountRaw) * Math.pow(10, div)));
        }

        const tx = buildTransferTx(toAddress, mosaicIdHex, amount, msgData, window.SSS.activePublicKey);
        console.log('[handleSSS] tx built. fee:', tx.fee?.value);

        const signedPayload = await signAndAnnounce(tx);
        console.log('[handleSSS] 送信成功:', signedPayload);
        // 送信成功通知はユニコーンポップアップに任せる（Swal は二重になるため省略）
    } catch (e) {
        console.error('[handleSSS] エラー詳細:', e?.name, e?.message, e);
        Swal.fire({ title: '送信失敗', text: e?.message ?? String(e), icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate Complete（一括送信）
// ─────────────────────────────────────────────────────────────────────────────

async function handleSSS_agg(activeAddress) {
    // index.html のグローバル変数（CSV読み込み済み）
    // eslint-disable-next-line no-undef
    const addr1 = window._agg_address1 ?? [];
    const amt1 = window._agg_amount1 ?? [];
    const mos1 = window._agg_mosaic1 ?? [];
    const msg1 = window._agg_message1 ?? [];

    // フォーム値（CSVに個別値がない行で使うデフォルト）
    const defaultMosaicIdHex = document.querySelector('.select_m1')?.value ?? '';
    const defaultAmount = document.getElementById('form-amount2')?.value ?? '0';
    const defaultMessage = document.getElementById('form-message2')?.value ?? '';

    if (addr1.length === 0) {
        Swal.fire({ title: 'CSVファイルを選択してください。', icon: 'warning' });
        return;
    }
    if (!defaultMosaicIdHex) {
        Swal.fire({ title: 'モザイクを選択してください。', icon: 'warning' });
        return;
    }

    try {
        // モザイク可分性を取得
        const moInfo = await getMosaicInfo(defaultMosaicIdHex);
        let defaultDiv = moInfo.divisibility;

        const signerPubKey = window.SSS.activePublicKey;
        const innerTxs = [];

        for (let i = 0; i < addr1.length; i++) {
            const toAddress = addr1[i];
            if (!toAddress) continue;

            // 行ごとに上書き可能な値
            const amountRaw = (amt1[i] !== undefined && amt1[i] !== '') ? amt1[i] : defaultAmount;
            let mosaicId = (mos1[i] !== undefined && mos1[i] !== '') ? mos1[i] : defaultMosaicIdHex;
            const message = (msg1[i] !== undefined && msg1[i] !== '') ? msg1[i] : defaultMessage;

            // 行ごとにモザイクIDが変わる場合は可分性を再取得
            let div = defaultDiv;
            if (mosaicId !== defaultMosaicIdHex) {
                try {
                    const mi = await getMosaicInfo(mosaicId);
                    div = mi.divisibility;
                } catch {
                    mosaicId = defaultMosaicIdHex;
                    div = defaultDiv;
                }
            }

            const amount = BigInt(Math.round(Number(amountRaw) * Math.pow(10, div)));
            innerTxs.push(buildEmbeddedTransferTx(toAddress, mosaicId, amount, message, signerPubKey));
        }

        if (innerTxs.length === 0) {
            Swal.fire({ title: '有効なアドレスがありません。', icon: 'warning' });
            return;
        }

        const aggregateTx = buildAggregateCompleteTx(innerTxs, signerPubKey, 0, 100);

        // 手数料表示
        const feeXym = Number(aggregateTx.fee.value) / 1_000_000;
        const feeEl = document.getElementById('agg_fee1');
        if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM　　</p>`;

        await signAndAnnounce(aggregateTx);
        console.log('[handleSSS_agg] announced');

        // WebSocket検知を待たずに直接ポップアップ＋効果音を鳴らす
        const audio1 = new Audio('./src/ding.ogg');
        audio1.currentTime = 0;
        audio1.play();
        const popup = document.getElementById('popup');
        if (popup && !popup.classList.contains('is-show')) popup.classList.add('is-show');

    } catch (e) {
        console.error('[handleSSS_agg]', e);
        Swal.fire({ title: '送信失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// マルチシグ転送（旧 handleSSS_msig → 今は Bonded 非対応のスタブ）
// ─────────────────────────────────────────────────────────────────────────────

async function handleSSS_msig(activeAddress) {
    console.log('[handleSSS_msig] v3実装');
}

// ─────────────────────────────────────────────────────────────────────────────
// モザイク作成
// ─────────────────────────────────────────────────────────────────────────────

async function Onclick_mosaic(activeAddress) {
    const supplyAmount = Number(document.getElementById('SupplyAmount')?.value ?? 0);
    const duration = BigInt(document.getElementById('Duration1')?.value ?? 0);
    const divisibility = Number(document.getElementById('Divisibility')?.value ?? 0);
    const supplyMutable = document.getElementById('Supply_M')?.checked ?? false;
    const transferable = document.getElementById('Transferable')?.checked ?? true;
    const restrictable = document.getElementById('Restrictable')?.checked ?? false;
    const revokable = document.getElementById('Revokable')?.checked ?? false;

    if (supplyAmount <= 0) {
        Swal.fire({ title: '供給量を入力してください。', icon: 'warning' }); return;
    }

    try {
        const signerPubKey = window.SSS.activePublicKey;
        const supply = BigInt(Math.round(supplyAmount * Math.pow(10, divisibility)));

        const { defTx, supplyTx } = buildMosaicDefinitionEmbeddedTxs(
            supplyMutable, transferable, restrictable, revokable,
            divisibility, duration, supply, signerPubKey
        );

        const aggregateTx = buildAggregateCompleteTx([defTx, supplyTx], signerPubKey, 0, 100);

        const feeXym = Number(aggregateTx.fee.value) / 1_000_000;
        const feeEl = document.getElementById('fee_mosaic');
        if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

        await signAndAnnounce(aggregateTx);
        Swal.fire({ title: 'モザイク作成を送信しました！', icon: 'success' });
    } catch (e) {
        console.error('[Onclick_mosaic]', e);
        Swal.fire({ title: 'モザイク作成失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// モザイク供給量変更
// ─────────────────────────────────────────────────────────────────────────────

async function mosaic_supply() {
    const mosaicIdHex = document.querySelector('.select_sup')?.value ?? '';
    const changeAmount = Number(document.getElementById('change_Amount')?.value ?? 0);
    const isIncrease = document.getElementById('change_sup')?.checked ?? true;

    if (!mosaicIdHex) {
        Swal.fire({ title: 'モザイクを選択してください。', icon: 'warning' }); return;
    }
    if (changeAmount <= 0) {
        Swal.fire({ title: '数量を入力してください。', icon: 'warning' }); return;
    }

    try {
        const moInfo = await getMosaicInfo(mosaicIdHex);
        const div = moInfo.divisibility;
        const delta = BigInt(Math.round(changeAmount * Math.pow(10, div)));
        const signerPubKey = window.SSS.activePublicKey;

        const tx = buildMosaicSupplyChangeTx(mosaicIdHex, delta, isIncrease ? 'increase' : 'decrease', signerPubKey);

        const feeXym = Number(tx.fee.value) / 1_000_000;
        const feeEl = document.getElementById('fee_sup');
        if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

        await signAndAnnounce(tx);
        Swal.fire({ title: '供給量変更を送信しました！', icon: 'success' });
    } catch (e) {
        console.error('[mosaic_supply]', e);
        Swal.fire({ title: '供給量変更失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// モザイク回収
// ─────────────────────────────────────────────────────────────────────────────

async function revoke_mosaic(activeAddress) {
    const isAggCheck = document.getElementById('re_agg_check')?.checked ?? false;
    const mosaicIdHex = document.querySelector('.select_r')?.value ?? '';
    const amountRaw = document.getElementById('re_amount')?.value ?? '0';
    const signerPubKey = window.SSS.activePublicKey;

    if (!mosaicIdHex) {
        Swal.fire({ title: 'モザイクを選択してください。', icon: 'warning' }); return;
    }

    try {
        if (!isAggCheck) {
            // ─ 単体回収 ─
            const holderAddress = (document.getElementById('holderAddress')?.value ?? '').trim();
            if (!holderAddress) {
                Swal.fire({ title: '回収元アドレスを入力してください。', icon: 'warning' }); return;
            }
            const moInfo = await getMosaicInfo(mosaicIdHex);
            const amount = BigInt(Math.round(Number(amountRaw) * Math.pow(10, moInfo.divisibility)));

            const tx = buildMosaicRevocationTx(holderAddress, mosaicIdHex, amount, signerPubKey);
            const feeXym = Number(tx.fee.value) / 1_000_000;
            const feeEl = document.getElementById('fee_rev');
            if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

            await signAndAnnounce(tx);
            Swal.fire({ title: 'モザイク回収を送信しました！', icon: 'success' });
        } else {
            // ─ 一括回収（全保有者を API から取得して Aggregate Complete） ─
            const pageNum = document.getElementById('page_num_holder1')?.value ?? 1;
            const res = await fetchJson(new URL(
                `/accounts?mosaicId=${mosaicIdHex}&orderBy=balance&order=desc&pageSize=100&pageNumber=${pageNum}`,
                NODE
            ));

            const innerTxs = [];
            for (const item of (res.data ?? [])) {
                const acc = item.account;
                const mosaic = (acc.mosaics ?? []).find(m => m.id.toUpperCase() === mosaicIdHex.toUpperCase());
                if (!mosaic) continue;
                const holderAddr = hexToAddress(acc.address);
                if (holderAddr === activeAddress) continue; // 自分は除外
                innerTxs.push(buildMosaicRevocationEmbeddedTx(holderAddr, mosaicIdHex, BigInt(mosaic.amount), signerPubKey));
            }

            if (innerTxs.length === 0) {
                Swal.fire({ title: '回収対象がありません。', icon: 'info' }); return;
            }

            const aggregateTx = buildAggregateCompleteTx(innerTxs, signerPubKey, 0, 100);
            const feeXym = Number(aggregateTx.fee.value) / 1_000_000;
            const feeEl = document.getElementById('fee_rev');
            if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

            await signAndAnnounce(aggregateTx);
            Swal.fire({ title: 'モザイク一括回収を送信しました！', icon: 'success' });
        }
    } catch (e) {
        console.error('[revoke_mosaic]', e);
        Swal.fire({ title: 'モザイク回収失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ルートネームスペース登録
// ─────────────────────────────────────────────────────────────────────────────

async function Onclick_Namespace() {
    const namespaceName = (document.getElementById('Namespace')?.value ?? '').trim().toLowerCase();
    const duration = Number(document.getElementById('Duration2')?.value ?? 0);
    const signerPubKey = window.SSS.activePublicKey;

    if (!namespaceName) {
        Swal.fire({ title: 'ネームスペース名を入力してください。', icon: 'warning' }); return;
    }
    if (duration < 86400 || duration > 5256000) {
        Swal.fire({ title: '有効期限が無効です（86400〜5256000 ブロック）', icon: 'warning' }); return;
    }

    try {
        const tx = buildRootNamespaceTx(namespaceName, duration, signerPubKey);
        const feeXym = Number(tx.fee.value) / 1_000_000;
        const feeEl = document.getElementById('fee_n');
        if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

        await signAndAnnounce(tx);
        Swal.fire({ title: 'ネームスペース登録を送信しました！', icon: 'success' });
    } catch (e) {
        console.error('[Onclick_Namespace]', e);
        Swal.fire({ title: 'ネームスペース登録失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// サブネームスペース登録
// ─────────────────────────────────────────────────────────────────────────────

async function Onclick_subNamespace() {
    const subName = (document.getElementById('subNamespace')?.value ?? '').trim().toLowerCase();
    const parentName = (document.getElementById('parentNamespace')?.value ?? '').trim().toLowerCase();
    const signerPubKey = window.SSS.activePublicKey;

    if (!subName || !parentName) {
        Swal.fire({ title: 'ネームスペース名を入力してください。', icon: 'warning' }); return;
    }

    try {
        // 親NSのIDを取得する
        const res = await fetchJson(new URL(
            `/namespaces?level0=${encodeURIComponent(parentName)}&pageSize=1`, NODE
        ));
        if (!res.data || res.data.length === 0) {
            Swal.fire({ title: '親ネームスペースが見つかりません。', icon: 'warning' }); return;
        }
        const parentId = res.data[0].namespace.id;

        const tx = buildSubNamespaceTx(subName, parentId, signerPubKey);
        const feeXym = Number(tx.fee.value) / 1_000_000;
        const feeEl = document.getElementById('fee_sn');
        if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

        await signAndAnnounce(tx);
        Swal.fire({ title: 'サブネームスペース登録を送信しました！', icon: 'success' });
    } catch (e) {
        console.error('[Onclick_subNamespace]', e);
        Swal.fire({ title: 'サブネームスペース登録失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// エイリアスリンク
// ─────────────────────────────────────────────────────────────────────────────

async function alias_Link() {
    const linkType = document.getElementById('alias_type')?.value ?? 'address'; // 'address' or 'mosaic'
    const isLink = document.getElementById('alias_link_check')?.checked ?? true;
    const action = isLink ? 'link' : 'unlink';
    const nsName = (document.getElementById('alias_namespace')?.value ?? '').trim().toLowerCase();
    const signerPubKey = window.SSS.activePublicKey;

    if (!nsName) {
        Swal.fire({ title: 'ネームスペース名を入力してください。', icon: 'warning' }); return;
    }

    try {
        // NSのIDを取得する
        const res = await fetchJson(new URL(
            `/namespaces?level0=${encodeURIComponent(nsName)}&pageSize=1`, NODE
        ));
        if (!res.data || res.data.length === 0) {
            Swal.fire({ title: 'ネームスペースが見つかりません。', icon: 'warning' }); return;
        }
        const nsId = res.data[0].namespace.id;

        let tx;
        if (linkType === 'address') {
            const address = (document.getElementById('alias_address')?.value ?? '').trim();
            if (!address) {
                Swal.fire({ title: 'アドレスを入力してください。', icon: 'warning' }); return;
            }
            tx = buildAddressAliasTx(action, nsId, address, signerPubKey);
        } else {
            const mosaicIdHex = document.querySelector('.select_alias_mosaic')?.value ?? '';
            if (!mosaicIdHex) {
                Swal.fire({ title: 'モザイクを選択してください。', icon: 'warning' }); return;
            }
            tx = buildMosaicAliasTx(action, nsId, mosaicIdHex, signerPubKey);
        }

        const feeXym = Number(tx.fee.value) / 1_000_000;
        const feeEl = document.getElementById('fee_L');
        if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

        await signAndAnnounce(tx);
        Swal.fire({ title: `エイリアスリンク（${action}）を送信しました！`, icon: 'success' });
    } catch (e) {
        console.error('[alias_Link]', e);
        Swal.fire({ title: 'エイリアスリンク失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// メタデータ 登録 / 更新
// ─────────────────────────────────────────────────────────────────────────────

async function Metadata(activeAddress) {
    const metaKeyStr = (document.getElementById('Meta_key')?.value ?? '').trim();
    const metaValue = (document.getElementById('Meta_value')?.value ?? '').trim();
    const metaType = Number(document.querySelector('.select_Meta')?.value ?? 0); // 0=Account, 1=Mosaic, 2=NS
    const signerPubKey = window.SSS.activePublicKey;

    if (!metaKeyStr) {
        Swal.fire({ title: 'メタデータキーを入力してください。', icon: 'warning' }); return;
    }
    if (!metaValue) {
        Swal.fire({ title: 'メタデータ値を入力してください。', icon: 'warning' }); return;
    }

    try {
        const key = sdkSymbol.metadataGenerateKey(metaKeyStr);
        const newValue = new TextEncoder().encode(metaValue);

        // 既存のメタデータを取得して差分計算
        const params = { targetAddress: activeAddress, scopedMetadataKey: key.toString(16).toUpperCase(), pageSize: 1 };
        let oldValue = null;
        try {
            const existRes = await fetchJson(new URL(`/metadata?${new URLSearchParams(params)}`, NODE));
            if (existRes.data && existRes.data.length > 0) {
                oldValue = new TextEncoder().encode(existRes.data[0].metadataEntry.value);
            }
        } catch { }

        let innerTx;
        if (metaType === 0) {
            // Account Metadata
            innerTx = buildAccountMetadataEmbeddedTx(activeAddress, key, newValue, oldValue, signerPubKey);
        } else if (metaType === 1) {
            // Mosaic Metadata
            const mosaicIdHex = document.querySelector('.select_Meta_mosaic')?.value ?? '';
            if (!mosaicIdHex) {
                Swal.fire({ title: 'モザイクを選択してください。', icon: 'warning' }); return;
            }
            innerTx = buildMosaicMetadataEmbeddedTx(activeAddress, mosaicIdHex, key, newValue, oldValue, signerPubKey);
        } else {
            // Namespace Metadata
            const nsIdHex = document.querySelector('.select_Meta_ns')?.value ?? '';
            if (!nsIdHex) {
                Swal.fire({ title: 'ネームスペースを選択してください。', icon: 'warning' }); return;
            }
            innerTx = buildNamespaceMetadataEmbeddedTx(activeAddress, nsIdHex, key, newValue, oldValue, signerPubKey);
        }

        const aggregateTx = buildAggregateCompleteTx([innerTx], signerPubKey, 0, 100);
        const feeXym = Number(aggregateTx.fee.value) / 1_000_000;
        const feeEl = document.getElementById('fee_Meta');
        if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

        await signAndAnnounce(aggregateTx);
        Swal.fire({ title: 'メタデータ登録を送信しました！', icon: 'success' });
    } catch (e) {
        console.error('[Metadata]', e);
        Swal.fire({ title: 'メタデータ登録失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// マルチシグアカウント作成
// ─────────────────────────────────────────────────────────────────────────────

async function Msig_account(activeAddress) {
    const minApproval = Number(document.getElementById('min_sig')?.value ?? 1);
    const minRemoval = Number(document.getElementById('min_del_sig')?.value ?? 1);
    const signerPubKey = window.SSS.activePublicKey;

    // 連署者アドレスを取得（複数行 id="cosign_addr_N" の入力欄）
    const addAddresses = [];
    for (let i = 1; i <= 25; i++) {
        const el = document.getElementById(`cosign_addr_${i}`);
        if (!el || !el.value.trim()) break;
        addAddresses.push(el.value.trim());
    }

    // フォールバック: 1行のみの入力欄
    if (addAddresses.length === 0) {
        const el = document.getElementById('cosign_addr');
        if (el && el.value.trim()) {
            el.value.trim().split(/\n|,/).forEach(a => {
                const addr = a.trim();
                if (addr) addAddresses.push(addr);
            });
        }
    }

    if (addAddresses.length === 0) {
        Swal.fire({ title: '連署者アドレスを入力してください。', icon: 'warning' }); return;
    }

    try {
        const innerTx = buildMultisigModificationEmbeddedTx(
            minApproval, minRemoval, addAddresses, [], signerPubKey
        );
        const aggregateTx = buildAggregateCompleteTx([innerTx], signerPubKey, addAddresses.length, 100);

        const feeXym = Number(aggregateTx.fee.value) / 1_000_000;
        const feeEl = document.getElementById('fee_Msig');
        if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

        await signAndAnnounce(aggregateTx);
        Swal.fire({ title: 'マルチシグアカウント作成を送信しました！', icon: 'success' });
    } catch (e) {
        console.error('[Msig_account]', e);
        Swal.fire({ title: 'マルチシグアカウント作成失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// マルチシグアカウントからの転送
// ─────────────────────────────────────────────────────────────────────────────

async function handleSSS_multisig(activeAddress) {
    // モーダル内のセレクトから値を取得
    const multisigAddr = document.querySelector('.select_msig_send')?.value ?? '';
    const toAddress = (document.getElementById('multisig_to')?.value ?? '').trim();
    const mosaicIdHex = document.querySelector('.select_m_msig')?.value ?? '';
    const amountRaw = document.getElementById('multisig_amount')?.value ?? '0';
    const message = document.getElementById('multisig_message2')?.value ?? '';
    const signerPubKey = window.SSS.activePublicKey;

    if (!multisigAddr) {
        Swal.fire({ title: '送信元マルチシグアカウントを選択してください。', icon: 'warning' }); return;
    }
    if (!toAddress) {
        Swal.fire({ title: '宛先アドレスを入力してください。', icon: 'warning' }); return;
    }
    if (!mosaicIdHex) {
        Swal.fire({ title: 'モザイクを選択してください。', icon: 'warning' }); return;
    }
    if (byteLengthUTF8(message) > 1023) {
        Swal.fire({ title: `メッセージが${byteLengthUTF8(message)}バイト。1023バイト以下にしてください。` }); return;
    }

    try {
        const { moInfo } = await getMosaicInfoCached(mosaicIdHex);
        const amount = BigInt(Math.round(Number(amountRaw) * Math.pow(10, moInfo.divisibility)));

        // マルチシグアカウントの公開鍵と minApproval を取得
        let msigPubKey = signerPubKey;
        let minApproval = 2; // デフォルトは Bonded 扱い（安全側）
        try {
            // 公開鍵取得
            const acctRes = await fetch(new URL('/accounts/' + multisigAddr, NODE));
            const acctJson = await acctRes.json();
            const fetchedKey = acctJson.account?.publicKey ?? '';
            if (fetchedKey && !/^0+$/.test(fetchedKey)) msigPubKey = fetchedKey;
            // minApproval は /account/{addr}/multisig エンドポイントで取得
            const msigRes = await fetch(new URL('/account/' + multisigAddr + '/multisig', NODE));
            const msigJson = await msigRes.json();
            minApproval = msigJson.multisig?.minApproval ?? minApproval;
            console.log('[handleSSS_multisig] minApproval:', minApproval);
        } catch (e) {
            console.warn('[handleSSS_multisig] account fetch failed', e);
        }

        const innerTx = buildEmbeddedTransferTx(toAddress, mosaicIdHex, amount, message, msigPubKey);

        if (minApproval <= 1) {
            // ── 1-of-N: Aggregate Complete（HashLock不要） ──────────
            const aggregateComplete = buildAggregateCompleteTx([innerTx], signerPubKey, 1, 100);
            const feeXym = Number(aggregateComplete.fee.value) / 1_000_000;
            const feeEl = document.getElementById('fee_multisig');
            if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

            await signAndAnnounce(aggregateComplete);
            Swal.fire({ title: 'マルチシグ転送を送信しました！', icon: 'success' });

        } else {
            // ── 2-of-N以上: Aggregate Bonded（HashLock必要） ──────────
            const aggregateBonded = buildAggregateBondedTx([innerTx], signerPubKey, 1, 100);
            const feeXym = Number(aggregateBonded.fee.value) / 1_000_000;
            const feeEl = document.getElementById('fee_multisig');
            if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM（+ HashLock 10 XYM）</p>`;

            const bondedHash = sdkCore.utils.uint8ToHex(facade.hashTransaction(aggregateBonded).bytes);
            const hashLockTx = buildHashLockTx(bondedHash, signerPubKey, XYM_ID);
            await signAndAnnounce(hashLockTx);

            Swal.fire({ title: 'Hash Lock 送信済み', text: '数秒後に Aggregate Bonded を送信します...', icon: 'info', timer: 4000, showConfirmButton: false });
            await new Promise(r => setTimeout(r, 4500));

            await signAndAnnounce(aggregateBonded, true);
            Swal.fire({ title: 'マルチシグ転送を送信しました！', icon: 'success' });
        }
    } catch (e) {
        console.error('[handleSSS_multisig]', e);
        Swal.fire({ title: 'マルチシグ転送失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 開発者への寄付
// ─────────────────────────────────────────────────────────────────────────────

async function handleSSS_dona(activeAddress) {
    // v2互換: メインネットの寄付先アドレスは固定、テストネットは自己アドレス
    const DONA_ADDRESS = networkType === 104
        ? 'NBOGLHXSI7FDRAO2CMZV5PQZ5UHZ3IED67ULPSY'  // 開発者 (mainnet)
        : activeAddress;                               // テストネットは自分に送信（テスト用）

    const amountRaw = document.getElementById('dona_amount')?.value ?? '0';
    const message = document.getElementById('dona_message')?.value ?? 'Donation from Ventus Wallet';

    if (Number(amountRaw) <= 0) {
        Swal.fire({ title: '数量を入力してください。', icon: 'warning' }); return;
    }

    try {
        const amount = BigInt(Math.round(Number(amountRaw) * 1_000_000)); // XYM は divisibility=6
        const tx = buildTransferTx(DONA_ADDRESS, XYM_ID, amount, message, window.SSS.activePublicKey);
        await signAndAnnounce(tx);
        Swal.fire({ title: 'ご支援ありがとうございます！🎉', icon: 'success' });
    } catch (e) {
        console.error('[handleSSS_dona]', e);
        Swal.fire({ title: '送信失敗', text: e.message, icon: 'error' });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// エントリポイント
// ─────────────────────────────────────────────────────────────────────────────

// SSSWindow リスナーを最初に登録しておく
// （main() 内の await loadSDK() 中に SSSWindow が発火することがあるため）
let _sssWindowCaught = false;
let _sdkReady = false; // loadSDK + initNetwork 完了フラグ

window.addEventListener('SSSWindow', async () => {
    console.log('[SSSWindow] SSS ready!');
    _sssWindowCaught = true;
    if (_sdkReady) {
        // SDK 初期化済み → アカウントだけ初期化
        await initAccountAndUI();
    }
    // SDK 未初期化の場合は main() 内の activeAddress チェックが通るので何もしない
    // （main() が最後まで走る）
}, { once: true });

// 1000ms 後に main() を起動（v2 の script.js と同様）
setTimeout(() => main(), 1000);


// =============================================================================
// マルチシグ送信モーダル: 送信元アカウント選択 & モザイク選択
// =============================================================================

export async function loadMsigSendModal() {
    const cosignerAddr = window.SSS?.activeAddress;
    if (!cosignerAddr) return;

    const addrContainer = document.querySelector('.multisig_address_select');
    const mosaicContainer = document.querySelector('.multisig_mosaic_select');
    if (!addrContainer) return;

    addrContainer.innerHTML = '<span style="color:#aaa;font-size:12px;">読み込み中...</span>';
    if (mosaicContainer) mosaicContainer.innerHTML = '';

    let multisigAddresses = [];
    try {
        const graph = await getMsigGraph(cosignerAddr);
        console.log('[loadMsigSendModal] graph:', JSON.stringify(graph));
        const seen = new Set();
        seen.add(cosignerAddr);
        for (const entry of (graph ?? [])) {
            for (const msigEntry of (entry.multisigEntries ?? [])) {
                const msig = msigEntry.multisig ?? msigEntry;
                // accountAddress フィールドがある場合
                const rawAcct = msig.accountAddress ?? msig.account;
                if (rawAcct && typeof rawAcct === 'string') {
                    const addr = rawAcct.length === 48 ? hexToAddress(rawAcct) : rawAcct;
                    if (!seen.has(addr)) { seen.add(addr); multisigAddresses.push(addr); }
                }
                // multisigAddresses (さらに上の先祖) も収集
                for (const raw of (msig.multisigAddresses ?? [])) {
                    const addr = (typeof raw === 'string' && raw.length === 48) ? hexToAddress(raw) : raw;
                    if (!seen.has(addr)) { seen.add(addr); multisigAddresses.push(addr); }
                }
            }
        }
    } catch (e) {
        console.warn('[loadMsigSendModal] graph fetch failed, fallback to /multisig', e);
    }

    if (multisigAddresses.length === 0) {
        try {
            const res = await fetch(new URL('/account/' + cosignerAddr + '/multisig', NODE));
            const json = await res.json();
            multisigAddresses = (json.multisig?.multisigAddresses ?? []).map(
                a => (typeof a === 'string' && a.length === 48) ? hexToAddress(a) : a
            );
        } catch (e) {
            console.warn('[loadMsigSendModal] multisig fallback failed', e);
        }
    }

    if (multisigAddresses.length === 0) {
        addrContainer.innerHTML =
            '<span style="color:#e53e3e;font-size:12px;">⚠️ 操作可能なマルチシグアカウントが見つかりません</span>';
        return;
    }

    const sel = document.createElement('select');
    sel.className = 'select_msig_send msig-send-input';
    sel.style.cssText = 'width:100%;padding:8px 12px;border-radius:8px;border:1.5px solid #c4b5fd;font-size:13px;background:#fff;';
    multisigAddresses.forEach(addr => {
        const opt = document.createElement('option');
        opt.value = addr;
        opt.title = addr;
        opt.textContent = addr.slice(0, 14) + '...' + addr.slice(-8);
        sel.appendChild(opt);
    });
    addrContainer.innerHTML = '';
    addrContainer.appendChild(sel);

    const addrHint = document.createElement('div');
    addrHint.style.cssText = 'font-size:10px;color:#888;margin-top:3px;word-break:break-all;';
    addrHint.textContent = sel.value;
    addrContainer.appendChild(addrHint);
    sel.addEventListener('change', () => { addrHint.textContent = sel.value; });

    // minApproval に応じてUIを切り替えるヘルパー
    async function _updateMsigSendUI(addr) {
        try {
            const res = await fetch(new URL('/account/' + addr + '/multisig', NODE));
            const json = await res.json();
            const minApp = json.multisig?.minApproval ?? 2;
            const feeNotice = document.querySelector('.msig-send-fee-notice');
            const subtitle  = document.querySelector('.msig-send-subtitle');
            if (minApp <= 1) {
                // 1-of-N: Complete → HashLock 不要
                if (feeNotice) feeNotice.style.display = 'none';
                if (subtitle)  subtitle.textContent = 'AggregateComplete トランザクション';
            } else {
                // 2-of-N以上: Bonded → HashLock 必要
                if (feeNotice) feeNotice.style.display = '';
                if (subtitle)  subtitle.textContent = 'AggregateBonded トランザクション';
            }
        } catch { /* 取得失敗時はデフォルト表示のまま */ }
    }

    await _updateMsigSendUI(sel.value);

    await _loadMsigSendMosaics(sel.value, mosaicContainer);
    sel.addEventListener('change', async () => {
        await _updateMsigSendUI(sel.value);
        await _loadMsigSendMosaics(sel.value, mosaicContainer);
    });
}

async function _loadMsigSendMosaics(targetAddr, mosaicContainer) {
    if (!mosaicContainer) return;
    mosaicContainer.innerHTML = '<span style="color:#aaa;font-size:12px;">読み込み中...</span>';

    const hoyu = document.getElementById('multisig_hoyu-ryo');
    const kigen = document.getElementById('multisig_kigen-gire');
    if (hoyu) hoyu.textContent = '';
    if (kigen) kigen.textContent = '';

    try {
        const res = await fetch(new URL('/accounts/' + targetAddr, NODE));
        const json = await res.json();
        const mosaics = json.account?.mosaics ?? [];

        if (mosaics.length === 0) {
            mosaicContainer.innerHTML = '<span style="color:#aaa;font-size:12px;">保有モザイクなし</span>';
            return;
        }

        const mosaicIds = mosaics.map(m => m.id);
        let nameMap = {};
        try {
            const namesRes = await getMosaicsNames(mosaicIds);
            for (const entry of (namesRes ?? [])) {
                const n = entry.names?.[0];
                nameMap[entry.mosaicId.toUpperCase()] = (n && typeof n === 'object') ? n.name : (n ?? null);
            }
        } catch { }

        const options = [];
        for (const m of mosaics) {
            let div = 0;
            try { const moInfo = await getMosaicInfo(m.id); div = moInfo.divisibility; } catch { }
            const name = nameMap[m.id.toUpperCase()] ?? m.id;
            options.push({ id: m.id, name, amount: Number(m.amount), div });
        }
        options.sort((a, b) => {
            if (a.name.includes('symbol.xym')) return -1;
            if (b.name.includes('symbol.xym')) return 1;
            return a.name < b.name ? -1 : 1;
        });

        const sel = document.createElement('select');
        sel.className = 'select_m_msig msig-send-input';
        sel.style.cssText = 'width:100%;padding:8px 12px;border-radius:8px;border:1.5px solid #c4b5fd;font-size:13px;background:#fff;';
        for (const o of options) {
            const opt = document.createElement('option');
            opt.value = o.id;
            opt.dataset.div = o.div;
            opt.dataset.amount = o.amount;
            opt.textContent = (o.name !== o.id) ? o.name : (o.id.slice(0, 16) + '...');
            sel.appendChild(opt);
        }
        mosaicContainer.innerHTML = '';
        mosaicContainer.appendChild(sel);

        const updateBalance = (selectedOpt) => {
            const div = Number(selectedOpt.dataset.div ?? 0);
            const amt = Number(selectedOpt.dataset.amount ?? 0);
            const disp = (amt / Math.pow(10, div)).toLocaleString(undefined, { maximumFractionDigits: div });
            const amtInput = document.getElementById('multisig_amount');
            if (amtInput) amtInput.placeholder = div > 0 ? '0.' + '0'.repeat(div) : '0';
            if (hoyu) hoyu.textContent = '保有量: ' + disp + '　';
        };
        if (sel.options.length > 0) updateBalance(sel.options[0]);
        sel.addEventListener('change', () => { updateBalance(sel.options[sel.selectedIndex]); });

    } catch (e) {
        console.error('[_loadMsigSendMosaics]', e);
        mosaicContainer.innerHTML = '<span style="color:#e53e3e;font-size:12px;">モザイク取得失敗</span>';
    }
}

// =============================================================================
// アカウント種別バッジ表示
// =============================================================================

async function updateMsigBadge(addr) {
    const badgeEl = document.getElementById('multisig_account');
    console.log('[updateMsigBadge] START el:', badgeEl, 'addr:', addr);
    if (!badgeEl) { console.error('[updateMsigBadge] #multisig_account not found!'); return; }

    // すぐに「確認中」を表示してデバッグ
    badgeEl.style.minHeight = '24px';
    badgeEl.innerHTML = '<span style="font-size:11px;color:#888;">⏳ アカウント種別確認中...</span>';

    const BASE = 'display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:bold;margin:4px 0;';
    const STYLES = {
        msig:    BASE + 'background:linear-gradient(90deg,#818cf8,#c084fc);color:#fff;',
        cosig:   BASE + 'background:linear-gradient(90deg,#22d3ee,#818cf8);color:#fff;',
        both:    BASE + 'background:linear-gradient(90deg,#06b6d4,#a855f7);color:#fff;',
        normal:  BASE + 'background:#e5e7eb;color:#6b7280;',
    };

    let data = null;
    try {
        data = await getMultisigAccountInfo(addr);
        console.log('[updateMsigBadge] data:', JSON.stringify(data));
    } catch (e) {
        console.warn('[updateMsigBadge] fetch failed (probably 404 = 非マルチシグ):', e.message);
    }

    const msig    = data?.multisig;
    const isMsig  = (msig?.cosignatoryAddresses?.length ?? 0) > 0;
    const isCosig = (msig?.multisigAddresses?.length    ?? 0) > 0;

    console.log('[updateMsigBadge] isMsig:', isMsig, 'isCosig:', isCosig);

    if (isMsig && isCosig) {
        badgeEl.innerHTML = `<span style="${STYLES.both}">🏦 マルチシグ ／ 🔐 連署者</span>`;
    } else if (isMsig) {
        const minAp  = msig.minApproval ?? 0;
        const numCos = msig.cosignatoryAddresses?.length ?? 0;
        badgeEl.innerHTML = `<span style="${STYLES.msig}">🏦 マルチシグ（${minAp} of ${numCos}）</span>`;
    } else if (isCosig) {
        const numMsig = msig.multisigAddresses?.length ?? 0;
        badgeEl.innerHTML = `<span style="${STYLES.cosig}">🔐 連署者（${numMsig}件管理）</span>`;
    } else {
        badgeEl.innerHTML = `<span style="${STYLES.normal}">👤 通常アカウント</span>`;
    }
}


// =============================================================================
// マルチシグ設定パネル: アカウント選択 & コサイナー管理
// =============================================================================

// 連署者アドレスリスト（モジュールスコープで管理）
const cosigList = [];
const deleteList = [];
let msigIsEditMode = false;
let _currentMinApproval = 0;
let _currentMinRemoval = 0;
let _msigTargetAddress = '';

export async function loadMsigPanelInfo() {
    const cosignerAddr = window.SSS?.activeAddress;
    if (!cosignerAddr) return;

    cosigList.length = 0;
    deleteList.length = 0;
    _msigTargetAddress = '';

    const node = window.ventus_NODE;
    if (!node) return;

    let multisigAddresses = [];
    try {
        const res = await fetch(new URL('/account/' + cosignerAddr + '/multisig', node));
        const json = await res.json();
        multisigAddresses = (json.multisig?.multisigAddresses ?? []).map(
            a => a.length === 48 ? hexToAddress(a) : a
        );
    } catch (e) {
        console.warn('[loadMsigPanelInfo] fetch failed', e);
    }

    const addrSel = document.querySelector('.multisig_address_select_2');
    if (addrSel) {
        if (multisigAddresses.length === 0) {
            addrSel.innerHTML = `<span class="msig-addr-text">${cosignerAddr}</span>`;
            _msigTargetAddress = cosignerAddr;
        } else {
            const allCandidates = [cosignerAddr, ...multisigAddresses];
            const sel = document.createElement('select');
            sel.id = 'msig-target-select';
            sel.className = 'msig-target-select';
            allCandidates.forEach((a, i) => {
                const opt = document.createElement('option');
                opt.value = a;
                opt.textContent = i === 0 ? `自分のアカウント（${a.slice(0, 8)}...）`
                    : `マルチシグ: ${a.slice(0, 8)}...`;
                sel.appendChild(opt);
            });
            addrSel.innerHTML = '';
            addrSel.appendChild(sel);
            _msigTargetAddress = allCandidates[0];
            sel.addEventListener('change', async () => {
                _msigTargetAddress = sel.value;
                await _loadMsigTargetInfo(_msigTargetAddress, node);
            });
        }
    }

    await _loadMsigTargetInfo(_msigTargetAddress, node);
}

async function _loadMsigTargetInfo(targetAddr, node) {
    cosigList.length = 0;
    deleteList.length = 0;

    const defaultDiv = document.getElementById('default_account');
    const rensyoDiv = document.getElementById('rensyosya');
    const deleteDiv = document.getElementById('delete-container');
    const displayCont = document.getElementById('display-container');
    const addSection = document.getElementById('msig-add-section');
    const deltaSection = document.getElementById('msig-delta-section');
    const newSection = document.getElementById('msig-new-section');

    if (defaultDiv) defaultDiv.innerHTML = '';
    if (rensyoDiv) rensyoDiv.innerHTML = '';
    if (deleteDiv) deleteDiv.innerHTML = '';
    if (displayCont) displayCont.innerHTML = '';

    try {
        const res = await fetch(new URL('/account/' + targetAddr + '/multisig', node));
        const json = await res.json();
        const info = json.multisig;

        if (info && (info.minApproval > 0 || info.minRemoval > 0)) {
            msigIsEditMode = true;
            _currentMinApproval = info.minApproval ?? 0;
            _currentMinRemoval = info.minRemoval ?? 0;

            if (defaultDiv) {
                defaultDiv.innerHTML =
                    `<div class="msig-status-badge">マルチシグ設定済み</div>` +
                    `<div class="msig-status-vals">最小承認: <b>${_currentMinApproval}</b> / 最小削除: <b>${_currentMinRemoval}</b></div>`;
            }

            if (rensyoDiv) {
                rensyoDiv.innerHTML = '<div class="msig-section-label">現在の連署者</div>';
                for (const rawAddr of (info.cosignatoryAddresses ?? [])) {
                    const displayAddr = rawAddr.length === 48 ? hexToAddress(rawAddr) : rawAddr;
                    const item = document.createElement('div');
                    item.className = 'msig-cosig-card';
                    item.dataset.addr = displayAddr;
                    item.innerHTML =
                        `<span class="msig-cosig-addr">${displayAddr}</span>` +
                        `<button class="msig-del-btn">削除予定</button>`;
                    item.querySelector('.msig-del-btn').addEventListener('click', () => {
                        if (deleteList.includes(displayAddr)) return;
                        deleteList.push(displayAddr);
                        item.classList.add('msig-cosig-queued');
                        item.querySelector('.msig-del-btn').disabled = true;
                        _renderDeleteQueue();
                    });
                    rensyoDiv.appendChild(item);
                }
            }

            if (deleteDiv) {
                deleteDiv.innerHTML = '<div class="msig-section-label" id="delete-label" style="display:none">削除予定</div>';
            }

            const buildAbsSelect = (id, currentVal) => {
                const sel = document.getElementById(id);
                if (!sel) return;
                sel.innerHTML = '';
                for (let i = 0; i <= 25; i++) {
                    const opt = document.createElement('option');
                    opt.value = String(i);
                    opt.textContent = String(i);
                    if (i === currentVal) opt.selected = true;
                    sel.appendChild(opt);
                }
            };
            buildAbsSelect('delta_sig', _currentMinApproval);
            buildAbsSelect('delta_del_sig', _currentMinRemoval);

            if (addSection) addSection.style.display = 'block';
            if (deltaSection) deltaSection.style.display = 'block';
            if (newSection) newSection.style.display = 'none';
        } else {
            msigIsEditMode = false;
            if (defaultDiv) defaultDiv.innerHTML = '<div class="msig-status-badge new">通常アカウント（マルチシグ未設定）</div>';
            if (addSection) addSection.style.display = 'block';
            if (deltaSection) deltaSection.style.display = 'none';
            if (newSection) newSection.style.display = 'block';
        }
    } catch (e) {
        console.warn('[_loadMsigTargetInfo]', e);
        msigIsEditMode = false;
        if (addSection) addSection.style.display = 'block';
        if (newSection) newSection.style.display = 'block';
        if (deltaSection) deltaSection.style.display = 'none';
    }
}

function _renderDeleteQueue() {
    const deleteDiv = document.getElementById('delete-container');
    const label = document.getElementById('delete-label');
    if (!deleteDiv) return;
    [...deleteDiv.querySelectorAll('.msig-delete-item')].forEach(el => el.remove());
    if (label) label.style.display = deleteList.length > 0 ? 'block' : 'none';
    deleteList.forEach(addr => {
        const item = document.createElement('div');
        item.className = 'msig-delete-item';
        item.innerHTML =
            `<span class="msig-cosig-addr del">${addr}</span>` +
            `<button class="msig-undo-btn">取り消し</button>`;
        item.querySelector('.msig-undo-btn').addEventListener('click', () => {
            const idx = deleteList.indexOf(addr);
            if (idx !== -1) deleteList.splice(idx, 1);
            item.remove();
            if (label) label.style.display = deleteList.length > 0 ? 'block' : 'none';
            const rensyoDiv = document.getElementById('rensyosya');
            if (rensyoDiv) {
                rensyoDiv.querySelectorAll('.msig-cosig-card').forEach(card => {
                    if (card.dataset.addr === addr) {
                        card.classList.remove('msig-cosig-queued');
                        card.querySelector('.msig-del-btn').disabled = false;
                    }
                });
            }
        });
        deleteDiv.appendChild(item);
    });
}

// =============================================================================
// パーシャルトランザクション
// =============================================================================

export async function initPartialTxes(addr) {
    const container = document.getElementById('partial-tx-list');
    if (!container) return;
    container.innerHTML = '';
    try {
        const data = await searchPartialTransactions({ address: addr, pageSize: 25 });
        const txes = data?.data ?? [];
        if (txes.length === 0) {
            container.innerHTML = '<div style="color:#aaa;font-size:12px;padding:8px;">署名待ちトランザクションなし</div>';
            return;
        }
        for (const tx of txes) {
            const hash = tx.meta?.hash ?? '?';
            const item = document.createElement('div');
            item.className = 'partial-tx-item';
            item.innerHTML =
                `<div class="partial-tx-hash">${hash.slice(0, 16)}...</div>` +
                `<button class="partial-tx-sign-btn" onclick="window._signPartialTx('${hash}')">署名</button>`;
            container.appendChild(item);
        }
    } catch (e) {
        console.warn('[initPartialTxes]', e);
    }
}

// =============================================================================
// ページ選択・テーブル再描画 (v3/fetch版)
// =============================================================================

// トランザクション履歴ページ切り替え
function select_Page() {
    const pageNum = Number(document.getElementById('page_num1')?.value ?? 1);
    const addr = window.SSS?.activeAddress;
    if (addr) showTransactions(addr, pageNum);
}

// モザイク一覧ページ切り替え
async function select_Page_mosa1() {
    const pageNum = Number(document.getElementById('page_num_mosa1')?.value ?? 1);
    const addr = window.SSS?.activeAddress;
    if (!addr) return;

    const msTbl = document.getElementById('ms_table');
    if (msTbl) msTbl.innerHTML = '<span style="color:#aaa;font-size:13px;">読み込み中...</span>';

    try {
        const chainInfo = await getChainInfo();
        const currentHeight = Number(chainInfo.height);
        const currentBlock = await getBlockByHeight(currentHeight);
        const currentTs = Number(currentBlock.timestamp);

        // 自分が発行（所有者）のモザイクを取得
        const data = await fetchJson(new URL(
            `/mosaics?ownerAddress=${addr}&pageNumber=${pageNum}&pageSize=50&order=desc`, NODE
        ));
        const mosaics = data.data ?? [];
        if (!msTbl) return;

        // モザイクIDリスト → 名前解決 (/namespaces/mosaic/names を使用)
        const mosaicIds = mosaics.map(m => (m.mosaic ?? m).id ?? '').filter(Boolean);
        let nameMap = {}; // mosaicId.upper -> nsName
        if (mosaicIds.length > 0) {
            try {
                const namesData = await getMosaicsNames(mosaicIds);
                for (const n of (namesData ?? [])) {
                    // names[0] はオブジェクト {name:"..."} または文字列
                    const raw = (n.names ?? [])[0];
                    const resolved = raw ? (typeof raw === 'object' ? raw.name : raw) : null;
                    if (resolved) nameMap[(n.mosaicId ?? '').toUpperCase()] = resolved;
                }
            } catch {}
        }

        // アカウント保有量マップ（実際の残高）
        let holdingsMap = {}; // mosaicId.upper -> amount(string)
        try {
            const accData = await getAccountInfo(addr);
            for (const mo of (accData?.mosaics ?? [])) {
                holdingsMap[mo.id.toUpperCase()] = mo.amount;
            }
        } catch {}

        // テーブル構築
        const tbl = document.createElement('table');
        tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:11px;';
        const tblBody = document.createElement('tbody');

        const headers = ['モザイクID','ネームスペース名','供給量','残高','有効期限','ステータス','可分性','制限可','供給量可変','転送可','回収可'];
        const hdr = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            th.style.cssText = 'background:#0a5;color:#fff;padding:5px 6px;text-align:center;white-space:nowrap;';
            hdr.appendChild(th);
        });
        tblBody.appendChild(hdr);

        mosaics.forEach((mEntry, idx) => {
            const m = mEntry.mosaic ?? mEntry;
            const mId = (m.id ?? '').toUpperCase();
            const nsName = nameMap[mId] || 'N/A';
            const supply = Number(BigInt(m.supply ?? 0));
            const div = m.divisibility ?? 0;
            const supplyDisp = (supply / Math.pow(10, div)).toLocaleString();

            // 実際のアカウント保有量を使用（保有していない場合は 0）
            const heldAmt = BigInt(holdingsMap[mId] ?? 0);
            const balanceDisp = (Number(heldAmt) / Math.pow(10, div)).toLocaleString();

            // 有効期限
            const dur = Number(m.duration ?? 0);
            const startH = Number(m.startHeight ?? 0);
            let expiryStr = '--- 無期限 ---';
            let isExpired = false;
            if (dur > 0) {
                const endH = startH + dur;
                const remainBlocks = endH - currentHeight;
                isExpired = remainBlocks < 0;
                const expiryMs = (epochAdjustment * 1000) + (currentTs + remainBlocks * 30000);
                const d = new Date(expiryMs);
                expiryStr = `${String(d.getFullYear()).slice(2)}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            }
            const statusDot = isExpired ? '🔴' : '🟢';
            const dot = v => v ? '🟢' : '❌';

            const flags = m.flags ?? 0;
            // Symbol mosaic flags: bit0=supplyMutable, bit1=transferable, bit2=restrictable, bit3=revokable
            const supplyMutable  = !!(flags & 1);
            const transferable   = !!(flags & 2);
            const restrictable   = !!(flags & 4);
            const revokable      = !!(flags & 8);

            const row = document.createElement('tr');
            row.style.cssText = idx % 2 === 0 ? 'background:#e8f8f0;' : 'background:#fff;';
            const cells = [
                { text: mId, mono: true, small: true },
                { text: nsName },
                { text: supplyDisp, right: true },
                { text: balanceDisp, right: true },
                { text: expiryStr, center: true },
                { html: statusDot, center: true },
                { text: String(div), center: true },
                { html: dot(restrictable), center: true },
                { html: dot(supplyMutable), center: true },
                { html: dot(transferable), center: true },
                { html: dot(revokable), center: true },
            ];
            cells.forEach(({ text, html, mono, small, center, right }) => {
                const td = document.createElement('td');
                td.style.cssText = `padding:4px 6px;border-bottom:1px solid #cde;text-align:${right ? 'right' : center ? 'center' : 'left'};${mono ? 'font-family:monospace;' : ''}${small ? 'font-size:10px;word-break:break-all;' : ''}`;
                if (html) td.textContent = html;
                else td.textContent = text ?? '';
                row.appendChild(td);
            });
            tblBody.appendChild(row);
        });

        tbl.appendChild(tblBody);
        msTbl.innerHTML = '';
        msTbl.appendChild(tbl);
    } catch (e) {
        console.error('[select_Page_mosa1]', e);
        if (msTbl) msTbl.innerHTML = `<span style="color:red;">エラー: ${e.message}</span>`;
    }
}

// ネームスペース一覧ページ切り替え (v3版)
async function select_Page_namespace() {
    const pageNum = Number(document.getElementById('page_num_namespace')?.value ?? 1);
    const addr = window.SSS?.activeAddress;
    if (!addr) return;

    const nsTbl = document.getElementById('ns_table');
    if (nsTbl) nsTbl.innerHTML = '<span style="color:#aaa;font-size:13px;">読み込み中...</span>';
    const nsSel = document.querySelector('.Namespace_select');
    if (nsSel) nsSel.innerHTML = '';

    try {
        const chainInfo = await getChainInfo();
        const currentHeight = Number(chainInfo.height);
        const currentBlock = await getBlockByHeight(currentHeight);
        const currentTs = Number(currentBlock.timestamp);

        const data = await fetchJson(new URL(
            `/namespaces?ownerAddress=${addr}&pageNumber=${pageNum}&pageSize=50&order=desc`, NODE
        ));
        const namespaces = data.data ?? [];

        if (!nsTbl) return;

        // ── 全 NS の名前解決 ──
        const allNsIds = [];
        for (const nsEntry of namespaces) {
            const ns = nsEntry.namespace ?? nsEntry;
            for (const lv of ['level0','level1','level2']) {
                const id = ns[lv];
                if (id) allNsIds.push(id);
            }
        }
        let nsNameMap = {};
        if (allNsIds.length > 0) {
            try {
                const names = await fetchJson(new URL('/namespaces/names', NODE), 'POST', { namespaceIds: [...new Set(allNsIds)] });
                // Symbol REST v3 は配列直接 or {namespaceNames:[...]} の両方ありうる
                const nameList = Array.isArray(names) ? names : (names.namespaceNames ?? []);
                for (const n of nameList) {
                    nsNameMap[(n.id ?? '').toUpperCase()] = n.name;
                }
            } catch {}
        }

        // ── テーブル構築 ──
        const tbl = document.createElement('table');
        tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
        const tblBody = document.createElement('tbody');

        // ヘッダー
        const hdr = document.createElement('tr');
        ['ネームスペース名','ネームスペースID','更新期限','ステータス','タイプ','🔗リンク🔗'].forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            th.style.cssText = 'background:#0a5;color:#fff;padding:6px 8px;text-align:center;white-space:nowrap;';
            hdr.appendChild(th);
        });
        tblBody.appendChild(hdr);

        namespaces.forEach((nsEntry, idx) => {
            const ns = nsEntry.namespace ?? nsEntry;
            const endH = Number(ns.endHeight ?? 0);
            const remainBlocks = endH - currentHeight;
            // 更新期限
            let expiryStr = '----------------';
            if (endH !== 0 && endH < 99_999_999) {
                const expiryMs = (epochAdjustment * 1000) + (currentTs + remainBlocks * 30000);
                const d = new Date(expiryMs);
                expiryStr = `${String(d.getFullYear()).slice(2)}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            }
            // NS名: level0 + level1 + level2 を "." で結合
            // level0/1/2 のleaf名を順に結合してフルパスを組み立てる
            const lvParts = ['level0','level1','level2']
                .map(lv => ns[lv] ? nsNameMap[(ns[lv]).toUpperCase()] : null)
                .filter(Boolean);
            const nsFullName = lvParts.join('.');
            // ネームスペースIDは最深レベルのID（サブNSなら level1/2）
            const nsDeepId = (ns.level2 ?? ns.level1 ?? ns.level0 ?? '').toUpperCase();
            const nsId = nsDeepId;
            // ステータス: 有効=緑, 期限切れ=赤
            const isExpired = endH !== 0 && endH < 99_999_999 && remainBlocks < 0;
            const statusDot = isExpired
                ? '<span style="color:red;font-size:16px;">🔴</span>'
                : '<span style="color:#00b050;font-size:16px;">🟢</span>';
            // タイプ & リンク
            const alias = ns.alias ?? {};
            let aliasType = '', aliasLink = '';
            if (alias.type === 1) {
                aliasType = 'Mosaic';
                aliasLink = alias.mosaicId ?? '';
            } else if (alias.type === 2) {
                aliasType = 'Address';
                aliasLink = alias.address ? hexToAddress(alias.address) : '';
            }

            const row = document.createElement('tr');
            row.style.cssText = idx % 2 === 0 ? 'background:#e8f8f0;' : 'background:#fff;';

            const cellData = [
                { text: nsFullName || nsId, bold: true },
                { text: nsId, mono: true },
                { text: expiryStr },
                { html: statusDot, center: true },
                { text: aliasType, center: true },
                { text: aliasLink, mono: true, small: true },
            ];
            cellData.forEach(({ text, html, bold, mono, center, small }) => {
                const td = document.createElement('td');
                td.style.cssText = `padding:5px 8px;border-bottom:1px solid #cde;text-align:${center ? 'center' : 'left'};${mono ? 'font-family:monospace;' : ''}${bold ? 'font-weight:bold;' : ''}${small ? 'font-size:11px;word-break:break-all;' : ''}`;
                if (html) td.innerHTML = html;
                else td.textContent = text ?? '';
                row.appendChild(td);
            });
            tblBody.appendChild(row);

            // セレクトボックスにも追加（ルートのみ）
            if (nsSel && (ns.depth ?? 1) === 1) {
                const opt = document.createElement('option');
                opt.value = nsFullName || nsId;
                opt.textContent = nsFullName || nsId;
                nsSel.appendChild(opt);
            }
        });

        tbl.appendChild(tblBody);
        nsTbl.innerHTML = '';
        nsTbl.appendChild(tbl);
    } catch (e) {
        console.error('[select_Page_namespace]', e);
        if (nsTbl) nsTbl.innerHTML = `<span style="color:red;">エラー: ${e.message}</span>`;
    }
}

// Metadata一覧ページ切り替え (v3版)
async function select_Page_meta() {
    const pageNum = Number(document.getElementById('page_num_meta')?.value ?? 1);
    const addr = window.SSS?.activeAddress;
    if (!addr) return;

    const metaTbl = document.getElementById('Meta_table');
    if (metaTbl) metaTbl.innerHTML = '<span style="color:#aaa;font-size:13px;">読み込み中...</span>';

    // Meta_select（キー選択セレクトボックス）をクリア
    const metaSel = document.querySelector('.Meta_select');
    if (metaSel) metaSel.innerHTML = '';

    try {
        const data = await fetchJson(new URL(
            `/metadata?targetAddress=${addr}&pageNumber=${pageNum}&pageSize=50`, NODE
        ));
        const metas = data.data ?? [];
        if (!metaTbl) return;

        // ── セレクトボックスにメタデータキーを追加 ──
        if (metaSel && metas.length > 0) {
            const sel = document.createElement('select');
            sel.className = 'select_Meta';
            sel.style.cssText = 'width:100%;padding:6px;border-radius:6px;font-family:monospace;';
            const defOpt = document.createElement('option');
            defOpt.value = '';
            defOpt.textContent = '--- 新規入力 ---';
            sel.appendChild(defOpt);
            metas.forEach(m => {
                const meta = m.metadataEntry ?? m;
                const key = meta.scopedMetadataKey ?? '';
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = key;
                sel.appendChild(opt);
            });
            // 選択時に Meta_key へ自動入力
            sel.addEventListener('change', () => {
                const keyEl = document.getElementById('Meta_key');
                if (keyEl) keyEl.value = sel.value;
            });
            metaSel.appendChild(sel);
        }

        const tbl = document.createElement('table');
        tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';
        const tblBody = document.createElement('tbody');

        // ヘッダー
        const headers = ['メタデータキー','タイプ','モザイクID / ネームスペース','Value(値)','送信者アドレス','対象アドレス'];
        const hdr = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            th.style.cssText = 'background:#0a5;color:#fff;padding:6px 8px;text-align:center;white-space:nowrap;';
            hdr.appendChild(th);
        });
        tblBody.appendChild(hdr);

        metas.forEach((m, idx) => {
            const meta = m.metadataEntry ?? m;
            // 値をhex→文字列デコード
            const valueHex = meta.value ?? '';
            let valueStr = '';
            try {
                valueStr = decodeURIComponent(escape(String.fromCharCode(
                    ...valueHex.match(/.{1,2}/g).map(b => parseInt(b, 16))
                )));
            } catch { valueStr = valueHex; }

            // タイプ判定 (0=Account, 1=Mosaic, 2=Namespace)
            const metaType = meta.metadataType ?? 0;
            const typeStr = metaType === 1 ? 'Mosaic' : metaType === 2 ? 'Namespace' : 'Account';
            const refId = meta.targetId ?? meta.scopedMetadataKey ?? '';

            const senderAddr = meta.sourceAddress?.length === 48
                ? hexToAddress(meta.sourceAddress) : (meta.sourceAddress ?? '');
            const targetAddr = meta.targetAddress?.length === 48
                ? hexToAddress(meta.targetAddress) : (meta.targetAddress ?? '');
            const metaKey = meta.scopedMetadataKey ?? '';

            const row = document.createElement('tr');
            row.style.cssText = idx % 2 === 0 ? 'background:#e8f8f0;' : 'background:#fff;';

            const cells = [
                { text: metaKey, mono: true },
                { text: typeStr, center: true },
                { text: typeStr !== 'Account' ? refId : '', mono: true, small: true },
                { text: valueStr, small: true },
                { text: senderAddr, mono: true, small: true },
                { text: targetAddr, mono: true, small: true },
            ];
            cells.forEach(({ text, mono, center, small }) => {
                const td = document.createElement('td');
                td.style.cssText = `padding:5px 8px;border-bottom:1px solid #cde;text-align:${center ? 'center' : 'left'};${mono ? 'font-family:monospace;' : ''}${small ? 'font-size:10px;word-break:break-all;' : ''}`;
                td.textContent = text ?? '';
                row.appendChild(td);
            });
            tblBody.appendChild(row);
        });

        tbl.appendChild(tblBody);
        metaTbl.innerHTML = '';
        metaTbl.appendChild(tbl);
    } catch (e) {
        console.error('[select_Page_meta]', e);
        if (metaTbl) metaTbl.innerHTML = `<span style="color:red;">エラー: ${e.message}</span>`;
    }
}

// =============================================================================
// モザイク保有者一覧 (v3版)
// =============================================================================

async function holder_list() {
    const pageNum = Number(document.getElementById('page_num_holder1')?.value ?? 1);
    const mosaicId = document.querySelector('.select_r')?.value ?? '';
    if (!mosaicId) {
        Swal.fire({ title: 'モザイクを選択してください', icon: 'warning' }); return;
    }

    const holderTbl = document.getElementById('holder_table');
    if (holderTbl) holderTbl.innerHTML = '<span style="color:#aaa;font-size:13px;">読み込み中...</span>';

    try {
        const moInfo = await getMosaicInfo(mosaicId);
        const div    = moInfo.divisibility ?? 0;
        const totalSupply = Number(BigInt(moInfo.supply ?? 0)) / Math.pow(10, div);

        const data = await fetchJson(new URL(
            `/accounts?mosaicId=${mosaicId}&orderBy=balance&order=desc&pageSize=100&pageNumber=${pageNum}`, NODE
        ));
        const accounts = data.data ?? [];

        // モザイク名・NS名表示
        const domMosaicRev = document.getElementById('mosaic_ID_rev');
        const domNsRev     = document.getElementById('namespace_rev');
        if (domMosaicRev) domMosaicRev.innerHTML = `<span style="font-family:monospace;font-size:13px;color:#555;">&lt; ${mosaicId} &gt;</span>`;
        if (domNsRev) {
            try {
                const nameRes  = await getMosaicsNames([mosaicId]);
                const nameEntry = nameRes?.[0];
                const n = nameEntry?.names?.[0];
                const nameStr = n && typeof n === 'object' ? n.name : (n ?? '');
                domNsRev.innerHTML = nameStr
                    ? `<big style="font-weight:bold;color:#0a5;">${nameStr}</big>`
                    : '';
            } catch { if (domNsRev) domNsRev.innerHTML = ''; }
        }

        if (!holderTbl) return;

        // ── テーブル構築 ──────────────────────────────────────────────────
        const tbl = document.createElement('table');
        tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:12px;';

        const tblHead = document.createElement('thead');
        const hdrRow  = document.createElement('tr');
        ['順位','アドレス','保有量','シェア(%)'].forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            th.style.cssText = 'background:#0a5;color:#fff;padding:6px 8px;text-align:center;white-space:nowrap;position:sticky;top:0;';
            hdrRow.appendChild(th);
        });
        tblHead.appendChild(hdrRow);
        tbl.appendChild(tblHead);

        const tblBody = document.createElement('tbody');
        const rows = []; // CSV用

        // ── NFT画像取得・表示（mosaic-center.net）─────────────────────
        const domMosaicImg = document.getElementById('mosaic_img');
        if (domMosaicImg) domMosaicImg.innerHTML = ''; // 画像をクリア
        fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${mosaicId}`)
            .then(r => r.ok ? r.json() : null)
            .then(imgData => {
                if (domMosaicImg && imgData && imgData[0] && imgData[0][7]) {
                    domMosaicImg.innerHTML = `
                        <br><div style="text-align:center;">
                            <a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                            <br><br>
                            <a href="${EXPLORER}/mosaics/${mosaicId}" target="_blank" style="display:inline-block;width:200px;">
                                <img class="mosaic_img" src="${imgData[0][7]}" width="200" style="border-radius:8px;box-shadow:0 2px 8px #0003;">
                            </a>
                        </div>`;
                }
            })
            .catch(() => {});

        accounts.forEach((entry, idx) => {
            const account = entry.account ?? entry;
            const address = account.address?.length === 48
                ? hexToAddress(account.address) : (account.address ?? '');
            const rawAmt   = account.mosaics?.find(m => m.id.toUpperCase() === mosaicId.toUpperCase())?.amount ?? 0;
            const amount   = Number(BigInt(rawAmt)) / Math.pow(10, div);
            const amountDisp = amount.toLocaleString(undefined, { minimumFractionDigits: div, maximumFractionDigits: div });
            const share    = totalSupply > 0 ? (amount / totalSupply * 100) : 0;
            const shareDisp = share.toFixed(4);
            const rank     = idx + 1 + 100 * (pageNum - 1);

            const row = document.createElement('tr');
            row.style.cssText = idx % 2 === 0 ? 'background:#e8f8f0;' : 'background:#fff;';
            if (rank <= 3) row.style.fontWeight = 'bold';

            const tdRank = document.createElement('td');
            tdRank.textContent = String(rank);
            tdRank.style.cssText = 'text-align:center;padding:5px 6px;border-bottom:1px solid #cde;white-space:nowrap;';

            const tdAddr = document.createElement('td');
            const link   = document.createElement('a');
            link.href    = `${EXPLORER}/accounts/${address}`;
            link.target  = '_blank';
            link.textContent = address;
            link.style.cssText = 'font-family:monospace;font-size:10px;word-break:break-all;color:#059;';
            tdAddr.style.cssText = 'padding:5px 6px;border-bottom:1px solid #cde;';
            tdAddr.appendChild(link);

            const tdAmt = document.createElement('td');
            tdAmt.textContent = amountDisp;
            tdAmt.style.cssText = 'text-align:right;padding:5px 8px;border-bottom:1px solid #cde;font-family:monospace;';

            const tdShare = document.createElement('td');
            tdShare.textContent = `${shareDisp}%`;
            tdShare.style.cssText = 'text-align:right;padding:5px 8px;border-bottom:1px solid #cde;color:#0a5;';

            row.append(tdRank, tdAddr, tdAmt, tdShare);
            tblBody.appendChild(row);
            rows.push([rank, address, amountDisp, `${shareDisp}%`]);
        });

        tbl.appendChild(tblBody);
        holderTbl.innerHTML = '';
        holderTbl.appendChild(tbl);

        // ── CSVダウンロードボタン ───────────────────────────────────────
        const csvBtn = document.getElementById('download_csv_button');
        if (csvBtn) {
            csvBtn.onclick = () => {
                const header = '順位,アドレス,保有量,シェア(%)';
                const csv    = [header, ...rows.map(r => r.join(','))].join('\n');
                const blob   = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url    = URL.createObjectURL(blob);
                const a      = document.createElement('a');
                a.href = url; a.download = `rich_list_${mosaicId}_p${pageNum}.csv`;
                a.click(); URL.revokeObjectURL(url);
            };
            csvBtn.style.display = rows.length > 0 ? 'inline-block' : 'none';
        }
    } catch (e) {
        console.error('[holder_list]', e);
        if (holderTbl) holderTbl.innerHTML = `<span style="color:red;">エラー: ${e.message}</span>`;
    }
}

// =============================================================================
// 有効期限計算 / NS手数料計算 (v3版)
// =============================================================================

async function ex_date1() {
    const blocks = Number(document.getElementById('Duration1')?.value ?? 0);
    const el = document.getElementById('ex_date1');
    if (!el) return;
    try {
        if (blocks === 0) { el.innerHTML = `<p style="font-size:20px;color:blue">無期限 ∞</p>`; return; }
        const chain = await getChainInfo();
        const currentBlock = await getBlockByHeight(Number(chain.height));
        const ts = Number(currentBlock.timestamp) + blocks * 30000;
        const date = new Date((epochAdjustment + ts / 1000) * 1000);
        el.innerHTML = `<p style="font-size:20px;color:blue">有効期限　${date.toLocaleString('ja-JP')}</p>`;
    } catch (e) {
        console.warn('[ex_date1]', e);
    }
}

async function ex_date2() {
    const blocks = Number(document.getElementById('Duration2')?.value ?? 0);
    const el = document.getElementById('ex_date2');
    if (!el) return;
    try {
        const chain = await getChainInfo();
        const currentBlock = await getBlockByHeight(Number(chain.height));
        const ts = Number(currentBlock.timestamp) + blocks * 30000;
        const date = new Date((epochAdjustment + ts / 1000) * 1000);
        el.innerHTML = `<p style="font-size:20px;color:blue">有効期限　${date.toLocaleString('ja-JP')}</p>`;
    } catch (e) {
        console.warn('[ex_date2]', e);
    }
}

async function feeCalc() {
    const blocks = Number(document.getElementById('Duration2')?.value ?? 0);
    const feeEl = document.getElementById('ns_fee');
    if (!feeEl) return;
    try {
        const feeRes = await fetchJson(new URL('/network/fees/rental', NODE));
        const perBlock = Number(feeRes.effectiveRootNamespaceRentalFeePerBlock ?? 0);
        const total = (blocks * perBlock / 1_000_000).toFixed(6);
        feeEl.innerHTML = `<p style="font-size:20px;color:blue">レンタル手数料　 ${Number(total).toLocaleString()} XYM</p>`;
    } catch (e) {
        console.warn('[feeCalc]', e);
    }
}

// =============================================================================
// Metadata種別UI切り替え
// =============================================================================

function MetaKey_select() {
    const metaType = document.getElementById('Meta_type')?.value ?? '';
    const domAddress = document.getElementById('meta_address');
    const domMosaic = document.getElementById('meta_mosaic');
    const domNamespace = document.getElementById('meta_namespace');

    if (metaType === '0') {
        if (domMosaic) domMosaic.style.display = 'none';
        if (domNamespace) domNamespace.style.display = 'none';
        if (domAddress) domAddress.innerHTML = `
            <div class="Form-Item_Meta">
            <p class="Form-Item-Label"><span class="Form-Item-Label-Required_Meta">Address</span></p>
            <input type="text" class="Form-Item-Input_Meta" id="Meta_address_input"
                   placeholder="${window.SSS?.activeAddress ?? ''}" />
            </div>`;
    } else if (metaType === '1') {
        if (domAddress) domAddress.innerHTML = '';
        if (domMosaic) domMosaic.style.display = 'flex';
        if (domNamespace) domNamespace.style.display = 'none';
    } else if (metaType === '2') {
        if (domAddress) domAddress.innerHTML = '';
        if (domMosaic) domMosaic.style.display = 'none';
        if (domNamespace) domNamespace.style.display = 'flex';
    } else {
        if (domAddress) domAddress.innerHTML = '';
        if (domMosaic) domMosaic.style.display = 'none';
        if (domNamespace) domNamespace.style.display = 'none';
    }
}

// =============================================================================
// マルチシグ ツリー (Canvas 2D 描画版)
// =============================================================================

// ツリー探索用キャッシュ
const _msigVisited = new Set();
const _msigNodeMap = new Map();

async function _msigFetchInfo(address) {
    try {
        const data = await getMultisigAccountInfo(address);
        return data?.multisig ?? null;
    } catch (e) {
        return null;
    }
}

async function _msigBuildTreeNode(address) {
    if (_msigVisited.has(address)) return _msigNodeMap.get(address);
    _msigVisited.add(address);
    const info = await _msigFetchInfo(address);
    const dispShort = address.slice(0, 6) + '...' + address.slice(-6);
    const isActive = (address === (window.SSS?.activeAddress ?? ''));
    const node = {
        addr: address,
        label: dispShort,
        approval: info?.minApproval ?? 0,
        removal: info?.minRemoval ?? 0,
        children: [],
        isActive,
        isMsig: (info?.cosignatoryAddresses?.length ?? 0) > 0,
    };
    _msigNodeMap.set(address, node);
    return node;
}

async function _msigFindRoots(address) {
    const info = await _msigFetchInfo(address);
    if (!info || (info.multisigAddresses ?? []).length === 0) return [address];
    const roots = [];
    for (const raw of info.multisigAddresses) {
        const addr = raw.length === 48 ? hexToAddress(raw) : raw;
        roots.push(...(await _msigFindRoots(addr)));
    }
    return roots;
}

async function _msigProcessCosignatories(address) {
    const node = await _msigBuildTreeNode(address);
    if (!node) return null;
    const info = await _msigFetchInfo(address);
    if (!info) return node;
    for (const raw of (info.cosignatoryAddresses ?? [])) {
        const childAddr = raw.length === 48 ? hexToAddress(raw) : raw;
        const child = await _msigProcessCosignatories(childAddr);
        if (child && !node.children.some(c => c.addr === child.addr)) {
            node.children.push(child);
        }
    }
    return node;
}

// getMsigGraph を使ってグラフ構造をフラットに取得
async function _msigBuildGraphData() {
    const addr = window.SSS?.activeAddress;
    if (!addr) {
        console.warn('[msigTree] SSS.activeAddress not set');
        return null;
    }
    console.log('[msigTree] fetching graph for:', addr);

    // まず自分自身の情報
    const selfInfo = await getMultisigAccountInfo(addr).catch(() => null);
    const selfMsig = selfInfo?.multisig;
    console.log('[msigTree] selfMsig:', selfMsig);

    // グラフを取得
    const graph = await getMsigGraph(addr).catch(e => { console.warn(e); return []; });
    console.log('[msigTree] graph:', graph);

    return { addr, selfMsig, graph };
}


// Canvas にツリーを描画
function _msigRenderCanvas(canvas, trees) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (!trees || trees.length === 0) {
        ctx.fillStyle = '#aaa';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('マルチシグ情報なし', W / 2, H / 2);
        return;
    }

    const NODE_W = 150, NODE_H = 50, H_GAP = 60, V_GAP = 80;

    // BFS でレイアウト計算
    function calcLayout(root, startX, startY) {
        const levels = [];
        const queue = [{ node: root, depth: 0 }];
        while (queue.length > 0) {
            const { node, depth } = queue.shift();
            if (!levels[depth]) levels[depth] = [];
            levels[depth].push(node);
            node._depth = depth;
            for (const child of (node.children ?? [])) {
                queue.push({ node: child, depth: depth + 1 });
            }
        }
        // 各ノードの x,y を設定
        for (let d = 0; d < levels.length; d++) {
            const levelNodes = levels[d];
            const totalW = levelNodes.length * NODE_W + (levelNodes.length - 1) * H_GAP;
            let x = startX + (W - totalW) / 2;
            for (const n of levelNodes) {
                n._x = x + NODE_W / 2;
                n._y = startY + d * (NODE_H + V_GAP) + NODE_H / 2;
                x += NODE_W + H_GAP;
            }
        }
        return levels.length;
    }

    let offsetY = 20;
    for (const root of trees) {
        const depth = calcLayout(root, 0, offsetY);
        offsetY += depth * (NODE_H + V_GAP) + 40;
    }

    // 接続線を描画
    function drawLines(node) {
        for (const child of (node.children ?? [])) {
            ctx.beginPath();
            ctx.strokeStyle = '#c4b5fd';
            ctx.lineWidth = 1.5;
            ctx.moveTo(node._x, node._y + NODE_H / 2);
            const midY = (node._y + child._y) / 2;
            ctx.lineTo(node._x, midY);
            ctx.lineTo(child._x, midY);
            ctx.lineTo(child._x, child._y - NODE_H / 2);
            ctx.stroke();
            drawLines(child);
        }
    }

    // ノードを描画
    function drawNode(node) {
        const x = node._x - NODE_W / 2;
        const y = node._y - NODE_H / 2;
        const r = 10;

        // 枠
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + NODE_W - r, y);
        ctx.quadraticCurveTo(x + NODE_W, y, x + NODE_W, y + r);
        ctx.lineTo(x + NODE_W, y + NODE_H - r);
        ctx.quadraticCurveTo(x + NODE_W, y + NODE_H, x + NODE_W - r, y + NODE_H);
        ctx.lineTo(x + r, y + NODE_H);
        ctx.quadraticCurveTo(x, y + NODE_H, x, y + NODE_H - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();

        if (node.isActive) {
            ctx.fillStyle = '#fef9c3';
        } else if (node.isMsig) {
            ctx.fillStyle = '#fce7f3';
        } else {
            ctx.fillStyle = '#ede9fe';
        }
        ctx.fill();
        ctx.strokeStyle = node.isMsig ? '#f9a8d4' : '#c4b5fd';
        ctx.lineWidth = 2;
        ctx.stroke();

        // ラベル
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node._x, node._y - 4);

        // 承認/削除
        if (node.approval > 0) {
            ctx.fillStyle = '#6d28d9';
            ctx.font = '10px sans-serif';
            ctx.fillText(`署名 ${node.approval} / 削除 ${node.removal}`, node._x, node._y + 12);
        }

        for (const child of (node.children ?? [])) {
            drawNode(child);
        }
    }

    for (const root of trees) {
        drawLines(root);
        drawNode(root);
    }
}

export async function loadMsigTree() {
    const container = document.getElementById('msig-tree-container');
    if (!container) { console.warn('[loadMsigTree] #msig-tree-container not found'); return; }

    container.innerHTML = '<div style="color:#888;padding:20px;text-align:center;">読み込み中...</div>';

    const activeAddr = window.SSS?.activeAddress;
    if (!activeAddr) {
        container.innerHTML = '<div style="color:#e53e3e;padding:20px;">SSSアカウント未接続</div>';
        return;
    }

    try {
        const [selfData, graph] = await Promise.all([
            getMultisigAccountInfo(activeAddr).catch(() => null),
            getMsigGraph(activeAddr).catch(() => []),
        ]);
        const selfMsig = selfData?.multisig;

        // ── ノードマップ構築 ─────────────────────────────────────────
        const toAddr = raw => (!raw ? '' : raw.length === 48 ? hexToAddress(raw) : raw.length === 39 ? raw : '');
        const nodeMap = new Map();
        const addNode = (addr, msig) => {
            if (!addr || nodeMap.has(addr)) return;
            nodeMap.set(addr, {
                minApproval: msig.minApproval ?? 0,
                minRemoval:  msig.minRemoval  ?? 0,
                cosigs:  (msig.cosignatoryAddresses ?? []).map(toAddr).filter(Boolean),
                parents: (msig.multisigAddresses    ?? []).map(toAddr).filter(Boolean),
            });
        };
        for (const lv of (graph ?? [])) {
            for (const e of (lv.multisigEntries ?? [])) {
                const msig = e.multisig ?? e;
                addNode(toAddr(msig.accountAddress ?? ''), msig);
            }
        }
        if (!nodeMap.has(activeAddr) && selfMsig) addNode(activeAddr, selfMsig);
        if (!nodeMap.has(activeAddr)) nodeMap.set(activeAddr, { minApproval:0, minRemoval:0, cosigs:[], parents:[] });

        // ── nodeMap に未登録のコサイナーを追加でフェッチ ────────────────
        // getMsigGraph は carol5 の直系パスのみ返すので、
        // 兄弟マルチシグ（例: carol2）の子が取得されない。
        // cosignatoryAddresses に出てくる未登録アドレスを追加フェッチする。
        {
            const allCosigAddrs = new Set();
            for (const info of nodeMap.values()) {
                for (const c of info.cosigs) allCosigAddrs.add(c);
            }
            const unknownAddrs = [...allCosigAddrs].filter(a => !nodeMap.has(a));
            if (unknownAddrs.length > 0) {
                const fetchResults = await Promise.all(
                    unknownAddrs.map(a => getMultisigAccountInfo(a).catch(() => null))
                );
                unknownAddrs.forEach((a, i) => {
                    const msig = fetchResults[i]?.multisig;
                    if (msig) {
                        addNode(a, msig);
                    } else {
                        // 通常アカウント（連署者のみ）
                        nodeMap.set(a, { minApproval:0, minRemoval:0, cosigs:[], parents:[] });
                    }
                });
            }
        }

                // ── ルート探索 ───────────────────────────────────────────────
        let roots = [...nodeMap.keys()].filter(a => {
            const pars = nodeMap.get(a).parents;
            return pars.length === 0 || !pars.some(p => nodeMap.has(p));
        });
        if (roots.length === 0) roots = [activeAddr];

        // ── ツリー構築 ───────────────────────────────────────────────
        // ancestors: 現在の再帰スタック（循環のみ防ぐ。同じノードが別ブランチに出ることは許可する）
        function buildNode(addr, ancestors = new Set()) {
            if (ancestors.has(addr)) return null; // 真の循環のみ防ぐ
            const info = nodeMap.get(addr) ?? { cosigs:[], parents:[], minApproval:0, minRemoval:0 };
            const newAnc = new Set(ancestors);
            newAnc.add(addr);
            return {
                addr,
                isMsig:    info.cosigs.length > 0,
                minAp:     info.minApproval,
                minRm:     info.minRemoval,
                isActive:  addr === activeAddr,
                children:  info.cosigs.map(c => buildNode(c, newAnc)).filter(Boolean),
            };
        }
        const trees = roots.map(r => buildNode(r)).filter(Boolean);

        // ── レイアウト ───────────────────────────────────────────────
        const NW=190, NH=72, HGAP=24, VGAP=60;
        function countLeaves(n) { return n.children.length === 0 ? 1 : n.children.reduce((s,c)=>s+countLeaves(c),0); }
        function layout(n, xStart, depth) {
            const leaves = countLeaves(n);
            const w = leaves*NW + (leaves-1)*HGAP;
            n._x = xStart + (w - NW) / 2;
            n._y = depth * (NH + VGAP);
            let cx = xStart;
            for (const c of n.children) {
                const cl = countLeaves(c);
                layout(c, cx, depth+1);
                cx += cl*NW + (cl-1)*HGAP + HGAP;
            }
        }
        let totalX = 0, maxDepth = 0;
        function getDepth(n, d) { maxDepth = Math.max(maxDepth, d); n.children.forEach(c=>getDepth(c,d+1)); }
        trees.forEach(t => {
            layout(t, totalX, 0);
            totalX += countLeaves(t)*NW + (countLeaves(t)-1)*HGAP + HGAP*4;
            getDepth(t, 0);
        });

        const svgW = Math.max(totalX, 500);
        const svgH = (maxDepth+1)*(NH+VGAP) + 60;

        // ── SVG 描画 ─────────────────────────────────────────────────
        const addrShort = a => a ? (a.slice(0,7)+'...'+a.slice(-7)) : '?';

        function renderNode(n) {
            const x=n._x, y=n._y+20;
            let fillAttr, strokeAttr, strokeW;
            if (n.isActive) {
                // アクティブアカウント：金色グラジェント + グロー
                fillAttr = 'url(#gradActive)';
                strokeAttr = '#f59e0b';
                strokeW = 3;
            } else if (n.isMsig) {
                fillAttr = 'url(#gradMsig)';
                strokeAttr = '#c084fc';
                strokeW = 2;
            } else {
                fillAttr = 'url(#gradCosig)';
                strokeAttr = '#67e8f9';
                strokeW = 1.5;
            }

            const labelY = n.isMsig ? y+20 : y + NH/2 + 4;
            let inner = `<text x="${x+NW/2}" y="${labelY}" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">${addrShort(n.addr)}</text>`;
            if (n.isMsig) {
                inner += `<text x="${x+NW/2}" y="${y+36}" text-anchor="middle" font-size="10" fill="#fff">最小承認者数: ${n.minAp}</text>`;
                inner += `<text x="${x+NW/2}" y="${y+50}" text-anchor="middle" font-size="10" fill="#fff">最小削除承認者数: ${n.minRm}</text>`;
            }

            // グロー効果（アクティブのみ）
            const glowEl = n.isActive
                ? `<rect x="${x-4}" y="${y-4}" width="${NW+8}" height="${NH+8}" rx="14" ry="14" fill="none" stroke="#fcd34d" stroke-width="2" opacity="0.5"/>`
                : '';

            let childSvg = '';
            for (const c of n.children) {
                const px = x+NW/2, py = y+NH;
                const cx2 = c._x+NW/2, cy2 = c._y+20;
                const midY = (py+cy2)/2;
                childSvg += `<path d="M${px},${py} L${px},${midY} L${cx2},${midY} L${cx2},${cy2}" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`;
                childSvg += renderNode(c);
            }

            return `${childSvg}
${glowEl}
<rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="10" ry="10" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokeW}"/>
${inner}`;
        }

        const allSvg = trees.map(t=>renderNode(t)).join('');

        const svgHtml = `<svg id="msig-tree-svg" xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="display:block;cursor:grab;">
  <defs>
    <linearGradient id="gradActive" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <linearGradient id="gradMsig" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <linearGradient id="gradCosig" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
  ${allSvg}
</svg>`;

        // ── Pan 可能なラッパー ────────────────────────────────────────
        container.innerHTML = `
<div style="padding:4px 8px;font-size:11px;color:#9ca3af;flex-shrink:0;">
  🟡 現在のアカウント　🟣 マルチシグ　🔵 連署者　｜ ドラッグで移動できます
</div>
<div id="msig-pan-area" style="flex:1;overflow:hidden;cursor:grab;min-height:380px;position:relative;">
  <div id="msig-pan-inner" style="position:absolute;top:0;left:0;will-change:transform;">
    ${svgHtml}
  </div>
</div>`;


        // ── ドラッグ pan ＋ ホイールズームイベント ─────────────────────
        const panArea  = document.getElementById('msig-pan-area');
        const panInner = document.getElementById('msig-pan-inner');
        let isDragging = false, startX = 0, startY = 0, translateX = 0, translateY = 0, scale = 1;
        const applyTransform = () => {
            panInner.style.transform = `translate(${translateX}px,${translateY}px) scale(${scale})`;
            panInner.style.transformOrigin = '0 0';
        };
        panArea.addEventListener('mousedown', e => {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            panArea.style.cursor = 'grabbing';
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!isDragging) return;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            applyTransform();
        });
        window.addEventListener('mouseup', () => {
            isDragging = false;
            if (panArea) panArea.style.cursor = 'grab';
        });

        // ホイールでズーム
        panArea.addEventListener('wheel', e => {
            e.preventDefault();
            const rect = panArea.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            const newScale = Math.min(3, Math.max(0.2, scale * delta));
            // ズームの中心をマウス位置に合わせる
            translateX = mouseX - (mouseX - translateX) * (newScale / scale);
            translateY = mouseY - (mouseY - translateY) * (newScale / scale);
            scale = newScale;
            applyTransform();
        }, { passive: false });

        // タッチ対応
        panArea.addEventListener('touchstart', e => {
            const t = e.touches[0];
            isDragging = true;
            startX = t.clientX - translateX;
            startY = t.clientY - translateY;
        }, { passive: true });
        panArea.addEventListener('touchmove', e => {
            if (!isDragging) return;
            const t = e.touches[0];
            translateX = t.clientX - startX;
            translateY = t.clientY - startY;
            applyTransform();
        }, { passive: true });
        panArea.addEventListener('touchend', () => { isDragging = false; });

    } catch (e) {
        console.error('[loadMsigTree] error:', e);
        container.innerHTML = `<div style="color:#e53e3e;padding:20px;">取得失敗: ${e?.message ?? String(e)}</div>`;
    }
}



