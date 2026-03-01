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
    buildRootNamespaceTx, buildSubNamespaceTx,
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
    const NODEWATCH_URL =
        'https://nodewatch.symbol.tools/api/symbol/nodes/peer?only_ssl=true&limit=10&order=random';

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
            const msgPayload = tx.message ?? '';
            const msgType = typeof msgPayload === 'object' ? (msgPayload.type ?? 0) : 0;
            let msgHex = typeof msgPayload === 'object' ? (msgPayload.payload ?? '') : msgPayload;
            const dom_message = document.createElement('div');
            dom_message.style.fontFamily = 'Hiragino Maru Gothic ProN W4';
            if (msgType === 1) {
                const dom_enc = document.createElement('div');
                dom_enc.innerHTML = `<font color="#ff00ff"><strong></br><ul class="decryption">\u6697\u53F7\u5316\u30E1\u30C3\u30BB\u30FC\u30B8</strong>\u3000< Encrypted Message ></font>`;
                dom_tx.appendChild(dom_enc);
                dom_message.innerHTML = `<font color="#4169e1">[\u6697\u53F7\u5316\u30E1\u30C3\u30BB\u30FC\u30B8]</font>`;
            } else if (msgHex) {
                // v3: メッセージはhex文字列。先頭2文字(00)を除いてUTF-8デコード
                if (msgHex.startsWith('00')) msgHex = msgHex.slice(2);
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

    // SSS チェック
    if (typeof window.isAllowedSSS === 'function') {
        console.log('SSS_Link=', window.isAllowedSSS());
        window.requestSSS?.();
        if (!window.isAllowedSSS()) {
            Swal.fire('SSS Link Error!!', 'SSSとLinkしてください。\nLink済みの場合は、ブラウザをリロードしてください。');
            return;
        }
    }

    // SDK + ノード初期化
    await loadSDK();
    const node = await getAvailableNode();
    await initNetwork(node);

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

    const activeAddress = window.SSS?.activeAddress;
    if (!activeAddress) return;

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
        // confirmed: ding2.ogg → ポップアップを閉じる → ventus.mp3
        (tx) => {
            const audio2 = new Audio('./src/ding2.ogg');
            audio2.currentTime = 0;
            audio2.play();
            const popup = document.getElementById('popup');
            if (popup) popup.classList.remove('is-show');
            const audioVentus = new Audio('./src/ventus.mp3');
            audioVentus.play();
        },
        // unconfirmed: ding.ogg → ユニコーンポップアップ表示
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

    console.log('[main] 初期化完了');
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
        const mo = await getMosaicInfo(mosaicIdHex);
        const div = mo.divisibility;
        const amount = BigInt(Math.round(Number(amountRaw) * Math.pow(10, div)));

        let msgData = message; // string(平文) または Uint8Array(暗号化済み)

        if (isEncrypted && message) {
            // 宛先の公開鍵を取得
            let recipientPubKey = null;
            try {
                const accInfo = await getAccountInfo(toAddress);
                recipientPubKey = accInfo.publicKey;
            } catch {
                Swal.fire({ title: '暗号化失敗', text: '宛先の公開鍵を取得できません。平文で送信します。', icon: 'warning' });
            }

            if (recipientPubKey) {
                // SSS でメッセージを暗号化（v2互換: setMessage→requestSignEncription）
                window.SSS.setMessage(message, recipientPubKey);
                const encMsg = await window.SSS.requestSignEncription();
                // v3: requestSignEncription は EncryptedMessage オブジェクトを返す
                // .payload が hex 文字列の場合は Uint8Array に変換して 0x01 を先頭に付与
                if (encMsg instanceof Uint8Array) {
                    msgData = encMsg; // 既に Uint8Array（0x01付き）
                } else if (encMsg && encMsg.payload) {
                    // v2互換 EncryptedMessage: payload が hex 文字列
                    const hexBytes = encMsg.payload.match(/.{1,2}/g).map(b => parseInt(b, 16));
                    msgData = new Uint8Array([0x01, ...hexBytes]);
                }
            }
        }

        const tx = buildTransferTx(toAddress, mosaicIdHex, amount, msgData, window.SSS.activePublicKey);
        const signedPayload = await signAndAnnounce(tx);
        console.log('[handleSSS] signedPayload:', signedPayload);
    } catch (e) {
        console.error('[handleSSS]', e);
        Swal.fire({ title: '送信失敗', text: e.message, icon: 'error' });
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
// マルチシグ転送
// ─────────────────────────────────────────────────────────────────────────────

async function handleSSS_msig(activeAddress) {
    console.log('[handleSSS_msig] v3実装');
}

// ─────────────────────────────────────────────────────────────────────────────
// エントリポイント
// ─────────────────────────────────────────────────────────────────────────────

// SSS と ページ読み込みを待ってから初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(main, 500));
} else {
    setTimeout(main, 500);
}
