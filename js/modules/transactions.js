/**
 * transactions.js - Symbol SDK v3 トランザクション作成・アナウンス
 *
 * v2: sym.TransferTransaction.create(...).setMaxFee(100)
 * v3: facade.createTransactionFromTypedDescriptor(descriptor, pubkey, 100, deadline)
 */

import { facade, sdkCore, sdkSymbol } from './config.js';
import { announceTransaction } from './symbolApi.js';

const DEADLINE_SEC = 60 * 60 * 2; // 2時間

// ─────────────────────────────────────────────────────────────────────────────
// SSS 連携ヘルパー
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SSSでトランザクションに署名してアナウンスする（通常Tx・Aggregate Complete）
 * v2: window.SSS.setTransaction(txObj); window.SSS.requestSign()...txRepo.announce()
 * v3: setTransactionByPayload(hex) → requestSign() → fetch PUT /transactions
 *
 * @param {object} tx - facade.createTransactionFromTypedDescriptor で作成したTx
 * @param {boolean} isBonded - AggregateBondedの場合 true
 * @returns {Promise<{hash: string, payload: string}>}
 */
export async function signAndAnnounce(tx, isBonded = false) {
    const payload = sdkCore.utils.uint8ToHex(tx.serialize());
    window.SSS.setTransactionByPayload(payload);
    const signedPayload = await window.SSS.requestSign();
    await announceTransaction(signedPayload.payload, isBonded);
    return signedPayload;
}

// ─────────────────────────────────────────────────────────────────────────────
// 転送トランザクション
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 転送Txを作成する
 * v2: sym.TransferTransaction.create(deadline, to, [mosaic], msg, networkType).setMaxFee(100)
 *
 * @param {string} recipientAddress - 39文字アドレス or ネームスペース名
 * @param {string} mosaicIdHex       - モザイクID (16進数)
 * @param {bigint|number} amount     - 絶対量（可分性適用済み）
 * @param {string} message           - プレーンメッセージ
 * @param {string} signerPubKey      - 署名者公開鍵 (window.SSS.activePublicKey)
 * @param {number} feeMultiplier     - 手数料乗数 (default: 100)
 */
export function buildTransferTx(recipientAddress, mosaicIdHex, amount, message, signerPubKey, feeMultiplier = 100) {
    const to = new sdkSymbol.Address(recipientAddress);
    // message が Uint8Array（暗号化済み）ならそのまま使用、string(平文)なら 0x00 プレフィックス付与
    const msgBytes = (message instanceof Uint8Array)
        ? message
        : new Uint8Array([0x00, ...new TextEncoder().encode(message)]);

    const descriptor = new sdkSymbol.descriptors.TransferTransactionV1Descriptor(
        to,
        [
            new sdkSymbol.descriptors.UnresolvedMosaicDescriptor(
                new sdkSymbol.models.UnresolvedMosaicId(BigInt('0x' + mosaicIdHex)),
                new sdkSymbol.models.Amount(BigInt(amount))
            )
        ],
        msgBytes
    );

    return facade.createTransactionFromTypedDescriptor(
        descriptor, signerPubKey, feeMultiplier, DEADLINE_SEC
    );
}

/**
 * 埋め込み転送Txを作成する（Aggregate内部用）
 */
