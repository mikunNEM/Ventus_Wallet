
// モザイク情報キャッシュ（可分性取得の高速化）
const _mosaicInfoCache = new Map();
async function getMosaicInfoCached(mosaicIdHex) {
    if (_mosaicInfoCache.has(mosaicIdHex)) return _mosaicInfoCache.get(mosaicIdHex);
    const info = await getMosaicInfo(mosaicIdHex);
    _mosaicInfoCache.set(mosaicIdHex, info);
    return info;
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
    getAccountInfo, getMultisigAccountInfo,
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

    const best = pool[0];
    if (!best) {
        Swal.fire('Active Node Error!!', '使用可能なノードが見つかりませんでした。');
        return undefined;
    }

    return new URL(best.endpoint).origin;
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
            nameMap[entry.mosaicId.toUpperCase()] =
                entry.names.length > 0 ? entry.names[0] : entry.mosaicId;
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

    // セレクトボックスを生成して .form-mosaic_ID に追加（既存のセレクトは削除）
    const buildSelect = (container, cssClass) => {
        if (!container) return null;
        // 既存のselectを削除
        container.querySelectorAll('select').forEach(s => s.remove());
        const sel = document.createElement('select');
        sel.classList.add(cssClass);
        for (const m of selectMosaics) {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.name;
            sel.appendChild(opt);
        }
        container.appendChild(sel);
        return sel;
    };

    const sel1 = buildSelect(document.querySelector('.form-mosaic_ID'), 'select_m1');
    const sel2 = buildSelect(document.querySelector('.mosaic_ID2'), 'select_m1');

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

async function showTransactions(activeAddress, pageNumber) {
    const dom_txInfo = document.getElementById('wallet-transactions');
    if (!dom_txInfo) return;
    dom_txInfo.innerHTML = '';

    const params = new URLSearchParams({
        address: activeAddress,
        pageSize: 15,
        pageNumber,
        order: 'desc',
        embedded: false,
    });

    const res = await fetchJson(new URL(`/transactions/confirmed?${params}`, NODE));
    if (!res || !res.data) return;

    for (const item of res.data) {
        const tx = item.transaction;
        const meta = item.meta;
        const dom_tx = document.createElement('div');
        const txType = tx.type;

        // ⛓ Transaction Info ボタン
        const hash = meta?.hash ?? tx.hash ?? '';
        const dom_hash = document.createElement('div');
        dom_hash.innerHTML = `<p style="text-align: right"><button type="button" class="button-txinfo" id="${EXPLORER}/transactions/${hash}" onclick="transaction_info(this.id);"><i>⛓ Transaction Info ⛓</i></button></p>`;
        dom_tx.appendChild(dom_hash);

        // 日時
        const dom_date = document.createElement('div');
        dom_date.style.fontSize = '20px';
        const tsMs = Number(meta?.timestamp ?? 0);
        const txDate = new Date((epochAdjustment * 1000) + tsMs);
        const pad = n => String(n).padStart(2, '0');
        const ymdhms = `${txDate.getFullYear()}-${pad(txDate.getMonth() + 1)}-${pad(txDate.getDate())} ${pad(txDate.getHours())}:${pad(txDate.getMinutes())}:${pad(txDate.getSeconds())}`;
        dom_date.innerHTML = `<font color="#7E00FF"><p style="text-align: right">${ymdhms}</p></font>`;
        dom_tx.appendChild(dom_date);

        // Tx Type
        const dom_txType = document.createElement('div');
        dom_txType.innerHTML = `<p style="text-align: right; line-height:100%;"><font color="#0000ff">< ${getTransactionType(txType)} ></font></p>`;
        dom_tx.appendChild(dom_txType);

        // 送信者アドレス（v3: signerPublicKeyのみ返るため公開鍵→Symbolアドレスに変換）
        const _signerRaw = tx.signerAddress ?? tx.signerPublicKey ?? '';
        const signerAddr = (_signerRaw.length === 64)
            ? publicKeyToAddress(_signerRaw)      // 公開鍵 64文字 → Symbolアドレス
            : hexToAddress(_signerRaw);            // hex48文字なら変換、済みならそのまま
        const dom_signer = document.createElement('div');
        dom_signer.innerHTML = `<div class="copy_container"><font color="#2f4f4f">From : ${signerAddr}</font><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${signerAddr}" onclick="Onclick_Copy(this.id);" /></div>`;
        dom_tx.appendChild(dom_signer);

        // ── TRANSFER (16724) ──────────────────────────────────────
        if (txType === 16724) {
            const recipientAddress = hexToAddress(tx.recipientAddress ?? '');
            const dom_recipient = document.createElement('div');
            dom_recipient.innerHTML = `<div class="copy_container"><font color="#2f4f4f">To\u3000:   ${recipientAddress}</font><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${recipientAddress}" onclick="Onclick_Copy(this.id);" /></div>`;
            dom_tx.appendChild(dom_recipient);

            const isSender = signerAddr === activeAddress;
            const mosaics = tx.mosaics ?? [];

            if (mosaics.length === 0) {
                const d = document.createElement('div');
                d.innerHTML = isSender
                    ? `<font color="#FF0000">Mosaic :\u3000No mosaic</font>`
                    : `<font color="#008000">Mosaic :\u3000No mosaic</font>`;
                dom_tx.appendChild(d);
            }

            for (const m of mosaics) {
                const mosaicIdHex = m.id;
                const dom_mosaic = document.createElement('div');
                const dom_amount = document.createElement('div');
                const dom_NFT = document.createElement('div');
                const dom_mosaic_img = document.createElement('div');

                (async () => {
                    try {
                        const moInfo = await getMosaicInfo(mosaicIdHex);
                        const div = moInfo.divisibility;
                        const dispAmt = (Number(m.amount) / 10 ** div).toLocaleString(undefined, { maximumFractionDigits: 6 });
                        const mosaicNamesArr = await getMosaicsNames([mosaicIdHex]).catch(() => null);
                        const names = mosaicNamesArr?.[0]?.names ?? [];
                        const nameStr = names.length > 0 ? names[0] : mosaicIdHex;

                        if (isSender) {
                            dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :\u3000<big><strong>${nameStr}</strong></big></font>`;
                            dom_amount.innerHTML = `<font color="#FF0000" size="+1">\uD83D\uDC81\u200D\u2640\uFE0F\u27A1\uFE0F\uD83D\uDCB0 :\u3000<i><big><strong> ${dispAmt} </strong></big></i></font>`;
                        } else {
                            dom_mosaic.innerHTML = `<font color="#008000">Mosaic :\u3000<big><strong>${nameStr}</strong></big></font>`;
                            dom_amount.innerHTML = `<font color="#008000" size="+1">\uD83D\uDCB0\u27A1\uFE0F\uD83D\uDE0A :\u3000<i><big><strong> ${dispAmt} </strong></big></i></font>`;
                        }
                    } catch { }
                })();

                nftdrive(mosaicIdHex, dom_NFT);
                comsaNFT(mosaicIdHex, dom_NFT);
                comsaNCFT(mosaicIdHex, dom_NFT);

                if (mosaicIdHex !== '6BED913FA20223F8' && mosaicIdHex !== '72C0212E67A08BCE') {
                    fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${mosaicIdHex}`)
                        .then(r => r.ok ? r.json() : null)
                        .then(data => {
                            if (data) {
                                dom_mosaic_img.innerHTML = `<br><div style="text-align:center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a><br><br><a href="https://symbol.fyi/mosaics/${mosaicIdHex}" target="_blank" style="display:inline-block;width:200px;"><img class="mosaic_img" src="${data[0][7]}" width="200"></a></div><br>`;
                            }
                        }).catch(() => { });
                }

                dom_tx.appendChild(dom_mosaic);
                dom_tx.appendChild(dom_amount);
                dom_tx.appendChild(dom_NFT);
                dom_tx.appendChild(dom_mosaic_img);
                await new Promise(r => setTimeout(r, 50));
            }

            // メッセージ
            // v3 REST API: tx.message は hex 文字列 "01xxxx..."(暗号化) or "00xxxx..."(平文)
            // または旧スキーマ: { type: 0|1, payload: "hex..." }
            const msgPayload = tx.message ?? '';
            let msgType, msgHex;
            if (typeof msgPayload === 'object') {
                msgType = msgPayload.type ?? 0;
                msgHex = msgPayload.payload ?? '';
            } else if (typeof msgPayload === 'string' && msgPayload.length >= 2) {
                msgType = parseInt(msgPayload.slice(0, 2), 16); // 先頭1バイト = タイプ
                msgHex = msgPayload.slice(2);                  // 残り = 本文
            } else {
                msgType = 0;
                msgHex = '';
            }

            const dom_message = document.createElement('div');
            dom_message.style.fontFamily = 'Hiragino Maru Gothic ProN W4';

            if (msgType === 1) {
                // 暗号化メッセージ
                const senderPubKey = tx.signerPublicKey ?? tx.signerAddress ?? '';
                const dom_enc = document.createElement('div');
                dom_enc.innerHTML = `<font color="#ff00ff"><strong><br>暗号化メッセージ &nbsp;< Encrypted Message ></strong></font>`;
                dom_tx.appendChild(dom_enc);

                // 復号ボタン（v2 の Onclick_Decryption と同等）
                const dom_dec_btn = document.createElement('button');
                dom_dec_btn.type = 'button';
                dom_dec_btn.textContent = '🔓 復号する';
                dom_dec_btn.style.cssText = 'margin:4px 0; padding:4px 12px; cursor:pointer;';
                dom_dec_btn.onclick = () => Onclick_Decryption(senderPubKey, msgHex);
                dom_tx.appendChild(dom_dec_btn);

                dom_message.innerHTML = `<font color="#4169e1">[暗号化メッセージ]</font>`;
            } else if (msgHex) {
                // 平文メッセージ（hex → UTF-8 デコード）
                let displayMsg = msgHex;
                try {
                    const bytes = new Uint8Array(msgHex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
                    displayMsg = new TextDecoder().decode(bytes);
                } catch { }
                dom_message.innerHTML = `<font color="#4169e1"><br><br>< Message ><br>${displayMsg}</font>`;
            }
            dom_tx.appendChild(dom_message);
            dom_tx.appendChild(document.createElement('hr'));
        }

        // ── NAMESPACE_REGISTRATION (16717) ──────────────────────
        if (txType === 16717) {
            const dom_ns = document.createElement('div');
            const label = tx.registrationType === 0 ? 'root Namespace \u767B\u9332' : 'sub Namespace \u767B\u9332';
            dom_ns.innerHTML = `<font color="#008b8b">${label} :\u3000<big><strong>${tx.name}</strong></big></font>`;
            dom_tx.appendChild(dom_ns);
            dom_tx.appendChild(document.createElement('hr'));
        }

        // ── MOSAIC_SUPPLY_REVOCATION (17229) ──────────────────────
        if (txType === 17229) {
            const mosaicIdHex = tx.mosaicId;
            const dom_mosaic = document.createElement('div');
            const dom_amount_el = document.createElement('div');
            (async () => {
                try {
                    const moInfo = await getMosaicInfo(mosaicIdHex);
                    const div = moInfo.divisibility;
                    const dispAmt = (Number(tx.amount) / 10 ** div).toLocaleString(undefined, { maximumFractionDigits: 6 });
                    dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic \u56DE\u53CE :\u3000<big><strong>${mosaicIdHex}</strong></big></font>`;
                    dom_amount_el.innerHTML = `<font color="#3399FF" size="+1">\uD83D\uDCB0\u27A1\uFE0F\uD83D\uDE0A :\u3000<i><big><strong> ${dispAmt} </strong></big></i></font>`;
                } catch { }
            })();
            const dom_src = document.createElement('div');
            dom_src.innerHTML = `<div class="copy_container"><font color="#2f4f4f">\u267B\uFE0F\u56DE\u53CE\u5148\u267B\uFE0F :\u3000${tx.sourceAddress ?? ''}</font></div>`;
            dom_tx.appendChild(dom_src);
            dom_tx.appendChild(dom_mosaic);
            dom_tx.appendChild(dom_amount_el);
            dom_tx.appendChild(document.createElement('hr'));
        }

        // ── MOSAIC_SUPPLY_CHANGE (16973) ──────────────────────────
        if (txType === 16973) {
            const dom_mosaic = document.createElement('div');
            const label = tx.action === 0 ? '\u6E1B\u5C11\u3000\u2B07\uFE0F' : '\u5897\u52A0\u3000\u2B06\uFE0F';
            dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic :\u3000${tx.mosaicId}<br><big><strong> ${label}\u3000${Number(tx.delta)}</strong></big></font>`;
            dom_tx.appendChild(dom_mosaic);
            dom_tx.appendChild(document.createElement('hr'));
        }

        // ── AGGREGATE (16705 / 16961) ──────────────────────────────
        if (txType === 16705 || txType === 16961) {
            const dom_agg = document.createElement('div');
            dom_agg.innerHTML = `<font color="#b8860b">Aggregate Tx (${(tx.transactions ?? []).length} inner txs)</font>`;
            dom_tx.appendChild(dom_agg);
            dom_tx.appendChild(document.createElement('hr'));
        }

        // ── HASH_LOCK (16712) ──────────────────────────────────────
        if (txType === 16712) {
            const dom_hl = document.createElement('div');
            dom_hl.innerHTML = `<font color="#888">Hash Lock</font>`;
            dom_tx.appendChild(dom_hl);
            dom_tx.appendChild(document.createElement('hr'));
        }

        dom_txInfo.appendChild(dom_tx);
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
    try { initMsigAddButton(); } catch(e) { console.warn('[main] initMsigAddButton error:', e); }
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
    try { initMsigAddButton(); } catch(e) { console.warn('[initAccountAndUI] initMsigAddButton error:', e); }
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
        const moInfo = await getMosaicInfoCached(mosaicIdHex);
        const amount = BigInt(Math.round(Number(amountRaw) * Math.pow(10, moInfo.divisibility)));

        // マルチシグから送信: inner tx の signerPublicKey はマルチシグアカウント自身の公開鍵が必要
        let msigPubKey = signerPubKey;
        try {
            const acctRes = await fetch(new URL('/accounts/' + multisigAddr, NODE));
            const acctJson = await acctRes.json();
            const fetchedKey = acctJson.account?.publicKey ?? '';
            if (fetchedKey && !/^0+$/.test(fetchedKey)) msigPubKey = fetchedKey;
        } catch (e) {
            console.warn('[handleSSS_multisig] msig pubkey fetch failed', e);
        }
        const innerTx = buildEmbeddedTransferTx(toAddress, mosaicIdHex, amount, message, msigPubKey);
        const aggregateBonded = buildAggregateBondedTx([innerTx], signerPubKey, 1, 100);

        const feeXym = Number(aggregateBonded.fee.value) / 1_000_000;
        const feeEl = document.getElementById('fee_multisig');
        if (feeEl) feeEl.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${feeXym.toLocaleString(undefined, { maximumFractionDigits: 6 })} XYM</p>`;

        // 1. まず Hash Lock Tx をアナウンス
        const bondedHash = sdkCore.utils.uint8ToHex(
            facade.hashTransaction(aggregateBonded).bytes
        );
        const hashLockTx = buildHashLockTx(bondedHash, signerPubKey, XYM_ID);
        await signAndAnnounce(hashLockTx);

        // 2. WebSocket で confirmed を待って Bonded をアナウンス
        // （簡易版: Hash Lock 確認後に手動で Bonded を送信するため、少し待機）
        Swal.fire({ title: 'Hash Lock 送信済み', text: '数秒後に Aggregate Bonded を送信します...', icon: 'info', timer: 4000, showConfirmButton: false });
        await new Promise(r => setTimeout(r, 4500));

        await signAndAnnounce(aggregateBonded, true);
        Swal.fire({ title: 'マルチシグ転送を送信しました！', icon: 'success' });
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

    await _loadMsigSendMosaics(sel.value, mosaicContainer);
    sel.addEventListener('change', async () => {
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
function select_Page_mosa1() {
    const addr = window.SSS?.activeAddress;
    if (addr) Onclick_mosaic(addr);
}

// ネームスペース一覧ページ切り替え (v3版)
async function select_Page_namespace() {
    const pageNum = Number(document.getElementById('page_num_namespace')?.value ?? 1);
    const addr = window.SSS?.activeAddress;
    if (!addr) return;

    const nsTbl = document.getElementById('ns_table');
    if (nsTbl) nsTbl.innerHTML = '';
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
        const tbl = document.createElement('table');
        tbl.setAttribute('border', '1');
        const tblBody = document.createElement('tbody');

        // ヘッダー行
        const hdr = document.createElement('tr');
        ['No', 'ネームスペース', '有効期限', '種別'].forEach(h => {
            const th = document.createElement('td');
            th.textContent = h;
            th.style.textAlign = 'center';
            hdr.appendChild(th);
        });
        tblBody.appendChild(hdr);

        const nsIds = namespaces.map(ns => ns.namespace?.level0 ?? ns.id ?? '');
        let nsNameMap = {};
        if (nsIds.length > 0) {
            try {
                const names = await fetchJson(new URL('/namespaces/names', NODE), 'POST', { namespaceIds: nsIds.filter(Boolean) });
                for (const n of (names.namespaceNames ?? [])) {
                    nsNameMap[n.id?.toUpperCase()] = n.name;
                }
            } catch {}
        }

        namespaces.forEach((nsEntry, idx) => {
            const ns = nsEntry.namespace ?? nsEntry;
            const endH = Number(ns.endHeight ?? 0);
            const remainBlocks = endH - currentHeight;
            let expiryStr = '';
            if (endH === 0xFFFFFFFFFFFFFFFF || endH > 9_999_999) {
                expiryStr = '無期限 ∞';
            } else {
                const expiryTs = (currentTs + remainBlocks * 30000);
                const d = new Date((epochAdjustment + expiryTs / 1000) * 1000);
                expiryStr = d.toLocaleString('ja-JP');
            }
            const nsId = (ns.level0 ?? ns.id ?? '');
            const nsName = nsNameMap[nsId.toUpperCase?.()] ?? nsId;
            const isRoot = (ns.depth ?? 1) === 1;
            const row = document.createElement('tr');
            [
                String(idx + 1 + (pageNum - 1) * 50),
                nsName,
                expiryStr,
                isRoot ? 'ルート' : 'サブ'
            ].forEach((text, ci) => {
                const td = document.createElement('td');
                td.textContent = text;
                td.style.textAlign = ci === 0 ? 'right' : ci === 3 ? 'center' : 'left';
                row.appendChild(td);
            });
            tblBody.appendChild(row);

            // セレクトボックスにも追加
            if (nsSel && isRoot) {
                const opt = document.createElement('option');
                opt.value = nsName;
                opt.textContent = nsName;
                nsSel.appendChild(opt);
            }
        });

        tbl.appendChild(tblBody);
        nsTbl.appendChild(tbl);
    } catch (e) {
        console.error('[select_Page_namespace]', e);
    }
}

// Metadata一覧ページ切り替え (v3版)
async function select_Page_meta() {
    const pageNum = Number(document.getElementById('page_num_meta')?.value ?? 1);
    const addr = window.SSS?.activeAddress;
    if (!addr) return;

    const metaTbl = document.getElementById('meta_table');
    if (metaTbl) metaTbl.innerHTML = '';

    try {
        const data = await fetchJson(new URL(
            `/metadata?targetAddress=${addr}&pageNumber=${pageNum}&pageSize=50`, NODE
        ));
        const metas = data.data ?? [];
        if (!metaTbl) return;

        const tbl = document.createElement('table');
        tbl.setAttribute('border', '1');
        const tblBody = document.createElement('tbody');

        const hdr = document.createElement('tr');
        ['No', 'キー', '値', '送信者'].forEach(h => {
            const th = document.createElement('td');
            th.textContent = h;
            th.style.textAlign = 'center';
            hdr.appendChild(th);
        });
        tblBody.appendChild(hdr);

        metas.forEach((m, idx) => {
            const meta = m.metadataEntry ?? m;
            const row = document.createElement('tr');
            const valueHex = meta.value ?? '';
            let valueStr = '';
            try {
                valueStr = decodeURIComponent(escape(String.fromCharCode(
                    ...valueHex.match(/.{1,2}/g).map(b => parseInt(b, 16))
                )));
            } catch { valueStr = valueHex; }
            const senderAddr = meta.sourceAddress?.length === 48
                ? hexToAddress(meta.sourceAddress) : (meta.sourceAddress ?? '');
            [String(idx + 1), meta.scopedMetadataKey ?? '', valueStr, senderAddr].forEach((text, ci) => {
                const td = document.createElement('td');
                td.textContent = text;
                td.style.textAlign = ci === 0 ? 'right' : 'left';
                row.appendChild(td);
            });
            tblBody.appendChild(row);
        });

        tbl.appendChild(tblBody);
        metaTbl.appendChild(tbl);
    } catch (e) {
        console.error('[select_Page_meta]', e);
    }
}

// =============================================================================
// モザイク保有者一覧 (v3版)
// =============================================================================

async function holder_list() {
    const pageNum = Number(document.getElementById('page_num_holder1')?.value ?? 1);
    const mosaicId = document.querySelector('.select_r')?.value ?? '';
    if (!mosaicId) return;

    const holderTbl = document.getElementById('holder_table');
    if (holderTbl) holderTbl.innerHTML = '';

    try {
        const moInfo = await getMosaicInfo(mosaicId);
        const div = moInfo.divisibility;

        const data = await fetchJson(new URL(
            `/accounts?mosaicId=${mosaicId}&orderBy=balance&order=desc&pageSize=100&pageNumber=${pageNum}`, NODE
        ));
        const accounts = data.data ?? [];

        // モザイク名
        const domMosaicRev = document.getElementById('mosaic_ID_rev');
        const domNsRev = document.getElementById('namespace_rev');
        if (domMosaicRev) domMosaicRev.innerHTML = `<big>< ${mosaicId} ></big>`;
        if (domNsRev) {
            try {
                const nameRes = await getMosaicsNames([mosaicId]);
                const nameEntry = nameRes?.[0];
                const names = nameEntry?.names ?? [];
                const n = names[0];
                const nameStr = n && typeof n === 'object' ? n.name : (n ?? '');
                domNsRev.innerHTML = nameStr ? `<big>${nameStr}</big>` : '';
            } catch { domNsRev.innerHTML = ''; }
        }

        if (!holderTbl) return;
        const tbl = document.createElement('table');
        tbl.setAttribute('border', '1');
        const tblBody = document.createElement('tbody');

        const hdr = document.createElement('tr');
        ['No', 'アドレス', '保有量'].forEach(h => {
            const th = document.createElement('td');
            th.textContent = h;
            th.style.textAlign = 'center';
            hdr.appendChild(th);
        });
        tblBody.appendChild(hdr);

        accounts.forEach((entry, idx) => {
            const account = entry.account ?? entry;
            const address = account.address?.length === 48 ? hexToAddress(account.address) : (account.address ?? '');
            const rawAmount = account.mosaics?.find(m => m.id === mosaicId)?.amount ?? 0;
            const amount = (Number(rawAmount) / Math.pow(10, div)).toLocaleString(undefined, {
                minimumFractionDigits: div, maximumFractionDigits: div
            });
            const row = document.createElement('tr');
            const no = document.createElement('td');
            no.textContent = String(idx + 1 + 100 * (pageNum - 1));
            no.style.textAlign = 'right';
            const addrCell = document.createElement('td');
            const link = document.createElement('a');
            link.href = `${EXPLORER}/accounts/${address}`;
            link.target = '_blank';
            link.textContent = address;
            addrCell.appendChild(link);
            const amtCell = document.createElement('td');
            amtCell.textContent = amount;
            amtCell.style.textAlign = 'right';
            row.append(no, addrCell, amtCell);
            tblBody.appendChild(row);
        });

        tbl.appendChild(tblBody);
        holderTbl.appendChild(tbl);
    } catch (e) {
        console.error('[holder_list]', e);
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

    container.innerHTML = '<div style="color:#888;padding:20px;text-align:center;font-size:13px;">読み込み中...</div>';

    const activeAddr = window.SSS?.activeAddress;
    if (!activeAddr) {
        container.innerHTML = '<div style="color:#e53e3e;padding:20px;">SSSアカウント未接続</div>';
        return;
    }

    try {
        // ── 1. 自分の情報 + graph を取得 ──────────────────────────────
        const [selfData, graph] = await Promise.all([
            getMultisigAccountInfo(activeAddr).catch(() => null),
            getMsigGraph(activeAddr).catch(() => []),
        ]);
        const selfMsig = selfData?.multisig;
        console.log('[msigTree] graph levels:', graph?.length, 'selfMsig:', selfMsig);

        // ── 2. 全ノードを accountAddress → info のマップに収集 ────────
        const toAddr = raw => (!raw || raw === '' ? '' : raw.length === 48 ? hexToAddress(raw) : raw.length === 39 ? raw : '');
        const nodeMap = new Map(); // addr -> { minApproval, minRemoval, cosignatoryAddresses[], multisigAddresses[] }

        const addNode = (addr, msig) => {
            if (!addr || nodeMap.has(addr)) return;
            nodeMap.set(addr, {
                minApproval: msig.minApproval ?? 0,
                minRemoval:  msig.minRemoval  ?? 0,
                cosignatories: (msig.cosignatoryAddresses ?? []).map(toAddr).filter(Boolean),
                parents:       (msig.multisigAddresses    ?? []).map(toAddr).filter(Boolean),
            });
        };

        for (const levelEntry of (graph ?? [])) {
            for (const entry of (levelEntry.multisigEntries ?? [])) {
                const msig = entry.multisig ?? entry;
                const addr = toAddr(msig.accountAddress ?? '');
                if (addr) addNode(addr, msig);
            }
        }

        // 自分自身もマップに追加（leaf の場合）
        if (!nodeMap.has(activeAddr) && selfMsig) addNode(activeAddr, selfMsig);
        if (!nodeMap.has(activeAddr)) {
            nodeMap.set(activeAddr, { minApproval: 0, minRemoval: 0, cosignatories: [], parents: [] });
        }

        // ── 3. ルートを特定（parents が空 or parents が全て nodeMap 外） ──
        function findRoots() {
            const roots = [];
            for (const [addr, info] of nodeMap) {
                const hasKnownParent = info.parents.some(p => nodeMap.has(p));
                if (!hasKnownParent) roots.push(addr);
            }
            return roots.length > 0 ? roots : [activeAddr];
        }

        // ── 4. ツリーノードを再帰構築 ─────────────────────────────────
        function buildNode(addr, visited = new Set()) {
            if (visited.has(addr)) return null;
            visited.add(addr);
            const info = nodeMap.get(addr) ?? { minApproval: 0, minRemoval: 0, cosignatories: [], parents: [] };
            const children = info.cosignatories
                .map(c => buildNode(c, visited))
                .filter(Boolean);
            return {
                addr,
                isMsig: info.cosignatories.length > 0,
                minApproval: info.minApproval,
                minRemoval:  info.minRemoval,
                isActive: addr === activeAddr,
                children,
            };
        }

        const roots = findRoots();
        const trees = roots.map(r => buildNode(r)).filter(Boolean);

        if (trees.length === 0) {
            container.innerHTML = '<div style="color:#888;padding:20px;text-align:center;">マルチシグ情報がありません</div>';
            return;
        }

        // ── 5. レイアウト計算 ─────────────────────────────────────────
        const NODE_W = 180, NODE_H = 72, H_GAP = 24, V_GAP = 60;

        function countLeaves(node) {
            if (node.children.length === 0) return 1;
            return node.children.reduce((s, c) => s + countLeaves(c), 0);
        }

        function assignPositions(node, xStart, depth) {
            const leaves = countLeaves(node);
            const w = leaves * NODE_W + (leaves - 1) * H_GAP;
            node._x = xStart + w / 2 - NODE_W / 2;
            node._y = depth * (NODE_H + V_GAP);
            let childX = xStart;
            for (const child of node.children) {
                const childLeaves = countLeaves(child);
                const childW = childLeaves * NODE_W + (childLeaves - 1) * H_GAP;
                assignPositions(child, childX, depth + 1);
                childX += childW + H_GAP;
            }
        }

        // 複数ルートを横に並べる
        let totalX = 0;
        let maxDepth = 0;
        function getMaxDepth(node, d) {
            maxDepth = Math.max(maxDepth, d);
            node.children.forEach(c => getMaxDepth(c, d + 1));
        }
        trees.forEach(t => {
            assignPositions(t, totalX, 0);
            const leaves = countLeaves(t);
            totalX += leaves * NODE_W + (leaves - 1) * H_GAP + H_GAP * 4;
            getMaxDepth(t, 0);
        });

        const svgW = Math.max(totalX, 400);
        const svgH = (maxDepth + 1) * (NODE_H + V_GAP) + 40;

        // ── 6. SVG 描画 ──────────────────────────────────────────────
        const addrShort = a => a ? (a.slice(0, 6) + '...' + a.slice(-6)) : '?';

        function renderNode(node) {
            const x = node._x, y = node._y + 20;
            const bg = node.isActive ? '#a78bfa' : node.isMsig ? 'url(#gradMsig)' : 'url(#gradCosig)';
            const stroke = node.isActive ? '#7c3aed' : node.isMsig ? '#c084fc' : '#67e8f9';

            let lines = `<text x="${x + NODE_W / 2}" y="${y + 20}" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">${addrShort(node.addr)}</text>`;
            if (node.isMsig) {
                lines += `<text x="${x + NODE_W / 2}" y="${y + 36}" text-anchor="middle" font-size="10" fill="#e9d5ff">最小承認者数: ${node.minApproval}</text>`;
                lines += `<text x="${x + NODE_W / 2}" y="${y + 50}" text-anchor="middle" font-size="10" fill="#e9d5ff">最小削除承認者数: ${node.minRemoval}</text>`;
            }

            let childSvg = '';
            for (const child of node.children) {
                const cx = child._x + NODE_W / 2;
                const cy = child._y + 20;
                const px = x + NODE_W / 2;
                const py = y + NODE_H;
                const midY = (py + cy) / 2;
                childSvg += `<path d="M${px},${py} L${px},${midY} L${cx},${midY} L${cx},${cy}" fill="none" stroke="#94a3b8" stroke-width="1.5"/>`;
                childSvg += renderNode(child);
            }

            return `${childSvg}
<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="10" ry="10"
      fill="${bg}" stroke="${stroke}" stroke-width="2"/>
${lines}`;
        }

        const allNodesSvg = trees.map(t => renderNode(t)).join('');

        const svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" style="font-family:sans-serif;min-width:${svgW}px;">
  <defs>
    <linearGradient id="gradMsig" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#c084fc"/>
    </linearGradient>
    <linearGradient id="gradCosig" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
  ${allNodesSvg}
</svg>`;

        container.innerHTML = `<div style="overflow:auto;padding:12px;">${svgHtml}</div>`;

    } catch (e) {
        console.error('[loadMsigTree] error:', e);
        container.innerHTML = `<div style="color:#e53e3e;padding:20px;">取得失敗: ${e?.message ?? String(e)}</div>`;
    }
}


