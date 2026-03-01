/**
 * config.js - Ventus ネットワーク設定・グローバル状態管理 (Symbol SDK v3)
 */

// ── SDK参照（loadSDK後に設定）──────────────────────────────────
export let sdkCore = null;
export let sdkSymbol = null;
export let facade = null;

// ── ネットワーク状態 ─────────────────────────────────────────────
export let NODE = null;
export let epochAdjustment = null;
export let networkType = null;   // 104 = MAIN_NET, 152 = TEST_NET
export let identifier = null;    // 'mainnet' or 'testnet'

// ── ネットワーク定数 ─────────────────────────────────────────────
export const NETWORK_CONFIG = {
    MAIN_NET: {
        networkType: 104,
        epochAdjustment: 1615853185,
        XYM_ID: '6BED913FA20223F8',
        EXPLORER: 'https://symbol.fyi',
        GRACE_BLOCK: 86400,
        FAUCET: null,
    },
    TEST_NET: {
        networkType: 152,
        epochAdjustment: 1667250467,
        XYM_ID: '72C0212E67A08BCE',
        EXPLORER: 'https://testnet.symbol.fyi',
        GRACE_BLOCK: 2880,
        FAUCET: 'https://testnet.symbol.tools/',
    },
};

export const TOTAL_CHAIN_IMPORTANCE = 78429286;
export const SDK_VERSION = '3.3.0';

// ── 現在のアクティブ設定（initNetwork後に設定）────────────────────
export let XYM_ID = null;
export let EXPLORER = null;
export let GRACE_BLOCK = null;

/**
 * Symbol SDK v3 を読み込む
 */
export async function loadSDK() {
    const sdk = await import(`https://unpkg.com/symbol-sdk@${SDK_VERSION}/dist/bundle.web.js`);
    sdkCore = sdk.core;
    sdkSymbol = sdk.symbol;
    return { sdkCore, sdkSymbol };
}

/**
 * ネットワーク情報を初期化する
 * @param {string} node - ノードURL
 */
export async function initNetwork(node) {
    NODE = node;

    const res = await fetch(new URL('/network/properties', NODE), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();

    const e = json.network.epochAdjustment;
    epochAdjustment = Number(e.substring(0, e.length - 1));
    identifier = json.network.identifier;  // 'mainnet' or 'testnet'
    networkType = identifier === 'mainnet' ? 104 : 152;

    facade = new sdkSymbol.SymbolFacade(identifier);

    const cfg = networkType === 104 ? NETWORK_CONFIG.MAIN_NET : NETWORK_CONFIG.TEST_NET;
    XYM_ID = cfg.XYM_ID;
    EXPLORER = cfg.EXPLORER;
    GRACE_BLOCK = cfg.GRACE_BLOCK;

    console.log(`[config] Network: ${identifier}, Node: ${NODE}`);
    return { facade, epochAdjustment, networkType, identifier };
}

/**
 * 公開鍵（64文字hex）をSymbolアドレス（NXXXXX... 39文字）に変換する
 * initNetwork() 完了後に使用可能
 * @param {string} publicKeyHex
 * @returns {string}
 */
export function publicKeyToAddress(publicKeyHex) {
    if (!facade || !publicKeyHex || publicKeyHex.length !== 64) return publicKeyHex;
    try {
        const pubKey = new sdkCore.PublicKey(publicKeyHex);
        return facade.network.publicKeyToAddress(pubKey).toString();
    } catch {
        return publicKeyHex;
    }
}