export function buildEmbeddedTransferTx(recipientAddress, mosaicIdHex, amount, message, signerPubKey) {
    const to = new sdkSymbol.Address(recipientAddress);
    // message が Uint8Array（暗号化済み）ならそのまま使用、string(平文)なら 0x00 プレフィックス付与
    const msgBytes = (message instanceof Uint8Array)
        ? message
        : new Uint8Array([0x00, ...new TextEncoder().encode(message)]);

    const descriptor = new sdkSymbol.descriptors.TransferTransactionV1Descriptor(
        to,
        [
            new sdkSymbol.descriptors.UnresolvedMosaicDescriptor(
                new sdkSymbol.models.UnresolvedMosaicId(BigInt('0x' + mosaicIdHex)),
                new sdkSymbol.models.Amount(BigInt(amount))
            )
        ],
        msgBytes
    );

    return facade.createEmbeddedTransactionFromTypedDescriptor(descriptor, signerPubKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregate トランザクション
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate Complete Tx を作成する
 * v2: sym.AggregateTransaction.createComplete(...).setMaxFeeForAggregate(100, cosigCount)
 *
 * @param {object[]} embeddedTxs   - buildEmbedded* で作成した内部Tx配列
 * @param {string} signerPubKey    - 署名者公開鍵
 * @param {number} cosigCount      - 追加連署者数
 * @param {number} feeMultiplier
 */
export function buildAggregateCompleteTx(embeddedTxs, signerPubKey, cosigCount = 0, feeMultiplier = 100) {
    const descriptor = new sdkSymbol.descriptors.AggregateCompleteTransactionV3Descriptor(
        facade.constructor.hashEmbeddedTransactions(embeddedTxs),
        embeddedTxs
    );
    return facade.createTransactionFromTypedDescriptor(
        descriptor, signerPubKey, feeMultiplier, DEADLINE_SEC, cosigCount
    );
}

/**
 * Aggregate Bonded Tx を作成する
 * v2: sym.AggregateTransaction.createBonded(...).setMaxFeeForAggregate(100, cosigCount)
 */
export function buildAggregateBondedTx(embeddedTxs, signerPubKey, cosigCount = 1, feeMultiplier = 100) {
    const descriptor = new sdkSymbol.descriptors.AggregateBondedTransactionV3Descriptor(
        facade.constructor.hashEmbeddedTransactions(embeddedTxs),
        embeddedTxs
    );
    return facade.createTransactionFromTypedDescriptor(
        descriptor, signerPubKey, feeMultiplier, DEADLINE_SEC * 24, cosigCount  // Bonded: 48時間
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hash Lock トランザクション
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hash Lock Tx を作成する（AggregateBonded アナウンス前に必要）
 * v2: sym.HashLockTransaction.create(deadline, mosaic(10XYM), 5760blocks, signedAggregateTx, networkType)
 *
 * @param {string} bondedTxPayloadHex  - signAndAnnounce の signedPayload.hash
 * @param {string} signerPubKey
 * @param {string} xymMosaicIdHex      - XYMのモザイクID
 */
export function buildHashLockTx(bondedTxHash, signerPubKey, xymMosaicIdHex, feeMultiplier = 100) {
    const descriptor = new sdkSymbol.descriptors.HashLockTransactionV1Descriptor(
        new sdkSymbol.descriptors.UnresolvedMosaicDescriptor(
            new sdkSymbol.models.UnresolvedMosaicId(BigInt('0x' + xymMosaicIdHex)),
            new sdkSymbol.models.Amount(10_000_000n)  // 固定値: 10 XYM
        ),
        new sdkSymbol.models.BlockDuration(5760n),  // 固定値: 5760ブロック
        new sdkCore.Hash256(bondedTxHash)
    );
    return facade.createTransactionFromTypedDescriptor(
        descriptor, signerPubKey, feeMultiplier, DEADLINE_SEC
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// メタデータ トランザクション
// ─────────────────────────────────────────────────────────────────────────────

/**
 * アカウントメタデータ埋め込みTxを作成する
 * v2: metaService.createAccountMetadataTransaction(...)
 *
 * @param {string} targetAddress
 * @param {bigint} key             - sdkSymbol.metadataGenerateKey("keyName")
 * @param {Uint8Array} newValue
 * @param {Uint8Array|null} oldValue - 既存の値（差分計算用）
 * @param {string} signerPubKey
 */
export function buildAccountMetadataEmbeddedTx(targetAddress, key, newValue, oldValue, signerPubKey) {
    let sizeDelta = newValue.length;
    let updatedValue = newValue;
    if (oldValue) {
        sizeDelta -= oldValue.length;
        updatedValue = sdkSymbol.metadataUpdateValue(oldValue, newValue);
    }

    const descriptor = new sdkSymbol.descriptors.AccountMetadataTransactionV1Descriptor(
        new sdkSymbol.Address(targetAddress),
        key,
        sizeDelta,
        updatedValue
    );
    return facade.createEmbeddedTransactionFromTypedDescriptor(descriptor, signerPubKey);
}

/**
 * モザイクメタデータ埋め込みTxを作成する
 */
export function buildMosaicMetadataEmbeddedTx(targetAddress, mosaicIdHex, key, newValue, oldValue, signerPubKey) {
    let sizeDelta = newValue.length;
    let updatedValue = newValue;
    if (oldValue) {
        sizeDelta -= oldValue.length;
        updatedValue = sdkSymbol.metadataUpdateValue(oldValue, newValue);
    }

    const descriptor = new sdkSymbol.descriptors.MosaicMetadataTransactionV1Descriptor(
        new sdkSymbol.Address(targetAddress),
        key,
        sizeDelta,
        updatedValue,
        new sdkSymbol.models.UnresolvedMosaicId(BigInt('0x' + mosaicIdHex))
    );
    return facade.createEmbeddedTransactionFromTypedDescriptor(descriptor, signerPubKey);
}

/**
 * ネームスペースメタデータ埋め込みTxを作成する
 */
export function buildNamespaceMetadataEmbeddedTx(targetAddress, namespaceIdHex, key, newValue, oldValue, signerPubKey) {
    let sizeDelta = newValue.length;
    let updatedValue = newValue;
    if (oldValue) {
        sizeDelta -= oldValue.length;
        updatedValue = sdkSymbol.metadataUpdateValue(oldValue, newValue);
    }

    const descriptor = new sdkSymbol.descriptors.NamespaceMetadataTransactionV1Descriptor(
        new sdkSymbol.Address(targetAddress),
        key,
        sizeDelta,
        updatedValue,
        new sdkSymbol.models.NamespaceId(BigInt('0x' + namespaceIdHex))
    );
    return facade.createEmbeddedTransactionFromTypedDescriptor(descriptor, signerPubKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// モザイク定義・変更
// ─────────────────────────────────────────────────────────────────────────────

/**
 * モザイク定義 + 供給量変更の埋め込みTxペアを作成する
 * v2: sym.MosaicDefinitionTransaction.create(...) + sym.MosaicSupplyChangeTransaction.create(...)
 *
 * @param {boolean} supplyMutable
 * @param {boolean} transferable
 * @param {boolean} restrictable
 * @param {boolean} revokable
 * @param {number} divisibility
 * @param {bigint} durationBlocks    - 0 = 無期限
 * @param {bigint} supplyAmount      - 絶対量
 * @param {string} signerPubKey
 * @returns {{defTx, supplyTx, nonce}}
 */
export function buildMosaicDefinitionEmbeddedTxs(
    supplyMutable, transferable, restrictable, revokable,
    divisibility, durationBlocks, supplyAmount, signerPubKey
) {
    const address = new sdkSymbol.Address(
        facade.network.publicKeyToAddress(new sdkCore.PublicKey(signerPubKey)).toString()
    );
    const nonce = sdkSymbol.generateMosaicId(address, Math.floor(Math.random() * 0xFFFFFFFF));

    const flags = (supplyMutable ? 0x01 : 0) | (transferable ? 0x02 : 0)
        | (restrictable ? 0x04 : 0) | (revokable ? 0x08 : 0);

    const defDescriptor = new sdkSymbol.descriptors.MosaicDefinitionTransactionV1Descriptor(
        nonce,
        new sdkSymbol.models.MosaicFlags(flags),
        divisibility,
        new sdkSymbol.models.BlockDuration(durationBlocks)
    );
    const defTx = facade.createEmbeddedTransactionFromTypedDescriptor(defDescriptor, signerPubKey);

    const supplyDescriptor = new sdkSymbol.descriptors.MosaicSupplyChangeTransactionV1Descriptor(
        new sdkSymbol.models.UnresolvedMosaicId(nonce),
        new sdkSymbol.models.MosaicSupplyChangeAction.INCREASE,
        new sdkSymbol.models.Amount(supplyAmount)
    );
    const supplyTx = facade.createEmbeddedTransactionFromTypedDescriptor(supplyDescriptor, signerPubKey);

    return { defTx, supplyTx, nonce };
}

// ─────────────────────────────────────────────────────────────────────────────
// ネームスペース登録
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ルートネームスペース登録Txを作成する
 * v2: sym.NamespaceRegistrationTransaction.createRootNamespace(...)
 */
export function buildRootNamespaceTx(namespaceName, durationBlocks, signerPubKey, feeMultiplier = 100) {
    const descriptor = new sdkSymbol.descriptors.NamespaceRegistrationTransactionV1Descriptor(
        new sdkSymbol.models.BlockDuration(BigInt(durationBlocks)),
        null,  // parentId: null = ルート
        namespaceName
    );
    return facade.createTransactionFromTypedDescriptor(descriptor, signerPubKey, feeMultiplier, DEADLINE_SEC);
}

/**
 * サブネームスペース登録Txを作成する
 * v2: sym.NamespaceRegistrationTransaction.createSubNamespace(...)
 */
export function buildSubNamespaceTx(subName, parentNamespaceIdHex, signerPubKey, feeMultiplier = 100) {
    const descriptor = new sdkSymbol.descriptors.NamespaceRegistrationTransactionV1Descriptor(
        null,  // duration: null = サブ
        new sdkSymbol.models.NamespaceId(BigInt('0x' + parentNamespaceIdHex)),
        subName
    );
    return facade.createTransactionFromTypedDescriptor(descriptor, signerPubKey, feeMultiplier, DEADLINE_SEC);
}

// ─────────────────────────────────────────────────────────────────────────────
// マルチシグ変更
// ─────────────────────────────────────────────────────────────────────────────

/**
 * マルチシグアカウント変更の埋め込みTxを作成する
 * v2: sym.MultisigAccountModificationTransaction.create(...)
 *
 * @param {number} minApprovalDelta
 * @param {number} minRemovalDelta
 * @param {string[]} addAddresses    - 追加する連署者アドレス配列
 * @param {string[]} removeAddresses - 削除する連署者アドレス配列
 * @param {string} signerPubKey
 */
export function buildMultisigModificationEmbeddedTx(
    minApprovalDelta, minRemovalDelta, addAddresses, removeAddresses, signerPubKey
) {
    const descriptor = new sdkSymbol.descriptors.MultisigAccountModificationTransactionV1Descriptor(
        minApprovalDelta,
        minRemovalDelta,
        addAddresses.map(a => new sdkSymbol.Address(a)),
        removeAddresses.map(a => new sdkSymbol.Address(a))
    );
    return facade.createEmbeddedTransactionFromTypedDescriptor(descriptor, signerPubKey);
}
