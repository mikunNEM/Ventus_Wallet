window.onload = function () {     // ハンバーガーメニュー
  var nav = document.getElementById('nav-wrapper');
  var hamburger = document.getElementById('js-hamburger');
  var blackBg = document.getElementById('js-black-bg');

  hamburger.addEventListener('click', function () {
    nav.classList.toggle('open');
  });
  blackBg.addEventListener('click', function () {
    nav.classList.remove('open');
  });
};

let harvestPageNumber = 0;

const dom_version = document.getElementById('version');
dom_version.innerHTML = `v1.1.0　|　Powered by SYMBOL`;


const sym = require('/node_modules/symbol-sdk');
const op = require("/node_modules/rxjs/operators");
const rxjs = require("/node_modules/rxjs");
const metal = require("/node_modules/metal-on-symbol");
const totalChainImportance = 78429286;

let epochAdjustment;
//let generationHash;
let NODE;
let networkType;
let XYM_ID;
let repo;
let accountRepo;
let txRepo;
let receiptRepo;
let mosaicRepo;
let nsRepo;
let nwRepo;
let chainRepo;
let blockRepo1;
let nodeRepo;
let EXPLORER;
let grace_block;
let metaRepo;
let metaService;
let resMosaicRepo;
let msigRepo;
let cosig = [];
let cosig2 = [];
let cosig_del = [];
let msig;
let inputValue;

setTimeout(() => {  //////////////////  指定した時間後に実行する  ////////////////////////////////////////////////

  getActiveNode().then(result => {  // アクティブなノードを渡す

    if (result === undefined) {
      Swal.fire(`Active Node Error !!`)
      return;
    }

    console.log("SSS_Link=", window.isAllowedSSS());
    window.requestSSS();    // SSSと連携されてない場合、右下にメッセージが出る

    if (isAllowedSSS() === false) {
      Swal.fire('SSS Link Error!!', `SSSとLinkしてください。
      Link済みの場合は、ブラウザをリロードしてください。`);
      return;
    }

    console.log("getActiveNode 戻り値 : ", result);
    NODE = result;
    const dom_netType = document.getElementById('netType');  // network Type を表示
    const dom_account_name = document.getElementById('account_name'); // account_name 表示　

    repo = new sym.RepositoryFactoryHttp(NODE);      // RepositoryFactoryはSymbol-SDKで提供されるアカウントやモザイク等の機能を提供するRepositoryを作成するためのもの
    accountRepo = repo.createAccountRepository();
    txRepo = repo.createTransactionRepository();
    receiptRepo = repo.createReceiptRepository();
    mosaicRepo = repo.createMosaicRepository();
    nsRepo = repo.createNamespaceRepository();
    nwRepo = repo.createNetworkRepository();
    chainRepo = repo.createChainRepository();
    blockRepo1 = repo.createBlockRepository();
    nodeRepo = repo.createNodeRepository();
    metaRepo = repo.createMetadataRepository();
    metaService = new sym.MetadataTransactionService(metaRepo);
    resMosaicRepo = repo.createRestrictionMosaicRepository();
    resAccountRepo = repo.createRestrictionAccountRepository();
    msigRepo = repo.createMultisigRepository();

    if (window.SSS.activeNetworkType === 104) { //MAIN_NET     
      epochAdjustment = 1615853185;
      networkType = sym.NetworkType.MAIN_NET;
      XYM_ID = '6BED913FA20223F8';
      //generationHash = '57F7DA205008026C776CB6AED843393F04CD458E0AA2D9F1D5F31A402072B2D6';
      EXPLORER = "https://symbol.fyi";
      grace_block = 86400;
      dom_netType.innerHTML = `<font color="#ff00ff">< MAIN_NET ></font>`
      dom_account_name.innerHTML = `<font color="#ff00ff">${window.SSS.activeName}</font>`
      console.log("MAIN_NET");
    }

    if (window.SSS.activeNetworkType === 152) { //TEST_NET 
      epochAdjustment = 1667250467;
      networkType = sym.NetworkType.TEST_NET;
      XYM_ID = '72C0212E67A08BCE';
      //generationHash = '49D6E1CE276A85B70EAFE52349AACCA389302E7A9754BCF1221E79494FC665A4';
      EXPLORER = "https://testnet.symbol.fyi";
      grace_block = 2880;
      dom_netType.innerHTML = `<font color="ff8c00">< TEST_NET ></font>`
      dom_account_name.innerHTML = `<font color="#ff8c00">${window.SSS.activeName}</font>`
      console.log("TEST_NET");
    }

    const address = sym.Address.createFromRawAddress(window.SSS.activeAddress);

    console.log("activeAddress=", address.address);

    const dom_addr = document.getElementById('wallet-addr');
    //dom_addr.innerText = address.pretty();                         // address.pretty() アドレスがハイフンで区切られた文字列で表示される
    dom_addr.innerHTML = `<div class="copy_container"> ${address.address}<input type="image" src="src/copy.png" class="copy_bt" height="30px" id="${address.address}" onclick="Onclick_Copy(this.id);" /></div>`;          // ハイフン無しでアドレスを表示 　& 　コピーボタンを設置

    console.log("address= wallet-addr", address);//////////////////////////////////////////////////////////////////////////////////////////////////  

    const dom_explorer = document.getElementById('explorer');  // Wallet 右上のExplorerリンク
    dom_explorer.innerHTML = `<a href="${EXPLORER}/accounts/${address.address}" target="_blank" rel="noopener noreferrer"> Symbol Explorer </a>`;

    const dom_faucet = document.getElementById('faucet');  // Wallet 右上のFaucetリンク
    //dom_faucet.innerHTML =`<a style="color: blue"><i>　　MAIN NET</style></i></a>`;
    if (networkType === 152) { // テストネットの場合表示
      dom_faucet.innerHTML = `<a href="https://testnet.symbol.tools/?recipient=${window.SSS.activeAddress}" target="_blank" rel="noopener noreferrer"> 🚰  Faucet🚰 </a>`;
    }

    const dom_xembook = document.getElementById('xembook');  // Wallet 右上のxembookリンク
    //dom_xembook.innerHTML =`<a style="color: blue"><i>　　TEST NET</i></a>`;
    if (networkType === 104) { // メインネットの場合表示
      dom_xembook.innerHTML = `<a href="https://xembook.github.io/xembook/?address=${window.SSS.activeAddress}" target="_blank" rel="noopener noreferrer"> XEMBook </a>`;
    }

    const dom_nftdrive_explorer = document.getElementById('nftdrive_explorer');  // Wallet 右上の nftdrive リンク
    dom_nftdrive_explorer.innerHTML = `<a href="https://nftdrive-explorer.info/?address=${window.SSS.activeAddress}" target="_blank" rel="noopener noreferrer"> NFT-Drive Explorer </a>`;

    const dom_hv_checker = document.getElementById('hv_checker');  // Wallet 右上のhv_checkerリンク
    dom_hv_checker.innerHTML = `<a href="https://ventus-wallet.net/HV_Checker" target="_blank" rel="noopener noreferrer"> 🌾 Harvest Checker 🌾</a>`;

    const dom_QR_Auth = document.getElementById('QR_Auth');  // Wallet 右上のQR_Authリンク 
    dom_QR_Auth.innerHTML = `<a href="https://ventus-wallet.net/QR_Auth/" target="_blank" rel="noopener noreferrer"> QRモザイク認証 </a>`;


    ///////////////////////////////////////////////    アカウント情報を取得する     ////////////////////////////////////////////

    accountRepo.getAccountInfo(address)
      .toPromise()
      .then((accountInfo) => {
        console.log("accountInfo=", accountInfo)
        console.log("account_Mosaics =", accountInfo.mosaics.length);

        const addr = document.getElementById('aInfo-addr');  // アクティブアドレス
        addr.innerHTML = `<div style="text-align: center;padding-top: 8px"><big><font color="green">${address.address}</font></big></div>`;

        const pubkey = document.getElementById('aInfo-pubkey');  // 公開鍵
        pubkey.innerHTML = `<div style="text-align: center;padding-top: 8px"><big><font color="green">${window.SSS.activePublicKey}</font></big></div>`;

        const impo = document.getElementById('importance');  // インポータンス表示
        let accountImportance = Number(accountInfo.importance.toString()) / totalChainImportance;
        if (accountImportance > 0) {
          accountImportance = Math.round(accountImportance);
          accountImportance /= 1000000;
        }

        impo.innerHTML = `<div style="text-align: center;padding-top: 8px"><big><font color="green">${accountImportance} ％</font></big></div>`;

        const hv_status = document.getElementById('hv_status');
        const hv_node = document.getElementById('hv_node');

        if (accountInfo.supplementalPublicKeys.linked !== undefined) {  //  account pubkey
          const account_pubkey = accountInfo.supplementalPublicKeys.linked.publicKey;
          //console.log("account_pubkey===============",account_pubkey);


          if (accountInfo.supplementalPublicKeys.node !== undefined) {   //  node pubkey
            const node_pubkey = accountInfo.supplementalPublicKeys.node.publicKey;
            //console.log("node_pubkey===============",node_pubkey);

            let xhr = new XMLHttpRequest();
            if (networkType === 152) {
              xhr.open("GET", `https://testnet.symbol.services/nodes/nodePublicKey/${node_pubkey}`, false);
            }
            if (networkType === 104) {
              xhr.open("GET", `https://symbol.services/nodes/nodePublicKey/${node_pubkey}`, false);
            }

            let data;
            let data2;
            xhr.send(null);
            if (xhr.status == 200) {
              data = xhr.response;
              data = JSON.parse(data);
              console.log("%cノード=", "color: red", data.host);

              let xhr2 = new XMLHttpRequest();
              xhr2.open("GET", `https://${data.host}:3001/node/unlockedaccount`, false);
              xhr2.send(null);
              if (xhr2.status == 200) {
                data2 = xhr2.response;
                data2 = JSON.parse(data2);
                //console.log("%c委任公開鍵=","color: red",data2);

                if (searchArray(data2.unlockedAccount, account_pubkey)) {
                  console.log(`有効🟢`);
                  hv_status.innerHTML = `🟢 有効`
                  hv_node.innerHTML = `委任ノード　:　${data.host}`
                } else {
                  console.log(`無効🔴`);
                  hv_status.innerHTML = `🔴 無効 `
                }
              } else {
                console.log(`Error: ${xhr2.status}`);
              }
            } else {
              console.log(`Error: ${xhr.status}`);
            }
          } else { // node pubkey  が無い場合 (ノードオーナーのアカウントの場合) //////////////////////////////////
            if (accountInfo.supplementalPublicKeys.vrf !== undefined) {  //  vrf pubkey

              let xhr = new XMLHttpRequest();
              if (networkType === 152) {
                xhr.open("GET", `https://testnet.symbol.services/nodes/${window.SSS.activePublicKey}`, false);
              }
              if (networkType === 104) {
                xhr.open("GET", `https://symbol.services/nodes/${window.SSS.activePublicKey}`, false);
              }

              let data;
              let data2;
              xhr.send(null);
              if (xhr.status == 200) {
                data = xhr.response;
                data = JSON.parse(data);
                console.log("%cノード=", "color: red", data.host);

                let xhr2 = new XMLHttpRequest();
                xhr2.open("GET", `https://${data.host}:3001/node/unlockedaccount`, false);
                xhr2.send(null);
                if (xhr2.status == 200) {
                  data2 = xhr2.response;
                  data2 = JSON.parse(data2);
                  //console.log("%c委任公開鍵=","color: red",data2);                        

                  if (searchArray(data2.unlockedAccount, account_pubkey)) {
                    console.log(`有効🟢`);
                    hv_status.innerHTML = `🟢 有効`
                    hv_node.innerHTML = `委任ノード　:　${data.host}`
                  } else {
                    console.log(`無効🔴`);
                    hv_status.innerHTML = `🔴 無効 `
                  }
                } else {
                  console.log(`Error: ${xhr2.status}`);
                }
              } else {
                console.log(`Error: ${xhr.status}`);
              }
            }
          }
        } else {
          hv_status.innerHTML = `🔴 無効 `
        }

        /////////////    harvest レシート  /////////////////////////////////

        getHarvests(15);

        async function getHarvests(pageSize) {

          harvestPageNumber++;

          const res_h = await receiptRepo.searchReceipts({
            targetAddress: accountInfo.address,
            pageNumber: harvestPageNumber,
            pageSize: pageSize,
            order: "desc"
          }).toPromise();

          console.log("ハーベスト_res_h === ", res_h);

          var lastHeight = 0;
          var cnt = 0;
          for (const statements of res_h.data) {
            const filterdReceipts = statements.receipts.filter(item => {
              if (item.targetAddress) {
                return item.targetAddress.plain() === accountInfo.address.plain();
              }
              return false;
            });

            if (statements.height.toString() !== lastHeight.toString()) {
              cnt = 0;
            }

            for (const receipt of filterdReceipts) {
              //             console.log("reciepts =========== ", receipt);
              showReceiptInfo("harvest", statements.height, receipt, cnt);
              lastHeight = statements.height;
              cnt++;
            }
          }

          if (res_h.isLastPage) {
            $('#harvests_footer').hide();
          }
          return res_h.isLastPage;

        }

        $('#harvests_more').click(function () { getHarvests(15); return false; });

        //////////////////////////////////////////////////////////////////////

        $("#account_append_info_1").empty();
        $("#account_append_info_2").empty();
        //$("#account_importance").empty();
        //$("multisig_message").empty();

        const default_account = document.getElementById("default_account");   //デフォルトのアカウントを表示しておく
        default_account.innerHTML = `<font style="color:blue">< ${window.SSS.activeName} >　　${window.SSS.activeAddress}</font>`;

        // 追加する連署者の要素を取得
        let inputText = document.getElementById('input-text');
        const addButton = document.getElementById('add-button');
        const displayContainer = document.getElementById('display-container');


        // 入力値を表示に追加する関数
        function addInputToDisplay() {

          if (inputText.value.trim().length === 39) {
            inputValue = sym.Address.createFromRawAddress(inputText.value.trim()); //アドレスクラスの生成
          }
          else if (inputText.value.trim().length === 64) {   // 公開鍵クラスの生成
            const pubtoaddr = sym.PublicAccount.createFromPublicKey(
              inputText.value.trim(),
              networkType
            )
            inputValue = sym.Address.createFromRawAddress(pubtoaddr.address.address);
          } else {
            Swal.fire({
              title: `<font color="coral">入力エラー！！

            追加したアドレス または 公開鍵を確認してください！</font>` })
            inputValue = '';
            inputText.value = '';
            return;
          }

          if (default_account.innerHTML !== "") {
            if (inputValue.address === window.SSS.activeAddress) {
              Swal.fire({
                title: `<font color="coral">同じアカウントは
                連署者に追加出来ません！</font>` })
              inputValue = '';
              inputText.value = '';
              return;
            }

          }

          if (cosig.some(item => item.address === inputValue.address)) {
            Swal.fire({ title: `<font color="coral">既に追加済みのアカウントです！</font>` })
            inputValue = '';
            inputText.value = '';
            return;
          } else {
            // 新しい要素を配列に追加
            cosig.push(inputValue);
            cosig2.push(inputValue);
          }

          // 表示用の要素を作成し、表示コンテナに追加
          const newItem = document.createElement('div');
          newItem.classList.add('container2');

          const addressSpan = document.createElement('span');
          addressSpan.innerHTML = `<font style="color: orange">追加する連署者</font>　　${inputValue.address}`;
          newItem.appendChild(addressSpan);

          const deleteButton = document.createElement('span');
          deleteButton.classList.add('delete-button');
          deleteButton.textContent = '　🗑️';

          // 削除ボタンのクリックイベントリスナーを追加
          deleteButton.addEventListener('click', () => {
            console.log("導通チェック　　🗑️ボタン　１");

            // 対応するアドレスを取得
            const addressToRemove = addressSpan.textContent.replace('追加する連署者', '').trim();

            // 配列から対応するアドレスを削除
            const index = cosig.findIndex(item => item.address === addressToRemove);
            if (index !== -1) {
              cosig.splice(index, 1);
            }
            const index2 = cosig2.findIndex(item => item.address === addressToRemove);
            if (index2 !== -1) {
              cosig2.splice(index2, 1);
            }

            newItem.remove(); // 表示から項目を削除
            console.log("%ccosig=====", "color: red", cosig); // 削除
            console.log("%ccosig2=====", "color: red", cosig2); // 削除
          });

          newItem.appendChild(deleteButton);
          displayContainer.insertBefore(newItem, displayContainer.firstChild); // 新しい項目を最初の子要素として追加


          // 入力ボックスの値をクリア
          inputText.value = '';
          console.log("%ccosig=====", "color: red", cosig);  // 追加
          console.log("%ccosig2=====", "color: red", cosig2);  // 追加
        }


        // ➕ボタンのクリックイベントリスナー
        addButton.addEventListener('click', addInputToDisplay);

        // 入力フィールドでEnterキーが押されたときのイベントリスナー
        inputText.addEventListener('keypress', (event) => {
          if (event.key === 'Enter') {
            addInputToDisplay();
          }
        });

        //////////////////// マルチシグ情報 //////////////////////////////////////////////////

        msigRepo.getMultisigAccountInfo(accountInfo.address)
          .subscribe(msig => {

            const tree_button = document.getElementById('tree_button');  //  マルチシグツリー表示ボタン
            tree_button.innerHTML = `<button class="btn-gradient-radius_tree" onclick="openPopup()">マルチシグツリーを表示</button>`;


            //連署者アカウント
            var parentKeys = "";
            for (const cosignatory of msig.cosignatoryAddresses) {
              //const parentAddress = cosignatory.pretty().slice(0, 20) + "..." + cosignatory.pretty().slice(-3);
              const parentAddress = cosignatory.address;
              parentKeys += `<dd><a href="${EXPLORER}/accounts/` + cosignatory.address + '" target="_blank" rel="noopener noreferrer">' + parentAddress + '</a></dd>';
            }
            if (msig.cosignatoryAddresses.length > 0) {

              $("#multisig_account").append('<dt>マルチシグアカウント</dt>')
              //  $("#account_append_info_1").append(`<dt>連署者　/　最小 承認数：${msig.minApproval}　/　最小削除 承認数：${msig.minRemoval}</dt><hr>` + parentKeys);
              $("#multisig_message").append('<dt>マルチシグアカウントはトランザクションを開始できません。<br>連署者のアカウントを使用してください。</dt>');
              $("#js-show-popup_multisig").remove()
              //  $("#account_append_info_2").remove()

              Swal.fire({
                title: `<font color="coral">マルチシグアカウントは<br>トランザクションを<br>開始出来ません。<br><br>連署者のアカウントを<br>使用してください。</font>`,
                cancelButtonText: '閉じる'
              })
            }

            //マルチシグアカウント

            //const a_address = window.SSS.activeAddress;
            //const short_a_address = a_address.slice(0, 20) + "..." + a_address.slice(-3);

            //var childKeys = "";
            let select_msig_account = [];   // セレクトボックス初期化
            select_msig_account.push({ value: window.SSS.activeAddress, name: '---　select multisig account　---' }); //セレクトボックス用の連想配列を作る

            console.log("487  msig ================", msig);

            let multisigInfo1;
            let multisigInfo2;
            let short_Address;

            (async () => {
              for (const multisig of msig.multisigAddresses) {
                multisigInfo1 = await fetchAccountInfo(multisig.address);

                if (multisigInfo1.multisigAddresses[0] !== undefined) {
                  for (const multisig of multisigInfo1.multisigAddresses) {
                    short_Address = multisig.address.slice(0, 20) + "..." + multisig.address.slice(-3);

                    select_msig_account.push({ value: multisig.address, name: short_Address });

                    multisigInfo2 = await fetchAccountInfo(multisig.address);
                    if (multisigInfo2.multisigAddresses[0] !== undefined) {
                      for (const multisig of multisigInfo2.multisigAddresses) {
                        short_Address = multisig.address.slice(0, 20) + "..." + multisig.address.slice(-3);
                        select_msig_account.push({ value: multisig.address, name: short_Address });
                      }
                    }
                  }
                }

                short_Address = multisig.address.slice(0, 20) + "..." + multisig.address.slice(-3);
                select_msig_account.push({ value: multisig.address, name: short_Address });
              }

              // 重複を取り除く
              const uniqueAccounts = Array.from(new Set(select_msig_account.map(a => a.value)))
                .map(value => {
                  return select_msig_account.find(a => a.value === value);
                });

              select_msig_account = uniqueAccounts;


              console.log("%cselect_msig_account=", "color: red", select_msig_account);


              if (msig.multisigAddresses.length > 0) {
                $("#account_append_info_2").append(`<dt>マルチシグ送信</dt>` /* + childKeys */);
                // $("#account_append_info_1").remove()
              }

              ///////////////////////////////////////////////
              const jsSelectBox_msig = document.querySelector('.multisig_address_select');
              let select_msig = document.createElement('select');

              select_msig.classList.add('select_msig');
              select_msig_account.forEach((v) => {
                const option = document.createElement('option');
                option.value = v.value;
                option.textContent = v.name;
                select_msig.appendChild(option);
                jsSelectBox_msig.appendChild(select_msig);
              });



              // select_msig をコピーして新しい要素を作成
              const select_msig_copy = select_msig.cloneNode(true);

              const jsSelectBox_msig2 = document.querySelector('.multisig_address_select_2');
              jsSelectBox_msig2.appendChild(select_msig_copy);

              const select_m_sig = document.querySelectorAll('.select_msig');


              function handleChange_msig(event) {        // セレクトボックスの値が変更されたときに実行される関数

                cosig = [];
                cosig2 = [];
                const rensyosya = document.getElementById("rensyosya");
                rensyosya.innerHTML = "";

                const select_min_sig = document.getElementById('min_sig');          // 署名者のセレクトボックスに0を追加する
                const select_min_del_sig = document.getElementById('min_del_sig');  //

                const options = select_min_sig.getElementsByTagName('option');
                const options2 = select_min_del_sig.getElementsByTagName('option');

                // 他のセレクトボックスの値を変更する
                select_m_sig.forEach(select => {
                  if (select !== event.target) {
                    select.value = event.target.value;
                    if (event.target.value !== window.SSS.activeAddress) {
                      default_account.innerHTML = "";

                      msigRepo.getMultisigAccountInfo(sym.Address.createFromRawAddress(event.target.value))
                        .subscribe(msig2 => {
                          console.log("%cマルチシグアカウント情報 ===", "color: red", msig2);

                          // 先頭のオプションが "0" かどうかをチェック
                          if (select_min_sig.options[0].value !== '0') {
                            // 0を追加してセレクトボックスを更新
                            const zeroOption = document.createElement('option');
                            zeroOption.text = '0';
                            zeroOption.value = '0';
                            select_min_sig.insertBefore(zeroOption, options[0]); // 0を先頭に追加
                            select_min_sig.value = '0'; // 0を選択状態にする
                          }
                          // 先頭のオプションが "0" かどうかをチェック
                          if (select_min_del_sig.options[0].value !== '0') {
                            // 0を追加してセレクトボックスを更新
                            const zeroOption2 = document.createElement('option');
                            zeroOption2.text = '0';
                            zeroOption2.value = '0';
                            select_min_del_sig.insertBefore(zeroOption2, options2[0]); // 0を先頭に追加
                            select_min_del_sig.value = '0'; // 0を選択状態にする
                          }
                          rensyosya.innerHTML = `<span style="color: blue;font-size:  17px"><i>　　　　　　　　　　　　　　　連署者　　${msig2.minApproval}/${msig2.cosignatoryAddresses.length}　トランザクション承認に必要な署名数<br>　　　　　　　　　　　　　　　　　　　　${msig2.minRemoval}/${msig2.cosignatoryAddresses.length}　連署者の削除に必要な署名数</i></span><br><br>`;
                          displayContainer.innerHTML = "";
                          cosig = msig2.cosignatoryAddresses;

                          console.log("%ccosig=====", "color: red", cosig);  // 
                          console.log("%ccosig2=====", "color: red", cosig2);  //

                          // cosig配列のアドレスをHTMLに表示
                          cosig.forEach(inputValue => {
                            const newItem = document.createElement('div');
                            newItem.classList.add('container2');

                            const textSpan = document.createElement('span');
                            textSpan.textContent = inputValue.address;
                            newItem.appendChild(textSpan);

                            const deleteButton = document.createElement('span');
                            deleteButton.textContent = '　🗑️';
                            deleteButton.classList.add('delete-button');

                            // ゴミ箱ボタンがクリックされたら、打ち消し線を引くか解除し、cosig_delに追加または削除する
                            deleteButton.addEventListener('click', () => {
                              console.log("導通チェック　　🗑️ボタン　２");
                              if (textSpan.style.textDecoration === 'line-through') {
                                // 打ち消し線が引かれている場合、解除し、cosig_delから削除する
                                textSpan.style.textDecoration = '';
                                textSpan.style.color = 'black'; // テキストの色を黒に戻す
                                newItem.querySelector('.cosig-text').remove(); // 「署名者を削除：」を削除
                                console.log("inputValue===", inputValue);
                                const index = cosig_del.indexOf(inputValue);
                                if (index !== -1) {
                                  cosig_del.splice(index, 1);
                                }
                              } else {
                                // 打ち消し線が引かれていない場合、引いて、cosig_delに追加する
                                textSpan.style.textDecoration = 'line-through';
                                textSpan.style.color = 'red'; // テキストの色を赤にする
                                const cosigText = document.createElement('span');
                                cosigText.classList.add('cosig-text');
                                cosigText.textContent = ' 署名者を削除：';
                                cosigText.style.color = 'red';
                                newItem.insertBefore(cosigText, textSpan); // テキストの前に「署名者を削除：」を追加
                                console.log("inputValue===", inputValue);
                                cosig_del.push(inputValue);
                              }

                              console.log("%ccosig=====", "color: red", cosig);
                              console.log("%ccosig2=====", "color: red", cosig2);
                              console.log("%ccosig_del=====", "color: red", cosig_del);
                              if (cosig_del.length > 1) {
                                Swal.fire({
                                  title: `<font color="coral">一度に削除出来る署名者は
                                １つだけです！</font>`
                                })
                              }

                            });

                            newItem.appendChild(deleteButton);
                            displayContainer.appendChild(newItem);
                          });

                        });

                    } else {                            //  アクティブアドレスの場合
                      displayContainer.innerHTML = '';
                      default_account.innerHTML = `<font style="color:blue">< ${window.SSS.activeName} >　　${window.SSS.activeAddress}</font>`;

                      console.log("%ccosig=====", "color: red", cosig);  // 
                      console.log("%ccosig2=====", "color: red", cosig2);  //

                      // 条件が満たされていない場合、0を削除して元の状態に戻す
                      select_min_sig.removeChild(options[0]); // 先頭の要素（0）を削除
                      select_min_sig.value = '1'; // 最初の値（1）を選択状態にする

                      select_min_del_sig.removeChild(options2[0]); // 先頭の要素（0）を削除
                      select_min_del_sig.value = '1'; // 最初の値（1）を選択状態にする
                    }
                  }
                });

              }

              // 全てのセレクトボックスにchangeイベントリスナーを追加
              select_m_sig.forEach(select => {
                select.addEventListener('change', handleChange_msig);
              });

            })(); // async() 

          }, err => $("#js-show-popup_multisig").remove());


        //ブロック //////////////////////////////////////////////////////////////////

        chainRepo.getChainInfo().subscribe(chain => {  //////////   

          rxjs.zip(
            blockRepo1.getBlockByHeight(chain.height),
            blockRepo1.getBlockByHeight(chain.latestFinalizedBlock.height),
          ).subscribe(zip => {

            $("#chain_height").html(    //  最新ブロック
              "[ <a target='_blank' href='" + EXPLORER + "/blocks/" + zip[0].height.compact() + "'>" + zip[0].height.compact() + "</a> ]　日時: " + dispTimeStamp(Number(zip[0].timestamp.toString()), epochAdjustment)
            );
            $("#finalized_chain_height").html(   //  確定ブロック
              "[ <a target='_blank' href='" + EXPLORER + "/blocks/" + zip[1].height.compact() + "'>" + zip[1].height.compact() + "</a> ]　日時: " + dispTimeStamp(Number(zip[1].timestamp.toString()), epochAdjustment)
            );
            console.log("%c現在のブロック高=", "color: red", zip[0].height.compact());
            console.log("%cファイナライズブロック=", "color: red", zip[1].height.compact());


            /////////////   モザイク　テーブル  ////////////////////////////////////////////////

            mosaicRepo.search({
              ownerAddress: accountInfo.address,
              pageNumber: 1,
              pageSize: 50,
              order: sym.Order.Desc
            })
              .subscribe(async mosaic => {

                console.log("mosaic_data=", mosaic.data);

                console.log("モザイクの数", mosaic.data.length);

                const select_revoke = []; //　セレクトボックス初期化 (モザイク回収)
                const select_mosaicID = []; //　セレクトボックス初期化 (モザイクID)
                const select_mosaic_sup = []; //　セレクトボックス初期化 (モザイクID 供給量変更)
                var body = document.getElementById("ms_table");

                // <table> 要素と <tbody> 要素を作成　/////////////////////////////////////////////////////
                var tbl = document.createElement("table");

                var colgroup_m = document.createElement("colgroup");
                // 各列の幅をパーセンテージで設定
                var colWidths_m = ["14%", "14%", "12%", "12%", "12%", "8%", "5%", "5%", "8%", "5%", "5%"];
                colWidths_m.forEach(function (width) {
                  var col_m = document.createElement("col");
                  col_m.style.width = width;
                  colgroup_m.appendChild(col_m);
                });
                tbl.appendChild(colgroup_m);

                var tblBody = document.createElement("tbody");
                let mosaicNames;
                // すべてのセルを作成
                for (var i = -1; i < mosaic.data.length; i++) {  // モザイクデータの数だけ繰り返す
                  if (i > -1) {
                    mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(mosaic.data[i].id.id.toHex())]).toPromise(); // モザイクIDからNamespaceの情報を取得する
                  }
                  // 表の行を作成
                  var row = document.createElement("tr");

                  for (var j = 0; j < 11; j++) {
                    // <td> 要素とテキストノードを作成し、テキストノードを
                    // <td> の内容として、その <td> を表の行の末尾に追加
                    var cell = document.createElement("td");
                    switch (j) {
                      case 0:   //モザイクID
                        if (i === -1) {
                          var cellText = document.createTextNode("モザイクID");
                          select_mosaicID.push({ value: "--- Select ---", name: "--- Select ---" }); //セレクトボックス用の連想配列を作る
                          select_mosaic_sup.push({ value: "--- Select ---", name: "--- Select ---" }); //セレクトボックス用の連想配列を作る
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        var cellText = document.createTextNode(mosaic.data[i].id.id.toHex());
                        if (mosaic.data[i].duration.compact() === 0) { // ステータスが無効なモザイクを排除                               
                          select_mosaicID.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                          if (mosaic.data[i].flags.supplyMutable === true) { // 供給量可変　🟢
                            select_mosaic_sup.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                          }
                        } else
                          if (endHeight - zip[0].height.compact() > 0) { // ステータスが無効なモザイクを排除
                            select_mosaicID.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                            if (mosaic.data[i].flags.supplyMutable === true) { // 供給量可変　🟢
                              select_mosaic_sup.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                            }
                          }
                        break;
                      case 1:   //ネームスペース名
                        if (i === -1) {
                          var cellText = document.createTextNode("ネームスペース名");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if ([mosaicNames][0][0].names.length !== 0) {  // ネームスペースがある場合                       
                          var cellText = document.createTextNode([mosaicNames][0][0].names[0].name);
                        } else {   // ネームスペースが無い場合
                          var cellText = document.createTextNode("N/A");
                        }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 2:   // 供給量
                        if (i === -1) {
                          var cellText = document.createTextNode("供給量");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        var supply1 = mosaic.data[i].supply.compact() / (10 ** mosaic.data[i].divisibility);
                        supply1 = supply1.toLocaleString(undefined, {
                          minimumFractionDigits: mosaic.data[i].divisibility,
                          maximumFractionDigits: mosaic.data[i].divisibility,
                        });
                        var cellText = document.createTextNode(supply1);
                        cell.style.textAlign = "right"; // 右寄せに設定
                        break;
                      case 3:   //残高
                        if (i === -1) {
                          var cellText = document.createTextNode("残高");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        for (var k = 0; k < accountInfo.mosaics.length; k++) {
                          if (accountInfo.mosaics[k].id.id.toHex() === mosaic.data[i].id.id.toHex()) { // accountInfoのamount データを探す
                            var balance = accountInfo.mosaics[k].amount.compact();
                          }
                        }
                        balance = balance / (10 ** mosaic.data[i].divisibility);   // 可分性を考慮
                        balance = balance.toLocaleString(undefined, {
                          minimumFractionDigits: mosaic.data[i].divisibility,
                          maximumFractionDigits: mosaic.data[i].divisibility,
                        });

                        var cellText = document.createTextNode(balance);
                        cell.style.textAlign = "right"; // 右寄せに設定
                        break;
                      case 4:   //有効期限
                        if (i === -1) {
                          var cellText = document.createTextNode("有効期限");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (mosaic.data[i].duration.compact() === 0) {
                          var cellText = document.createTextNode("---　無期限　---");
                        } else {
                          var endHeight = mosaic.data[i].startHeight.compact() + mosaic.data[i].duration.compact()
                          var remainHeight = endHeight - zip[0].height.compact();
                          t = dispTimeStamp(zip[0].timestamp.compact() + (remainHeight * 30000), epochAdjustment)
                          var cellText = document.createTextNode(t);
                        }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 5:   // ステータス
                        if (i === -1) {
                          var cellText = document.createTextNode("ステータス");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (mosaic.data[i].duration.compact() === 0) {
                          var cellText = document.createTextNode("🟢");
                        } else
                          if (mosaic.data[i].duration.compact() > 0) {
                            var endHeight = mosaic.data[i].startHeight.compact() + mosaic.data[i].duration.compact()
                            if (endHeight - zip[0].height.compact() > 0) {
                              var cellText = document.createTextNode("🟢");
                            } else {
                              var cellText = document.createTextNode("❌");
                            }
                          }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 6:   // 可分性
                        if (i === -1) {
                          var cellText = document.createTextNode("可分性");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        var cellText = document.createTextNode(`${mosaic.data[i].divisibility}`);
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 7:   //　制限可
                        if (i === -1) {
                          var cellText = document.createTextNode("制限可");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (mosaic.data[i].flags.restrictable === true) {
                          var cellText = document.createTextNode("🟢");
                        } else
                          if (mosaic.data[i].flags.restrictable === false) {
                            var cellText = document.createTextNode("❌");
                          }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 8:  // 供給量可変
                        if (i === -1) {
                          var cellText = document.createTextNode("供給量可変");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (mosaic.data[i].flags.supplyMutable === true) {
                          var cellText = document.createTextNode("🟢");
                        } else
                          if (mosaic.data[i].flags.supplyMutable === false) {
                            var cellText = document.createTextNode("❌");
                          }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 9:   // 転送可
                        if (i === -1) {
                          var cellText = document.createTextNode("転送可");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (mosaic.data[i].flags.transferable === true) {
                          var cellText = document.createTextNode("🟢");
                        } else
                          if (mosaic.data[i].flags.transferable === false) {
                            var cellText = document.createTextNode("❌");
                          }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 10:   // 回収可
                        if (i === -1) {
                          var cellText = document.createTextNode("回収可");
                          select_revoke.push({ value: "--- Select ---", name: "--- Select ---" }); //セレクトボックス用の連想配列を作る
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (mosaic.data[i].flags.revokable === true) {
                          var cellText = document.createTextNode("🟢");
                          if (mosaic.data[i].duration.compact() === 0) { // ステータスが無効なモザイクを排除
                            select_revoke.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                          } else
                            if (endHeight - zip[0].height.compact() > 0) { // ステータスが無効なモザイクを排除
                              select_revoke.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                            }
                        } else
                          if (mosaic.data[i].flags.revokable === false) {
                            var cellText = document.createTextNode("❌");
                          }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 11:   // 編集
                        /////////////////////////////  保留  //////////
                        if (i === -1) {
                          var cellText = document.createTextNode("");
                          break;
                        }
                        if (mosaic.data[i].duration.compact() === 0) {
                          var cellText = document.createTextNode("");
                        } else
                          if (mosaic.data[i].duration.compact() > 0) {
                            var endHeight = mosaic.data[i].startHeight.compact() + mosaic.data[i].duration.compact()
                            if (endHeight - zip[0].height.compact() > 0) {
                              var cellText = document.createTextNode("");
                            } else {
                              var cellText = document.createTextNode("");
                            }
                          }
                        break;
                    }
                    cell.appendChild(cellText);
                    row.appendChild(cell);
                  }

                  // 表の本体の末尾に行を追加
                  tblBody.appendChild(row);
                }

                // <tbody> を <table> の中に追加
                tbl.appendChild(tblBody);
                // <table> を <body> の中に追加
                body.appendChild(tbl);
                // tbl の border 属性を 2 に設定
                tbl.setAttribute("border", "1");

                // 既に存在する select_revoke 配列のモザイクIDを収集（デフォルト値を除外）
                const mosaicIds = select_revoke
                  .filter(item => item.value !== '--- Select ---')
                  .map(item => new sym.MosaicId(item.value));

                // モザイクIDにリンクしているネームスペースを取得
                nsRepo.getMosaicsNames(mosaicIds)
                  .toPromise()
                  .then((data) => {
                    if (!data) return;

                    // select_revoke 配列を更新（デフォルト値を除外）
                    for (let i = 0; i < select_revoke.length; i++) {
                      const item = select_revoke[i];
                      if (item.value === '--- Select ---') continue; // デフォルト値をスキップ

                      const alias = data.find(d => d.mosaicId.toHex() === item.value);
                      const aliasName = alias && alias.names.length > 0 ? alias.names[0].name : item.value;
                      item.name = aliasName;
                    }

                    console.log("%cselect_revoke=", "color: red", select_revoke);
                    console.log("%cselect_mosaicID=", "color: red", select_mosaicID);
                    console.log("%cselect_mosaic_sup=", "color: red", select_mosaic_sup);

                    ////    セレクトボックス  (回収モザイク用)    ///////////////////////////////////////

                    const jsSelectBox_rev = document.querySelector('.revoke_select');
                    const select = document.createElement('select');

                    select.classList.add('select_r');
                    select_revoke.forEach((v) => {
                      const option = document.createElement('option');
                      option.value = v.value;
                      option.textContent = v.name;
                      select.appendChild(option);
                    });
                    jsSelectBox_rev.appendChild(select);

                    const selectBox = document.querySelector('.select_r');   //  イベントリスナー


                    // イベントリスナーを追加
                    selectBox.addEventListener("change", function (event) {

                      // セレクトボックスの値が変化したときの処理
                      const selectedValue = event.target.value;
                      //console.log("選択された値: ", selectedValue);

                      const mosaicId = new sym.MosaicId(selectedValue);

                      const dom_mosaic_img = document.getElementById("mosaic_img");

                      console.log("dom_img =", dom_mosaic_img); ////////////////
                      if (dom_mosaic_img !== null) { // null じゃなければ子ノードを全て削除  
                        while (dom_mosaic_img.firstChild) {
                          dom_mosaic_img.removeChild(dom_mosaic_img.firstChild);
                        }
                      }

                      // mosaic-center の画像を表示
                      fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${mosaicId.id.toHex()}`)
                        .then((response) => {
                          // レスポンスが成功したかどうかを確認
                          if (!response.ok) {
                            throw new Error(`Network response was not ok: ${response.status}`);
                          }
                          // JSONデータを解析して返す
                          return response.json();
                        })
                        .then((data) => {
                          if (data !== null) { //データがある場合
                            dom_mosaic_img.innerHTML = `
                            <br><div style="text-align: center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                                                             <br>
                                                             <br>
                                                             <a href="https://symbol.fyi/mosaics/${mosaicId.id.toHex()}" target="_blank" style="display: inline-block; width: 200px;">
                                                             <img class="mosaic_img" src=${data[0][7]} width="200">
                                                             </a></div>
                                                            `
                          }
                        })
                        .catch((error) => {
                          console.error("Fetch error:", error);
                        });

                      holder_list(); // ホルダーリストを呼び出す
                      document.getElementById('download_csv_button').addEventListener('click', downloadCSV);// CSVダウンロード
                    });
                  });

                ////    select_mosaicID  (Metadata用)    ///////////////////////////////////////

                const jsSelectBox_mosaicID = document.querySelector('.select_mosaicID');
                const select_mo = document.createElement('select');

                select_mo.classList.add('select_mo');
                select_mosaicID.forEach((v) => {
                  const option = document.createElement('option');
                  option.value = v.value;
                  option.textContent = v.name;
                  select_mo.appendChild(option);
                });
                jsSelectBox_mosaicID.appendChild(select_mo);

                /////   mosaic_ID セレクトボックス  (供給量変更用）///////////////////////////////

                const jsSelectBox_sup = document.querySelector('.select_mosaic_sup');
                const select_sup = document.createElement('select');

                select_sup.classList.add('select_sup');
                select_mosaic_sup.forEach((v) => {
                  const option = document.createElement('option');
                  option.value = v.value;
                  option.textContent = v.name;
                  select_sup.appendChild(option);
                });
                jsSelectBox_sup.appendChild(select_sup);

              });


            //// ネームスペース テーブル　//////////////////////////////////////////////////////////////////////////////

            nsRepo.search({
              ownerAddress: accountInfo.address,
              pageNumber: 1,
              pageSize: 50,
              order: sym.Order.Desc
            }) /////    保有ネームスペース
              .subscribe(async ns => {

                console.log("{ownerAddress:accountInfo.address}: ", { ownerAddress: accountInfo.address });

                var Nnames1 = new Array(ns.data.length);
                var i = 0;
                var ddNamespace = new Array(ns.data.length);
                for (const nsInfo of ns.data) {

                  //  console.log("%cnsInfo==","color: blue",nsInfo)
                  if (nsInfo.levels.length == 1) { //ルートネームスペース

                    const Nnames = await nsRepo.getNamespacesNames([nsInfo.levels[nsInfo.levels.length - 1]]).toPromise();
                    Nnames1[i] = Nnames[0].name;

                    var namespace = "";
                    for (const namespaceName of Nnames) {
                      if (namespace != "") {
                        namespace = "." + namespace;
                      }
                      namespace = namespaceName.name + namespace;
                    }

                    var remainHeight = nsInfo.endHeight.compact() - zip[0].height.compact();
                    //  console.log("期限が終了するブロック: " + nsInfo.endHeight.compact());  
                    //  console.log("あと残りのブロック: " + remainHeight);

                    t = dispTimeStamp(zip[0].timestamp.compact() + (remainHeight * 30000), epochAdjustment)
                    // t = dispTimeStamp(nsInfo.endHeight.compact() * 30000,epochAdjustment);
                    // ddNamespace += '<dd>' + namespace + ' [期限: ' + t + ']</dd>';
                    ddNamespace[i] = t;
                  }

                  if (nsInfo.levels.length == 2) { //サブネームスペース                
                    const Nnames = await nsRepo.getNamespacesNames([nsInfo.levels[nsInfo.levels.length - 1]]).toPromise();
                    Nnames1[i] = Nnames[1].name + "." + Nnames[0].name;
                    //console.log("%cNnames[i]================","color: red",Nnames[i])
                    //ddNamespace[i] = t; 
                  }

                  if (nsInfo.levels.length == 3) { //サブネームスペース                
                    const Nnames = await nsRepo.getNamespacesNames([nsInfo.levels[nsInfo.levels.length - 1]]).toPromise();
                    Nnames1[i] = Nnames[2].name + "." + Nnames[1].name + "." + Nnames[0].name;
                    //ddNamespace[i] = t; 
                  }

                  i = ++i;
                }

                console.log("ns_data=", ns.data);

                console.log("ネームスペースの数", ns.data.length);
                const select_ns = [];   // セレクトボックス初期化　（エイリアスリンク/ネームスペース）

                var body = document.getElementById("ns_table");

                // <table> 要素と <tbody> 要素を作成　/////////////////////////////////////////////////////
                var tbl = document.createElement("table");

                var colgroup_n = document.createElement("colgroup");
                // 各列の幅をパーセンテージで設定
                var colWidths_n = ["18%", "16%", "14%", "9%", "10%", "33%"];
                colWidths_n.forEach(function (width) {
                  var col_n = document.createElement("col");
                  col_n.style.width = width;
                  colgroup_n.appendChild(col_n);
                });
                tbl.appendChild(colgroup_n);

                var tblBody = document.createElement("tbody");

                // すべてのセルを作成
                for (var i = -1; i < ns.data.length; i++) {  // ネームスペースの数だけ繰り返す
                  // 表の行を作成
                  var row = document.createElement("tr");

                  for (var j = 0; j < 6; j++) {
                    // <td> 要素とテキストノードを作成し、テキストノードを
                    // <td> の内容として、その <td> を表の行の末尾に追加
                    var cell = document.createElement("td");
                    switch (j) {
                      case 0:   //ネームスペースID
                        if (i === -1) {
                          var cellText = document.createTextNode("ネームスペース名");
                          select_ns.push({ value: "--- Select ---", name: "--- Select ---" }); //セレクトボックス用の連想配列を作る
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        var cellText = document.createTextNode(Nnames1[i]);
                        if (zip[0].height.compact() < ns.data[i].endHeight.compact() - grace_block) {  // ステータスが無効なネームスペースを排除
                          select_ns.push({ value: Nnames1[i], name: Nnames1[i] }); //セレクトボックス用の連想配列を作る                              
                        }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 1:   //ネームスペース名
                        if (i === -1) {
                          var cellText = document.createTextNode("ネームスペースID");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (ns.data[i].levels.length === 1) { //　ルートネームスペースの時
                          var cellText = document.createTextNode(ns.data[i].levels[0].id.toHex());
                        } else
                          if (ns.data[i].levels.length === 2) { //  サブネームスペース1の時
                            var cellText = document.createTextNode(ns.data[i].levels[1].id.toHex());
                          } else
                            if (ns.data[i].levels.length === 3) { //  サブネームスペース2の時
                              var cellText = document.createTextNode(ns.data[i].levels[2].id.toHex());
                            }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 2:   // 有効期限
                        if (i === -1) {
                          var cellText = document.createTextNode("更新期限");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (ns.data[i].levels.length !== 1) {
                          var cellText = document.createTextNode("----------------");
                        } else {
                          var cellText = document.createTextNode(ddNamespace[i]);
                        }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 3:
                        if (i === -1) {
                          var cellText = document.createTextNode("ステータス");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (zip[0].height.compact() > ns.data[i].endHeight.compact() - grace_block) {
                          var cellText = document.createTextNode("❌");
                        } else
                          if (zip[0].height.compact() < ns.data[i].endHeight.compact() - grace_block) {
                            var cellText = document.createTextNode("🟢");
                          }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 4:   // エイリアスタイプ
                        if (i === -1) {
                          var cellText = document.createTextNode("タイプ");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (ns.data[i].alias.type === 0) {
                          var cellText = document.createTextNode("--------");
                        } else
                          if (ns.data[i].alias.type === 1) {
                            var cellText = document.createTextNode("Mosaic");
                          } else
                            if (ns.data[i].alias.type === 2) {
                              var cellText = document.createTextNode("Address");
                            }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                      case 5:   // エイリアス
                        if (i === -1) {
                          var cellText = document.createTextNode("🔗リンク🔗");
                          cell.style.textAlign = "center"; // 中央に設定
                          break;
                        }
                        if (ns.data[i].alias.type === 0) {
                          var cellText = document.createTextNode("--------------------------------------------------------");
                        } else
                          if (ns.data[i].alias.type === 1) {
                            var cellText = document.createTextNode(ns.data[i].alias.mosaicId.id.toHex());
                          } else
                            if (ns.data[i].alias.type === 2) {
                              var cellText = document.createTextNode(ns.data[i].alias.address.address);
                            }
                        cell.style.textAlign = "center"; // 中央に設定
                        break;
                    }
                    cell.appendChild(cellText);
                    row.appendChild(cell);
                  }
                  // 表の本体の末尾に行を追加
                  tblBody.appendChild(row);
                }
                // <tbody> を <table> の中に追加
                tbl.appendChild(tblBody);
                // <table> を <body> の中に追加
                body.appendChild(tbl);
                // tbl の border 属性を 2 に設定
                tbl.setAttribute("border", "1");


                console.log("%cselect_ns:", "color: red", select_ns); // ネームスペース　セレクトボックス ///////

                const jsSelectBox = document.querySelector('.Namespace_select');
                let select = document.createElement('select');

                select.classList.add('select1');
                select_ns.forEach((v) => {
                  const option = document.createElement('option');
                  option.value = v.value;
                  option.textContent = v.name;
                  select.appendChild(option);
                });
                jsSelectBox.appendChild(select);


                /////   Namespace セレクトボックス  (Metadata用）

                const jsSelectBox_N = document.querySelector('.Namespace_select_N');
                const select_N = document.createElement('select');

                select_N.classList.add('select_N');
                select_ns.forEach((v) => {
                  const option = document.createElement('option');
                  option.value = v.value;
                  option.textContent = v.name;
                  select_N.appendChild(option);
                });
                jsSelectBox_N.appendChild(select_N);


              });
          })
        });

        /////////////////////// Meta data テーブル　/////////////////////////////////////////////////////////////// 

        metaRepo
          .search({
            targetAddress: accountInfo.address,
            pageNumber: 1,
            pageSize: 50,
            order: sym.Order.Desc
          }).subscribe(async data => {

            // console.log("data = = = =  ", data);

            const select_Meta = [];   // セレクトボックス初期化　（Meta Key）

            var body = document.getElementById("Meta_table");

            // <table> 要素と <tbody> 要素を作成
            var tbl = document.createElement("table");

            var colgroup_meta = document.createElement("colgroup");

            // 各列の幅をパーセンテージで設定
            var colWidths_meta = ["11%", "7%", "11%", "21%", "25%", "25%"];
            colWidths_meta.forEach(function (width) {
              var col_meta = document.createElement("col");
              col_meta.style.width = width;
              colgroup_meta.appendChild(col_meta);
            });

            tbl.appendChild(colgroup_meta);

            var tblBody = document.createElement("tbody");

            console.log("　　　　　　　　　　　　　　data.data", data.data);
            // すべてのセルを作成
            for (var i = -1; i < data.data.length; i++) { // メタデータの数だけ繰り返す
              // 表の行を作成
              var row = document.createElement("tr");

              for (var j = 0; j < 6; j++) {
                // <td> 要素とテキストノードを作成し、テキストノードを
                // <td> の内容として、その <td> を表の行の末尾に追加
                var cell = document.createElement("td");
                var cellText;
                switch (j) {
                  case 0: //Metadata Key
                    if (i === -1) {
                      cellText = document.createTextNode("メタデータ キー");
                      select_Meta.push({ value: "", name: "　　　新規 キー", type: "Type" }); //セレクトボックス用の連想配列を作る
                      cell.style.textAlign = "center"; // 中央に設定
                    } else {
                      cellText = document.createTextNode(data.data[i].metadataEntry.scopedMetadataKey.toHex()); // scopedMetadataKey を 16進数に変換
                      select_Meta.push({ value: data.data[i].metadataEntry.scopedMetadataKey.toHex(), name: data.data[i].metadataEntry.scopedMetadataKey.toHex(), type: data.data[i].metadataEntry.metadataType }); //セレクトボックス用の連想配列を作る
                    }
                    break;
                  case 1: //タイプ
                    if (i === -1) {
                      cellText = document.createTextNode("タイプ");
                      cell.style.textAlign = "center"; // 中央に設定
                    } else {
                      if (data.data[i].metadataEntry.metadataType === 0) {
                        cellText = document.createTextNode("Account");
                      } else if (data.data[i].metadataEntry.metadataType === 1) {
                        cellText = document.createTextNode("Mosaic");
                      } else if (data.data[i].metadataEntry.metadataType === 2) {
                        cellText = document.createTextNode("Namespace");
                      }
                    }
                    cell.style.textAlign = "center"; // 中央に設定
                    break;
                  case 2: // 対象ID
                    if (i === -1) {
                      cellText = document.createTextNode("モザイク ID / ネームスペース");
                      cell.style.textAlign = "center"; // 中央に設定
                    } else {
                      if (data.data[i].metadataEntry.targetId === undefined) {
                        cellText = document.createTextNode("N/A");
                      } else {
                        if (data.data[i].metadataEntry.metadataType === 1) { // モザイクの場合　ID
                          cellText = document.createTextNode(data.data[i].metadataEntry.targetId.id.toHex());
                        } else if (data.data[i].metadataEntry.metadataType === 2) { // ネームスペースがある場合、ID → ネームスペースに変換
                          var ns_name = await nsRepo.getNamespacesNames([data.data[i].metadataEntry.targetId.id]).toPromise();
                          if (ns_name.length === 1) {
                            cellText = document.createTextNode([ns_name][0][0].name);
                          } else if (ns_name.length === 2) {
                            cellText = document.createTextNode([ns_name][0][1].name + "." + [ns_name][0][0].name);
                          } else if (ns_name.length === 3) {
                            cellText = document.createTextNode([ns_name][0][2].name + "." + [ns_name][0][1].name + "." + [ns_name][0][0].name);
                          }
                        }
                      }
                    }
                    cell.style.textAlign = "center"; // 中央に設定
                    break;
                  case 3: // value
                    if (i === -1) {
                      cellText = document.createTextNode(" Value(値)");
                      cell.style.textAlign = "center"; // 中央に設定
                    } else {
                      cellText = document.createTextNode(data.data[i].metadataEntry.value);
                    }
                    break;
                  case 4: // 送信者アドレス
                    if (i === -1) {
                      cellText = document.createTextNode("送信者アドレス");
                      cell.style.textAlign = "center"; // 中央に設定
                    } else {
                      cellText = document.createTextNode(data.data[i].metadataEntry.sourceAddress.address);
                    }
                    break;
                  case 5: // 対象アドレス
                    if (i === -1) {
                      cellText = document.createTextNode("対象アドレス");
                      cell.style.textAlign = "center"; // 中央に設定
                    } else {
                      cellText = document.createTextNode(data.data[i].metadataEntry.targetAddress.address);
                    }
                    break;
                }
                cell.appendChild(cellText);
                row.appendChild(cell);
              }
              // 表の本体の末尾に行を追加
              tblBody.appendChild(row);
            }
            // <tbody> を <table> の中に追加
            tbl.appendChild(tblBody);
            // <table> を <body> の中に追加
            body.appendChild(tbl);
            // tbl の border 属性を 1 に設定
            tbl.setAttribute("border", "1");

            select_Meta.push({ value: "Pointy", name: "　　Poinyに登録", type: "Type" }); // Pointy ポイントアプリに表示するために特定キーのメタデータを編集

            console.log("%cselect_Meta:", "color: red", select_Meta); // Metadata　セレクトボックス ///////

            const jsSelectBox = document.querySelector('.Meta_select');
            const select = document.createElement('select');

            select.classList.add('select_Meta');
            select_Meta.forEach((v) => {
              const option = document.createElement('option');
              option.value = v.value;
              option.textContent = v.name;
              select.appendChild(option);
            });
            jsSelectBox.appendChild(select);

          });


        ///////////////////////////////////////////////////////////////////////////////////////////////////////// 

        //select要素を取得する

        const select_mosaic = [];

        ///////////////////////////////////////////////////////

        for (let m of accountInfo.mosaics) {  //accountInfo のモザイクの数だけ繰り返す　　　　　　Account Info の XYM表示
          if (m.id.id.toHex() === XYM_ID) {
            const dom_xym = document.getElementById('wallet-xym')
            dom_xym.innerHTML = `<i>XYM Balance : ${(parseInt(m.amount.toHex(), 16) / (10 ** 6)).toLocaleString(undefined, { maximumFractionDigits: 6 })}　</i>`
          }
        }

        nsRepo.getMosaicsNames(accountInfo.mosaics.map((m) => new sym.MosaicId(m.id.id.toHex())))
          .toPromise()
          .then((data) => {
            if (!data) return

            // console.log("%cdata====", "color:red", data);
            data.forEach((val, index) => {
              let d = {
                mosaicId: val.mosaicId,
                mosaic: accountInfo.mosaics[index],
                // mosaicInfo: mosaicInfo,
                namespaces: val.names.map(n => n.name),
              };

              if (d.namespaces.length !== 0) {  //  ネームスペースがある場合
                select_mosaic.push({ value: d.mosaic.id.id.toHex(), name: `${d.namespaces}` });
              } else {                          //ネームスペースがない場合
                select_mosaic.push({ value: d.mosaic.id.id.toHex(), name: `${d.mosaic.id.id.toHex()}` });
              }
            })

            // nameプロパティでソートする
            const sortedArray = select_mosaic.sort((a, b) => {
              // aが"symbol.xym"を含む場合、aを先に配置
              if (a.name.includes('symbol.xym')) return -1;
              // bが"symbol.xym"を含む場合、bを先に配置
              if (b.name.includes('symbol.xym')) return 1;

              // それ以外の場合はnameの値で昇順にソート
              if (a.name < b.name) return -1;
              if (a.name > b.name) return 1;
              return 0;
            });

            const jsSelectBox_m = document.querySelector('.form-mosaic_ID');
            const select_m1 = document.createElement('select');

            select_m1.classList.add('select_m1');
            sortedArray.forEach((v) => {
              const option = document.createElement('option');
              option.value = v.value;
              option.textContent = v.name;
              select_m1.appendChild(option);
              jsSelectBox_m.appendChild(select_m1);
            });

            // select_m1 をコピーして新しい要素を作成
            const select_m1_copy = select_m1.cloneNode(true);

            const jsSelectBox_m1 = document.querySelector('.mosaic_ID2');
            // jsSelectBox_m1.classList.add('select_m1');
            jsSelectBox_m1.appendChild(select_m1_copy);

            const hoyu = document.getElementById("hoyu-ryo");          //  XYMの保有量を　初期表示する
            const hoyu_agg = document.getElementById("hoyu-ryo_agg");  // XYMの保有量を　初期表示する
            hoyu.textContent = `保有量 : ${(parseInt(accountInfo.mosaics[0].amount.toHex(), 16) / (10 ** 6)).toLocaleString(undefined, { maximumFractionDigits: 6 })}　`;
            hoyu_agg.textContent = `保有量 : ${(parseInt(accountInfo.mosaics[0].amount.toHex(), 16) / (10 ** 6)).toLocaleString(undefined, { maximumFractionDigits: 6 })}　　　　　　`;

            const kigen = document.getElementById("kigen-gire");
            const kigen_agg = document.getElementById("kigen-gire_agg");

            const select_m11 = document.querySelectorAll('.select_m1');


            function handleChange_m11(event) {        // セレクトボックスの値が変更されたときに実行される関数

              hoyu.textContent = "　";
              hoyu_agg.textContent = "　";
              kigen.textContent = "";
              kigen_agg.textContent = "";
              let mosaic_id;
              let mosaic_amount;

              for (let m of accountInfo.mosaics) {  //accountInfo のモザイクの数だけ繰り返す
                if (m.id.id.toHex() === event.target.value) {
                  mosaic_id = m.id.id;
                  mosaic_amount = m.amount;
                  break;      // 対象のモザイクが見つかったらfor文 終了
                }
              }


              // 他のセレクトボックスの値を変更する
              select_m11.forEach(select => {
                if (select !== event.target) {
                  select.value = event.target.value;
                }
              });

              mosaicRepo.getMosaic(mosaic_id) // 可分性の情報を取得する
                .toPromise()
                .then(
                  (mosaicInfo) => {
                    const hoyu = document.getElementById("hoyu-ryo");
                    const hoyu_agg = document.getElementById("hoyu-ryo_agg");
                    hoyu.textContent = `保有量 : ${(parseInt(mosaic_amount.toHex(), 16) / (10 ** mosaicInfo.divisibility)).toLocaleString(undefined, { maximumFractionDigits: 6 })}　`;
                    hoyu_agg.textContent = `保有量 : ${(parseInt(mosaic_amount.toHex(), 16) / (10 ** mosaicInfo.divisibility)).toLocaleString(undefined, { maximumFractionDigits: 6 })}　　　　　　`;

                    chainRepo.getChainInfo().subscribe(chain => {
                      if (mosaicInfo.duration.toString() === '0' || (chain.height - mosaicInfo.startHeight.add(mosaicInfo.duration)) < 0) {
                        // 期限なし OR 期限ありで期限が切れていないもの はOK
                        kigen.textContent = "";
                        kigen_agg.textContent = "";
                      } else {
                        kigen.textContent = `有効期限が切れています　`;
                        kigen_agg.textContent = `有効期限が切れています　　　　　　`;
                      }
                    })
                  })
            }

            // 全てのセレクトボックスにchangeイベントリスナーを追加
            select_m11.forEach(select => {
              select.addEventListener('change', handleChange_m11);
            });
          })

      }).catch((error) => {
        console.error('Promiseが拒否されました:', error); // エラーが発生した場合はキャッチする
      });


    //////////////////////////////////////　リスナーでトランザクションを検知し、音を鳴らす //////////////////////////////////////////////////

    //(async () => {
    // nsRepo = repo.createNamespaceRepository();
    wsEndpoint = NODE.replace('http', 'ws') + "/ws";
    listener = new sym.Listener(wsEndpoint, nsRepo, WebSocket);


    listener.open().then(() => {

      //Websocketが切断される事なく、常時監視するために、ブロック生成(約30秒毎)の検知を行う

      // ブロック生成の検知  /////////////////////////////////////////////////////////////////
      listener.newBlock()
        .subscribe(block => {
          //  console.log(block);    //ブロック生成 　表示OFF
        });

      // 未承認トランザクションの検知  ////////////////////////////////////////////////////////
      listener.unconfirmedAdded(address)
        .subscribe(tx => {
          //受信後の処理を記述
          console.log("未承認Tx 検知　＝＝＝", tx);
          // 未承認トランザクション音を鳴らす
          var my_audio = new Audio("./src/ding.ogg");
          my_audio.currentTime = 0;  //再生開始位置を先頭に戻す
          my_audio.play();  //サウンドを再生 
          var popup = document.getElementById('popup'); //ポップアップを表示
          popup.classList.toggle('is-show');
        });

      // 承認トランザクションの検知  //////////////////////////////////////////////////////////
      listener.confirmed(address)
        .subscribe(tx => {
          //受信後の処理を記述
          console.log("承認Tx 検知　＝＝＝", tx);
          // 承認音を鳴らす   
          var my_audio = new Audio("./src/ding2.ogg");
          my_audio.currentTime = 0;  //再生開始位置を先頭に戻す      
          my_audio.play();  //サウンドを再生
          var popup = document.getElementById('popup'); // ポップアップを閉じる
          popup.classList.toggle('is-show');
          var audio = new Audio('./src/ventus.mp3');
          audio.play();
          if (tx.type !== 16712) {  // ロックハッシュの時 承認後　50秒後にリロードする
            window.setTimeout(function () { location.reload(); }, 6000); // 6秒後にページをリロード
          } else {
            window.setTimeout(function () { location.reload(); }, 50000); // 50秒後にページをリロード
          }
        });


      // マルチシグアカウントの署名要求を検知  //////////////////////////////////////////////////

      const alice_1 = sym.PublicAccount.createFromPublicKey(
        window.SSS.activePublicKey,
        networkType
      );

      bondedListener = listener.aggregateBondedAdded(alice_1.address);

      bondedHttp = txRepo.search({
        address: alice_1.address,
        group: sym.TransactionGroup.Partial
      })
        .pipe(
          op.delay(2000),
          op.mergeMap(page => page.data)
        );


      //マルチシグアカウントの情報を取得
      msigRepo.getMultisigAccountInfo(sym.Address.createFromRawAddress(window.SSS.activeAddress)) // アクティブアカウント
        .subscribe(msig1 => {

          console.log("%cmsig 1 == ", "color: pink", msig1);

          bondedSubscribe = function (observer) {
            observer.pipe(
              //すでに署名済みでない場合
              op.filter(_ => {
                console.log("%c　アクティブアカウント　signedByAccount ==== ", "color: green", !_.signedByAccount(alice_1.publicKey)) //////////
                return !_.signedByAccount(alice_1.publicKey);
              })
            ).subscribe(_ => {
              txRepo.getTransactionsById(
                [_.transactionInfo.hash],
                sym.TransactionGroup.Partial
              )
                .pipe(
                  op.filter(aggTx => aggTx.length > 0)
                )
                .subscribe(aggTx => {
                  console.log("リスナー検知 aggTx===", aggTx)

                  if (aggTx[0].signer.address.address !== window.SSS.activeAddress) { //アクティブアカウントが起案者のアカウントではない場合
                    console.log("インナートランザクションの署名者に自分が指定されている場合");

                    console.log("署名済みチェック===", (aggTx[0].cosignatures.find((inTx) => inTx.signer.publicKey === window.SSS.activePublicKey)));

                    if ((aggTx[0].cosignatures.find((inTx) => inTx.signer.publicKey === window.SSS.activePublicKey)) === undefined) {
                      if (msig1.cosignatoryAddresses.length === 0) { // 連署者アカウントの場合

                        Swal.fire({
                          title: `署名要求が届いています`,
                          html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a><br><br><font color="red">取引を取り消す事は出来ません。<br>全ての金額と受取人のアドレスを確認し、<br>慎重に署名を行なってください。</font>`,
                          icon: 'info',
                          showCancelButton: true,
                          confirmButtonText: '署名する',
                          cancelButtonText: 'キャンセル',

                        }).then((result) => {
                          if (result.isConfirmed) {
                            // 実行ボタンがクリックされた場合の処理
                            window.SSS.setTransaction(aggTx[0]);
                            window.SSS.requestSignCosignatureTransaction().then((signedTx) => {
                              console.log('signedTx', signedTx);
                              txRepo.announceAggregateBondedCosignature(signedTx);// announce

                              var my_audio = new Audio("./src/ding.ogg");
                              my_audio.currentTime = 0;  //再生開始位置を先頭に戻す
                              my_audio.play();  //サウンドを再生

                              Swal.fire({
                                title: '署名しました！',
                                html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a>`,
                                cancelButtonText: '閉じる'
                              })
                            })

                            // Swal.fire('実行完了', 'プログラムが正常に実行されました。', 'success');
                          } else if (result.dismiss === Swal.DismissReason.cancel) {
                            // キャンセルボタンがクリックされた場合の処理
                            console.log('署名をキャンセルしました。');
                          }
                        });
                      } else { // マルチシグアカウントの場合
                        Swal.fire({
                          title: `署名要求が届いています`,
                          html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a><br><br><font color="red">マルチシグアカウントからは署名出来ません。<br>連署者のアカウントにて<br>慎重に署名を行なってください。</font>`,
                          icon: 'info',
                          cancelButtonText: '閉じる',

                        })
                      }
                    }
                  }
                });
            });
          }
          bondedSubscribe(bondedListener);
          bondedSubscribe(bondedHttp);

          for (const msig2 of msig1.multisigAddresses) {  // １階層上のアドレスをチェック

            accountRepo.getAccountInfo(msig2).toPromise().then((accountInfo) => { //  アドレスから公開鍵を取得する

              const alice_2 = sym.PublicAccount.createFromPublicKey(
                accountInfo.publicKey,
                networkType
              );

              bondedListener = listener.aggregateBondedAdded(alice_2.address);

              bondedHttp = txRepo.search({
                address: alice_2.address,
                group: sym.TransactionGroup.Partial
              })
                .pipe(
                  op.delay(2000),
                  op.mergeMap(page => page.data)
                );

              msigRepo.getMultisigAccountInfo(msig2)
                .subscribe(msig => {

                  console.log("%cmsig 2== ", "color: pink", msig);

                  bondedSubscribe = function (observer) {
                    observer.pipe(
                      //すでに署名済みでない場合
                      op.filter(_ => {
                        console.log("%c１階層上　signedByAccount ==== ", "color: green", !_.signedByAccount(alice_2.publicKey)) //////////
                        return !_.signedByAccount(alice_2.publicKey);
                      })
                    ).subscribe(_ => {
                      txRepo.getTransactionsById(
                        [_.transactionInfo.hash],
                        sym.TransactionGroup.Partial
                      )
                        .pipe(
                          op.filter(aggTx => aggTx.length > 0)
                        )
                        .subscribe(aggTx => {
                          console.log("１階層上　リスナー検知 aggTx===", aggTx)

                          if (aggTx[0].signer.address.address !== window.SSS.activeAddress) { //一つ上のアカウントが signer のアカウントではない場合
                            console.log("インナートランザクションの署名者に自分が指定されている場合");

                            console.log("１階層上　署名済みチェック===", (aggTx[0].cosignatures.find((inTx) => inTx.signer.publicKey === window.SSS.activePublicKey)));

                            if ((aggTx[0].cosignatures.find((inTx) => inTx.signer.publicKey === window.SSS.activePublicKey)) === undefined) {
                              if (msig1.cosignatoryAddresses.length === 0) { // 連署者アカウントの場合

                                Swal.fire({
                                  title: `署名要求が届いています`,
                                  html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a><br><br><font color="red">取引を取り消す事は出来ません。<br>全ての金額と受取人のアドレスを確認し、<br>慎重に署名を行なってください。</font>`,
                                  icon: 'info',
                                  showCancelButton: true,
                                  confirmButtonText: '署名する',
                                  cancelButtonText: 'キャンセル',

                                }).then((result) => {
                                  if (result.isConfirmed) {
                                    // 実行ボタンがクリックされた場合の処理
                                    window.SSS.setTransaction(aggTx[0]);
                                    window.SSS.requestSignCosignatureTransaction().then((signedTx) => {
                                      console.log('signedTx', signedTx);
                                      txRepo.announceAggregateBondedCosignature(signedTx);// announce

                                      var my_audio = new Audio("./src/ding.ogg");
                                      my_audio.currentTime = 0;  //再生開始位置を先頭に戻す
                                      my_audio.play();  //サウンドを再生

                                      Swal.fire({
                                        title: '署名しました！',
                                        html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a>`,
                                        cancelButtonText: '閉じる'
                                      })
                                    })

                                    // Swal.fire('実行完了', 'プログラムが正常に実行されました。', 'success');
                                  } else if (result.dismiss === Swal.DismissReason.cancel) {
                                    // キャンセルボタンがクリックされた場合の処理
                                    console.log('署名をキャンセルしました。');
                                  }
                                });
                              } else { // マルチシグアカウントの場合
                                Swal.fire({
                                  title: `署名要求が届いています`,
                                  html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a><br><br><font color="red">マルチシグアカウントからは署名出来ません。<br>連署者のアカウントにて<br>慎重に署名を行なってください。</font>`,
                                  icon: 'info',
                                  cancelButtonText: '閉じる',

                                })
                              }
                            }
                          }
                        });
                    });
                  }
                  bondedSubscribe(bondedListener);
                  bondedSubscribe(bondedHttp);

                  for (const msig3 of msig.multisigAddresses) { // 2階層上のアドレスをチェック

                    accountRepo.getAccountInfo(msig3).toPromise().then((accountInfo) => { //  アドレスから公開鍵を取得する

                      const alice_3 = sym.PublicAccount.createFromPublicKey(
                        accountInfo.publicKey,
                        networkType
                      );

                      bondedListener = listener.aggregateBondedAdded(alice_3.address);

                      bondedHttp = txRepo.search({
                        address: alice_3.address,
                        group: sym.TransactionGroup.Partial
                      })
                        .pipe(
                          op.delay(2000),
                          op.mergeMap(page => page.data)
                        );

                      msigRepo.getMultisigAccountInfo(msig3)
                        .subscribe(msig => {

                          console.log("%cmsig 3 == ", "color: pink", msig);

                          bondedSubscribe = function (observer) {
                            observer.pipe(
                              //すでに署名済みでない場合
                              op.filter(_ => {
                                console.log("%c２階層上　signedByAccount ==== ", "color: green", !_.signedByAccount(alice_3.publicKey)) //////////
                                return !_.signedByAccount(alice_3.publicKey);
                              })
                            ).subscribe(_ => {
                              txRepo.getTransactionsById(
                                [_.transactionInfo.hash],
                                sym.TransactionGroup.Partial
                              )
                                .pipe(
                                  op.filter(aggTx => aggTx.length > 0)
                                )
                                .subscribe(aggTx => {
                                  console.log("２階層上　リスナー検知 aggTx===", aggTx)

                                  if (aggTx[0].signer.address.address !== window.SSS.activeAddress) { //アクティブアカウントが signer のアカウントではない場合
                                    console.log("インナートランザクションの署名者に自分が指定されている場合");

                                    console.log("2階層上　署名済みチェック===", (aggTx[0].cosignatures.find((inTx) => inTx.signer.publicKey === window.SSS.activePublicKey)));

                                    if ((aggTx[0].cosignatures.find((inTx) => inTx.signer.publicKey === window.SSS.activePublicKey)) === undefined) {
                                      if (msig1.cosignatoryAddresses.length === 0) { // 連署者アカウントの場合

                                        Swal.fire({
                                          title: `署名要求が届いています`,
                                          html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a><br><br><font color="red">取引を取り消す事は出来ません。<br>全ての金額と受取人のアドレスを確認し、<br>慎重に署名を行なってください。</font>`,
                                          icon: 'info',
                                          showCancelButton: true,
                                          confirmButtonText: '署名する',
                                          cancelButtonText: 'キャンセル',

                                        }).then((result) => {
                                          if (result.isConfirmed) {
                                            // 実行ボタンがクリックされた場合の処理
                                            window.SSS.setTransaction(aggTx[0]);
                                            window.SSS.requestSignCosignatureTransaction().then((signedTx) => {
                                              console.log('signedTx', signedTx);
                                              txRepo.announceAggregateBondedCosignature(signedTx);// announce

                                              var my_audio = new Audio("./src/ding.ogg");
                                              my_audio.currentTime = 0;  //再生開始位置を先頭に戻す
                                              my_audio.play();  //サウンドを再生

                                              Swal.fire({
                                                title: '署名しました！',
                                                html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a>`,
                                                cancelButtonText: '閉じる'
                                              })
                                            })

                                            // Swal.fire('実行完了', 'プログラムが正常に実行されました。', 'success');
                                          } else if (result.dismiss === Swal.DismissReason.cancel) {
                                            // キャンセルボタンがクリックされた場合の処理
                                            console.log('署名をキャンセルしました。');
                                          }
                                        });
                                      } else { // マルチシグアカウントの場合
                                        Swal.fire({
                                          title: `署名要求が届いています`,
                                          html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a><br><br><font color="red">マルチシグアカウントからは署名出来ません。<br>連署者のアカウントにて<br>慎重に署名を行なってください。</font>`,
                                          icon: 'info',
                                          cancelButtonText: '閉じる',

                                        })
                                      }
                                    }
                                  }
                                });
                            });
                          }
                          bondedSubscribe(bondedListener);
                          bondedSubscribe(bondedHttp);

                        })
                    })
                  }

                })
            })
          }
        },
          error => {
            // エラーが発生した場合の処理　　マルチシグアカウントが無い場合 //////////////////////////////////////////////////

            console.error("マルチシグアカウントが有りません");

            bondedSubscribe = function (observer) {
              observer.pipe(

                //すでに署名済みでない場合
                op.filter(_ => {
                  return !_.signedByAccount(alice_1.publicKey);
                })
              ).subscribe(_ => {

                txRepo.getTransactionsById(
                  [_.transactionInfo.hash],
                  sym.TransactionGroup.Partial
                )
                  .pipe(
                    op.filter(aggTx => aggTx.length > 0)
                  )
                  .subscribe(aggTx => {
                    console.log("検知 aggTx===", aggTx)

                    if (aggTx[0].signer.address.address !== window.SSS.activeAddress) { //メインのアカウントが起案者のアカウントではない場合
                      //インナートランザクションの署名者に自分が指定されている場合

                      console.log("署名済みチェック===", (aggTx[0].cosignatures.find((inTx) => inTx.signer.publicKey === window.SSS.activePublicKey)));

                      if ((aggTx[0].cosignatures.find((inTx) => inTx.signer.publicKey === window.SSS.activePublicKey)) === undefined) {

                        Swal.fire({
                          title: `署名要求が届いています`,
                          html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a><br><br><font color="red">取引を取り消す事は出来ません。<br>全ての金額と受取人のアドレスを確認し、<br>慎重に署名を行なってください。</font>`,
                          icon: 'info',
                          showCancelButton: true,
                          confirmButtonText: '署名する',
                          cancelButtonText: 'キャンセル',

                        }).then((result) => {
                          if (result.isConfirmed) {

                            // 実行ボタンがクリックされた場合の処理
                            window.SSS.setTransaction(aggTx[0]);
                            window.SSS.requestSignCosignatureTransaction().then((signedTx) => {
                              console.log('signedTx', signedTx);
                              txRepo.announceAggregateBondedCosignature(signedTx);// announce

                              var my_audio = new Audio("./src/ding.ogg");
                              my_audio.currentTime = 0;  //再生開始位置を先頭に戻す
                              my_audio.play();  //サウンドを再生

                              Swal.fire({
                                title: '署名しました！',
                                html: `<a href="${EXPLORER}/transactions/${aggTx[0].transactionInfo.hash}" target="_blank"><b>➡️こちらをクリックして詳細を確認してください。</b></a>`,
                                cancelButtonText: '閉じる'
                              })
                            })

                            // Swal.fire('実行完了', 'プログラムが正常に実行されました。', 'success');
                          } else if (result.dismiss === Swal.DismissReason.cancel) {
                            // キャンセルボタンがクリックされた場合の処理
                            console.log('署名をキャンセルしました。');
                          }
                        });

                      }
                    }
                  });
              });
            }
            bondedSubscribe(bondedListener);
            bondedSubscribe(bondedHttp);

          });
    });

    // }); // async

    ///////////////////////////////////////////////////////////////////////////////


    //////////////////////////////////////  トランザクション履歴を取得する  //////////////////////////////////////////////////////////////////////////////


    const searchCriteria = {
      group: sym.TransactionGroup.Confirmed,
      address,
      pageNumber: 1,
      pageSize: 10,
      order: sym.Order.Desc,
      embedded: false,
    };

    console.log("searchCriteria=", searchCriteria);  //////////////////
    console.log("txRepo=", txRepo);   //////////////////

    const dom_txInfo = document.getElementById('wallet-transactions');
    console.log("dom_txInfo=", dom_txInfo);

    txRepo
      .search(searchCriteria)
      .subscribe(async txs => {
        console.log("txs=", txs);         /////////////////

        let t = 1;
        let en = new Array(searchCriteria.pageSize);

        for (let tx of txs.data) {   ///////////////    tx を pageSize の回数繰り返す ///////////////////

          const dom_tx = document.createElement('div');
          const dom_date = document.createElement('div');
          dom_date.style.fontSize = "20px";
          const dom_txType = document.createElement('div');
          const dom_hash = document.createElement('div');
          const dom_signer_address = document.createElement('div');
          const dom_recipient_address = document.createElement('div');

          const dom_enc = document.createElement('div');
          const dom_message = document.createElement('div');
          dom_message.style.fontFamily = "Hiragino Maru Gothic ProN W4";
          const dom_namespace = document.createElement('div');
          //const dom_mosaic = document.createElement('div');
          const dom_account = document.createElement('div');
          const dom_restriction = document.createElement('div');
          const dom_hash_lock = document.createElement('div');
          const dom_account_modification_add = document.createElement('div');
          const dom_account_modification_del = document.createElement('div');
          const dom_msig_account = document.createElement('div');
          const dom_min_approval_delta = document.createElement('div');
          const dom_min_removal_delta = document.createElement('div');
          //const dom_NFT = document.createElement('div');

          dom_txType.innerHTML = `<p style="text-align: right; line-height:100%;&"><font color="#0000ff">< ${getTransactionType(tx.type)} ></font></p>`;        //　 　Tx Type

          if (tx.type === 16712) { //ハッシュロック時のハッシュ値
            dom_hash.innerHTML = `<p style="text-align: right"><button type="button" class="button-txinfo" id="${EXPLORER}/transactions/${tx.hash}" onclick="transaction_info(this.id);"><i>⛓ Transaction Info ⛓</i></a></button></p>`; //Tx hash 
          } else {
            dom_hash.innerHTML = `<p style="text-align: right"><button type="button" class="button-txinfo" id="${EXPLORER}/transactions/${tx.transactionInfo.hash}" onclick="transaction_info(this.id);"><i>⛓ Transaction Info ⛓</i></a></button></p>`; //Tx hash 
          }

          dom_signer_address.innerHTML = `<div class="copy_container"><font color="#2f4f4f">From : ${tx.signer.address.address}</font><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${tx.signer.address.address}" onclick="Onclick_Copy(this.id);" /></div>`;    //  送信者 アドレス


          ////////////////////////////////////////////　　  　timestamp to Date 　　　　　/////////////////////////
          const timestamp = epochAdjustment + (parseInt(tx.transactionInfo.timestamp.toHex(), 16) / 1000);   /////////////// Unit64 を 16進数に　変換したあと10進数に変換　
          const date = new Date(timestamp * 1000);

          const yyyy = `${date.getFullYear()}`;
          // .slice(-2)で文字列中の末尾の2文字を取得する
          // `0${date.getHoge()}`.slice(-2) と書くことで０埋めをする
          const MM = `0${date.getMonth() + 1}`.slice(-2); // getMonth()の返り値は0が基点
          const dd = `0${date.getDate()}`.slice(-2);
          const HH = `0${date.getHours()}`.slice(-2);
          const mm = `0${date.getMinutes()}`.slice(-2);
          const ss = `0${date.getSeconds()}`.slice(-2);

          const ymdhms = `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;

          //console.log(ymdhms);  // 日時を表示

          dom_date.innerHTML = `<font color="#7E00FF"><p style="text-align: right">${ymdhms}</p></font>`;    //　日付  右寄せ
          ///////////////////////////////////////////////////////////////////////////////////////////////////////

          dom_tx.appendChild(dom_hash);                      // dom_hash(⛓Transacrion info⛓) をdom_txに追加
          dom_tx.appendChild(dom_date);                      // dom_date(日付)　をdom_txに追加        	        
          dom_tx.appendChild(dom_txType);                    // dom_txType(Txタイプ) をdom_txに追加         
          dom_tx.appendChild(dom_signer_address);            // dom_signer_address(送信者アドレス) をdom_txに追加  

          //  ----------------------------------------------------------------  //

          if (tx.type === 16724) { // tx.type が 'TRANSFER' の場合    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////      
            if (tx.recipientAddress.address === undefined) {  // 宛先が Namespace の場合 NamespaceId から取得し表示する
              (async () => {
                //let namespacesNames = await nsRepo.getNamespacesNames([sym.NamespaceId.createFromEncoded(tx.recipientAddress.id.toHex())]).toPromise();
                const namespaceName = await nsRepo.getNamespace(tx.recipientAddress.id).toPromise().catch(() => console.count(`Namespace Error!!`));         // Namespace　有無のチェック
                if (namespaceName !== undefined) {
                  const a = await nsRepo.getNamespacesNames([namespaceName.levels[0].id]).toPromise();
                  let name1 = [a][0][0].name;   //  root
                  if (namespaceName.levels.length > 1) {
                    const b = await nsRepo.getNamespacesNames([namespaceName.levels[1].id]).toPromise();
                    name1 = name1 + "." + [b][0][0].name;  // sub1
                    if (namespaceName.levels.length > 2) {
                      const c = await nsRepo.getNamespacesNames([namespaceName.levels[2].id]).toPromise();
                      name1 = name1 + "." + [c][0][0].name;  // sub2
                    }
                  }
                  dom_recipient_address.innerHTML = `<div class="copy_container"><font color="#2f4f4f">To　: <a href="${EXPLORER}/namespaces/${name1}" target="_blank" rel="noopener noreferrer">${name1}</a><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${name1}" onclick="Onclick_Copy(this.id);" /></div></font>`; //  文字列の結合　   宛先                       
                } else {
                  dom_namespace.innerHTML = `<font color="#ff6347"><big>To:　Namespace 期限切れ</big></font>`;
                }
              })(); // async() 
            } else {   // Nから始まるの39文字のアドレスの場合はそのままアドレスを表示
              dom_recipient_address.innerHTML = `<div class="copy_container"><font color="#2f4f4f">To　:   ${tx.recipientAddress.address}</font><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${tx.recipientAddress.address}" onclick="Onclick_Copy(this.id);" /></div>`; //  文字列の結合　   宛先
            }
            dom_tx.appendChild(dom_recipient_address);         // dom_recipient_address をdom_txに追加

            //console.log('Tx_Mosaics =',tx.mosaics.length);  ///  モザイクの数を表示 ///////////////////////////////////////////

            /////////// モザイクが空ではない場合   /////////////////　　モザイクが空の場合はこの for 文はスルーされる  //////////
            for (let i = 0; i < tx.mosaics.length; i++) {  //モザイクの数だけ繰り返す
              const dom_mosaic = document.createElement('div');
              const dom_amount = document.createElement('div');
              const dom_mosaic_img = document.createElement('div');
              const dom_NFT = document.createElement('div');

              (async () => {
                let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(tx.mosaics[i].id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

                mosaicInfo = await mosaicRepo.getMosaic(tx.mosaics[i].id.id).toPromise();// 可分性の情報を取得する                     
                let div = mosaicInfo.divisibility; // 可分性      

                if (tx.signer.address.address === address.address) {  // 署名アドレスとウォレットのアドレスが同じ場合　 

                  if ([mosaicNames][0][0].names.length !== 0) {  // ネームスペースがある場合
                    dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                  } else {   　　　　　　　　　　　　　　　　　　　　　 //　ネームスペースがない場合
                    dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<strong>${tx.mosaics[i].id.id.toHex()}</strong></font>`;
                  }
                  dom_amount.innerHTML = `<font color="#FF0000" size="+1">💁‍♀️➡️💰 :　<i><big><strong> ${(parseInt(tx.mosaics[i].amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量

                } else {     //  署名アドレスとウォレットアドレスが違う場合
                  if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                         
                    dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                  } else { 　　　　　　　　　　　　　　　　　　　　　  // ネームスペースがない場合
                    dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${tx.mosaics[i].id.id.toHex()}</strong></font>`;
                    // console.log("%cdom_mosaic====","color: red",tx.mosaics[i].id.id.toHex(),i);                            
                  }
                  dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(tx.mosaics[i].amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
                }
                // console.log("%ci モザイクが空では無い場合の処理　iだよ　",'color: red',i); 
              })(); // async() 

              xym_mon(tx.mosaics[i].id, dom_NFT, window.SSS.activePublicKey); // xym_mon NFT画像表示
              nftdrive(tx.mosaics[i].id, dom_NFT); // nftdrive NFT画像表示
              comsa(tx.mosaics[i].id, dom_NFT);    // comsa NFT画像表示
              comsaNCFT(tx.mosaics[i].id, dom_NFT);    // comsa NCFT画像表示

              if (tx.mosaics[i].id.toHex() !== "6BED913FA20223F8" && tx.mosaics[i].id.toHex() !== "72C0212E67A08BCE") { // XYMのモザイク画像は表示しない

                ///////////////  Mosaic Center  /////////////////////

                // mosaic-center の画像を表示
                fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${tx.mosaics[i].id.id.toHex()}`)
                  .then((response) => {
                    // レスポンスが成功したかどうかを確認
                    if (!response.ok) {
                      throw new Error(`Network response was not ok: ${response.status}`);
                    }
                    // JSONデータを解析して返す
                    return response.json();
                  })
                  .then((data) => {
                    if (data !== null) { //データがある場合
                      dom_mosaic_img.innerHTML = `
                            <br><div style="text-align: center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                                                             <br>
                                                             <br>
                                                             <a href="https://symbol.fyi/mosaics/${tx.mosaics[i].id.id.toHex()}" target="_blank" style="display: inline-block; width: 200px;">
                                                             <img class="mosaic_img" src=${data[0][7]} width="200">
                                                             </a></div><br>
                                                            `
                    }
                  })
                  .catch((error) => {
                    console.error("Fetch error:", error);
                  });

              }

              dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加
              dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加
              dom_tx.appendChild(dom_NFT);                       // dom_NFT をdom_txに追加
              dom_tx.appendChild(dom_mosaic_img);                // dom_mosaic_img をdom_txに追加 

              await new Promise(resolve => setTimeout(resolve, 100)); // 0.1秒処理を止める

            }  //モザイクの数だけ繰り返す
            //})(); // async() 

            if (tx.mosaics.length === 0) {   // モザイクが空の場合  //////////////　モザイクがある場合はこの if 文はスルーされる
              const dom_mosaic = document.createElement('div');
              const dom_amount = document.createElement('div');

              if (tx.signer.address.address === address.address) {  // 署名アドレスとウォレットのアドレスが同じ場合
                dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　No mosaic</font>`;     // No mosaic
                dom_amount.innerHTML = `<font color="#FF0000">💁‍♀️➡️💰 : </font>`;     // 　数量
              } else {          //  署名アドレスとウォレットアドレスが違う場合
                dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　No mosaic</font>`;     // No mosaic
                dom_amount.innerHTML = `<font color="#008000">💰➡️😊 : </font>`;     // 　数量        
              }
              dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
              dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加
            }     /////////////////////////////////////////////////////////////////////////////////////////////////////    

            if (tx.message.type === 1) {   // メッセージが暗号文の時          
              let alice;
              let PubKey;
              let enc_message1 = {};
              dom_enc.innerHTML = `<font color="#ff00ff"><strong></br><ul class="decryption">暗号化メッセージ</strong>　< Encrypted Message ></font>`;     // 暗号化メッセージの場合

              dom_tx.appendChild(dom_enc);

              (async () => {

                if (tx.recipientAddress.address !== undefined) { //送信先のアドレスが、39文字のアドレスの場合

                  if (tx.recipientAddress.address !== tx.signer.address.address) {    // 送信先アドレスと、送信元アドレスが異なる場合  ///////////////////////////////
                    if (tx.signer.address.address === address.address) {   // 署名アドレスと、ウォレットアドレスが同じ場合
                      alice = sym.Address.createFromRawAddress(tx.recipientAddress.address);   //アドレスクラスの生成

                    } else
                      if (tx.recipientAddress.address === address.address) { // 送信先アドレスと、ウォレットアドレスが同じ場合
                        alice = sym.Address.createFromRawAddress(tx.signer.address.address);   //アドレスクラスの生成			
                      }

                  } else {    // 送信先アドレスと、ウォレットアドレスが同じ場合
                    alice = sym.Address.createFromRawAddress(tx.recipientAddress.address);   //アドレスクラスの生成
                    PubKey = window.SSS.activePublicKey;
                  }

                } else {  //送信先のアドレスが、ネームスペースの場合
                  const to_address = await nsRepo.getLinkedAddress(tx.recipientAddress.id).toPromise();

                  if (to_address.address !== tx.signer.address.address) {    // 送信先アドレスと、送信元アドレスが異なる場合  ///////////////////////////////
                    if (tx.signer.address.address === address.address) {   // 署名アドレスと、ウォレットアドレスが同じ場合
                      alice = sym.Address.createFromRawAddress(tx.recipientAddress.address);   //アドレスクラスの生成

                    } else
                      if (to_address.address === address.address) { // 送信先アドレスと、ウォレットアドレスが同じ場合
                        alice = sym.Address.createFromRawAddress(tx.signer.address.address);   //アドレスクラスの生成			
                      }

                  } else {    // 送信先アドレスと、ウォレットアドレスが同じ場合
                    alice = sym.Address.createFromRawAddress(to_address.address);   //アドレスクラスの生成
                    PubKey = window.SSS.activePublicKey;
                  }
                }
                accountRepo.getAccountInfo(alice).toPromise().then((accountInfo) => { //  アドレスから公開鍵を取得する
                  PubKey = accountInfo.publicKey;
                  enc_message1.message = tx.message.payload;
                  enc_message1.PubKey = PubKey;
                  en[t] = enc_message1;
                  // console.table(en);

                  dom_message.innerHTML = `<input type="button" id="${PubKey}" value="${tx.message.payload}" onclick="Onclick_Decryption(this.id, this.value);" class="button-decrypted"/></div>`;     // 　メッセージ
                  dom_tx.appendChild(dom_message);                   // dom_message をdom_txに追加                                                              
                  dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く    

                }); //公開鍵を取得
              })(); // async() 
            } else {          // 平文の場合
              dom_message.innerHTML = `<font color="#4169e1"><br><br>< Message ><br>${tx.message.payload}</font>`;     // 　メッセージ
              dom_tx.appendChild(dom_message);                   // dom_message をdom_txに追加                                                              
              dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
            }
          } // tx.type が 'TRANSFER' の場合

          //  ----------------------------------------------------------------  //

          if (tx.type === 16718) {       // tx.type が 'NAMESPACE_REGISTRATION' の場合	  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if (tx.registrationType === 0) {
              dom_namespace.innerHTML = `<font color="#008b8b">root Namespace 登録 :　<big><strong>${tx.namespaceName}</strong></big></font>`;
            } else
              if (tx.registrationType === 1) {
                dom_namespace.innerHTML = `<font color="#008b8b">sub Namespace 登録 :　<big><strong>${tx.namespaceName}</strong></big></font>`;
              }
            dom_tx.appendChild(dom_namespace);                 // namespaceをdom_txに追加
            dom_tx.appendChild(dom_message);                   // dom_message をdom_txに追加                                                              
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く          	  		  		  	  
          }
          //  ----------------------------------------------------------------  //

          if (tx.type === 17229) {       // tx.type が 'MOSAIC_SUPPLY_REVOCATION' の場合	  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            const dom_mosaic = document.createElement('div');
            const dom_amount = document.createElement('div');
            const dom_mosaic_img = document.createElement('div');
            const dom_NFT = document.createElement('div');

            (async () => {
              let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(tx.mosaic.id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

              mosaicInfo = await mosaicRepo.getMosaic(tx.mosaic.id.id).toPromise();// 可分性の情報を取得する                     
              let div = mosaicInfo.divisibility; // 可分性      

              if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                         
                dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic 回収 :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
              } else { 　　　　　　　　　　　　　　　　　　　　　  // ネームスペースがない場合
                dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic 回収 :　<strong>${tx.mosaic.id.id.toHex()}</strong></font>`;
              }
              dom_amount.innerHTML = `<font color="#3399FF" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(tx.mosaic.amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量                
            })(); // async() 

            ///////////////  Mosaic Center  /////////////////////

            // mosaic-center の画像を表示
            fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${tx.mosaic.id.id.toHex()}`)
              .then((response) => {
                // レスポンスが成功したかどうかを確認
                if (!response.ok) {
                  throw new Error(`Network response was not ok: ${response.status}`);
                }
                // JSONデータを解析して返す
                return response.json();
              })
              .then((data) => {
                if (data !== null) { //データがある場合
                  dom_mosaic_img.innerHTML = `
                            <br><div style="text-align: center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                                                             <br>
                                                             <br>
                                                             <a href="https://symbol.fyi/mosaics/${tx.mosaic.id.id.toHex()}" target="_blank" style="display: inline-block; width: 200px;">
                                                             <img class="mosaic_img" src=${data[0][7]} width="200">
                                                             </a></div><br>
                                                            `
                }
              })
              .catch((error) => {
                console.error("Fetch error:", error);
              });

            dom_recipient_address.innerHTML = `<div class="copy_container"><font color="#2f4f4f">♻️回収先♻️ :　${tx.sourceAddress.address}</font><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${tx.sourceAddress.address}" onclick="Onclick_Copy(this.id);" /></div>`;
            dom_tx.appendChild(dom_recipient_address);
            dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
            dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加    
            dom_tx.appendChild(dom_NFT);                       // dom_NFT をdom_imgに追加
            dom_tx.appendChild(dom_mosaic_img);                // dom_mosaic_img をdom_imgに追加                                                       
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く          	  		  		  	  
          }
          //  ----------------------------------------------------------------  // 

          if (tx.type === 16973) {       // tx.type が 'MOSAIC_SUPPLY_CHANGE' の場合	  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            const dom_mosaic = document.createElement('div');
            if (tx.action === 0) {
              dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic :　${tx.mosaicId.toHex()}　<br><big><strong> 減少　⬇️　${parseInt(tx.delta.toHex(), 16)}</strong></big></font>`;
            } else
              if (tx.action === 1) {
                dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic :　${tx.mosaicId.toHex()}　<br><big><strong> 増加　⬆️　${parseInt(tx.delta.toHex(), 16)}</strong></big></font>`;
              }
            dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
          }

          //  ----------------------------------------------------------------  //

          if (tx.type === 16974) {       // tx.type が 'ADDRESS_ALIAS' の場合   ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////        
            (async () => {
              let alias_Action;
              if (tx.aliasAction === 1) {
                alias_Action = "Link";
              } else
                if (tx.aliasAction === 0) {
                  alias_Action = "Unlink";
                }
              // let namespacesNames = await nsRepo.getNamespacesNames([sym.NamespaceId.createFromEncoded(tx.namespaceId.id.toHex())]).toPromise();
              const namespaceName = await nsRepo.getNamespace(tx.namespaceId.id).toPromise().catch(() => console.count(`Namespace Error!!`));         // Namespace　有無のチェック;
              if (namespaceName !== undefined) {
                const a = await nsRepo.getNamespacesNames([namespaceName.levels[0].id]).toPromise();
                let name1 = [a][0][0].name;   //  root
                if (namespaceName.levels.length > 1) {
                  const b = await nsRepo.getNamespacesNames([namespaceName.levels[1].id]).toPromise();
                  name1 = name1 + "." + [b][0][0].name;  // sub1
                  if (namespaceName.levels.length > 2) {
                    const c = await nsRepo.getNamespacesNames([namespaceName.levels[2].id]).toPromise();
                    name1 = name1 + "." + [c][0][0].name;  // sub2
                  }
                }
                dom_namespace.innerHTML = `<font color="#008b8b">Namespace エイリアス <strong>${alias_Action}</strong></br></br>Namespace : <strong>${name1} </strong></br>Address : </br><strong>${tx.address.address}</strong></font>`;
              } else {
                dom_namespace.innerHTML = `<font color="#ff6347"><big>Namespace 期限切れ</big></font>`;
              }
              dom_tx.appendChild(dom_namespace);                 // dom_namespaceをdom_txに追加                                                             
              dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
            })(); // async()           	  		  		  	  
          }
          //  ----------------------------------------------------------------  //

          if (tx.type === 17230) {       // tx.type が 'MOSAIC_ALIAS' の場合	  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            (async () => {
              let alias_Action;
              if (tx.aliasAction === 1) {
                alias_Action = "Link";
              } else
                if (tx.aliasAction === 0) {
                  alias_Action = "Unlink";
                }
              // let namespacesNames = await nsRepo.getNamespacesNames([sym.NamespaceId.createFromEncoded(tx.namespaceId.id.toHex())]).toPromise();
              const namespaceName = await nsRepo.getNamespace(tx.namespaceId.id).toPromise().catch(() => console.count(`Namespace Error!!`));         // Namespace　有無のチェック;
              if (namespaceName !== undefined) {
                const a = await nsRepo.getNamespacesNames([namespaceName.levels[0].id]).toPromise();
                let name1 = [a][0][0].name;   //  root
                if (namespaceName.levels.length > 1) {
                  const b = await nsRepo.getNamespacesNames([namespaceName.levels[1].id]).toPromise();
                  name1 = name1 + "." + [b][0][0].name;  // sub1
                  if (namespaceName.levels.length > 2) {
                    const c = await nsRepo.getNamespacesNames([namespaceName.levels[2].id]).toPromise();
                    name1 = name1 + "." + [c][0][0].name;  // sub2
                  }
                }
                dom_namespace.innerHTML = `<font color="#008b8b">Mosaic エイリアス <strong>${alias_Action}</strong></br></br>Namespace : <strong>${name1} </strong></br>MosaicID : <strong>${tx.mosaicId.id.toHex()}</strong></font>`;
              } else {
                dom_namespace.innerHTML = `<font color="#ff6347"><big>Namespace 期限切れ</big></font>`;
              }

              dom_tx.appendChild(dom_namespace);                  // dom_namespaceをdom_txに追加                                                               
              dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く   
            })(); // async()          	  		  		  	  
          }
          //  ----------------------------------------------------------------  //

          if (tx.type === 16720) {       // tx.type が 'ACCOUNT_ADDRESS_RESTRICTION' の場合	  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////              
            if (tx.restrictionFlags === 1) {
              restriction_type = "指定アドレスからのみ受信許可";
              res_Flag = "　　　　　　　　　➡️🟢";
            }
            if (tx.restrictionFlags === 16385) {
              restriction_type = "指定アドレス宛のみ送信許可";
              res_Flag = "　　　　　　　　　🟢➡️";
            }
            if (tx.restrictionFlags === 32769) {
              restriction_type = "指定アドレスからの受信拒否";
              res_Flag = "　　　　　　　　　➡️❌";
            }
            if (tx.restrictionFlags === 49153) {
              restriction_type = "指定アドレス宛への送信禁止";
              res_Flag = "　　　　　　　　　❌➡️";
            }

            if (tx.restrictionAdditions.length !== 0) {   // 制限追加
              dom_restriction.innerHTML = `<font color="#ff4500"><strong>⚠️アカウントアドレス制限　追加</strong></font>
                <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
                <br>${res_Flag}
                <br>アドレス : <strong>${tx.restrictionAdditions[0].address}</strong></font>`
            }

            if (tx.restrictionDeletions.length !== 0) {   // 制限削除
              dom_restriction.innerHTML = `<font color="#3399FF"><strong>⚠️アカウントアドレス制限　削除</strong></font>
                 <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
                 <br>${res_Flag}
                 <br>アドレス : <strong>${tx.restrictionDeletions[0].address}</strong></font>`
            }

            dom_tx.appendChild(dom_restriction);               // dom_restrictionをdom_txに追加
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
          }
          //  ----------------------------------------------------------------  //

          if (tx.type === 16976) {       // tx.type が 'ACCOUNT_MOSAIC_RESTRICTION' の場合	  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if (tx.restrictionFlags === 2) {
              restriction_type = "指定モザイクを含むトランザクションのみ受信許可";
              res_Flag = "　　　　　　　　　➡️🟢";
            }
            if (tx.restrictionFlags === 32770) {
              restriction_type = "指定モザイクを含むトランザクションを受信拒否";
              res_Flag = "　　　　　　　　　➡️❌";
            }

            if (tx.restrictionAdditions.length !== 0) {   // 制限追加
              dom_restriction.innerHTML = `<font color="#ff4500"><strong>⚠️アカウントモザイク制限　追加</strong></font>
                 <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
                 <br>${res_Flag}
                 <br>モザイクID : <strong>${tx.restrictionAdditions[0].id.toHex()}</strong></font>`
            }

            if (tx.restrictionDeletions.length !== 0) {   // 制限削除
              dom_restriction.innerHTML = `<font color="#3399FF"><strong>⚠️アカウントモザイク制限　削除</strong></font>
                <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
                <br>${res_Flag}
                <br>モザイクID : <strong>${tx.restrictionDeletions[0].id.toHex()}</strong></font>`
            }

            dom_tx.appendChild(dom_restriction);               // dom_restrictionをdom_txに追加
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
          }
          //  ----------------------------------------------------------------  //

          if (tx.type === 17232) {       // tx.type が 'ACCOUNT_OPERATION_RESTRICTION' の場合	  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if (tx.restrictionFlags === 16388) {
              restriction_type = "指定トランザクションの送信のみ許可";
              res_Flag = "　　　　　　　　　🟢➡️";
            }
            if (tx.restrictionFlags === 49156) {
              restriction_type = "指定トランザクションの送信を禁止";
              res_Flag = "　　　　　　　　　❌➡️";
            }

            dom_restriction.innerHTML = `<font color="#ff4500"><strong>⚠️アカウントトランザクション制限</strong></font>
              <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
              <br>${res_Flag}
              <br>Tx タイプ : <strong>${getTransactionType(tx.restrictionAdditions[0])}</strong></font>`

            dom_tx.appendChild(dom_restriction);               // dom_restrictionをdom_txに追加
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
          }
          //  ----------------------------------------------------------------  //

          if (tx.type === 16712) {       // tx.type が 'HASH_LOCK' の場合	  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            dom_hash_lock.innerHTML = `<font color="#ff4500"><big><strong>ハッシュロック
            <br>symbol.xym : 10xym </strong></big></font>
            <font color="#008b8b">
            <br>
            <br><strong>連署者の署名が揃うと10xymは返却されます。<br>署名が揃わない場合、48時間後にSymbolネットワークに徴収されます。</strong></font>`
            dom_tx.appendChild(dom_hash_lock);               // dom_restrictionをdom_txに追加
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
          }

          /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          if (tx.type === 16961 || tx.type === 16705) {      // tx.type が 'AGGREGATE_BONDED'　または 'AGGREGATE_COMPLETE' の場合		///////////////////////////////////////////////////////////////////////////////////////////////
            (async () => {
              const aggTx = await txRepo.getTransactionsById([tx.transactionInfo.hash], sym.TransactionGroup.Confirmed).toPromise();
              console.log('%c///////////////////////////////', 'color: green');
              console.log(`%caggTx  ( ${ymdhms} )`, "color: blue", aggTx[0]);

              const dom_amount = document.createElement('div');

              if (aggTx[0].innerTransactions[0].type === 16724) {  // TRANSFER の場合

                const dom_aggTx = document.createElement('div');
                const dom_mosaic = document.createElement('div');
                const dom_receive = document.createElement('div');
                const dom_NFT = document.createElement('div');
                const dom_mosaic_img = document.createElement('div');

                let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

                mosaicInfo = await mosaicRepo.getMosaic(aggTx[0].innerTransactions[0].mosaics[0].id.id).toPromise();// 可分性の情報を取得する                     
                let div = mosaicInfo.divisibility; // 可分性

                if (aggTx[0].innerTransactions[0].signer.address.address === address.address) {  // 署名アドレスとウォレットのアドレスが同じ場合　

                  if ([mosaicNames][0][0].names.length !== 0) {  // ネームスペースがある場合
                    dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                  } else {                                       //　ネームスペースがない場合
                    dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<strong>${aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex()}</strong></font>`;
                  }
                  dom_amount.innerHTML = `<font color="#FF0000" size="+1">💁‍♀️➡️💰 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaics[0].amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量

                } else {     //  署名アドレスとウォレットアドレスが違う場合
                  if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                         
                    dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                  } else {                                      // ネームスペースがない場合
                    dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex()}</strong></font>`;
                  }
                  dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaics[0].amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
                }

                if (aggTx[0].innerTransactions[0].message !== undefined) {     // １つ目、2つ目のインナートランザクションにメッセージがあれば表示する。
                  dom_message.innerHTML = `<font color="#4169e1"><br>< Message ><br>${aggTx[0].innerTransactions[0].message.payload}</font>`;     // 　メッセージ

                  if (aggTx[0].innerTransactions[0].message.payload === `{"version":"comsa-nft-1.0"}` || aggTx[0].innerTransactions[0].message.payload === `{"version":"comsa-nft-1.1"}`) {
                    // dom_NFT.innerHTML = `<font color="#4169e1">< Mosaic ID ></br>${aggTx[0].innerTransactions[1].mosaics[0].id.id.toHex()}`;
                    dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${aggTx[0].innerTransactions[1].mosaics[0].id.id.toHex()}</strong></font>`;
                    dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[1].mosaics[0].amount.toHex(), 16)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量 
                    comsa(aggTx[0].innerTransactions[1].mosaics[0].id, dom_NFT); // comsa NFT画像表示
                  }
                  if (aggTx[0].innerTransactions[0].message.payload === `{"version":"comsa-ncft-1.1"}`) {
                    dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${aggTx[0].innerTransactions[1].mosaics[0].id.id.toHex()}</strong></font>`;
                    dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[1].mosaics[0].amount.toHex(), 16)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
                    comsaNCFT(aggTx[0].innerTransactions[1].mosaics[0].id, dom_NFT); // comsa NCFT画像表示
                  }
                } else
                  if (aggTx[0].innerTransactions[1].message !== undefined) {
                    dom_message.innerHTML = `<font color="#4169e1"><br>< Message ><br>${aggTx[0].innerTransactions[1].message.payload}</font>`;     // メッセージ
                  }

                dom_aggTx.innerHTML = `<font color="#FF00FF">aggTx(${aggTx[0].innerTransactions.length})　${getTransactionType(aggTx[0].innerTransactions[0].type)}</font>`;  // アグリの数　と　Type

                xym_mon(aggTx[0].innerTransactions[0].mosaics[0].id, dom_NFT, window.SSS.activePublicKey); // xym_mon NFT画像表示
                nftdrive(aggTx[0].innerTransactions[0].mosaics[0].id, dom_NFT); // nftdrive NFT画像表示
                if (aggTx[0].innerTransactions.length > 1) {
                  if (aggTx[0].innerTransactions[1].recipientAddress.address === window.SSS.activeAddress && tx.type === 16961) {
                    dom_receive.innerHTML = `<div style="text-align: center"><font color="#008000" size="+1" >😊⬅️🖼️</font></div>`;
                  }
                  nftdrive(aggTx[0].innerTransactions[1].mosaics[0].id, dom_NFT); // nftdrive NFT画像表示  
                }
                if (aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex() !== "6BED913FA20223F8" && aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex() !== "72C0212E67A08BCE") { // XYMのモザイク画像は表示しない

                  ///////////////  Mosaic Center  /////////////////////

                  // mosaic-center の画像を表示
                  fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex()}`)
                    .then((response) => {
                      // レスポンスが成功したかどうかを確認
                      if (!response.ok) {
                        throw new Error(`Network response was not ok: ${response.status}`);
                      }
                      // JSONデータを解析して返す
                      return response.json();
                    })
                    .then((data) => {
                      if (data !== null) { //データがある場合
                        dom_mosaic_img.innerHTML = `
                        <br><div style="text-align: center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                                                         <br>
                                                         <br>
                                                         <a href="https://symbol.fyi/mosaics/${aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex()}" target="_blank" style="display: inline-block; width: 200px;">
                                                         <img class="mosaic_img" src=${data[0][7]} width="200">
                                                         </a></div><br>
                                                        `
                      }
                    })
                    .catch((error) => {
                      console.error("Fetch error:", error);
                    });

                }

                dom_tx.appendChild(dom_aggTx);                     // dom_aggTx をdom_txに追加
                dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
                dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加
                dom_tx.appendChild(dom_receive);                   // dom_receive をdom_txに追加
                dom_tx.appendChild(dom_NFT);                       // dom_NFT をdom_txに追加
                dom_tx.appendChild(dom_mosaic_img);                // dom_mosaic_img をdom_txに追加

                await new Promise(resolve => setTimeout(resolve, 100)); // 0.1秒処理を止める
              }

              if (aggTx[0].innerTransactions[0].type === 16717) { // MOSAIC_REGISTRATION の場合
                const dom_mosaic = document.createElement('div');
                dom_mosaic.innerHTML = `<font color="#008b8b">Mosaic 登録 :　<big><strong>${aggTx[0].innerTransactions[0].mosaicId.id.toHex()}</strong></big></font>`;
                dom_tx.appendChild(dom_mosaic);                  // dom_mosaicをdom_txに追加
              }

              if (aggTx[0].innerTransactions[0].type === 16708) { // ACCOUNT_METADATAの場合
                dom_account.innerHTML = `<font color="#ff6347"><big>METADATA登録 :　　Account</font><br><strong><font color="#008b8b"> Key :　${aggTx[0].innerTransactions[0].scopedMetadataKey.toHex()}<br>Address : ${window.SSS.activeAddress}</strong></big></font>`;
                dom_tx.appendChild(dom_account);
              }

              if (aggTx[0].innerTransactions[0].type === 16964) { // MOSAIC_METADATA の場合
                const dom_mosaic = document.createElement('div');
                dom_mosaic.innerHTML = `<font color="#ff6347"><big>METADATA登録 :　　Mosaic </font><br><strong><font color="#008b8b"> Key :　${aggTx[0].innerTransactions[0].scopedMetadataKey.toHex()}<br>Mosaic ID: 　${aggTx[0].innerTransactions[0].targetMosaicId.toHex()}</strong></big></font>`;
                dom_tx.appendChild(dom_mosaic);                  // dom_mosaicをdom_txに追加      
              }

              if (aggTx[0].innerTransactions[0].type === 17220) { // NAMESPACE_METADATA
                //var ns_name_Meta = await nsRepo.getNamespacesNames([aggTx[0].innerTransactions[0].targetNamespaceId.id]).toPromise();
                const namespaceName = await nsRepo.getNamespace(aggTx[0].innerTransactions[0].targetNamespaceId.id).toPromise().catch(() => console.count(`Namespace Error!!`));         // Namespace　有無のチェック
                //  console.log("1257==",namespaceName);
                if (namespaceName !== undefined) {
                  const a = await nsRepo.getNamespacesNames([namespaceName.levels[0].id]).toPromise();
                  let name1 = [a][0][0].name;   //  root
                  if (namespaceName.levels.length > 1) {
                    const b = await nsRepo.getNamespacesNames([namespaceName.levels[1].id]).toPromise();
                    name1 = name1 + "." + [b][0][0].name;  // sub1
                    if (namespaceName.levels.length > 2) {
                      const c = await nsRepo.getNamespacesNames([namespaceName.levels[2].id]).toPromise();
                      name1 = name1 + "." + [c][0][0].name;  // sub2
                    }
                  }
                  dom_namespace.innerHTML = `<font color="#ff6347"><big>METADATA登録 :　　Namespace</font><br><strong><font color="#008b8b"> Key :　${aggTx[0].innerTransactions[0].scopedMetadataKey.toHex()}<br>Namespace :　${name1}</strong></big></font>`;
                } else {
                  dom_namespace.innerHTML = `<font color="#ff6347"><big>Namespace 期限切れ</big></font>`;
                }
                dom_tx.appendChild(dom_namespace);                  // dom_namespaceをdom_txに追加
              }

              if (aggTx[0].innerTransactions[0].type === 16722) { // SECRET_LOCK
                const dom_aggTx = document.createElement('div');
                if (aggTx[0].innerTransactions[0].mosaic !== undefined) {
                  const dom_mosaic = document.createElement('div');
                  let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(aggTx[0].innerTransactions[0].mosaic.id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

                  mosaicInfo = await mosaicRepo.getMosaic(aggTx[0].innerTransactions[0].mosaic.id.id).toPromise();// 可分性の情報を取得する                     
                  let div = mosaicInfo.divisibility; // 可分性

                  if (aggTx[0].innerTransactions[0].signer.address.address === address.address) {  // 署名アドレスとウォレットのアドレスが同じ場合　
                    if ([mosaicNames][0][0].names.length !== 0) {  // ネームスペースがある場合
                      dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                    } else {                                       //　ネームスペースがない場合
                      dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<strong>${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}</strong></font>`;
                    }
                    dom_amount.innerHTML = `<font color="#FF0000" size="+1">💁‍♀️➡️💰 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaic.amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
                  } else {     //  署名アドレスとウォレットアドレスが違う場合
                    if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                                                       
                      dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                    } else {                                      // ネームスペースがない場合
                      dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}</strong></font>`;
                    }
                    dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaic.amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
                  }

                  dom_aggTx.innerHTML = `<font color="#FF00FF">aggTx(${aggTx[0].innerTransactions.length})　${getTransactionType(aggTx[0].innerTransactions[0].type)}</font>`;
                  dom_tx.appendChild(dom_aggTx);                     // dom_aggTx をdom_txに追加        
                  dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
                  dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加                                                                                           
                }

                if (aggTx[0].innerTransactions[0].message !== undefined) {     // １つ目、2つ目のインナートランザクションにメッセージがあれば表示する。 
                  dom_message.innerHTML = `</br><font color="#4169e1"><br>< Message ><br>${aggTx[0].innerTransactions[0].message.payload}</font>`;     // 　メッセージ              
                } else
                  if (aggTx[0].innerTransactions[1].message !== undefined) {
                    dom_message.innerHTML = `</br><font color="#4169e1"><br>< Message ><br>${aggTx[0].innerTransactions[1].message.payload}</font>`;     // メッセージ
                  }
              }

              if (aggTx[0].innerTransactions[0].type === 17229) {       // 'MOSAIC_SUPPLY_REVOCATION' の場合
                const dom_aggTx = document.createElement('div');
                const dom_mosaic = document.createElement('div');
                const dom_amount = document.createElement('div');
                const dom_mosaic_img = document.createElement('div');
                const dom_NFT = document.createElement('div');

                (async () => {
                  let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(aggTx[0].innerTransactions[0].mosaic.id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

                  mosaicInfo = await mosaicRepo.getMosaic(aggTx[0].innerTransactions[0].mosaic.id.id).toPromise();// 可分性の情報を取得する                     
                  let div = mosaicInfo.divisibility; // 可分性      

                  if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                         
                    dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic 回収 :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                  } else { 　　　　　　　　　　　　　　　　　　　　　  // ネームスペースがない場合
                    dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic 回収 :　<strong>${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}</strong></font>`;
                  }
                  dom_amount.innerHTML = `<font color="#3399FF" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaic.amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量                
                })(); // async() 

                ///////////////  Mosaic Center  /////////////////////

                // mosaic-center の画像を表示
                fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}`)
                  .then((response) => {
                    // レスポンスが成功したかどうかを確認
                    if (!response.ok) {
                      throw new Error(`Network response was not ok: ${response.status}`);
                    }
                    // JSONデータを解析して返す
                    return response.json();
                  })
                  .then((data) => {
                    if (data !== null) { //データがある場合
                      dom_mosaic_img.innerHTML = `
                        <br><div style="text-align: center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                                                         <br>
                                                         <br>
                                                         <a href="https://symbol.fyi/mosaics/${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}" target="_blank" style="display: inline-block; width: 200px;">
                                                         <img class="mosaic_img" src=${data[0][7]} width="200">
                                                         </a></div><br>
                                                        `
                    }
                  })
                  .catch((error) => {
                    console.error("Fetch error:", error);
                  });

                dom_aggTx.innerHTML = `<font color="#FF00FF">aggTx(${aggTx[0].innerTransactions.length})　${getTransactionType(aggTx[0].innerTransactions[0].type)}</font>`;  // アグリの数　と　Type
                dom_tx.appendChild(dom_aggTx);
                dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
                dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加
                dom_tx.appendChild(dom_NFT);                       // dom_NFT をdom_imgに追加
                dom_tx.appendChild(dom_mosaic_img);                // dom_mosaic_img をdom_imgに追加                                                                     	  		  		  	  
              }

              if (aggTx[0].innerTransactions[0].type === 16725) {       // 'MULTISIG_ACCOUNT_MODIFICATION' の場合

                dom_msig_account.innerHTML = `<font color="#ff00ff"><big><strong><br>マルチシグアカウント<br>${aggTx[0].innerTransactions[0].signer.address.address}</strong></font><br>`
                dom_tx.appendChild(dom_msig_account);

                if (aggTx[0].innerTransactions[0].addressAdditions.length !== 0) { // 追加アドレスがある場合
                  let address_add = "";
                  for (let i = 0; i < aggTx[0].innerTransactions[0].addressAdditions.length; i++) {
                    address_add = `${address_add}<br>${aggTx[0].innerTransactions[0].addressAdditions[i].address}`
                  }
                  dom_account_modification_add.innerHTML = `<font color="#ff6347"><big><strong><br>連署者 登録 :</strong></font><strong><font color="#008b8b"> 　${address_add}<br></strong></big></font>`;
                  dom_tx.appendChild(dom_account_modification_add);
                }
                if (aggTx[0].innerTransactions[0].addressDeletions.length !== 0) {  // 削除アドレスがある場合
                  let address_del = "";
                  for (let i = 0; i < aggTx[0].innerTransactions[0].addressDeletions.length; i++) {
                    address_del = `${address_del}<br>${aggTx[0].innerTransactions[0].addressDeletions[i].address}`
                  }
                  dom_account_modification_del.innerHTML = `<font color="#00bfff"><big><strong><br>連署者 削除 :</strong></font><strong><font color="#008b8b"> 　${address_del}<br></strong></big></font>`;
                  dom_tx.appendChild(dom_account_modification_del);
                }

                dom_min_approval_delta.innerHTML = `<br>最小承認増減値　${aggTx[0].innerTransactions[0].minApprovalDelta}`
                dom_min_removal_delta.innerHTML = `最小削除増減値　${aggTx[0].innerTransactions[0].minRemovalDelta}`
                dom_tx.appendChild(dom_min_approval_delta);
                dom_tx.appendChild(dom_min_removal_delta);
              }

              dom_tx.appendChild(dom_enc);
              dom_tx.appendChild(dom_message);                   // dom_message をdom_txに追加
              dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く  
            })(); // async() 
          }
          //dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
          dom_txInfo.appendChild(dom_tx);                    // トランザクション情報を追加

          console.log('%c= = = = = = = = = = = = = = = =', 'color: green');
          console.log(`%ctx[${t}][${ymdhms}] =`, "color: blue", tx);      //　トランザクションをコンソールに表示　//////////////////
          t = ++t;
        }    // tx の数だけループ処理 
      })	// txRepo.search(searchCriteria).subscribe(async txs => 


  }).catch(() => Swal.fire(`Link Error!!`, `Chromeブラウザに
  拡張機能 「SSS Extension」 がインストールされているか確認してください！
  SSSとLink済みの場合は、ブラウザをリロードしてください。`));  //  getActiveNode()

  // 現在のウィンドウの幅を取得
  var windowWidth = window.innerWidth;

  // モバイルデバイスかどうかを判定し、メッセージを表示
  if (windowWidth < 480) { //
    document.body.style.background = "black"; // 背景色を白に設定  
    // モバイルデバイスの場合にメッセージを表示
    //Swal.fire(`Sorry, For desktop use only.`, `
    //
    //デスクトップ専用です。`);
  }

}, 1000)


// Transaction Type を返す関数  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function getTransactionType(type) { // https://symbol.github.io/symbol-sdk-typescript-javascript/1.0.3/enums/TransactionType.html
  switch (type) {
    case 16720:
      return 'ACCOUNT_ADDRESS_RESTRICTION';
    case 16716:
      return 'ACCOUNT_KEY_LINK';
    case 16708:
      return 'ACCOUNT_METADATA';
    case 16976:
      return 'ACCOUNT_MOSAIC_RESTRICTION';
    case 17232:
      return 'ACCOUNT_OPERATION_RESTRICTION';
    case 16974:
      return 'ADDRESS_ALIAS';
    case 16961:
      return 'AGGREGATE_BONDED';
    case 16705:
      return 'AGGREGATE_COMPLETE';
    case 16712:
      return 'HASH_LOCK';
    case 16977:
      return 'MOSAIC_ADDRESS_RESTRICTION';
    case 17230:
      return 'MOSAIC_ALIAS';
    case 16717:
      return 'MOSAIC_DEFINITION';
    case 16721:
      return 'MOSAIC_GLOBAL_RESTRICTION';
    case 16964:
      return 'MOSAIC_METADATA';
    case 16973:
      return 'MOSAIC_SUPPLY_CHANGE';
    case 17229:
      return 'MOSAIC_SUPPLY_REVOCATION';
    case 16725:
      return 'MULTISIG_ACCOUNT_MODIFICATION';
    case 17220:
      return 'NAMESPACE_METADATA';
    case 16718:
      return 'NAMESPACE_REGISTRATION';
    case 16972:
      return 'NODE_KEY_LINK';
    case 0:
      return 'RESERVED';
    case 16722:
      return 'SECRET_LOCK';
    case 16978:
      return 'SECRET_PROOF';
    case 16724:
      return 'TRANSFER';
    case 16707:
      return 'VOTING_KEY_LINK';
    case 16963:
      return 'VRF_KEY_LINK';
    default:
      return 'Other';
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// handleSSS関数はトランザクションを作成し、window.SSS.setTransaction関数を実行しSSSにトランザクションを登録します。
// そしてwindow.SSS.requestSign関数を実行し、SSSを用いた署名をユーザ－に要求します。

async function handleSSS() {
  // if (address1.length === 0){ // アグリゲートTxの配列が空の場合    < transfer>   
  console.log('handle sss');
  let addr = document.getElementById('form-addr').value;
  //const mosaic_ID = document.getElementById('form-mosaic_ID').value;
  const mosaic_ID = document.querySelector('.select_m1').value;
  const amount = document.getElementById('form-amount').value;
  const message = document.getElementById('form-message').value;
  const enc = document.getElementById('form-enc').checked;
  const maxfee = document.getElementById('form-maxfee').value;

  if (addr.length === 45) {   //ハイフン有りのアドレスの場合
    addr = addr.replace(/-/g, "");  // ハイフンを削除する
  }
  addr = addr.replace(/ /g, "");  // スペース削除
  addr = addr.replace(/　/g, ""); //　スペース削除

  console.log("mosaic_ID==", mosaic_ID);
  console.log("amount==", amount);
  console.log("message==", message);
  console.log("enc==", enc);
  console.log("maxfee==", maxfee);

  console.log("%cmessage UTF-8 バイト数=", "color: red", byteLengthUTF8(message));

  if (byteLengthUTF8(message) > 1023) {
    Swal.fire(`メッセージのサイズが${byteLengthUTF8(message)}バイトです!!          
               1023バイト 以下にしてください。`);
    return;
  }

  mosaicInfo = await mosaicRepo.getMosaic(new sym.MosaicId(mosaic_ID)).toPromise();// 可分性の情報を取得する 
  const div = mosaicInfo.divisibility; // 可分性


  if (enc === false) {                      //////////////// メッセージが平文の場合 ////////////////////////////////////

    if (addr.length === 39) {  //文字数が39文字の場合
      if (networkType === 152) {
        if (addr.charAt(0) !== "T") {
          Swal.fire('Address Error !!', `Tから始まるアドレスを入力してください`);
          return;
        }
      }
      if (networkType === 104) {
        if (addr.charAt(0) !== "N") {
          Swal.fire('Address Error !!', `Nから始まるアドレスを入力してください`);
          return;
        }
      }

      const account_check = await accountRepo.getAccountInfo(sym.Address.createFromRawAddress(addr))
        .toPromise()
        .catch(() => Swal.fire('Address Error !!', `ネットワークに認識されていないアドレスです`));          // アドレス　有無のチェック
      console.log("%caccount_check", "color: red", account_check)

      /* if (account_check === true){ // アドレスがない場合は処理を終了
          console.log("%cAddress Error!!","color: red");
          return;
       }             */

      const tx = sym.TransferTransaction.create(        // トランザクションを生成
        sym.Deadline.create(epochAdjustment),
        sym.Address.createFromRawAddress(addr),
        [
          new sym.Mosaic(
            new sym.MosaicId(mosaic_ID),
            sym.UInt64.fromUint(Number(amount) * 10 ** div) // div 可分性を適用
          )
        ],
        sym.PlainMessage.create(message),
        networkType,
        sym.UInt64.fromUint(1000000 * Number(maxfee))          // MaxFee 設定
      )
      window.SSS.setTransaction(tx);               // SSSにトランザクションを登録        
      window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
        console.log('signedTx', signedTx);
        txRepo.announce(signedTx);
      })
    } else { // 文字数が39以外の場合　(ネームスペース)
      const namespaceId = new sym.NamespaceId(addr.toLowerCase());
      const ns_check = await nsRepo.getLinkedAddress(namespaceId)
        .toPromise()
        .catch(() => Swal.fire('NameSpace Error !!', `ネームスペースがないか、リンクされていません`));          // ネームスペース　有無のチェック

      if (ns_check === true) { // ネームスペースがない場合は処理を終了
        console.log("%cNameSpace Error!!", "color: red");
        return;
      }

      const tx = sym.TransferTransaction.create(        // トランザクションを生成
        sym.Deadline.create(epochAdjustment),
        namespaceId,
        [
          new sym.Mosaic(
            new sym.MosaicId(mosaic_ID),
            sym.UInt64.fromUint(Number(amount) * 10 ** div) // div 可分性を適用
          )
        ],
        sym.PlainMessage.create(message),
        networkType,
        sym.UInt64.fromUint(1000000 * Number(maxfee))          // MaxFee 設定
      )
      window.SSS.setTransaction(tx);               // SSSにトランザクションを登録        
      window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
        console.log('signedTx', signedTx);
        txRepo.announce(signedTx);
      })
    }
  } else
    if (enc === true) {                ////////////// メッセージが暗号の場合 /////////////////////////////////////////////////
      if (addr.length === 39) {  //文字数が39文字の場合
        if (networkType === 152) {
          if (addr.charAt(0) !== "T") {
            Swal.fire('Address Error !!', `Tから始まるアドレスを入力してください`);
            return;
          }
        }
        if (networkType === 104) {
          if (addr.charAt(0) !== "N") {
            Swal.fire('Address Error !!', `Nから始まるアドレスを入力してください`);
            return;
          }
        }

        const account_check = await accountRepo.getAccountInfo(sym.Address.createFromRawAddress(addr))
          .toPromise()
          .catch(() => Swal.fire('Address Error !!', `ネットワークに認識されていないアドレスです`));          // アドレス　有無のチェック
        console.log("%caccount_check", "color: red", account_check)

        /* if (account_check === true){ // アドレスがない場合は処理を終了
            console.log("%cAddress Error!!","color: red");
            return;
         } */

        const alice = sym.Address.createFromRawAddress(addr);   //アドレスクラスの生成
        accountInfo = await accountRepo.getAccountInfo(alice)
          .toPromise()
          .catch(() => Swal.fire('Publickey Error !!', `公開鍵が取得出来ません`));          //　送信先アドレスの公開鍵　 有無のチェック
        console.log("accontInfo=", accountInfo);

        if (accountInfo === true) { // accountInfo が無い場合は処理を終了
          console.log("%caccountInfo Error !!", "color: red");
          return;
        }

        const pubkey = accountInfo.publicKey;
        window.SSS.setMessage(message, pubkey);
        window.SSS.requestSignEncription().then((msg) => {
          setTimeout(() => {
            console.log({ msg });
            const tx = sym.TransferTransaction.create(        // トランザクションを生成
              sym.Deadline.create(epochAdjustment),
              sym.Address.createFromRawAddress(addr),
              [
                new sym.Mosaic(
                  new sym.MosaicId(mosaic_ID),
                  sym.UInt64.fromUint(Number(amount) * 10 ** div) // div 可分性を適用
                )
              ],
              msg,
              networkType,
              sym.UInt64.fromUint(1000000 * Number(maxfee))          // MaxFee 設定  
            )
            window.SSS.setTransaction(tx);               // SSSにトランザクションを登録
            window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求                   
              console.log('signedTx', signedTx);
              txRepo.announce(signedTx);
            })
          }, 1000)
        });
      } else { // 文字数が39以外の場合 (ネームスペース)
        const namespaceId = new sym.NamespaceId(addr.toLowerCase());
        const ns_check = await nsRepo.getLinkedAddress(namespaceId)
          .toPromise()
          .catch(() => Swal.fire('NameSpace Error !!'));          // ネームスペース　有無のチェック

        if (ns_check === true) { // ネームスペースがない場合は処理を終了
          console.log("%cNameSpace Error!!", "color: red");
          return;
        }
        //const namespaceId = new sym.NamespaceId(addr);
        const address = await nsRepo.getLinkedAddress(namespaceId).toPromise();
        const alice = sym.Address.createFromRawAddress(address.address);   //アドレスクラスの生成
        accountInfo = await accountRepo.getAccountInfo(alice).toPromise();  //　送信先アドレスの公開鍵を取得する
        console.log("accontInfo=", accountInfo);

        const pubkey = accountInfo.publicKey;
        window.SSS.setMessage(message, pubkey);
        window.SSS.requestSignEncription().then((msg) => {
          setTimeout(() => {
            console.log({ msg });
            const tx = sym.TransferTransaction.create(        // トランザクションを生成
              sym.Deadline.create(epochAdjustment),
              namespaceId,
              [
                new sym.Mosaic(
                  new sym.MosaicId(mosaic_ID),
                  sym.UInt64.fromUint(Number(amount) * 10 ** div) // div 可分性を適用
                )
              ],
              msg,
              networkType,
              sym.UInt64.fromUint(1000000 * Number(maxfee))          // MaxFee 設定  
            )
            window.SSS.setTransaction(tx);               // SSSにトランザクションを登録
            window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求                   
              console.log('signedTx', signedTx);
              txRepo.announce(signedTx);
            })
          }, 1000)
        });
      }
    }
}

async function handleSSS_multisig() {
  // if (address1.length === 0){ // アグリゲートTxの配列が空の場合    < transfer>   
  console.log('handle sss multisig');
  const multisig_addr = document.querySelector('.select_msig').value;
  let addr = document.getElementById('multisig_to').value;
  let mosaic_ID = document.querySelector('.select_m2').value;
  let amount = document.getElementById('multisig_amount').value;
  let message = document.getElementById('multisig_message2').value;
  let innerTx = [];
  let tx;
  let aggregateTx;

  if (addr.length === 45) {   //ハイフン有りのアドレスの場合
    addr = addr.replace(/-/g, "");  // ハイフンを削除する
  }
  addr = addr.replace(/ /g, "");  // スペース削除
  addr = addr.replace(/　/g, ""); //　スペース削除

  console.log("multisig_addr==", multisig_addr);
  console.log("addr==", addr);
  console.log("mosaic_ID==", mosaic_ID);
  console.log("amount==", amount);
  console.log("message==", message);



  console.log("%cmessage UTF-8 バイト数=", "color: red", byteLengthUTF8(message));

  if (byteLengthUTF8(message) > 1023) {
    Swal.fire(`メッセージのサイズが${byteLengthUTF8(message)}バイトです!!          
                   1023バイト 以下にしてください。`);
    return;
  }

  mosaicInfo = await mosaicRepo.getMosaic(new sym.MosaicId(mosaic_ID)).toPromise();// 可分性の情報を取得する 
  const div = mosaicInfo.divisibility; // 可分性

  let check_minApproval;
  if (addr.length === 39 || addr.length === 0) {  //文字数が39文字 か0の場合   ---------------------------------------------------------------------------------------------------------------------------
    if (addr.length === 39) {
      if (networkType === 152) {
        if (addr.charAt(0) !== "T") {
          Swal.fire('Address Error !!', `Tから始まるアドレスを入力してください`);
          return;
        }
      }
      if (networkType === 104) {
        if (addr.charAt(0) !== "N") {
          Swal.fire('Address Error !!', `Nから始まるアドレスを入力してください`);
          return;
        }
      }

      const account_check = await accountRepo.getAccountInfo(sym.Address.createFromRawAddress(addr))
        .toPromise()
        .catch(() => Swal.fire('Address Error !!', `ネットワークに認識されていないアドレスです`));          // アドレス　有無のチェック
      console.log("%caccount_check", "color: red", account_check)
    }
    /* if (account_check === true){ // アドレスがない場合は処理を終了
        console.log("%cAddress Error!!","color: red");
        return;
     }             */

    if (address1.length === 0) {
      tx = sym.TransferTransaction.create(        // トランザクションを生成
        undefined,
        sym.Address.createFromRawAddress(addr),
        [
          new sym.Mosaic(
            new sym.MosaicId(mosaic_ID),
            sym.UInt64.fromUint(Number(amount) * 10 ** div) // div 可分性を適用
          )
        ],
        sym.PlainMessage.create(message),
        networkType,
      )
    } else {                     // ファイルが選択された場合　一括送信　innerTx 作成
      for (let i = 0; i < address1.length; i++) {
        if (amount1[i] !== undefined) {    // C列 amount がある場合
          amount2 = amount1[i];
        }
        if (mosaic1[i] !== undefined) {    // D列 mosaic がある場合
          if (mosaic1[i] === "") {
            if (networkType === 152) { //testnet
              mosaic_ID = "72C0212E67A08BCE";
            }
            if (networkType === 104) { //mainnet
              mosaic_ID = "6BED913FA20223F8";
            }
          } else {
            mosaic_ID = mosaic1[i];
            mosaicInfo = await mosaicRepo.getMosaic(new sym.MosaicId(mosaic_ID)).toPromise();// 可分性の情報を取得する 
            div = mosaicInfo.divisibility; // 可分性
          }
        }
        if (message1[i] !== undefined) {   // E列 message がある場合
          message2 = message1[i];
        }


        if (address1[i].length === 39) {  // アドレスの場合  -----------------------------------------------
          innerTx[i] = sym.TransferTransaction.create(
            undefined, //Deadline
            sym.Address.createFromRawAddress(address1[i]), //送信先
            [
              new sym.Mosaic(
                new sym.MosaicId(mosaic_ID),
                sym.UInt64.fromUint(Number(amount) * 10 ** div) // div 可分性を適用  
              )
            ],
            sym.PlainMessage.create(message),
            networkType
          );
        } else {                          // ネームスペースの場合   ------------------------------------------
          namespaceId = new sym.NamespaceId(address1[i]);
          innerTx[i] = sym.TransferTransaction.create(
            undefined, //Deadline
            namespaceId, //送信先
            [
              new sym.Mosaic(
                new sym.MosaicId(mosaic_ID),
                sym.UInt64.fromUint(Number(amount) * 10 ** div) // div 可分性を適用  
              )
            ],
            sym.PlainMessage.create(message),
            networkType
          );
        }

      }
    }

    const msig_account_Info = await accountRepo.getAccountInfo(sym.Address.createFromRawAddress(multisig_addr))
      .toPromise()

    console.log("msig_account_Info===", msig_account_Info.publicKey)

    const publicAccount = sym.PublicAccount.createFromPublicKey(       // マルチシグ化したアカウントの公開鍵
      msig_account_Info.publicKey,
      networkType
    );

    for (let i = 0; i < address1.length; i++) {
      innerTx[i] = innerTx[i].toAggregate(publicAccount)
    }

    msigRepo.getMultisigAccountInfo(msig_account_Info.address).subscribe(msig => {

      check_minApproval = msig.minApproval;

      for (const address of msig.cosignatoryAddresses) {       // マルチシグアカウントを調べて、最小承認数が２以上あるか確認する。
        msigRepo.getMultisigAccountInfo(address).subscribe(msig => { // 下の階層もチェック
          if (check_minApproval < msig.minApproval) {
            check_minApproval = msig.minApproval;
          }
          for (const address of msig.cosignatoryAddresses) {
            msigRepo.getMultisigAccountInfo(address).subscribe(msig => { // 下の階層もチェック
              if (check_minApproval < msig.minApproval) {
                check_minApproval = msig.minApproval;
              }
            })
          }
        })
      }

      setTimeout(() => {
        console.log("check_minApproval ==", check_minApproval);
        if (check_minApproval <= 1) {  // 最小承認数が 1の場合 または ０  --------------------------------------
          if (address1.length === 0) {  // CSVファイルを選択しない場合
            aggregateTx = sym.AggregateTransaction.createComplete(
              sym.Deadline.create(epochAdjustment),  //Deadline
              [
                tx.toAggregate(publicAccount),
              ],
              networkType,
              []
            ).setMaxFeeForAggregate(100);
          } else {                       // CSVファイルを選択した場合
            aggregateTx = sym.AggregateTransaction.createComplete(
              sym.Deadline.create(epochAdjustment),  //Deadline
              innerTx,
              networkType,
              []
            ).setMaxFeeForAggregate(100);
          }

          window.SSS.setTransaction(aggregateTx);       // SSSにトランザクションを登録
          window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
            console.log('signedTx', signedTx);
            txRepo.announce(signedTx);
          })

        } else { // 最小承認数が　２以上の場合   -------------------------------------------------------
          if (address1.length === 0) {  // CSVファイルを選択しない場合
            aggregateTx = sym.AggregateTransaction.createBonded(
              sym.Deadline.create(epochAdjustment, 48),  //Deadline
              [
                tx.toAggregate(publicAccount),
              ],
              networkType,
              []
            ).setMaxFeeForAggregate(100, msig.minApproval);
          } else {                       // CSVファイルを選択した場合
            aggregateTx = sym.AggregateTransaction.createBonded(
              sym.Deadline.create(epochAdjustment, 48),  //Deadline
              innerTx,
              networkType,
              []
            ).setMaxFeeForAggregate(100, msig.minApproval);

          }


          console.log("aggregateTx====", aggregateTx)
          console.log("aggregateTx.maxFee======", parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000);

          //const agg_fee = document.getElementById("agg_fee1");    // aggregate 手数料表示
          //agg_fee.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000} XYM　　　　</p>`

          window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録
          window.SSS.requestSign().then((signedAggregateTx) => {// アグリゲートTxに署名

            console.log("signedAggregateTx===", signedAggregateTx);

            const hashLockTx = sym.HashLockTransaction.create(  //  ハッシュロック
              sym.Deadline.create(epochAdjustment),
              new sym.Mosaic(
                new sym.NamespaceId("symbol.xym"),
                sym.UInt64.fromUint(10 * 1000000)
              ), //固定値:10XYM
              sym.UInt64.fromUint(5760),
              signedAggregateTx,
              networkType
            ).setMaxFee(100);

            console.log("hashLockTx===", hashLockTx);

            setTimeout(() => {
              window.SSS.setTransaction(hashLockTx);               // SSSにトランザクションを登録
              window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
                console.log('signedTx', signedTx);
                txRepo.announce(signedTx);
              })
            }, 1000);

            wsEndpoint = NODE.replace('http', 'ws') + "/ws";
            listener = new sym.Listener(wsEndpoint, nsRepo, WebSocket);

            listener.open().then(() => {

              //Websocketが切断される事なく、常時監視するために、ブロック生成(約30秒毎)の検知を行う

              // ブロック生成の検知  /////////////////////////////////////////////////////////////////
              listener.newBlock()
                .subscribe(block => {
                  //  console.log(block);    //ブロック生成 　表示OFF
                });

              // 承認トランザクションの検知  //////////////////////////////////////////////////////////
              listener.confirmed(sym.Address.createFromRawAddress(window.SSS.activeAddress))
                .subscribe(tx => {
                  //受信後の処理を記述
                  console.log(tx);

                  setTimeout(() => {
                    txRepo.announceAggregateBonded(signedAggregateTx);   // アグボンアナウンス
                  }, 500);
                });
            });

          })
        }
      }, 1000);

    })

  } else if (addr.length !== 39 && addr.length !== 0) { // 文字数が39  0以外の場合　(ネームスペース)　--------------------------------------------------------------------------------------------------------------------------
    const namespaceId = new sym.NamespaceId(addr.toLowerCase());
    const ns_check = await nsRepo.getLinkedAddress(namespaceId)
      .toPromise()
      .catch(() => Swal.fire('NameSpace Error !!', `ネームスペースがないか、リンクされていません`));          // ネームスペース　有無のチェック

    if (ns_check === true) { // ネームスペースがない場合は処理を終了
      console.log("%cNameSpace Error!!", "color: red");
      return;
    }

    const tx = sym.TransferTransaction.create(        // トランザクションを生成
      undefined,
      namespaceId,
      [
        new sym.Mosaic(
          new sym.MosaicId(mosaic_ID),
          sym.UInt64.fromUint(Number(amount) * 10 ** div) // div 可分性を適用
        )
      ],
      sym.PlainMessage.create(message),
      networkType,
      //sym.UInt64.fromUint(1000000 * Number(maxfee))          // MaxFee 設定
    )

    const msig_account_Info = await accountRepo.getAccountInfo(sym.Address.createFromRawAddress(multisig_addr))
      .toPromise()

    console.log("msig_account_Info===", msig_account_Info.publicKey)

    const publicAccount = sym.PublicAccount.createFromPublicKey(       // マルチシグ化したアカウントの公開鍵
      msig_account_Info.publicKey,
      networkType
    );

    msigRepo.getMultisigAccountInfo(msig_account_Info.address).subscribe(msig => {

      check_minApproval = msig.minApproval;

      for (const address of msig.cosignatoryAddresses) {
        msigRepo.getMultisigAccountInfo(address).subscribe(msig => { // 下の階層もチェック
          if (check_minApproval < msig.minApproval) {
            check_minApproval = msig.minApproval;
          }
          for (const address of msig.cosignatoryAddresses) {
            msigRepo.getMultisigAccountInfo(address).subscribe(msig => { // 下の階層もチェック
              if (check_minApproval < msig.minApproval) {
                check_minApproval = msig.minApproval;
              }
            })
          }
        })
      }

      setTimeout(() => {
        console.log("check_minApproval ==", check_minApproval);
        if (check_minApproval <= 1) {  // 最小承認数が 1または０の場合  -----------------------------------------------

          const aggregateTx = sym.AggregateTransaction.createComplete(
            sym.Deadline.create(epochAdjustment),  //Deadline
            [
              tx.toAggregate(publicAccount),
            ],
            networkType,
            []
          ).setMaxFeeForAggregate(100);

          window.SSS.setTransaction(aggregateTx);       // SSSにトランザクションを登録
          window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
            console.log('signedTx', signedTx);
            txRepo.announce(signedTx);
          })

        } else { // 最小承認数が　２以上の場合   ----------------------------------------------------------------

          const aggregateTx = sym.AggregateTransaction.createBonded(
            sym.Deadline.create(epochAdjustment, 48),  //Deadline
            [
              tx.toAggregate(publicAccount),
            ],
            networkType,
            []
            /*sym.UInt64.fromUint(1000000*Number(maxfee2))          //最大手数料*/
          ).setMaxFeeForAggregate(100, msig.minApproval);

          console.log("aggregateTx====", aggregateTx)
          console.log("aggregateTx.maxFee======", parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000);

          //const agg_fee = document.getElementById("agg_fee1");    // aggregate 手数料表示
          //agg_fee.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000} XYM　　　　</p>`

          window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録
          window.SSS.requestSign().then((signedAggregateTx) => {// アグリゲートTxに署名

            console.log("signedAggregateTx===", signedAggregateTx);

            const hashLockTx = sym.HashLockTransaction.create(  //  ハッシュロック
              sym.Deadline.create(epochAdjustment),
              new sym.Mosaic(
                new sym.NamespaceId("symbol.xym"),
                sym.UInt64.fromUint(10 * 1000000)
              ), //固定値:10XYM
              sym.UInt64.fromUint(5760),
              signedAggregateTx,
              networkType
            ).setMaxFee(100);

            console.log("hashLockTx===", hashLockTx);

            setTimeout(() => {
              window.SSS.setTransaction(hashLockTx);               // SSSにトランザクションを登録
              window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
                console.log('signedTx', signedTx);
                txRepo.announce(signedTx);
              })
            }, 1000);

            wsEndpoint = NODE.replace('http', 'ws') + "/ws";
            listener = new sym.Listener(wsEndpoint, nsRepo, WebSocket);

            listener.open().then(() => {

              //Websocketが切断される事なく、常時監視するために、ブロック生成(約30秒毎)の検知を行う

              // ブロック生成の検知  /////////////////////////////////////////////////////////////////
              listener.newBlock()
                .subscribe(block => {
                  //  console.log(block);    //ブロック生成 　表示OFF
                });

              // 承認トランザクションの検知  //////////////////////////////////////////////////////////
              listener.confirmed(sym.Address.createFromRawAddress(window.SSS.activeAddress))
                .subscribe(tx => {
                  //受信後の処理を記述
                  console.log(tx);

                  setTimeout(() => {
                    txRepo.announceAggregateBonded(signedAggregateTx);   // アグボンアナウンス
                  }, 100);
                });
            });
          })
        }
      }, 1000);
    })
  }

}


async function handleSSS_agg() {            //////////    aggregate Tx  一括送信 /////////////////////////////////////////////

  console.log('handle sss_agg');
  let mosaic_ID2 = document.querySelector('.select_m1').value;
  let amount2 = document.getElementById('form-amount2').value;
  let message2 = document.getElementById('form-message2').value;
  //const enc2 = document.getElementById('form-enc2').value;
  //const maxfee2 = document.getElementById('form-maxFee2').value;

  // console.log("multisig_address==",multisig_address)
  console.log("mosaic_ID==", mosaic_ID2);
  console.log("amount==", amount2);
  console.log("message==", message2);
  // console.log("maxfee==",maxfee2);



  console.log("%cmessage UTF-8 バイト数=", "color: red", byteLengthUTF8(message2));

  if (byteLengthUTF8(message2) > 1023) {
    Swal.fire(`メッセージのサイズが${byteLengthUTF8(message2)}バイトです!!          
                   1023バイト 以下にしてください。`);
    return;
  }

  /*  const res1 = await resMosaicRepo
    .search({ mosaicId: new sym.MosaicId(mosaic_ID2),
      pageSize: 100})
    .toPromise();
     console.log("%c制限状態チェック","color: red",res1); */

  mosaicInfo = await mosaicRepo.getMosaic(new sym.MosaicId(mosaic_ID2)).toPromise();// 可分性の情報を取得する 
  let div = mosaicInfo.divisibility; // 可分性

  let innerTx = [];
  for (let i = 0; i < address1.length; i++) {
    if (amount1[i] !== undefined) {    // C列 amount がある場合
      amount2 = amount1[i];
    }
    if (mosaic1[i] !== undefined) {    // D列 mosaic がある場合
      if (mosaic1[i] === "") {
        if (networkType === 152) { //testnet
          mosaic_ID2 = "72C0212E67A08BCE";
        }
        if (networkType === 104) { //mainnet
          mosaic_ID2 = "6BED913FA20223F8";
        }
      } else {
        mosaic_ID2 = mosaic1[i];
        mosaicInfo = await mosaicRepo.getMosaic(new sym.MosaicId(mosaic_ID2)).toPromise();// 可分性の情報を取得する 
        div = mosaicInfo.divisibility; // 可分性
      }
    }
    if (message1[i] !== undefined) {   // E列 message がある場合
      message2 = message1[i];
    }


    if (address1[i].length === 39) {  // アドレスの場合  -----------------------------------------------
      innerTx[i] = sym.TransferTransaction.create(
        undefined, //Deadline
        sym.Address.createFromRawAddress(address1[i]), //送信先
        [
          new sym.Mosaic(
            new sym.MosaicId(mosaic_ID2),
            sym.UInt64.fromUint(Number(amount2) * 10 ** div) // div 可分性を適用  
          )
        ],
        sym.PlainMessage.create(message2),
        networkType
      );
    } else {                          // ネームスペースの場合   ------------------------------------------
      namespaceId = new sym.NamespaceId(address1[i]);
      innerTx[i] = sym.TransferTransaction.create(
        undefined, //Deadline
        namespaceId, //送信先
        [
          new sym.Mosaic(
            new sym.MosaicId(mosaic_ID2),
            sym.UInt64.fromUint(Number(amount2) * 10 ** div) // div 可分性を適用  
          )
        ],
        sym.PlainMessage.create(message2),
        networkType
      );
    }

  }

  const publicAccount = sym.PublicAccount.createFromPublicKey(
    window.SSS.activePublicKey,
    networkType
  );

  for (let i = 0; i < address1.length; i++) {
    innerTx[i] = innerTx[i].toAggregate(publicAccount)
  }

  const aggregateTx = sym.AggregateTransaction.createComplete(
    sym.Deadline.create(epochAdjustment),  //Deadline
    innerTx,
    networkType,
    [],
    /*sym.UInt64.fromUint(1000000*Number(maxfee2))          //最大手数料*/
  ).setMaxFeeForAggregate(100);

  console.log("aggregateTx====", aggregateTx)
  console.log("aggregateTx.maxFee======", parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000);

  const agg_fee = document.getElementById("agg_fee1");    // aggregate 手数料表示
  agg_fee.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000} XYM　　　　</p>`

  window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録        
  window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
    console.log('signedTx', signedTx);
    txRepo.announce(signedTx);
  })
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function handleSSS_dona() {   //  開発者への寄付

  let addr = "NBOGLHXSI7FDRAO2CMZV5PQZ5UHZ3IED67ULPSY";
  const mosaic_ID = "6BED913FA20223F8";
  const amount = document.getElementById('dona_amount').value;
  const message = document.getElementById('dona_message').value;
  //const enc = document.getElementById('form-enc').value;
  const maxfee = document.getElementById('dona_maxFee').value;
  const div = 6;

  const tx = sym.TransferTransaction.create(        // トランザクションを生成
    sym.Deadline.create(epochAdjustment),
    sym.Address.createFromRawAddress(addr),
    [
      new sym.Mosaic(
        new sym.MosaicId(mosaic_ID),
        sym.UInt64.fromUint(Number(amount) * 10 ** div) // div 可分性を適用
      )
    ],
    sym.PlainMessage.create(message),
    networkType,
    sym.UInt64.fromUint(1000000 * Number(maxfee))          // MaxFee 設定
  )
  window.SSS.setTransaction(tx);               // SSSにトランザクションを登録        
  window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
    console.log('signedTx', signedTx);
    txRepo.announce(signedTx);
  })
}

/////////////////////////////////////////////////////////////////////////////////////////////
// 未承認状態の時にpopup する
// ポップアップのセッティング処理
function popupSetting() {
  let popup = document.getElementById('popup');
  if (!popup) return;

  let bgBlack = document.getElementById('bg-black');
  let showBtn = document.getElementById('show-btn');

  // ポップアップ
  popUp(bgBlack);
  popUp(showBtn);

  // ポップアップ処理
  function popUp(elem) {
    if (!elem) return;
    elem.addEventListener('click', function () {
      popup.classList.toggle('is-show');
    });
  }
}

// ポップアップのセッティング
popupSetting();


/////////////////////// セレクトボックスの Page No を変更した時にトランザクション履歴を再読み込みする //////////////////////////////////////////////////////////////////


function select_Page() {

  const address = sym.Address.createFromRawAddress(window.SSS.activeAddress);

  const page_num = document.getElementById('page_num1').value;  /////////  セレクトボックスから、Page No を取得  ///////////////////////

  const searchCriteria = {
    group: sym.TransactionGroup.Confirmed,
    address,
    pageNumber: page_num,
    pageSize: 10,
    order: sym.Order.Desc,
    embedded: false,
  };

  console.log("searchCriteria=", searchCriteria);  //////////////////
  console.log("txRepo=", txRepo);   //////////////////

  const dom_txInfo = document.getElementById('wallet-transactions');
  console.log("dom_txInfo=", dom_txInfo); ////////////////
  if (dom_txInfo !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_txInfo.firstChild) {
      dom_txInfo.removeChild(dom_txInfo.firstChild);
    }
  }

  //////////////////////////////////////////////////////////////////


  txRepo
    .search(searchCriteria)
    .subscribe(async txs => {
      console.log("txs=", txs);         /////////////////

      let t = 1;
      let en = new Array(searchCriteria.pageSize);

      for (let tx of txs.data) {   ///////////////    tx を pageSize の回数繰り返す ///////////////////

        const dom_tx = document.createElement('div');
        const dom_date = document.createElement('div');
        dom_date.style.fontSize = "20px";
        const dom_txType = document.createElement('div');
        const dom_hash = document.createElement('div');
        const dom_signer_address = document.createElement('div');
        const dom_recipient_address = document.createElement('div');

        const dom_enc = document.createElement('div');
        const dom_message = document.createElement('div');
        dom_message.style.fontFamily = "Hiragino Maru Gothic ProN W4";
        const dom_namespace = document.createElement('div');
        //const dom_mosaic = document.createElement('div');
        const dom_account = document.createElement('div');
        const dom_restriction = document.createElement('div');
        const dom_hash_lock = document.createElement('div');
        const dom_account_modification_add = document.createElement('div');
        const dom_account_modification_del = document.createElement('div');
        const dom_msig_account = document.createElement('div');
        const dom_min_approval_delta = document.createElement('div');
        const dom_min_removal_delta = document.createElement('div');
        //const dom_NFT = document.createElement('div');

        dom_txType.innerHTML = `<p style="text-align: right; line-height:100%;&"><font color="#0000ff">< ${getTransactionType(tx.type)} ></font></p>`;        //　 　Tx Type

        if (tx.type === 16712) { //ハッシュロック時のハッシュ値
          dom_hash.innerHTML = `<p style="text-align: right"><button type="button" class="button-txinfo" id="${EXPLORER}/transactions/${tx.hash}" onclick="transaction_info(this.id);"><i>⛓ Transaction Info ⛓</i></a></button></p>`; //Tx hash 
        } else {
          dom_hash.innerHTML = `<p style="text-align: right"><button type="button" class="button-txinfo" id="${EXPLORER}/transactions/${tx.transactionInfo.hash}" onclick="transaction_info(this.id);"><i>⛓ Transaction Info ⛓</i></a></button></p>`; //Tx hash 
        }

        dom_signer_address.innerHTML = `<div class="copy_container"><font color="#2f4f4f">From : ${tx.signer.address.address}</font><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${tx.signer.address.address}" onclick="Onclick_Copy(this.id);" /></div>`;    //  送信者 アドレス


        ////////////////////////////////////////////　　  　timestamp to Date 　　　　　/////////////////////////
        const timestamp = epochAdjustment + (parseInt(tx.transactionInfo.timestamp.toHex(), 16) / 1000);   /////////////// Unit64 を 16進数に　変換したあと10進数に変換　
        const date = new Date(timestamp * 1000);

        const yyyy = `${date.getFullYear()}`;
        // .slice(-2)で文字列中の末尾の2文字を取得する
        // `0${date.getHoge()}`.slice(-2) と書くことで０埋めをする
        const MM = `0${date.getMonth() + 1}`.slice(-2); // getMonth()の返り値は0が基点
        const dd = `0${date.getDate()}`.slice(-2);
        const HH = `0${date.getHours()}`.slice(-2);
        const mm = `0${date.getMinutes()}`.slice(-2);
        const ss = `0${date.getSeconds()}`.slice(-2);

        const ymdhms = `${yyyy}-${MM}-${dd} ${HH}:${mm}:${ss}`;

        //console.log(ymdhms);  // 日時を表示

        dom_date.innerHTML = `<font color="#7E00FF"><p style="text-align: right">${ymdhms}</p></font>`;    //　日付  右寄せ
        ///////////////////////////////////////////////////////////////////////////////////////////////////////

        dom_tx.appendChild(dom_hash);                      // dom_hash(⛓Transacrion info⛓) をdom_txに追加
        dom_tx.appendChild(dom_date);                      // dom_date(日付)　をdom_txに追加        	        
        dom_tx.appendChild(dom_txType);                    // dom_txType(Txタイプ) をdom_txに追加         
        dom_tx.appendChild(dom_signer_address);            // dom_signer_address(送信者アドレス) をdom_txに追加  

        //  ----------------------------------------------------------------  //

        if (tx.type === 16724) { // tx.type が 'TRANSFER' の場合    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////      
          if (tx.recipientAddress.address === undefined) {  // 宛先が Namespace の場合 NamespaceId から取得し表示する
            (async () => {
              //let namespacesNames = await nsRepo.getNamespacesNames([sym.NamespaceId.createFromEncoded(tx.recipientAddress.id.toHex())]).toPromise();
              const namespaceName = await nsRepo.getNamespace(tx.recipientAddress.id).toPromise().catch(() => console.count(`Namespace Error!!`));         // Namespace　有無のチェック
              if (namespaceName !== undefined) {
                const a = await nsRepo.getNamespacesNames([namespaceName.levels[0].id]).toPromise();
                let name1 = [a][0][0].name;   //  root
                if (namespaceName.levels.length > 1) {
                  const b = await nsRepo.getNamespacesNames([namespaceName.levels[1].id]).toPromise();
                  name1 = name1 + "." + [b][0][0].name;  // sub1
                  if (namespaceName.levels.length > 2) {
                    const c = await nsRepo.getNamespacesNames([namespaceName.levels[2].id]).toPromise();
                    name1 = name1 + "." + [c][0][0].name;  // sub2
                  }
                }
                dom_recipient_address.innerHTML = `<div class="copy_container"><font color="#2f4f4f">To　: <a href="${EXPLORER}/namespaces/${name1}" target="_blank" rel="noopener noreferrer">${name1}</a><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${name1}" onclick="Onclick_Copy(this.id);" /></div></font>`; //  文字列の結合　   宛先                       
              } else {
                dom_namespace.innerHTML = `<font color="#ff6347"><big>To:　Namespace 期限切れ</big></font>`;
              }
            })(); // async() 
          } else {   // Nから始まるの39文字のアドレスの場合はそのままアドレスを表示
            dom_recipient_address.innerHTML = `<div class="copy_container"><font color="#2f4f4f">To　:   ${tx.recipientAddress.address}</font><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${tx.recipientAddress.address}" onclick="Onclick_Copy(this.id);" /></div>`; //  文字列の結合　   宛先
          }
          dom_tx.appendChild(dom_recipient_address);         // dom_recipient_address をdom_txに追加

          //console.log('Tx_Mosaics =',tx.mosaics.length);  ///  モザイクの数を表示 ///////////////////////////////////////////

          /////////// モザイクが空ではない場合   /////////////////　　モザイクが空の場合はこの for 文はスルーされる  //////////
          for (let i = 0; i < tx.mosaics.length; i++) {  //モザイクの数だけ繰り返す
            const dom_mosaic = document.createElement('div');
            const dom_amount = document.createElement('div');
            const dom_mosaic_img = document.createElement('div');
            const dom_NFT = document.createElement('div');

            (async () => {
              let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(tx.mosaics[i].id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

              mosaicInfo = await mosaicRepo.getMosaic(tx.mosaics[i].id.id).toPromise();// 可分性の情報を取得する                     
              let div = mosaicInfo.divisibility; // 可分性      

              if (tx.signer.address.address === address.address) {  // 署名アドレスとウォレットのアドレスが同じ場合　 

                if ([mosaicNames][0][0].names.length !== 0) {  // ネームスペースがある場合
                  dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                } else {   　　　　　　　　　　　　　　　　　　　　　 //　ネームスペースがない場合
                  dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<strong>${tx.mosaics[i].id.id.toHex()}</strong></font>`;
                }
                dom_amount.innerHTML = `<font color="#FF0000" size="+1">💁‍♀️➡️💰 :　<i><big><strong> ${(parseInt(tx.mosaics[i].amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量

              } else {     //  署名アドレスとウォレットアドレスが違う場合
                if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                         
                  dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                } else { 　　　　　　　　　　　　　　　　　　　　　  // ネームスペースがない場合
                  dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${tx.mosaics[i].id.id.toHex()}</strong></font>`;
                  // console.log("%cdom_mosaic====","color: red",tx.mosaics[i].id.id.toHex(),i);                            
                }
                dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(tx.mosaics[i].amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
              }
              // console.log("%ci モザイクが空では無い場合の処理　iだよ　",'color: red',i); 
            })(); // async() 

            xym_mon(tx.mosaics[i].id, dom_NFT, window.SSS.activePublicKey); // xym_mon NFT画像表示
            nftdrive(tx.mosaics[i].id, dom_NFT); // nftdrive NFT画像表示
            comsa(tx.mosaics[i].id, dom_NFT);    // comsa NFT画像表示
            comsaNCFT(tx.mosaics[i].id, dom_NFT);    // comsa NCFT画像表示

            if (tx.mosaics[i].id.toHex() !== "6BED913FA20223F8" && tx.mosaics[i].id.toHex() !== "72C0212E67A08BCE") { // XYMのモザイク画像は表示しない

              ///////////////  Mosaic Center  /////////////////////

              // mosaic-center の画像を表示
              fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${tx.mosaics[i].id.id.toHex()}`)
                .then((response) => {
                  // レスポンスが成功したかどうかを確認
                  if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                  }
                  // JSONデータを解析して返す
                  return response.json();
                })
                .then((data) => {
                  if (data !== null) { //データがある場合
                    dom_mosaic_img.innerHTML = `
                        <br><div style="text-align: center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                                                         <br>
                                                         <br>
                                                         <a href="https://symbol.fyi/mosaics/${tx.mosaics[i].id.id.toHex()}" target="_blank" style="display: inline-block; width: 200px;">
                                                         <img class="mosaic_img" src=${data[0][7]} width="200">
                                                         </a></div><br>
                                                        `
                  }
                })
                .catch((error) => {
                  console.error("Fetch error:", error);
                });

            }

            dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加
            dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加
            dom_tx.appendChild(dom_NFT);                       // dom_NFT をdom_txに追加
            dom_tx.appendChild(dom_mosaic_img);                // dom_mosaic_img をdom_txに追加 

            await new Promise(resolve => setTimeout(resolve, 100)); // 0.1秒処理を止める

          }  //モザイクの数だけ繰り返す
          //})(); // async() 

          if (tx.mosaics.length === 0) {   // モザイクが空の場合  //////////////　モザイクがある場合はこの if 文はスルーされる
            const dom_mosaic = document.createElement('div');
            const dom_amount = document.createElement('div');

            if (tx.signer.address.address === address.address) {  // 署名アドレスとウォレットのアドレスが同じ場合
              dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　No mosaic</font>`;     // No mosaic
              dom_amount.innerHTML = `<font color="#FF0000">💁‍♀️➡️💰 : </font>`;     // 　数量
            } else {          //  署名アドレスとウォレットアドレスが違う場合
              dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　No mosaic</font>`;     // No mosaic
              dom_amount.innerHTML = `<font color="#008000">💰➡️😊 : </font>`;     // 　数量        
            }
            dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
            dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加
          }     /////////////////////////////////////////////////////////////////////////////////////////////////////    

          if (tx.message.type === 1) {   // メッセージが暗号文の時          
            let alice;
            let PubKey;
            let enc_message1 = {};
            dom_enc.innerHTML = `<font color="#ff00ff"><strong></br><ul class="decryption">暗号化メッセージ</strong>　< Encrypted Message ></font>`;     // 暗号化メッセージの場合

            dom_tx.appendChild(dom_enc);

            (async () => {

              if (tx.recipientAddress.address !== undefined) { //送信先のアドレスが、39文字のアドレスの場合

                if (tx.recipientAddress.address !== tx.signer.address.address) {    // 送信先アドレスと、送信元アドレスが異なる場合  ///////////////////////////////
                  if (tx.signer.address.address === address.address) {   // 署名アドレスと、ウォレットアドレスが同じ場合
                    alice = sym.Address.createFromRawAddress(tx.recipientAddress.address);   //アドレスクラスの生成

                  } else
                    if (tx.recipientAddress.address === address.address) { // 送信先アドレスと、ウォレットアドレスが同じ場合
                      alice = sym.Address.createFromRawAddress(tx.signer.address.address);   //アドレスクラスの生成			
                    }

                } else {    // 送信先アドレスと、ウォレットアドレスが同じ場合
                  alice = sym.Address.createFromRawAddress(tx.recipientAddress.address);   //アドレスクラスの生成
                  PubKey = window.SSS.activePublicKey;
                }

              } else {  //送信先のアドレスが、ネームスペースの場合
                const to_address = await nsRepo.getLinkedAddress(tx.recipientAddress.id).toPromise();

                if (to_address.address !== tx.signer.address.address) {    // 送信先アドレスと、送信元アドレスが異なる場合  ///////////////////////////////
                  if (tx.signer.address.address === address.address) {   // 署名アドレスと、ウォレットアドレスが同じ場合
                    alice = sym.Address.createFromRawAddress(tx.recipientAddress.address);   //アドレスクラスの生成

                  } else
                    if (to_address.address === address.address) { // 送信先アドレスと、ウォレットアドレスが同じ場合
                      alice = sym.Address.createFromRawAddress(tx.signer.address.address);   //アドレスクラスの生成			
                    }

                } else {    // 送信先アドレスと、ウォレットアドレスが同じ場合
                  alice = sym.Address.createFromRawAddress(to_address.address);   //アドレスクラスの生成
                  PubKey = window.SSS.activePublicKey;
                }
              }
              accountRepo.getAccountInfo(alice).toPromise().then((accountInfo) => { //  アドレスから公開鍵を取得する
                PubKey = accountInfo.publicKey;
                enc_message1.message = tx.message.payload;
                enc_message1.PubKey = PubKey;
                en[t] = enc_message1;
                // console.table(en);

                dom_message.innerHTML = `<input type="button" id="${PubKey}" value="${tx.message.payload}" onclick="Onclick_Decryption(this.id, this.value);" class="button-decrypted"/></div>`;     // 　メッセージ
                dom_tx.appendChild(dom_message);                   // dom_message をdom_txに追加                                                              
                dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く    

              }); //公開鍵を取得
            })(); // async() 
          } else {          // 平文の場合
            dom_message.innerHTML = `<font color="#4169e1"><br><br>< Message ><br>${tx.message.payload}</font>`;     // 　メッセージ
            dom_tx.appendChild(dom_message);                   // dom_message をdom_txに追加                                                              
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
          }
        } // tx.type が 'TRANSFER' の場合

        //  ----------------------------------------------------------------  //

        if (tx.type === 16718) {       // tx.type が 'NAMESPACE_REGISTRATION' の場合	  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          if (tx.registrationType === 0) {
            dom_namespace.innerHTML = `<font color="#008b8b">root Namespace 登録 :　<big><strong>${tx.namespaceName}</strong></big></font>`;
          } else
            if (tx.registrationType === 1) {
              dom_namespace.innerHTML = `<font color="#008b8b">sub Namespace 登録 :　<big><strong>${tx.namespaceName}</strong></big></font>`;
            }
          dom_tx.appendChild(dom_namespace);                 // namespaceをdom_txに追加
          dom_tx.appendChild(dom_message);                   // dom_message をdom_txに追加                                                              
          dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く          	  		  		  	  
        }
        //  ----------------------------------------------------------------  //

        if (tx.type === 17229) {       // tx.type が 'MOSAIC_SUPPLY_REVOCATION' の場合	  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          const dom_mosaic = document.createElement('div');
          const dom_amount = document.createElement('div');
          const dom_mosaic_img = document.createElement('div');
          const dom_NFT = document.createElement('div');

          (async () => {
            let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(tx.mosaic.id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

            mosaicInfo = await mosaicRepo.getMosaic(tx.mosaic.id.id).toPromise();// 可分性の情報を取得する                     
            let div = mosaicInfo.divisibility; // 可分性      

            if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                         
              dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic 回収 :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
            } else { 　　　　　　　　　　　　　　　　　　　　　  // ネームスペースがない場合
              dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic 回収 :　<strong>${tx.mosaic.id.id.toHex()}</strong></font>`;
            }
            dom_amount.innerHTML = `<font color="#3399FF" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(tx.mosaic.amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量                
          })(); // async() 

          ///////////////  Mosaic Center  /////////////////////

          // mosaic-center の画像を表示
          fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${tx.mosaic.id.id.toHex()}`)
            .then((response) => {
              // レスポンスが成功したかどうかを確認
              if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
              }
              // JSONデータを解析して返す
              return response.json();
            })
            .then((data) => {
              if (data !== null) { //データがある場合
                dom_mosaic_img.innerHTML = `
                        <br><div style="text-align: center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                                                         <br>
                                                         <br>
                                                         <a href="https://symbol.fyi/mosaics/${tx.mosaic.id.id.toHex()}" target="_blank" style="display: inline-block; width: 200px;">
                                                         <img class="mosaic_img" src=${data[0][7]} width="200">
                                                         </a></div><br>
                                                        `
              }
            })
            .catch((error) => {
              console.error("Fetch error:", error);
            });

          dom_recipient_address.innerHTML = `<div class="copy_container"><font color="#2f4f4f">♻️回収先♻️ :　${tx.sourceAddress.address}</font><input type="image" src="src/copy.png" class="copy_bt" height="20px" id="${tx.sourceAddress.address}" onclick="Onclick_Copy(this.id);" /></div>`;
          dom_tx.appendChild(dom_recipient_address);
          dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
          dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加    
          dom_tx.appendChild(dom_NFT);                       // dom_NFT をdom_imgに追加
          dom_tx.appendChild(dom_mosaic_img);                // dom_mosaic_img をdom_imgに追加                                                       
          dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く          	  		  		  	  
        }
        //  ----------------------------------------------------------------  // 

        if (tx.type === 16973) {       // tx.type が 'MOSAIC_SUPPLY_CHANGE' の場合	  ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          const dom_mosaic = document.createElement('div');
          if (tx.action === 0) {
            dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic :　${tx.mosaicId.toHex()}　<br><big><strong> 減少　⬇️　${parseInt(tx.delta.toHex(), 16)}</strong></big></font>`;
          } else
            if (tx.action === 1) {
              dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic :　${tx.mosaicId.toHex()}　<br><big><strong> 増加　⬆️　${parseInt(tx.delta.toHex(), 16)}</strong></big></font>`;
            }
          dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
          dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
        }

        //  ----------------------------------------------------------------  //

        if (tx.type === 16974) {       // tx.type が 'ADDRESS_ALIAS' の場合   ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////        
          (async () => {
            let alias_Action;
            if (tx.aliasAction === 1) {
              alias_Action = "Link";
            } else
              if (tx.aliasAction === 0) {
                alias_Action = "Unlink";
              }
            // let namespacesNames = await nsRepo.getNamespacesNames([sym.NamespaceId.createFromEncoded(tx.namespaceId.id.toHex())]).toPromise();
            const namespaceName = await nsRepo.getNamespace(tx.namespaceId.id).toPromise().catch(() => console.count(`Namespace Error!!`));         // Namespace　有無のチェック;
            if (namespaceName !== undefined) {
              const a = await nsRepo.getNamespacesNames([namespaceName.levels[0].id]).toPromise();
              let name1 = [a][0][0].name;   //  root
              if (namespaceName.levels.length > 1) {
                const b = await nsRepo.getNamespacesNames([namespaceName.levels[1].id]).toPromise();
                name1 = name1 + "." + [b][0][0].name;  // sub1
                if (namespaceName.levels.length > 2) {
                  const c = await nsRepo.getNamespacesNames([namespaceName.levels[2].id]).toPromise();
                  name1 = name1 + "." + [c][0][0].name;  // sub2
                }
              }
              dom_namespace.innerHTML = `<font color="#008b8b">Namespace エイリアス <strong>${alias_Action}</strong></br></br>Namespace : <strong>${name1} </strong></br>Address : </br><strong>${tx.address.address}</strong></font>`;
            } else {
              dom_namespace.innerHTML = `<font color="#ff6347"><big>Namespace 期限切れ</big></font>`;
            }
            dom_tx.appendChild(dom_namespace);                 // dom_namespaceをdom_txに追加                                                             
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
          })(); // async()           	  		  		  	  
        }
        //  ----------------------------------------------------------------  //

        if (tx.type === 17230) {       // tx.type が 'MOSAIC_ALIAS' の場合	  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          (async () => {
            let alias_Action;
            if (tx.aliasAction === 1) {
              alias_Action = "Link";
            } else
              if (tx.aliasAction === 0) {
                alias_Action = "Unlink";
              }
            // let namespacesNames = await nsRepo.getNamespacesNames([sym.NamespaceId.createFromEncoded(tx.namespaceId.id.toHex())]).toPromise();
            const namespaceName = await nsRepo.getNamespace(tx.namespaceId.id).toPromise().catch(() => console.count(`Namespace Error!!`));         // Namespace　有無のチェック;
            if (namespaceName !== undefined) {
              const a = await nsRepo.getNamespacesNames([namespaceName.levels[0].id]).toPromise();
              let name1 = [a][0][0].name;   //  root
              if (namespaceName.levels.length > 1) {
                const b = await nsRepo.getNamespacesNames([namespaceName.levels[1].id]).toPromise();
                name1 = name1 + "." + [b][0][0].name;  // sub1
                if (namespaceName.levels.length > 2) {
                  const c = await nsRepo.getNamespacesNames([namespaceName.levels[2].id]).toPromise();
                  name1 = name1 + "." + [c][0][0].name;  // sub2
                }
              }
              dom_namespace.innerHTML = `<font color="#008b8b">Mosaic エイリアス <strong>${alias_Action}</strong></br></br>Namespace : <strong>${name1} </strong></br>MosaicID : <strong>${tx.mosaicId.id.toHex()}</strong></font>`;
            } else {
              dom_namespace.innerHTML = `<font color="#ff6347"><big>Namespace 期限切れ</big></font>`;
            }

            dom_tx.appendChild(dom_namespace);                  // dom_namespaceをdom_txに追加                                                               
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く   
          })(); // async()          	  		  		  	  
        }
        //  ----------------------------------------------------------------  //

        if (tx.type === 16720) {       // tx.type が 'ACCOUNT_ADDRESS_RESTRICTION' の場合	  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////              
          if (tx.restrictionFlags === 1) {
            restriction_type = "指定アドレスからのみ受信許可";
            res_Flag = "　　　　　　　　　➡️🟢";
          }
          if (tx.restrictionFlags === 16385) {
            restriction_type = "指定アドレス宛のみ送信許可";
            res_Flag = "　　　　　　　　　🟢➡️";
          }
          if (tx.restrictionFlags === 32769) {
            restriction_type = "指定アドレスからの受信拒否";
            res_Flag = "　　　　　　　　　➡️❌";
          }
          if (tx.restrictionFlags === 49153) {
            restriction_type = "指定アドレス宛への送信禁止";
            res_Flag = "　　　　　　　　　❌➡️";
          }

          if (tx.restrictionAdditions.length !== 0) {   // 制限追加
            dom_restriction.innerHTML = `<font color="#ff4500"><strong>⚠️アカウントアドレス制限　追加</strong></font>
            <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
            <br>${res_Flag}
            <br>アドレス : <strong>${tx.restrictionAdditions[0].address}</strong></font>`
          }

          if (tx.restrictionDeletions.length !== 0) {   // 制限削除
            dom_restriction.innerHTML = `<font color="#3399FF"><strong>⚠️アカウントアドレス制限　削除</strong></font>
             <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
             <br>${res_Flag}
             <br>アドレス : <strong>${tx.restrictionDeletions[0].address}</strong></font>`
          }

          dom_tx.appendChild(dom_restriction);               // dom_restrictionをdom_txに追加
          dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
        }
        //  ----------------------------------------------------------------  //

        if (tx.type === 16976) {       // tx.type が 'ACCOUNT_MOSAIC_RESTRICTION' の場合	  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          if (tx.restrictionFlags === 2) {
            restriction_type = "指定モザイクを含むトランザクションのみ受信許可";
            res_Flag = "　　　　　　　　　➡️🟢";
          }
          if (tx.restrictionFlags === 32770) {
            restriction_type = "指定モザイクを含むトランザクションを受信拒否";
            res_Flag = "　　　　　　　　　➡️❌";
          }

          if (tx.restrictionAdditions.length !== 0) {   // 制限追加
            dom_restriction.innerHTML = `<font color="#ff4500"><strong>⚠️アカウントモザイク制限　追加</strong></font>
             <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
             <br>${res_Flag}
             <br>モザイクID : <strong>${tx.restrictionAdditions[0].id.toHex()}</strong></font>`
          }

          if (tx.restrictionDeletions.length !== 0) {   // 制限削除
            dom_restriction.innerHTML = `<font color="#3399FF"><strong>⚠️アカウントモザイク制限　削除</strong></font>
            <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
            <br>${res_Flag}
            <br>モザイクID : <strong>${tx.restrictionDeletions[0].id.toHex()}</strong></font>`
          }

          dom_tx.appendChild(dom_restriction);               // dom_restrictionをdom_txに追加
          dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
        }
        //  ----------------------------------------------------------------  //

        if (tx.type === 17232) {       // tx.type が 'ACCOUNT_OPERATION_RESTRICTION' の場合	  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          if (tx.restrictionFlags === 16388) {
            restriction_type = "指定トランザクションの送信のみ許可";
            res_Flag = "　　　　　　　　　🟢➡️";
          }
          if (tx.restrictionFlags === 49156) {
            restriction_type = "指定トランザクションの送信を禁止";
            res_Flag = "　　　　　　　　　❌➡️";
          }

          dom_restriction.innerHTML = `<font color="#ff4500"><strong>⚠️アカウントトランザクション制限</strong></font>
          <font color="#008b8b"><br><br>タイプ : <strong>${restriction_type}</strong>
          <br>${res_Flag}
          <br>Tx タイプ : <strong>${getTransactionType(tx.restrictionAdditions[0])}</strong></font>`

          dom_tx.appendChild(dom_restriction);               // dom_restrictionをdom_txに追加
          dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
        }
        //  ----------------------------------------------------------------  //

        if (tx.type === 16712) {       // tx.type が 'HASH_LOCK' の場合	  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          dom_hash_lock.innerHTML = `<font color="#ff4500"><big><strong>ハッシュロック
        <br>symbol.xym : 10xym </strong></big></font>
        <font color="#008b8b">
        <br>
        <br><strong>連署者の署名が揃うと10xymは返却されます。<br>署名が揃わない場合、48時間後にSymbolネットワークに徴収されます。</strong></font>`
          dom_tx.appendChild(dom_hash_lock);               // dom_restrictionをdom_txに追加
          dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
        }

        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        if (tx.type === 16961 || tx.type === 16705) {      // tx.type が 'AGGREGATE_BONDED'　または 'AGGREGATE_COMPLETE' の場合		///////////////////////////////////////////////////////////////////////////////////////////////
          (async () => {
            const aggTx = await txRepo.getTransactionsById([tx.transactionInfo.hash], sym.TransactionGroup.Confirmed).toPromise();
            console.log('%c///////////////////////////////', 'color: green');
            console.log(`%caggTx  ( ${ymdhms} )`, "color: blue", aggTx[0]);

            const dom_amount = document.createElement('div');

            if (aggTx[0].innerTransactions[0].type === 16724) {  // TRANSFER の場合

              const dom_aggTx = document.createElement('div');
              const dom_mosaic = document.createElement('div');
              const dom_receive = document.createElement('div');
              const dom_NFT = document.createElement('div');
              const dom_mosaic_img = document.createElement('div');

              let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

              mosaicInfo = await mosaicRepo.getMosaic(aggTx[0].innerTransactions[0].mosaics[0].id.id).toPromise();// 可分性の情報を取得する                     
              let div = mosaicInfo.divisibility; // 可分性

              if (aggTx[0].innerTransactions[0].signer.address.address === address.address) {  // 署名アドレスとウォレットのアドレスが同じ場合　

                if ([mosaicNames][0][0].names.length !== 0) {  // ネームスペースがある場合
                  dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                } else {                                       //　ネームスペースがない場合
                  dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<strong>${aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex()}</strong></font>`;
                }
                dom_amount.innerHTML = `<font color="#FF0000" size="+1">💁‍♀️➡️💰 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaics[0].amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量

              } else {     //  署名アドレスとウォレットアドレスが違う場合
                if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                         
                  dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                } else {                                      // ネームスペースがない場合
                  dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex()}</strong></font>`;
                }
                dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaics[0].amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
              }

              if (aggTx[0].innerTransactions[0].message !== undefined) {     // １つ目、2つ目のインナートランザクションにメッセージがあれば表示する。
                dom_message.innerHTML = `<font color="#4169e1"><br>< Message ><br>${aggTx[0].innerTransactions[0].message.payload}</font>`;     // 　メッセージ

                if (aggTx[0].innerTransactions[0].message.payload === `{"version":"comsa-nft-1.0"}` || aggTx[0].innerTransactions[0].message.payload === `{"version":"comsa-nft-1.1"}`) {
                  // dom_NFT.innerHTML = `<font color="#4169e1">< Mosaic ID ></br>${aggTx[0].innerTransactions[1].mosaics[0].id.id.toHex()}`;
                  dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${aggTx[0].innerTransactions[1].mosaics[0].id.id.toHex()}</strong></font>`;
                  dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[1].mosaics[0].amount.toHex(), 16)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量 
                  comsa(aggTx[0].innerTransactions[1].mosaics[0].id, dom_NFT); // comsa NFT画像表示
                }
                if (aggTx[0].innerTransactions[0].message.payload === `{"version":"comsa-ncft-1.1"}`) {
                  dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${aggTx[0].innerTransactions[1].mosaics[0].id.id.toHex()}</strong></font>`;
                  dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[1].mosaics[0].amount.toHex(), 16)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
                  comsaNCFT(aggTx[0].innerTransactions[1].mosaics[0].id, dom_NFT); // comsa NCFT画像表示
                }
              } else
                if (aggTx[0].innerTransactions[1].message !== undefined) {
                  dom_message.innerHTML = `<font color="#4169e1"><br>< Message ><br>${aggTx[0].innerTransactions[1].message.payload}</font>`;     // メッセージ
                }

              dom_aggTx.innerHTML = `<font color="#FF00FF">aggTx(${aggTx[0].innerTransactions.length})　${getTransactionType(aggTx[0].innerTransactions[0].type)}</font>`;  // アグリの数　と　Type

              xym_mon(aggTx[0].innerTransactions[0].mosaics[0].id, dom_NFT, window.SSS.activePublicKey); // xym_mon NFT画像表示
              nftdrive(aggTx[0].innerTransactions[0].mosaics[0].id, dom_NFT); // nftdrive NFT画像表示
              if (aggTx[0].innerTransactions.length > 1) {
                if (aggTx[0].innerTransactions[1].recipientAddress.address === window.SSS.activeAddress && tx.type === 16961) {
                  dom_receive.innerHTML = `<div style="text-align: center"><font color="#008000" size="+1" >😊⬅️🖼️</font></div>`;
                }
                nftdrive(aggTx[0].innerTransactions[1].mosaics[0].id, dom_NFT); // nftdrive NFT画像表示  
              }
              if (aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex() !== "6BED913FA20223F8" && aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex() !== "72C0212E67A08BCE") { // XYMのモザイク画像は表示しない

                ///////////////  Mosaic Center  /////////////////////

                // mosaic-center の画像を表示
                fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex()}`)
                  .then((response) => {
                    // レスポンスが成功したかどうかを確認
                    if (!response.ok) {
                      throw new Error(`Network response was not ok: ${response.status}`);
                    }
                    // JSONデータを解析して返す
                    return response.json();
                  })
                  .then((data) => {
                    if (data !== null) { //データがある場合
                      dom_mosaic_img.innerHTML = `
                    <br><div style="text-align: center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                                                     <br>
                                                     <br>
                                                     <a href="https://symbol.fyi/mosaics/${aggTx[0].innerTransactions[0].mosaics[0].id.id.toHex()}" target="_blank" style="display: inline-block; width: 200px;">
                                                     <img class="mosaic_img" src=${data[0][7]} width="200">
                                                     </a></div><br>
                                                    `
                    }
                  })
                  .catch((error) => {
                    console.error("Fetch error:", error);
                  });

              }

              dom_tx.appendChild(dom_aggTx);                     // dom_aggTx をdom_txに追加
              dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
              dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加
              dom_tx.appendChild(dom_receive);                   // dom_receive をdom_txに追加
              dom_tx.appendChild(dom_NFT);                       // dom_NFT をdom_txに追加
              dom_tx.appendChild(dom_mosaic_img);                // dom_mosaic_img をdom_txに追加

              await new Promise(resolve => setTimeout(resolve, 100)); // 0.1秒処理を止める
            }

            if (aggTx[0].innerTransactions[0].type === 16717) { // MOSAIC_REGISTRATION の場合
              const dom_mosaic = document.createElement('div');
              dom_mosaic.innerHTML = `<font color="#008b8b">Mosaic 登録 :　<big><strong>${aggTx[0].innerTransactions[0].mosaicId.id.toHex()}</strong></big></font>`;
              dom_tx.appendChild(dom_mosaic);                  // dom_mosaicをdom_txに追加
            }

            if (aggTx[0].innerTransactions[0].type === 16708) { // ACCOUNT_METADATAの場合
              dom_account.innerHTML = `<font color="#ff6347"><big>METADATA登録 :　　Account</font><br><strong><font color="#008b8b"> Key :　${aggTx[0].innerTransactions[0].scopedMetadataKey.toHex()}<br>Address : ${window.SSS.activeAddress}</strong></big></font>`;
              dom_tx.appendChild(dom_account);
            }

            if (aggTx[0].innerTransactions[0].type === 16964) { // MOSAIC_METADATA の場合
              const dom_mosaic = document.createElement('div');
              dom_mosaic.innerHTML = `<font color="#ff6347"><big>METADATA登録 :　　Mosaic </font><br><strong><font color="#008b8b"> Key :　${aggTx[0].innerTransactions[0].scopedMetadataKey.toHex()}<br>Mosaic ID: 　${aggTx[0].innerTransactions[0].targetMosaicId.toHex()}</strong></big></font>`;
              dom_tx.appendChild(dom_mosaic);                  // dom_mosaicをdom_txに追加      
            }

            if (aggTx[0].innerTransactions[0].type === 17220) { // NAMESPACE_METADATA
              //var ns_name_Meta = await nsRepo.getNamespacesNames([aggTx[0].innerTransactions[0].targetNamespaceId.id]).toPromise();
              const namespaceName = await nsRepo.getNamespace(aggTx[0].innerTransactions[0].targetNamespaceId.id).toPromise().catch(() => console.count(`Namespace Error!!`));         // Namespace　有無のチェック
              //  console.log("1257==",namespaceName);
              if (namespaceName !== undefined) {
                const a = await nsRepo.getNamespacesNames([namespaceName.levels[0].id]).toPromise();
                let name1 = [a][0][0].name;   //  root
                if (namespaceName.levels.length > 1) {
                  const b = await nsRepo.getNamespacesNames([namespaceName.levels[1].id]).toPromise();
                  name1 = name1 + "." + [b][0][0].name;  // sub1
                  if (namespaceName.levels.length > 2) {
                    const c = await nsRepo.getNamespacesNames([namespaceName.levels[2].id]).toPromise();
                    name1 = name1 + "." + [c][0][0].name;  // sub2
                  }
                }
                dom_namespace.innerHTML = `<font color="#ff6347"><big>METADATA登録 :　　Namespace</font><br><strong><font color="#008b8b"> Key :　${aggTx[0].innerTransactions[0].scopedMetadataKey.toHex()}<br>Namespace :　${name1}</strong></big></font>`;
              } else {
                dom_namespace.innerHTML = `<font color="#ff6347"><big>Namespace 期限切れ</big></font>`;
              }
              dom_tx.appendChild(dom_namespace);                  // dom_namespaceをdom_txに追加
            }

            if (aggTx[0].innerTransactions[0].type === 16722) { // SECRET_LOCK
              const dom_aggTx = document.createElement('div');
              if (aggTx[0].innerTransactions[0].mosaic !== undefined) {
                const dom_mosaic = document.createElement('div');
                let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(aggTx[0].innerTransactions[0].mosaic.id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

                mosaicInfo = await mosaicRepo.getMosaic(aggTx[0].innerTransactions[0].mosaic.id.id).toPromise();// 可分性の情報を取得する                     
                let div = mosaicInfo.divisibility; // 可分性

                if (aggTx[0].innerTransactions[0].signer.address.address === address.address) {  // 署名アドレスとウォレットのアドレスが同じ場合　
                  if ([mosaicNames][0][0].names.length !== 0) {  // ネームスペースがある場合
                    dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                  } else {                                       //　ネームスペースがない場合
                    dom_mosaic.innerHTML = `<font color="#FF0000">Mosaic :　<strong>${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}</strong></font>`;
                  }
                  dom_amount.innerHTML = `<font color="#FF0000" size="+1">💁‍♀️➡️💰 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaic.amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
                } else {     //  署名アドレスとウォレットアドレスが違う場合
                  if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                                                       
                    dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                  } else {                                      // ネームスペースがない場合
                    dom_mosaic.innerHTML = `<font color="#008000">Mosaic :　<strong>${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}</strong></font>`;
                  }
                  dom_amount.innerHTML = `<font color="#008000" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaic.amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量
                }

                dom_aggTx.innerHTML = `<font color="#FF00FF">aggTx(${aggTx[0].innerTransactions.length})　${getTransactionType(aggTx[0].innerTransactions[0].type)}</font>`;
                dom_tx.appendChild(dom_aggTx);                     // dom_aggTx をdom_txに追加        
                dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
                dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加                                                                                           
              }

              if (aggTx[0].innerTransactions[0].message !== undefined) {     // １つ目、2つ目のインナートランザクションにメッセージがあれば表示する。 
                dom_message.innerHTML = `</br><font color="#4169e1"><br>< Message ><br>${aggTx[0].innerTransactions[0].message.payload}</font>`;     // 　メッセージ              
              } else
                if (aggTx[0].innerTransactions[1].message !== undefined) {
                  dom_message.innerHTML = `</br><font color="#4169e1"><br>< Message ><br>${aggTx[0].innerTransactions[1].message.payload}</font>`;     // メッセージ
                }
            }

            if (aggTx[0].innerTransactions[0].type === 17229) {       // 'MOSAIC_SUPPLY_REVOCATION' の場合
              const dom_aggTx = document.createElement('div');
              const dom_mosaic = document.createElement('div');
              const dom_amount = document.createElement('div');
              const dom_mosaic_img = document.createElement('div');
              const dom_NFT = document.createElement('div');

              (async () => {
                let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(aggTx[0].innerTransactions[0].mosaic.id.id.toHex())]).toPromise(); // Namespaceの情報を取得する

                mosaicInfo = await mosaicRepo.getMosaic(aggTx[0].innerTransactions[0].mosaic.id.id).toPromise();// 可分性の情報を取得する                     
                let div = mosaicInfo.divisibility; // 可分性      

                if ([mosaicNames][0][0].names.length !== 0) { // ネームスペースがある場合                         
                  dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic 回収 :　<big><strong>${[mosaicNames][0][0].names[0].name}</strong></big></font>`;
                } else { 　　　　　　　　　　　　　　　　　　　　　  // ネームスペースがない場合
                  dom_mosaic.innerHTML = `<font color="#3399FF">Mosaic 回収 :　<strong>${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}</strong></font>`;
                }
                dom_amount.innerHTML = `<font color="#3399FF" size="+1">💰➡️😊 :　<i><big><strong> ${(parseInt(aggTx[0].innerTransactions[0].mosaic.amount.toHex(), 16) / (10 ** div)).toLocaleString(undefined, { maximumFractionDigits: 6 })} </big></strong><i></font>`;    // 　数量                
              })(); // async() 

              ///////////////  Mosaic Center  /////////////////////

              // mosaic-center の画像を表示
              fetch(`https://mosaic-center.net/db/api.php?mode=search&mosaicid=${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}`)
                .then((response) => {
                  // レスポンスが成功したかどうかを確認
                  if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                  }
                  // JSONデータを解析して返す
                  return response.json();
                })
                .then((data) => {
                  if (data !== null) { //データがある場合
                    dom_mosaic_img.innerHTML = `
                    <br><div style="text-align: center;"><a class="btn-style-link" href="https://mosaic-center.net/" target="_blank">Mosaic Center</a>
                                                     <br>
                                                     <br>
                                                     <a href="https://symbol.fyi/mosaics/${aggTx[0].innerTransactions[0].mosaic.id.id.toHex()}" target="_blank" style="display: inline-block; width: 200px;">
                                                     <img class="mosaic_img" src=${data[0][7]} width="200">
                                                     </a></div><br>
                                                    `
                  }
                })
                .catch((error) => {
                  console.error("Fetch error:", error);
                });

              dom_aggTx.innerHTML = `<font color="#FF00FF">aggTx(${aggTx[0].innerTransactions.length})　${getTransactionType(aggTx[0].innerTransactions[0].type)}</font>`;  // アグリの数　と　Type
              dom_tx.appendChild(dom_aggTx);
              dom_tx.appendChild(dom_mosaic);                    // dom_mosaic をdom_txに追加 
              dom_tx.appendChild(dom_amount);                    // dom_amount をdom_txに追加
              dom_tx.appendChild(dom_NFT);                       // dom_NFT をdom_imgに追加
              dom_tx.appendChild(dom_mosaic_img);                // dom_mosaic_img をdom_imgに追加                                                                     	  		  		  	  
            }

            if (aggTx[0].innerTransactions[0].type === 16725) {       // 'MULTISIG_ACCOUNT_MODIFICATION' の場合

              dom_msig_account.innerHTML = `<font color="#ff00ff"><big><strong><br>マルチシグアカウント<br>${aggTx[0].innerTransactions[0].signer.address.address}</strong></font><br>`
              dom_tx.appendChild(dom_msig_account);

              if (aggTx[0].innerTransactions[0].addressAdditions.length !== 0) { // 追加アドレスがある場合
                let address_add = "";
                for (let i = 0; i < aggTx[0].innerTransactions[0].addressAdditions.length; i++) {
                  address_add = `${address_add}<br>${aggTx[0].innerTransactions[0].addressAdditions[i].address}`
                }
                dom_account_modification_add.innerHTML = `<font color="#ff6347"><big><strong><br>連署者 登録 :</strong></font><strong><font color="#008b8b"> 　${address_add}<br></strong></big></font>`;
                dom_tx.appendChild(dom_account_modification_add);
              }
              if (aggTx[0].innerTransactions[0].addressDeletions.length !== 0) {  // 削除アドレスがある場合
                let address_del = "";
                for (let i = 0; i < aggTx[0].innerTransactions[0].addressDeletions.length; i++) {
                  address_del = `${address_del}<br>${aggTx[0].innerTransactions[0].addressDeletions[i].address}`
                }
                dom_account_modification_del.innerHTML = `<font color="#00bfff"><big><strong><br>連署者 削除 :</strong></font><strong><font color="#008b8b"> 　${address_del}<br></strong></big></font>`;
                dom_tx.appendChild(dom_account_modification_del);
              }

              dom_min_approval_delta.innerHTML = `<br>最小承認増減値　${aggTx[0].innerTransactions[0].minApprovalDelta}`
              dom_min_removal_delta.innerHTML = `最小削除増減値　${aggTx[0].innerTransactions[0].minRemovalDelta}`
              dom_tx.appendChild(dom_min_approval_delta);
              dom_tx.appendChild(dom_min_removal_delta);
            }

            dom_tx.appendChild(dom_enc);
            dom_tx.appendChild(dom_message);                   // dom_message をdom_txに追加
            dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く  
          })(); // async() 
        }
        //dom_tx.appendChild(document.createElement('hr'));  // 水平線を引く
        dom_txInfo.appendChild(dom_tx);                    // トランザクション情報を追加

        console.log('%c= = = = = = = = = = = = = = = =', 'color: green');
        console.log(`%ctx[${t}][${ymdhms}] =`, "color: blue", tx);      //　トランザクションをコンソールに表示　//////////////////
        t = ++t;
      }    // tx の数だけループ処理 
    })	// txRepo.search(searchCriteria).subscribe(async txs => 

}

///////////////////////////////////////////  　　　　発行した  Mosaic ページ切り替え       /////////////////////////////////

function select_Page_mosa1() {

  const page_num_mosa1 = document.getElementById('page_num_mosa1').value;  /////////  セレクトボックスから、Page No を取得  ///////////////////////

  const dom_ms = document.getElementById('ms_table');
  if (dom_ms !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_ms.firstChild) {
      dom_ms.removeChild(dom_ms.firstChild);
    }
  }

  const dom_re = document.querySelector('.revoke_select');
  if (dom_re !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_re.firstChild) {
      dom_re.removeChild(dom_re.firstChild);
    }
  }

  const dom_mo = document.querySelector('.select_mosaicID');
  if (dom_mo !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_mo.firstChild) {
      dom_mo.removeChild(dom_mo.firstChild);
    }
  }

  const dom_sup = document.querySelector('.select_mosaic_sup');
  if (dom_sup !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_sup.firstChild) {
      dom_sup.removeChild(dom_sup.firstChild);
    }
  }


  accountRepo.getAccountInfo(sym.Address.createFromRawAddress(window.SSS.activeAddress))
    .toPromise()
    .then((accountInfo) => {
      console.log("accountInfo=", accountInfo)
      console.log("account_Mosaics =", accountInfo.mosaics.length);

      //ブロック
      chainRepo.getChainInfo().subscribe(chain => {  //////////   

        rxjs.zip(
          blockRepo1.getBlockByHeight(chain.height),
          blockRepo1.getBlockByHeight(chain.latestFinalizedBlock.height),
        ).subscribe(zip => {

          $("#chain_height").html(    //  最新ブロック
            "[ <a target='_blank' href='" + EXPLORER + "/blocks/" + zip[0].height.compact() + "'>" + zip[0].height.compact() + "</a> ]　日時: " + dispTimeStamp(Number(zip[0].timestamp.toString()), epochAdjustment)
          );
          $("#finalized_chain_height").html(   //  確定ブロック
            "[ <a target='_blank' href='" + EXPLORER + "/blocks/" + zip[1].height.compact() + "'>" + zip[1].height.compact() + "</a> ]　日時: " + dispTimeStamp(Number(zip[1].timestamp.toString()), epochAdjustment)
          );
          console.log("ブロック高=", zip[0].height.compact());
          console.log("ファイナライズブロック=", zip[1].height.compact());


          mosaicRepo.search({
            ownerAddress: sym.Address.createFromRawAddress(window.SSS.activeAddress),
            pageNumber: page_num_mosa1,
            pageSize: 50,
            order: sym.Order.Desc
          })
            .subscribe(async mosaic => {

              console.log("mosaic_data=", mosaic.data);

              console.log("モザイクの数", mosaic.data.length);

              const select_revoke = []; //　セレクトボックス初期化 (モザイク回収)
              const select_mosaicID = []; //　セレクトボックス初期化 (モザイクID)
              const select_mosaic_sup = []; //　セレクトボックス初期化 (モザイクID 供給量変更)
              var body = document.getElementById("ms_table");

              // <table> 要素と <tbody> 要素を作成　/////////////////////////////////////////////////////
              var tbl = document.createElement("table");
              var tblBody = document.createElement("tbody");
              let mosaicNames;
              // すべてのセルを作成
              for (var i = -1; i < mosaic.data.length; i++) {  // ネームスペースの数だけ繰り返す
                if (i > -1) {
                  mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(mosaic.data[i].id.id.toHex())]).toPromise(); // モザイクIDからNamespaceの情報を取得する
                }
                // 表の行を作成
                var row = document.createElement("tr");

                for (var j = 0; j < 11; j++) {
                  // <td> 要素とテキストノードを作成し、テキストノードを
                  // <td> の内容として、その <td> を表の行の末尾に追加
                  var cell = document.createElement("td");
                  switch (j) {
                    case 0:   //モザイクID
                      if (i === -1) {
                        var cellText = document.createTextNode("モザイクID");
                        select_mosaicID.push({ value: "--- Select ---", name: "--- Select ---" }); //セレクトボックス用の連想配列を作る
                        select_mosaic_sup.push({ value: "--- Select ---", name: "--- Select ---" }); //セレクトボックス用の連想配列を作る
                        break;
                      }
                      var cellText = document.createTextNode(mosaic.data[i].id.id.toHex());
                      if (mosaic.data[i].duration.compact() === 0) { // ステータスが無効なモザイクを排除                               
                        select_mosaicID.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                        if (mosaic.data[i].flags.supplyMutable === true) { // 供給量可変　🟢
                          select_mosaic_sup.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                        }
                      } else
                        if (endHeight - zip[0].height.compact() > 0) { // ステータスが無効なモザイクを排除
                          select_mosaicID.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                          if (mosaic.data[i].flags.supplyMutable === true) { // 供給量可変　🟢
                            select_mosaic_sup.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                          }
                        }
                      break;
                    case 1:   //ネームスペース名
                      if (i === -1) {
                        var cellText = document.createTextNode("ネームスペース名");
                        break;
                      }
                      if ([mosaicNames][0][0].names.length !== 0) {  // ネームスペースがある場合                       
                        var cellText = document.createTextNode([mosaicNames][0][0].names[0].name);
                      } else {   // ネームスペースが無い場合
                        var cellText = document.createTextNode("N/A");
                      }
                      break;
                    case 2:   // 供給量
                      if (i === -1) {
                        var cellText = document.createTextNode("供給量");
                        break;
                      }
                      var supply1 = mosaic.data[i].supply.compact() / (10 ** mosaic.data[i].divisibility);
                      supply1 = supply1.toLocaleString();

                      var cellText = document.createTextNode(supply1);
                      break;
                    case 3:   //残高
                      if (i === -1) {
                        var cellText = document.createTextNode("残高");
                        break;
                      }
                      for (var k = 0; k < accountInfo.mosaics.length; k++) {
                        if (accountInfo.mosaics[k].id.id.toHex() === mosaic.data[i].id.id.toHex()) { // accountInfoのamount データを探す
                          var balance = accountInfo.mosaics[k].amount.compact();
                        }
                      }
                      balance = balance / (10 ** mosaic.data[i].divisibility);   // 可分性を考慮
                      balance = balance.toLocaleString();

                      var cellText = document.createTextNode(balance);
                      break;
                    case 4:   //有効期限
                      if (i === -1) {
                        var cellText = document.createTextNode("有効期限");
                        break;
                      }
                      if (mosaic.data[i].duration.compact() === 0) {
                        var cellText = document.createTextNode("---　無期限　---");
                      } else {
                        var endHeight = mosaic.data[i].startHeight.compact() + mosaic.data[i].duration.compact()
                        var remainHeight = endHeight - zip[0].height.compact();
                        t = dispTimeStamp(zip[0].timestamp.compact() + (remainHeight * 30000), epochAdjustment)
                        var cellText = document.createTextNode(t);
                      }
                      break;
                    case 5:   // ステータス
                      if (i === -1) {
                        var cellText = document.createTextNode("ステータス");
                        break;
                      }
                      if (mosaic.data[i].duration.compact() === 0) {
                        var cellText = document.createTextNode("　　🟢");
                      } else
                        if (mosaic.data[i].duration.compact() > 0) {
                          var endHeight = mosaic.data[i].startHeight.compact() + mosaic.data[i].duration.compact()
                          if (endHeight - zip[0].height.compact() > 0) {
                            var cellText = document.createTextNode("　　🟢");
                          } else {
                            var cellText = document.createTextNode("　　❌");
                          }
                        }
                      break;
                    case 6:   // 可分性
                      if (i === -1) {
                        var cellText = document.createTextNode("可分性");
                        break;
                      }
                      var cellText = document.createTextNode(`　${mosaic.data[i].divisibility}`);
                      break;
                    case 7:   //　制限可
                      if (i === -1) {
                        var cellText = document.createTextNode("制限可");
                        break;
                      }
                      if (mosaic.data[i].flags.restrictable === true) {
                        var cellText = document.createTextNode("　🟢");
                      } else
                        if (mosaic.data[i].flags.restrictable === false) {
                          var cellText = document.createTextNode("　❌");
                        }
                      break;
                    case 8:  // 供給量可変
                      if (i === -1) {
                        var cellText = document.createTextNode("供給量可変");
                        break;
                      }
                      if (mosaic.data[i].flags.supplyMutable === true) {
                        var cellText = document.createTextNode("　　🟢");
                      } else
                        if (mosaic.data[i].flags.supplyMutable === false) {
                          var cellText = document.createTextNode("　　❌");
                        }
                      break;
                    case 9:   // 転送可
                      if (i === -1) {
                        var cellText = document.createTextNode("転送可");
                        break;
                      }
                      if (mosaic.data[i].flags.transferable === true) {
                        var cellText = document.createTextNode("　🟢");
                      } else
                        if (mosaic.data[i].flags.transferable === false) {
                          var cellText = document.createTextNode("　❌");
                        }
                      break;
                    case 10:   // 回収可
                      if (i === -1) {
                        var cellText = document.createTextNode("回収可");
                        select_revoke.push({ value: "--- Select ---", name: "--- Select ---" }); //セレクトボックス用の連想配列を作る
                        break;
                      }
                      if (mosaic.data[i].flags.revokable === true) {
                        var cellText = document.createTextNode("　🟢");
                        if (mosaic.data[i].duration.compact() === 0) { // ステータスが無効なモザイクを排除
                          select_revoke.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                        } else
                          if (endHeight - zip[0].height.compact() > 0) { // ステータスが無効なモザイクを排除
                            select_revoke.push({ value: mosaic.data[i].id.id.toHex(), name: mosaic.data[i].id.id.toHex() }); //セレクトボックス用の連想配列を作る
                          }
                      } else
                        if (mosaic.data[i].flags.revokable === false) {
                          var cellText = document.createTextNode("　❌");
                        }
                      break;
                    case 11:   // 編集
                      /////////////////////////////  保留  //////////
                      if (i === -1) {
                        var cellText = document.createTextNode("");
                        break;
                      }
                      if (mosaic.data[i].duration.compact() === 0) {
                        var cellText = document.createTextNode("");
                      } else
                        if (mosaic.data[i].duration.compact() > 0) {
                          var endHeight = mosaic.data[i].startHeight.compact() + mosaic.data[i].duration.compact()
                          if (endHeight - zip[0].height.compact() > 0) {
                            var cellText = document.createTextNode("");
                          } else {
                            var cellText = document.createTextNode("");
                          }
                        }
                      break;
                  }
                  cell.appendChild(cellText);
                  row.appendChild(cell);
                }

                // 表の本体の末尾に行を追加
                tblBody.appendChild(row);
              }

              // <tbody> を <table> の中に追加
              tbl.appendChild(tblBody);
              // <table> を <body> の中に追加
              body.appendChild(tbl);
              // tbl の border 属性を 2 に設定
              tbl.setAttribute("border", "1");
              console.log("%cselect_revoke=", "color: red", select_revoke);
              console.log("%cselect_mosaicID=", "color: red", select_mosaicID);
              console.log("%cselect_mosaic_sup=", "color: red", select_mosaic_sup);

              ////    セレクトボックス  (回収モザイク用)    ///////////////////////////////////////

              const jsSelectBox_rev = document.querySelector('.revoke_select');
              const select = document.createElement('select');

              select.classList.add('select_r');
              select_revoke.forEach((v) => {
                const option = document.createElement('option');
                option.value = v.value;
                option.textContent = v.name;
                select.appendChild(option);
              });
              jsSelectBox_rev.appendChild(select);

              ////    select_mosaicID  (Metadata用)    ///////////////////////////////////////

              const jsSelectBox_mosaicID = document.querySelector('.select_mosaicID');
              const select_mo = document.createElement('select');

              select_mo.classList.add('select_mo');
              select_mosaicID.forEach((v) => {
                const option = document.createElement('option');
                option.value = v.value;
                option.textContent = v.name;
                select_mo.appendChild(option);
              });
              jsSelectBox_mosaicID.appendChild(select_mo);

              /////   mosaic_ID セレクトボックス  (供給量変更用）///////////////////////////////

              const jsSelectBox_sup = document.querySelector('.select_mosaic_sup');
              const select_sup = document.createElement('select');

              select_sup.classList.add('select_sup');
              select_mosaic_sup.forEach((v) => {
                const option = document.createElement('option');
                option.value = v.value;
                option.textContent = v.name;
                select_sup.appendChild(option);
              });
              jsSelectBox_sup.appendChild(select_sup);

            });

        })
      });

    });
}

///////////////////////////////////////////  　　　　発行した  Namespace ページ切り替え       /////////////////////////////////

function select_Page_namespace() {

  const page_num_namespace = document.getElementById('page_num_namespace').value;  /////////  セレクトボックスから、Page No を取得  ///////////////////////

  const dom_ns = document.getElementById('ns_table');
  if (dom_ns !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_ns.firstChild) {
      dom_ns.removeChild(dom_ns.firstChild);
    }
  }

  const dom_nse = document.querySelector('.Namespace_select');
  if (dom_nse !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_nse.firstChild) {
      dom_nse.removeChild(dom_nse.firstChild);
    }
  }


  accountRepo.getAccountInfo(sym.Address.createFromRawAddress(window.SSS.activeAddress))
    .toPromise()
    .then((accountInfo) => {
      console.log("accountInfo=", accountInfo)
      console.log("account_Mosaics =", accountInfo.mosaics.length);

      ////

      //ブロック
      chainRepo.getChainInfo().subscribe(chain => {  //////////   

        rxjs.zip(
          blockRepo1.getBlockByHeight(chain.height),
          blockRepo1.getBlockByHeight(chain.latestFinalizedBlock.height),
        ).subscribe(zip => {

          $("#chain_height").html(    //  最新ブロック
            "[ <a target='_blank' href='" + EXPLORER + "/blocks/" + zip[0].height.compact() + "'>" + zip[0].height.compact() + "</a> ]　日時: " + dispTimeStamp(Number(zip[0].timestamp.toString()), epochAdjustment)
          );
          $("#finalized_chain_height").html(   //  確定ブロック
            "[ <a target='_blank' href='" + EXPLORER + "/blocks/" + zip[1].height.compact() + "'>" + zip[1].height.compact() + "</a> ]　日時: " + dispTimeStamp(Number(zip[1].timestamp.toString()), epochAdjustment)
          );
          console.log("%c現在のブロック高=", "color: red", zip[0].height.compact());
          console.log("%cファイナライズブロック=", "color: red", zip[1].height.compact());



          //// ネームスペース テーブル　//////////////////////////////////////////////////////////////////////////////

          nsRepo.search({
            ownerAddress: accountInfo.address,
            pageNumber: page_num_namespace,
            pageSize: 50,
            order: sym.Order.Desc
          }) /////    保有ネームスペース
            .subscribe(async ns => {

              console.log("{ownerAddress:accountInfo.address}: ", { ownerAddress: accountInfo.address });

              var Nnames1 = new Array(ns.data.length);
              var i = 0;
              var ddNamespace = new Array(ns.data.length);
              for (const nsInfo of ns.data) {

                //  console.log("%cnsInfo==","color: blue",nsInfo)
                if (nsInfo.levels.length == 1) { //ルートネームスペース

                  const Nnames = await nsRepo.getNamespacesNames([nsInfo.levels[nsInfo.levels.length - 1]]).toPromise();
                  Nnames1[i] = Nnames[0].name;

                  var namespace = "";
                  for (const namespaceName of Nnames) {
                    if (namespace != "") {
                      namespace = "." + namespace;
                    }
                    namespace = namespaceName.name + namespace;
                  }

                  var remainHeight = nsInfo.endHeight.compact() - zip[0].height.compact();
                  //  console.log("期限が終了するブロック: " + nsInfo.endHeight.compact());  
                  //  console.log("あと残りのブロック: " + remainHeight);

                  t = dispTimeStamp(zip[0].timestamp.compact() + (remainHeight * 30000), epochAdjustment)
                  // t = dispTimeStamp(nsInfo.endHeight.compact() * 30000,epochAdjustment);
                  // ddNamespace += '<dd>' + namespace + ' [期限: ' + t + ']</dd>';
                  ddNamespace[i] = t;
                }

                if (nsInfo.levels.length == 2) { //サブネームスペース                
                  const Nnames = await nsRepo.getNamespacesNames([nsInfo.levels[nsInfo.levels.length - 1]]).toPromise();
                  Nnames1[i] = Nnames[1].name + "." + Nnames[0].name;
                  //console.log("%cNnames[i]================","color: red",Nnames[i])
                  //ddNamespace[i] = t; 
                }

                if (nsInfo.levels.length == 3) { //サブネームスペース                
                  const Nnames = await nsRepo.getNamespacesNames([nsInfo.levels[nsInfo.levels.length - 1]]).toPromise();
                  Nnames1[i] = Nnames[2].name + "." + Nnames[1].name + "." + Nnames[0].name;
                  //ddNamespace[i] = t; 
                }

                i = ++i;
              }

              console.log("ns_data=", ns.data);

              console.log("ネームスペースの数", ns.data.length);
              const select_ns = [];   // セレクトボックス初期化　（エイリアスリンク/ネームスペース）

              var body = document.getElementById("ns_table");

              // <table> 要素と <tbody> 要素を作成　/////////////////////////////////////////////////////
              var tbl = document.createElement("table");
              var tblBody = document.createElement("tbody");

              // すべてのセルを作成
              for (var i = -1; i < ns.data.length; i++) {  // ネームスペースの数だけ繰り返す
                // 表の行を作成
                var row = document.createElement("tr");

                for (var j = 0; j < 6; j++) {
                  // <td> 要素とテキストノードを作成し、テキストノードを
                  // <td> の内容として、その <td> を表の行の末尾に追加
                  var cell = document.createElement("td");
                  switch (j) {
                    case 0:   //ネームスペースID
                      if (i === -1) {
                        var cellText = document.createTextNode("ネームスペース名");
                        select_ns.push({ value: "--- Select ---", name: "--- Select ---" }); //セレクトボックス用の連想配列を作る
                        break;
                      }
                      var cellText = document.createTextNode(Nnames1[i]);
                      if (zip[0].height.compact() < ns.data[i].endHeight.compact() - grace_block) {  // ステータスが無効なネームスペースを排除
                        select_ns.push({ value: Nnames1[i], name: Nnames1[i] }); //セレクトボックス用の連想配列を作る                              
                      }
                      break;
                    case 1:   //ネームスペース名
                      if (i === -1) {
                        var cellText = document.createTextNode("ネームスペースID");
                        break;
                      }
                      if (ns.data[i].levels.length === 1) { //　ルートネームスペースの時
                        var cellText = document.createTextNode(ns.data[i].levels[0].id.toHex());
                      } else
                        if (ns.data[i].levels.length === 2) { //  サブネームスペース1の時
                          var cellText = document.createTextNode(ns.data[i].levels[1].id.toHex());
                        } else
                          if (ns.data[i].levels.length === 3) { //  サブネームスペース2の時
                            var cellText = document.createTextNode(ns.data[i].levels[2].id.toHex());
                          }
                      break;
                    case 2:   // 有効期限
                      if (i === -1) {
                        var cellText = document.createTextNode("更新期限");
                        break;
                      }
                      if (ns.data[i].levels.length !== 1) {
                        var cellText = document.createTextNode("----------------");
                      } else {
                        var cellText = document.createTextNode(ddNamespace[i]);
                      }
                      break;
                    case 3:
                      if (i === -1) {
                        var cellText = document.createTextNode("ステータス");
                        break;
                      }
                      if (zip[0].height.compact() > ns.data[i].endHeight.compact() - grace_block) {
                        var cellText = document.createTextNode("　　❌");
                      } else
                        if (zip[0].height.compact() < ns.data[i].endHeight.compact() - grace_block) {
                          var cellText = document.createTextNode("　　🟢");
                        }
                      break;
                    case 4:   // エイリアスタイプ
                      if (i === -1) {
                        var cellText = document.createTextNode("タイプ");
                        break;
                      }
                      if (ns.data[i].alias.type === 0) {
                        var cellText = document.createTextNode("--------");
                      } else
                        if (ns.data[i].alias.type === 1) {
                          var cellText = document.createTextNode("Mosaic");
                        } else
                          if (ns.data[i].alias.type === 2) {
                            var cellText = document.createTextNode("Address");
                          }
                      break;
                    case 5:   // エイリアス
                      if (i === -1) {
                        var cellText = document.createTextNode("🔗リンク🔗");
                        break;
                      }
                      if (ns.data[i].alias.type === 0) {
                        var cellText = document.createTextNode("--------------------------------------------------------");
                      } else
                        if (ns.data[i].alias.type === 1) {
                          var cellText = document.createTextNode(ns.data[i].alias.mosaicId.id.toHex());
                        } else
                          if (ns.data[i].alias.type === 2) {
                            var cellText = document.createTextNode(ns.data[i].alias.address.address);
                          }
                      break;
                  }
                  cell.appendChild(cellText);
                  row.appendChild(cell);
                }
                // 表の本体の末尾に行を追加
                tblBody.appendChild(row);
              }
              // <tbody> を <table> の中に追加
              tbl.appendChild(tblBody);
              // <table> を <body> の中に追加
              body.appendChild(tbl);
              // tbl の border 属性を 2 に設定
              tbl.setAttribute("border", "1");


              console.log("%cselect_ns:", "color: red", select_ns); // ネームスペース　セレクトボックス ///////

              const jsSelectBox = document.querySelector('.Namespace_select');
              let select = document.createElement('select');

              select.classList.add('select1');
              select_ns.forEach((v) => {
                const option = document.createElement('option');
                option.value = v.value;
                option.textContent = v.name;
                select.appendChild(option);
              });
              jsSelectBox.appendChild(select);


              /////   Namespace セレクトボックス  (Metadata用）

              const jsSelectBox_N = document.querySelector('.Namespace_select_N');
              const select_N = document.createElement('select');

              select_N.classList.add('select_N');
              select_ns.forEach((v) => {
                const option = document.createElement('option');
                option.value = v.value;
                option.textContent = v.name;
                select_N.appendChild(option);
              });
              jsSelectBox_N.appendChild(select_N);


            });
        })
      });

    })

}

///////////////////////////////////////////         Meta テーブル  ページ切り替え    //////////////////////////////////

function select_Page_meta() {

  const page_num_meta = document.getElementById('page_num_meta').value;  /////////  セレクトボックスから、Page No を取得  ///////////////////////

  const dom_Meta = document.getElementById('Meta_table');
  console.log("dom_txInfo=", dom_Meta); ////////////////
  if (dom_Meta !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_Meta.firstChild) {
      dom_Meta.removeChild(dom_Meta.firstChild);
    }
  }

  const dom_Meta_select = document.querySelector('.Meta_select');
  console.log("dom_txInfo=", dom_Meta_select); ////////////////
  if (dom_Meta_select !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_Meta_select.firstChild) {
      dom_Meta_select.removeChild(dom_Meta_select.firstChild);
    }
  }

  metaRepo
    .search({
      targetAddress: sym.Address.createFromRawAddress(window.SSS.activeAddress),
      pageNumber: page_num_meta,
      pageSize: 50,
      order: sym.Order.Desc
    }).subscribe(async data => {

      console.log("data = = = =  ", data);

      const select_Meta = [];   // セレクトボックス初期化　（Meta Key）

      var body = document.getElementById("Meta_table");

      // <table> 要素と <tbody> 要素を作成　/////////////////////////////////////////////////////
      var tbl = document.createElement("table");
      var tblBody = document.createElement("tbody");

      // すべてのセルを作成
      for (var i = -1; i < data.data.length; i++) {  // ネームスペースの数だけ繰り返す
        // 表の行を作成
        var row = document.createElement("tr");

        for (var j = 0; j < 6; j++) {
          // <td> 要素とテキストノードを作成し、テキストノードを
          // <td> の内容として、その <td> を表の行の末尾に追加
          var cell = document.createElement("td");
          switch (j) {
            case 0:   //Metadata Key
              if (i === -1) {
                var cellText = document.createTextNode("メタデータ キー");
                select_Meta.push({ value: "", name: "　　　新規 キー", type: "Type" }); //セレクトボックス用の連想配列を作る                       
                break;
              }
              var cellText = document.createTextNode(data.data[i].metadataEntry.scopedMetadataKey.toHex()); // scopedMetadataKey を 16進数に変換
              if (i > -1) {
                select_Meta.push({ value: data.data[i].metadataEntry.scopedMetadataKey.toHex(), name: data.data[i].metadataEntry.scopedMetadataKey.toHex(), type: data.data[i].metadataEntry.metadataType }); //セレクトボックス用の連想配列を作る                              
              }
              break;
            case 1:   //タイプ
              if (i === -1) {
                var cellText = document.createTextNode("タイプ");
                break;
              }
              if (data.data[i].metadataEntry.metadataType === 0) {
                var cellText = document.createTextNode("Account");
              } else
                if (data.data[i].metadataEntry.metadataType === 1) {
                  var cellText = document.createTextNode("Mosaic");
                } else
                  if (data.data[i].metadataEntry.metadataType === 2) {
                    var cellText = document.createTextNode("Namespace");
                  }
              break;
            case 2:   // 対象ID
              if (i === -1) {
                var cellText = document.createTextNode("モザイク ID / ネームスペース");
                break;
              }
              //  console.log("対象ID＝＝＝",data.data[i].metadataEntry.targetId.id);
              if (data.data[i].metadataEntry.targetId === undefined) {
                var cellText = document.createTextNode("N/A");
              } else
                if (data.data[i].metadataEntry.targetId !== undefined) {
                  if (data.data[i].metadataEntry.metadataType === 1) {  // モザイクの場合　ID
                    var cellText = document.createTextNode(data.data[i].metadataEntry.targetId.id.toHex());
                  } else
                    if (data.data[i].metadataEntry.metadataType === 2) { // ネームスペースがある場合、ID → ネームスペースに変換                                             
                      var ns_name = await nsRepo.getNamespacesNames([data.data[i].metadataEntry.targetId.id]).toPromise();
                      if (ns_name.length === 1) {
                        var cellText = document.createTextNode([ns_name][0][0].name);
                      } else
                        if (ns_name.length === 2) {
                          var cellText = document.createTextNode([ns_name][0][1].name + "." + [ns_name][0][0].name);
                        } else
                          if (ns_name.length === 3) {
                            var cellText = document.createTextNode([ns_name][0][2].name + "." + [ns_name][0][1].name + "." + [ns_name][0][0].name);
                          }
                    }
                }
              break;
            case 3:   // value
              if (i === -1) {
                var cellText = document.createTextNode(" 　　Value(値)");
                break;
              }
              // if (isHexadecimal(data.data[i].metadataEntry.value) === true){  // 16進数文字列の場合　UTF-８に変換する
              //   value1 = sym.Convert.decodeHex(data.data[i].metadataEntry.value);
              //   var cellText = document.createTextNode(value1);
              //  }else{
              var cellText = document.createTextNode(data.data[i].metadataEntry.value);
              // }
              // console.log("%cメタデータエントリー中身","color: red",data.data[i]);                  
              break;
            case 4:  // 送信者アドレス
              if (i === -1) {
                var cellText = document.createTextNode("送信者アドレス");
                break;
              }
              var cellText = document.createTextNode(data.data[i].metadataEntry.sourceAddress.address);
              break;
            case 5:   // 対象アドレス
              if (i === -1) {
                var cellText = document.createTextNode("対象アドレス");
                break;
              }
              var cellText = document.createTextNode(data.data[i].metadataEntry.targetAddress.address);
              break;

          }
          cell.appendChild(cellText);
          row.appendChild(cell);
        }
        // 表の本体の末尾に行を追加
        tblBody.appendChild(row);
      }
      // <tbody> を <table> の中に追加
      tbl.appendChild(tblBody);
      // <table> を <body> の中に追加
      body.appendChild(tbl);
      // tbl の border 属性を 2 に設定
      tbl.setAttribute("border", "1");

      select_Meta.push({ value: "Pointy", name: "　　Pointyに登録", type: "Type" }); // Pointy ポイントアプリに表示するために特定キーのメタデータを編集

      console.log("%cselect_Meta:", "color: red", select_Meta); // Metadata　セレクトボックス ///////

      const jsSelectBox = document.querySelector('.Meta_select');
      const select = document.createElement('select');

      select.classList.add('select_Meta');
      select_Meta.forEach((v) => {
        const option = document.createElement('option');
        option.value = v.value;
        option.textContent = v.name;
        select.appendChild(option);
      });
      jsSelectBox.appendChild(select);

    });

}    //  select_Page_meta

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 暗号化メッセージを復号する //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



function Onclick_Decryption(PubKey, encryptedMessage) {
  console.log("%cPubkeyだよ", "color: blue", PubKey)
  console.log("%cencryptedMessageだよ", "color: green", encryptedMessage)

  window.SSS.setEncryptedMessage(
    encryptedMessage,
    PubKey
  )

  window.SSS.requestSignDecription().then((data) => {
    console.log(data);

    Swal.fire({
      /* `暗号化メッセージ
      < Encrypted Message >

      ${encryptedMessage} */

      html: `復号化メッセージ
      <br>
      < Decrypted Message >
      <br>
      <br>
      <p style="font-size: 24px;"><font color="blue">${data}</font></p>`
    }); // ポップアップで表示
  })
}

///////////////  Transaction Info ボタン ///////////////////////////

function transaction_info(url) {
  window.open(url);  // hash からエクスプローラーを開く
}

///////////// /  タイムスタンプ  ////////////////////////////////////////////
function dispTimeStamp(timeStamp, epoch) {

  const d = new Date(timeStamp + epoch * 1000)
  const strDate = d.getFullYear() % 100
    + "-" + paddingDate0(d.getMonth() + 1)
    + '-' + paddingDate0(d.getDate())
    + ' ' + paddingDate0(d.getHours())
    + ':' + paddingDate0(d.getMinutes());
  return strDate;
}

function getDateId(timeStamp, epoch) {
  const d = new Date(timeStamp + epoch * 1000)
  const dateId = d.getFullYear()
    + paddingDate0(d.getMonth() + 1)
    + paddingDate0(d.getDate());
  return dateId;

}

function paddingDate0(num) {
  return (num < 10) ? '0' + num : '' + num;
};

function dispAmount(amount, divisibility) {

  const strNum = amount.toString();
  if (divisibility > 0) {

    if (amount < Math.pow(10, divisibility)) {

      return "0." + paddingAmount0(strNum, 0, divisibility);

    } else {

      const r = strNum.slice(-divisibility);
      const l = strNum.substring(0, strNum.length - divisibility);
      return comma3(l) + "." + r;
    }
  } else {
    return comma3(strNum);
  }
}
function comma3(strNum) {
  return strNum.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
}

function paddingAmount0(val, char, n) {
  for (; val.length < n; val = char + val);
  return val;
}

function dispBlockTimeStamp(id, height) {

  blockRepo1.getBlockByHeight(height)
    .subscribe(block => {

      $(id).text(
        dispTimeStamp(Number(block.timestamp.toString()), epochAdjustment)
      );
    })
}


///////////////   レシート情報   /////////////////////////////////////
function showReceiptInfo(tag, height, receipt, cnt) {

  if (cnt === 0) {
    cnt = "";
  }

  $("#" + tag).append("<tr>"
    + "<td id='" + tag + "_date" + height + receipt.type + cnt + "'></td>"
    + "<td id='" + tag + "_type' style='font-size:84%;'>" + sym.ReceiptType[receipt.type] + "</td>"
    + "<td id='" + tag + "_amount' class='text-right'>" + dispAmount(receipt.amount, 6) + "</td>" //mosaicLabel
    + "</tr>"
  );

  dispBlockTimeStamp("#" + tag + "_date" + height + receipt.type, height);
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Copyボタンをクリックして、クリップボードにコピー
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function Onclick_Copy(copy_address) {

  console.log("Copy_address=", copy_address);       // 正しいアドレスが表示されている
  console.log("コピーボタンが押されたよ");


  let COPY_COMPLETE = document.createElement('div');
  COPY_COMPLETE.innerHTML = `　　　　<strong style="color: green;"><font size="6">Copied!</font></strong>`;


  const COPY_BT = document.querySelector('h2');
  console.log(COPY_BT);

  COPY_BT.replaceWith(COPY_COMPLETE);
  setTimeout(() => {
    COPY_COMPLETE.replaceWith(COPY_BT);
  }, 700);


  navigator.clipboard.writeText(copy_address);

}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// モザイク作成 //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function Onclick_mosaic() {

  const supplyAmount = document.getElementById("SupplyAmount").value;
  const duration = document.getElementById("Duration1").value;
  const divisibility = document.getElementById("Divisibility").value;
  const supplyMutable = document.getElementById("Supply_M").checked;
  const transferable = document.getElementById("Transferable").checked;
  const restrictable = document.getElementById("Restrictable").checked;
  const revokable = document.getElementById("Revokable").checked;
  const maxFee = document.getElementById("re_maxFee_m").value;

  console.log("duration=", duration);
  console.log("supplyMutable=", supplyMutable);
  console.log("transferable=", transferable);
  console.log("restrictable=", restrictable);
  console.log("revokable=", revokable);

  //supplyMutable = true; //供給量変更の可否
  //transferable = true; //第三者への譲渡可否
  //restrictable = true; //制限設定の可否
  //revokable = true; //発行者からの還収可否

  const address = sym.Address.createFromRawAddress(window.SSS.activeAddress); //アカウントのアドレスを取得

  const publicAccount = sym.PublicAccount.createFromPublicKey(                //アカウントの公開鍵を取得
    window.SSS.activePublicKey,
    networkType
  );

  //モザイク定義
  const nonce = sym.MosaicNonce.createRandom();
  const mosaicDefTx = sym.MosaicDefinitionTransaction.create(
    undefined,
    nonce,
    sym.MosaicId.createFromNonce(nonce, address), //モザイクID
    sym.MosaicFlags.create(supplyMutable, transferable, restrictable, revokable),
    divisibility, //divisibility:可分性
    sym.UInt64.fromUint(duration), //duration:有効期限
    networkType
  );

  console.log(mosaicDefTx);

  const mosaicChangeTx = sym.MosaicSupplyChangeTransaction.create(
    undefined,
    mosaicDefTx.mosaicId,
    sym.MosaicSupplyChangeAction.Increase,
    sym.UInt64.fromUint(supplyAmount), //数量
    networkType
  );

  console.log(mosaicChangeTx);

  const aggregateTx = sym.AggregateTransaction.createComplete(
    sym.Deadline.create(epochAdjustment),
    [
      mosaicDefTx.toAggregate(publicAccount),
      mosaicChangeTx.toAggregate(publicAccount),
    ],
    networkType, [],
    sym.UInt64.fromUint(1000000 * Number(maxFee))
  )

  window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録        
  window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
    console.log('signedTx', signedTx);
    txRepo.announce(signedTx);
  })

}

//////////////////////////////////////////////////////////////////////////
//                   モザイク供給量変更
/////////////////////////////////////////////////////////////////////////

function mosaic_supply() {

  const mosaic_ID = document.querySelector(".select_sup").value;
  const change_Amount = document.getElementById("change_Amount").value;
  const Type = document.getElementById("change_sup").checked;
  const maxFee = document.getElementById("re_maxFee_sup").value;

  console.log("mosaic_ID=", mosaic_ID);
  console.log("change_Amount=", change_Amount);
  console.log("Type=", Type);
  console.log("maxFee=", maxFee);


  if (Type === true) {
    mosaicChangeTx = sym.MosaicSupplyChangeTransaction.create(
      sym.Deadline.create(epochAdjustment),
      new sym.MosaicId(mosaic_ID),
      sym.MosaicSupplyChangeAction.Increase,
      sym.UInt64.fromUint(change_Amount), //数量
      networkType,
      sym.UInt64.fromUint(1000000 * Number(maxFee))//最大手数料
    );
  } else
    if (Type === false) {
      mosaicChangeTx = sym.MosaicSupplyChangeTransaction.create(
        sym.Deadline.create(epochAdjustment),
        new sym.MosaicId(mosaic_ID),
        sym.MosaicSupplyChangeAction.Decrease,
        sym.UInt64.fromUint(change_Amount), //数量
        networkType,
        sym.UInt64.fromUint(1000000 * Number(maxFee))//最大手数料
      );
    }

  console.log(mosaicChangeTx);

  window.SSS.setTransaction(mosaicChangeTx);               // SSSにトランザクションを登録        
  window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
    console.log('signedTx', signedTx);
    txRepo.announce(signedTx);
  })

}

//////////////////////////////////////////////////////////////////////////
//                   モザイク回収
/////////////////////////////////////////////////////////////////////////

async function revoke_mosaic() {

  let re_agg_check = document.getElementById("re_agg_check").checked;  // 一括回収チェックのフラグ
  let mosaic_ID2 = document.querySelector(".select_r").value;
  let amount2 = document.getElementById("re_amount").value;

  if (re_agg_check === false) {
    if (file1 === undefined) {   // ファイルが選択されていない時   ///////////////////
      if (mosaic_ID2 === "--- Select ---") {
        Swal.fire(`モザイクIDを選択してください！`, "");
      }
      let mosaicInfo = await mosaicRepo.getMosaic(new sym.MosaicId(mosaic_ID2)).toPromise();// 可分性の情報を取得する 
      let div = mosaicInfo.divisibility; // 可分性

      const holderAddress = document.getElementById("holderAddress").value;
      // const maxFee = document.getElementById("re_maxFee_r").value;

      const revoke_tx = sym.MosaicSupplyRevocationTransaction.create(
        sym.Deadline.create(epochAdjustment),
        sym.Address.createFromRawAddress(holderAddress),
        new sym.Mosaic(
          new sym.MosaicId(mosaic_ID2),     // mosice ID 16進数　
          sym.UInt64.fromUint(Number(amount2) * 10 ** div)),      // mosaic 数量  可分性を適用する                                  
        networkType,
        //sym.UInt64.fromUint(1000000*Number(maxFee)) 
      ).setMaxFee(100); //手数料

      const fee_rev = document.getElementById("fee_rev");    // aggregate 手数料表示
      fee_rev.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(revoke_tx.maxFee.toHex(), 16) / 1000000} XYM　　　　</p>`

      window.SSS.setTransaction(revoke_tx);               // SSSにトランザクションを登録        
      window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
        console.log('signedTx', signedTx);
        txRepo.announce(signedTx);
      })
    } else { //ファイルが選択されている場合 //////////////////////////////////////////////

      let innerTx = [];
      for (let i = 0; i < address1.length; i++) {
        if (amount1[i] !== undefined) {    // 3列目 amount がある場合
          amount2 = amount1[i];

        }
        if (mosaic1[i] !== undefined) {    // 4列目 mosaic がある場合
          mosaic_ID2 = mosaic1[i];
        } else { // mosaic ID がない場合
          if (mosaic_ID2 === "--- Select ---") {
            Swal.fire(`モザイクIDを選択してください！`, "");
          }
        }

        let mosaicInfo = await mosaicRepo.getMosaic(new sym.MosaicId(mosaic_ID2)).toPromise();// 可分性の情報を取得する 
        let div = mosaicInfo.divisibility; // 可分性

        if (address1[i].length === 39) {  // アドレスの場合
          innerTx[i] = sym.MosaicSupplyRevocationTransaction.create(
            undefined, //Deadline
            sym.Address.createFromRawAddress(address1[i]), //回収先                                                            
            new sym.Mosaic(
              new sym.MosaicId(mosaic_ID2),
              sym.UInt64.fromUint(Number(amount2) * 10 ** div)
            ),
            //sym.PlainMessage.create(message),
            networkType
          );
        } else {  // ネームスペースの場合
          namespaceId = new sym.NamespaceId(address1[i]);
          innerTx[i] = sym.MosaicSupplyRevocationTransaction.create(
            undefined, //Deadline
            namespaceId, //回収先                                
            new sym.Mosaic(
              new sym.MosaicId(mosaic_ID2),
              sym.UInt64.fromUint(Number(amount2) * 10 ** div)
            ),
            //sym.PlainMessage.create(message),
            networkType
          );
        }

      }

      const publicAccount = sym.PublicAccount.createFromPublicKey(
        window.SSS.activePublicKey,
        networkType
      );

      for (let i = 0; i < address1.length; i++) {
        innerTx[i] = innerTx[i].toAggregate(publicAccount)
      }

      const aggregateTx = sym.AggregateTransaction.createComplete(
        sym.Deadline.create(epochAdjustment),  //Deadline
        innerTx,
        networkType,
        [],
        /*sym.UInt64.fromUint(1000000*Number(maxfee2))          //最大手数料*/
      ).setMaxFeeForAggregate(100);

      console.log("aggregateTx====", aggregateTx)
      console.log("aggregateTx.maxFee======", parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000);

      const agg_fee = document.getElementById("fee_rev");    // aggregate 手数料表示
      agg_fee.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000} XYM　　　　</p>`

      window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録        
      window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
        console.log('signedTx', signedTx);
        txRepo.announce(signedTx);
      })



    }

  } else {  // 一括回収チェックが true の場合 ///////////////////////////
    if (mosaic_ID2 === "--- Select ---") {
      Swal.fire(`モザイクIDを選択してください！`, "");
    }

    const page_num = document.getElementById('page_num_holder1').value;  /////////  セレクトボックスから、Page No を取得  ///////////////////////

    let xhr = new XMLHttpRequest();

    if (networkType === 104) { // Main Net
      xhr.open("GET", `${NODE}/accounts?mosaicId=${mosaic_ID2}&orderBy=balance&order=desc&pageSize=100&pageNumber=${page_num}`, false);
    }
    if (networkType === 152) { // Test Net
      xhr.open("GET", `${NODE}/accounts?mosaicId=${mosaic_ID2}&orderBy=balance&order=desc&pageSize=100&pageNumber=${page_num}`, false);
    }

    let data;

    xhr.send(null);

    data = xhr.response;
    data = JSON.parse(data);
    data2 = [];
    data3 = [];
    for (j = 0; j < data.data.length; j++) {
      for (i = 0; i < data.data[j].account.mosaics.length; i++) {
        if (data.data[j].account.mosaics[i].id === mosaic_ID2) {
          data2.push(sym.Address.createFromEncoded(data.data[j].account.address).plain());
          data3.push(data.data[j].account.mosaics[i].amount);
        }

      }
    }


    let innerTx = [];
    for (let i = 0; i < data2.length; i++) {

      if (data2[i].length === 39) {  // アドレスの場合
        innerTx[i] = sym.MosaicSupplyRevocationTransaction.create(
          undefined, //Deadline
          sym.Address.createFromRawAddress(data2[i]), //回収先                                                            
          new sym.Mosaic(
            new sym.MosaicId(mosaic_ID2),
            sym.UInt64.fromUint(Number(data3[i]))
          ),
          //sym.PlainMessage.create(message),
          networkType
        );
      } else {  // ネームスペースの場合
        namespaceId = new sym.NamespaceId(data2[i]);
        innerTx[i] = sym.MosaicSupplyRevocationTransaction.create(
          undefined, //Deadline
          namespaceId, //回収先                                
          new sym.Mosaic(
            new sym.MosaicId(mosaic_ID2),
            sym.UInt64.fromUint(Number(data3[i]))
          ),
          //sym.PlainMessage.create(message),
          networkType
        );
      }

    }

    const publicAccount = sym.PublicAccount.createFromPublicKey(
      window.SSS.activePublicKey,
      networkType
    );

    for (let i = 0; i < data2.length; i++) {
      innerTx[i] = innerTx[i].toAggregate(publicAccount)
    }

    const aggregateTx = sym.AggregateTransaction.createComplete(
      sym.Deadline.create(epochAdjustment),  //Deadline
      innerTx,
      networkType,
      [],
      /*sym.UInt64.fromUint(1000000*Number(maxfee2))          //最大手数料*/
    ).setMaxFeeForAggregate(100);

    console.log("aggregateTx====", aggregateTx)
    console.log("aggregateTx.maxFee======", parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000);

    const agg_fee = document.getElementById("fee_rev");    // aggregate 手数料表示
    agg_fee.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000} XYM　　　　</p>`

    window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録        
    window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
      console.log('signedTx', signedTx);
      txRepo.announce(signedTx);
    })

  }

}

//////////////////////////////////////////////////////////////////////////
//                   モザイク　リッチリスト
/////////////////////////////////////////////////////////////////////////

async function holder_list() {
  const page_num = document.getElementById('page_num_holder1').value;  // セレクトボックスから、Page No を取得
  const mosaic_ID = document.querySelector(".select_r").value;

  const mosaicInfo = await mosaicRepo.getMosaic(new sym.MosaicId(mosaic_ID)).toPromise(); // 可分性の情報を取得する 
  const div = mosaicInfo.divisibility; // 可分性

  const dom_holder = document.getElementById('holder_table');  // テーブルがある場合削除
  if (dom_holder !== null) { // null じゃなければ子ノードを全て削除  
    while (dom_holder.firstChild) {
      dom_holder.removeChild(dom_holder.firstChild);
    }
  }

  let xhr = new XMLHttpRequest();

  if (networkType === 104) { // Main Net
    xhr.open("GET", `${NODE}/accounts?mosaicId=${mosaic_ID}&orderBy=balance&order=desc&pageSize=100&pageNumber=${page_num}`, false);
  }
  if (networkType === 152) { // Test Net
    xhr.open("GET", `${NODE}/accounts?mosaicId=${mosaic_ID}&orderBy=balance&order=desc&pageSize=100&pageNumber=${page_num}`, false);
  }

  xhr.send(null);
  let data = JSON.parse(xhr.response);

  let data2 = [];
  let data3 = [];
  for (let j = 0; j < data.data.length; j++) {
    for (let i = 0; i < data.data[j].account.mosaics.length; i++) {
      if (data.data[j].account.mosaics[i].id === mosaic_ID) {
        data2.push(sym.Address.createFromEncoded(data.data[j].account.address).plain());
        data3.push(data.data[j].account.mosaics[i].amount / 10 ** div);
      }
    }
  }

  const dom_mosaic_rev = document.getElementById('mosaic_ID_rev');
  dom_mosaic_rev.innerHTML = `<big>< ${mosaic_ID} ></big>`;

  const dom_namespace_rev = document.getElementById('namespace_rev');
  let mosaicNames = await nsRepo.getMosaicsNames([new sym.MosaicId(mosaic_ID)]).toPromise(); // Namespaceの情報を取得する

  if ([mosaicNames][0][0].names.length !== 0) {
    dom_namespace_rev.innerHTML = `<big> ${[mosaicNames][0][0].names[0].name} </big>`;
  } else {
    dom_namespace_rev.innerHTML = ``;
  }

  var body = document.getElementById("holder_table");

  var tbl = document.createElement("table");
  var colgroup_r = document.createElement("colgroup");

  // 各列の幅をパーセンテージで設定
  var colWidths_r = ["10%", "60%", "30%"];
  colWidths_r.forEach(function (width) {
    var col_r = document.createElement("col");
    col_r.style.width = width;
    colgroup_r.appendChild(col_r);
  });

  tbl.appendChild(colgroup_r);

  var tblBody = document.createElement("tbody");

  for (var i = -1; i < data.data.length; i++) {  // データの数だけ繰り返す
    var row = document.createElement("tr");

    for (var j = 0; j < 3; j++) {
      var cell = document.createElement("td");
      var cellText;
      switch (j) {
        case 0:   // No
          if (i === -1) {
            cellText = document.createTextNode("No");
            cell.style.textAlign = "center"; // 中央に設定
          } else {
            cellText = document.createTextNode(i + 1 + (100 * (page_num - 1))); // Noを追加
            cell.style.textAlign = "right"; // 右寄せに設定    
          }
          cell.appendChild(cellText);
          break;
        case 1:   //アドレス
          if (i === -1) {
            cellText = document.createTextNode("アドレス");
            cell.appendChild(cellText);
          } else {
            const address = data2[i];
            const link = document.createElement('a');
            link.href = `${EXPLORER}/accounts/${address}`;
            link.target = '_blank';
            link.textContent = address;
            link.classList.add("address"); // クラスを追加
            cell.appendChild(link); // アドレスをリンクとしてセルに追加
          }
          cell.style.textAlign = "center"; // 中央に設定
          break;
        case 2:   //数量
          if (i === -1) {
            cellText = document.createTextNode("保有量");
            cell.style.textAlign = "center"; // 中央に設定
          } else {
            let balance_r = data3[i];
            balance_r = balance_r.toLocaleString(undefined, {   // ロケールを適用
              minimumFractionDigits: div,
              maximumFractionDigits: div,
            });
            cellText = document.createTextNode(balance_r);　// 数量をセルに追加 
            cell.style.textAlign = "right"; // 右寄せに設定
          }
          cell.appendChild(cellText);
          break;
      }
      row.appendChild(cell);
    }
    tblBody.appendChild(row);
  }

  tbl.appendChild(tblBody);
  body.appendChild(tbl);
  tbl.setAttribute("border", "1");
}



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Namespace 作成 //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function Onclick_Namespace() {

  const Namespace = document.getElementById("Namespace").value;
  const duration = document.getElementById("Duration2").value;
  const maxFee = document.getElementById("re_maxFee_n").value;


  const namespaceId = new sym.NamespaceId(Namespace.toLowerCase());
  const ns_check = await nsRepo.getNamespace(namespaceId)
    .toPromise()
    .catch(() => Swal.fire('New NameSpace', ""));          // ネームスペース　有無のチェック
  console.log("%cns_check", "color: red", ns_check);
  if (ns_check.active === true) {   // ネームスペースが存在する場合

    console.log("ネームスペースが存在する場合")
    if (ns_check.ownerAddress.address !== undefined) {
      if (ns_check.ownerAddress.address !== window.SSS.activeAddress) {
        Swal.fire('この NameSpace は別のオーナーが使用しています!!', "");
        return;
      } else {
        Swal.fire('Namespace を更新します', "");
      }
    }
  }

  if (ns_check === true) { // ネームスペースがないので作成可能
    console.log("%cNew NameSpace", "color: red");
  }

  if (Number(duration) < 86400 || Number(duration) > 5256000) {
    Swal.fire('有効期限が無効です!!', "");
    return;
  }

  console.log("Namespace=", Namespace);
  console.log("Duration=", duration);
  console.log("maxFee===", maxFee);

  // ルートネームスペースをレンタルする
  const tx = sym.NamespaceRegistrationTransaction.createRootNamespace(
    sym.Deadline.create(epochAdjustment),
    Namespace,
    sym.UInt64.fromUint(duration),
    networkType,
    sym.UInt64.fromUint(1000000 * Number(maxFee))
  )

  window.SSS.setTransaction(tx);               // SSSにトランザクションを登録        
  window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
    console.log('signedTx', signedTx);
    txRepo.announce(signedTx);
  })

}


//  サブネームスペースを取得する /////////////////////////////////////////////////////////////
function Onclick_subNamespace() {

  const rootNamespace = document.getElementById("rootNamespace").value;
  const subNamespace = document.getElementById("subNamespace").value;
  const maxFee = document.getElementById("re_maxFee_sn").value;

  console.log("rootNamespace=", rootNamespace);
  console.log("subNamespace=", subNamespace);


  const tx = sym.NamespaceRegistrationTransaction.createSubNamespace(
    sym.Deadline.create(epochAdjustment),
    subNamespace,
    rootNamespace,
    networkType,
    sym.UInt64.fromUint(1000000 * Number(maxFee))
  )

  window.SSS.setTransaction(tx);               // SSSにトランザクションを登録        
  window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
    console.log('signedTx', signedTx);
    txRepo.announce(signedTx);
  })

}


///////////////////////////////////////////////////////////////////////////////
//                 エイリアスリンク　　
///////////////////////////////////////////////////////////////////////////////

function alias_Link() {

  const Namespace = document.querySelector(".select1").value;
  const alias_type = document.getElementById("alias_type").value;
  const Address_Mosaic = document.getElementById("Link_Address").value;
  //const Mosaic_ID = document.getElementById("Link_Mosaic_ID").value;
  const maxFee = document.getElementById("re_maxFee_L").value;


  console.log("Namespace=", Namespace);
  console.log("alias_type=", alias_type);
  console.log("Address_Mosaic=", Address_Mosaic)
  console.log("maxFee=", maxFee);
  console.log("alias_type=", alias_type);

  //アカウントへリンク  /////////////////////////////
  if (alias_type === "0") {
    const namespaceId = new sym.NamespaceId(Namespace);
    const address = sym.Address.createFromRawAddress(Address_Mosaic);

    tx = sym.AliasTransaction.createForAddress(
      sym.Deadline.create(epochAdjustment),
      sym.AliasAction.Link,
      namespaceId,
      address,
      networkType,
      sym.UInt64.fromUint(1000000 * Number(maxFee))
    )

    window.SSS.setTransaction(tx);               // SSSにトランザクションを登録        
    window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
      console.log('signedTx', signedTx);
      txRepo.announce(signedTx);
    })
  }

  // モザイクへリンク  /////////////////////////////
  if (alias_type === "1") {
    const namespaceId = new sym.NamespaceId(Namespace);
    const mosaicId = new sym.MosaicId(Address_Mosaic);

    tx = sym.AliasTransaction.createForMosaic(
      sym.Deadline.create(epochAdjustment),
      sym.AliasAction.Link,
      namespaceId,
      mosaicId,
      networkType,
      sym.UInt64.fromUint(1000000 * Number(maxFee))
    )

    window.SSS.setTransaction(tx);               // SSSにトランザクションを登録        
    window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
      console.log('signedTx', signedTx);
      txRepo.announce(signedTx);
    })
  }

  //アカウントからリンク解除  ////////////////////////
  if (alias_type === "2") {
    const namespaceId = new sym.NamespaceId(Namespace);
    const address = sym.Address.createFromRawAddress(Address_Mosaic);

    tx = sym.AliasTransaction.createForAddress(
      sym.Deadline.create(epochAdjustment),
      sym.AliasAction.Unlink,
      namespaceId,
      address,
      networkType,
      sym.UInt64.fromUint(1000000 * Number(maxFee))
    )

    window.SSS.setTransaction(tx);               // SSSにトランザクションを登録        
    window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
      console.log('signedTx', signedTx);
      txRepo.announce(signedTx);
    })
  }

  // モザイクからリンク解除 ////////////////////////////
  if (alias_type === "3") {
    const namespaceId = new sym.NamespaceId(Namespace);
    const mosaicId = new sym.MosaicId(Address_Mosaic);

    tx = sym.AliasTransaction.createForMosaic(
      sym.Deadline.create(epochAdjustment),
      sym.AliasAction.Unlink,
      namespaceId,
      mosaicId,
      networkType,
      sym.UInt64.fromUint(1000000 * Number(maxFee))
    )

    window.SSS.setTransaction(tx);               // SSSにトランザクションを登録        
    window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
      console.log('signedTx', signedTx);
      txRepo.announce(signedTx);
    })
  }
}

/////////////////////////////////////////////////////////////////////////////////
//    Metadata 登録
/////////////////////////////////////////////////////////////////////////////////

async function Metadata() {

  const Meta_type = document.getElementById("Meta_type").value;   // Metadata登録先
  const Meta_key = document.querySelector(".select_Meta").value;     // Metadata Key
  //const Meta_to = document.querySelector(".Meta_to").value;       // Address / MosaicID / Namespace
  const mosaicID = document.querySelector(".select_mo").value;   //  MosaicID
  const Namespace = document.querySelector(".select_N").value;  // Namespace
  let Meta_value = document.getElementById("Meta_value").value; // value値
  //const maxFee = document.getElementById("re_maxFee_Meta").value; //  maxFee値
  const address = sym.Address.createFromRawAddress(window.SSS.activeAddress);



  console.log("Meta_type===", Meta_type);
  // console.log("Meta_address===", Meta_address1);
  console.log("From_address===", address);
  console.log("Meta_key===", Meta_key);
  console.log("Meta_value===", Meta_value);
  console.log("mosaicID===", mosaicID);
  console.log("Namespace===", Namespace);



  console.log("%cvalue UTF-8 バイト数=", "color: red", byteLengthUTF8(Meta_value));

  if (Meta_type === "-1") {
    Swal.fire(`タイプを選択してください！`);
    return;
  }

  if (byteLengthUTF8(Meta_value) > 1024) {

    Swal.fire(`Valueのサイズが${byteLengthUTF8(Meta_value)}バイトです!!

	    1024バイト 以下にしてください。`);
    return;

  }

  const publicAccount = sym.PublicAccount.createFromPublicKey(                //アカウントの公開鍵を取得
    window.SSS.activePublicKey,
    networkType
  );

  // ポップアップを表示して入力を求める関数
  function showPrompt(message) {
    return prompt(message);
  }

  if (Meta_key === "") {

    // メインの処理
    function main() {
      // ポップアップを表示して入力を求める
      const userInput = showPrompt("メタデータキーを作成します。任意のキーワードを入力してください:");

      // 入力された値を返す
      return userInput;
    }

    // メインの処理を実行
    const key_word = main();

    key = sym.KeyGenerator.generateUInt64Key(key_word); // キーワードからメタデータキーを作成
    //key = sym.KeyGenerator.generateUInt64Key(Math.random().toString(36).slice(2)); //適当な文字列からメタデータキーを生成
  } else
    if (Meta_key === "Pointy") {
      key = new sym.MosaicId("8CE27C5EFA9DB1DF"); // 16進数　→ Uint64に変換
      key = key.id;
      Meta_value = `{"cardName":"${Meta_value}"}`;
    } else
      if (Meta_key !== undefined) {
        key = new sym.MosaicId(Meta_key); // 16進数　→ Uint64に変換
        key = key.id;     
      }
  
      value = Meta_value;


  if (Meta_type === "0") { // アカウントに登録 //////////////////////////   
    const Meta_address = document.getElementById("Meta_address").value;   // 登録先アドレス
    let Meta_address1;
    if (Meta_address.length === 0 || Meta_address === window.SSS.activeAddress) {   // 登録先がアクティブアドレスの場合
      Meta_address1 = address;

      tx = await metaService
        .createAccountMetadataTransaction(
          undefined,
          networkType,
          Meta_address1, //メタデータ記録先アドレス
          key,
          value, //Key-Value値
          address //メタデータ作成者アドレス
        )
        .toPromise();

      aggregateTx = sym.AggregateTransaction.createComplete(
        sym.Deadline.create(epochAdjustment),
        [tx.toAggregate(publicAccount)],
        networkType,
        []
        //sym.UInt64.fromUint(1000000*Number(maxFee))
      ).setMaxFeeForAggregate(100);

      console.log("aggregateTx==========", aggregateTx);

      const Meta_fee = document.getElementById("Meta_fee1");    // Meta 手数料表示
      Meta_fee.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000} XYM　　　　　　　　　　　　</p>`

      window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録        
      window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
        console.log('signedTx', signedTx);
        txRepo.announce(signedTx);
      })

    } else
      if (Meta_address.length === 39) {
        if (networkType === 152) {
          if (Meta_address.charAt(0) !== "T") {
            Swal.fire('Address Error !!', `Tから始まるアドレスを入力してください`);
            return;
          }
        }
        if (networkType === 104) {
          if (Meta_address.charAt(0) !== "N") {
            Swal.fire('Address Error !!', `Nから始まるアドレスを入力してください`);
            return;
          }
        }

        const account_check = await accountRepo.getAccountInfo(sym.Address.createFromRawAddress(Meta_address))
          .toPromise()
          .catch(() => Swal.fire('Address Error !!', `ネットワークに認識されていないアドレスです`));          // アドレス　有無のチェック
        console.log("%caccount_check", "color: red", account_check)

        Meta_address1 = sym.Address.createFromRawAddress(Meta_address);

        tx = await metaService
          .createAccountMetadataTransaction(
            undefined,
            networkType,
            Meta_address1, //メタデータ記録先アドレス
            key,
            value, //Key-Value値
            address //メタデータ作成者アドレス
          )
          .toPromise();

        aggregateTx = sym.AggregateTransaction.createBonded(
          sym.Deadline.create(epochAdjustment, 48),  //Deadline
          [tx.toAggregate(publicAccount)],
          networkType,
          []
        ).setMaxFeeForAggregate(100, 1);

        console.log("aggregateTx====", aggregateTx)
        console.log("aggregateTx.maxFee======", parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000);

        const Meta_fee = document.getElementById("Meta_fee1");    // Meta 手数料表示
        Meta_fee.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000} XYM　　　　　　　　　　　　</p>`

        window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録
        window.SSS.requestSign().then((signedAggregateTx) => {// アグリゲートTxに署名

          console.log("signedAggregateTx===", signedAggregateTx);

          const hashLockTx = sym.HashLockTransaction.create(  //  ハッシュロック
            sym.Deadline.create(epochAdjustment),
            new sym.Mosaic(
              new sym.NamespaceId("symbol.xym"),
              sym.UInt64.fromUint(10 * 1000000)
            ), //固定値:10XYM
            sym.UInt64.fromUint(5760),
            signedAggregateTx,
            networkType
          ).setMaxFee(100);

          console.log("hashLockTx===", hashLockTx);

          setTimeout(() => {
            window.SSS.setTransaction(hashLockTx);               // SSSにトランザクションを登録
            window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
              console.log('signedTx', signedTx);
              txRepo.announce(signedTx);
            })
          }, 1000);

          wsEndpoint = NODE.replace('http', 'ws') + "/ws";
          listener = new sym.Listener(wsEndpoint, nsRepo, WebSocket);

          listener.open().then(() => {

            //Websocketが切断される事なく、常時監視するために、ブロック生成(約30秒毎)の検知を行う

            // ブロック生成の検知  /////////////////////////////////////////////////////////////////
            listener.newBlock()
              .subscribe(block => {
                //  console.log(block);    //ブロック生成 　表示OFF
              });

            // 承認トランザクションの検知  //////////////////////////////////////////////////////////
            listener.confirmed(sym.Address.createFromRawAddress(window.SSS.activeAddress))
              .subscribe(tx => {
                //受信後の処理を記述
                console.log(tx);

                setTimeout(() => {
                  txRepo.announceAggregateBonded(signedAggregateTx);   // アグボンアナウンス
                }, 500);
              });
          });

        })

      } else {
        Swal.fire('Address Error !!', `アドレスを確認してください！`)
        return
      }
  }
  if (Meta_type === "1") { // モザイクに登録 ///////////////////////////
    const mosaicId = new sym.MosaicId(mosaicID);
    const mosaicInfo = await mosaicRepo.getMosaic(mosaicId).toPromise();

    tx = await metaService
      .createMosaicMetadataTransaction(
        undefined,
        networkType,
        mosaicInfo.ownerAddress, //モザイク作成者アドレス
        mosaicId,
        key,
        value, //Key-Value値
        address
      )
      .toPromise();

    aggregateTx = sym.AggregateTransaction.createComplete(
      sym.Deadline.create(epochAdjustment),
      [tx.toAggregate(publicAccount)],
      networkType,
      []
      // sym.UInt64.fromUint(1000000*Number(maxFee))
    ).setMaxFeeForAggregate(100);

    const Meta_fee = document.getElementById("Meta_fee1");    // Meta 手数料表示
    Meta_fee.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000} XYM　　　　　　　　　　　　</p>`

    window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録        
    window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
      console.log('signedTx', signedTx);
      txRepo.announce(signedTx);
    })

  }
  if (Meta_type === "2") { // ネームスペースに登録 /////////////////////////
    const namespaceId = new sym.NamespaceId(Namespace);
    console.log("namespaceId===", namespaceId);
    const namespaceInfo = await nsRepo.getNamespace(namespaceId).toPromise();

    tx = await metaService
      .createNamespaceMetadataTransaction(
        undefined,
        networkType,
        namespaceInfo.ownerAddress, //ネームスペースの作成者アドレス
        namespaceId,
        key,
        value, //Key-Value値
        address //メタデータの登録者
      )
      .toPromise();

    aggregateTx = sym.AggregateTransaction.createComplete(
      sym.Deadline.create(epochAdjustment),
      [tx.toAggregate(publicAccount)],
      networkType,
      []
      //sym.UInt64.fromUint(1000000*Number(maxFee))
    ).setMaxFeeForAggregate(100);

    const Meta_fee = document.getElementById("Meta_fee1");    // Meta 手数料表示
    Meta_fee.innerHTML = `<p style="font-size:20px;color:blue;">手数料　 ${parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000} XYM　　　　　　　　　　　　</p>`

    window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録        
    window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
      console.log('signedTx', signedTx);
      txRepo.announce(signedTx);
    })
  }

}

/////////////////////////////////////////////////////////
//    文字列のバイト長(UTF-8)を得る
/////////////////////////////////////////////////////////


/*function bytelength(s) {
  return encodeURI(s).replace(/%../g, "*").length;
}*/

function byteLengthUTF8(s) {
  return new TextEncoder().encode(s).length;
}


/////////////////////////////////////////////////////////
//    16進数文字列かどうか判別
/////////////////////////////////////////////////////////
const rAtZ = /[A-Z]/, r0t9 = /[0-9]/;
function isHexadecimal(str) {
  //var hexRegex = /^[0-9A-F]+$/;
  //return hexRegex.test(str);
  return rAtZ.test(str) && r0t9.test(str);
}


//////////////////////////////////////////////////////////////////////////////////
//     ネームスペース　手数料計算
//////////////////////////////////////////////////////////////////////////////////


async function feeCalc() {
  const rentalBlock = document.getElementById('Duration2').value;  // 有効期限を取得  //
  console.log("レンタルブロック: " + rentalBlock);
  rentalFees = await nwRepo.getRentalFees().toPromise();
  rootNsperBlock = rentalFees.effectiveRootNamespaceRentalFeePerBlock.compact();
  rootNsRenatalFeeTotal = rentalBlock * rootNsperBlock;
  rootNsRenatalFeeTotal = rootNsRenatalFeeTotal / 1000000;
  console.log("rentalBlock:" + rentalBlock);
  console.log("rootNsRenatalFeeTotal:" + rootNsRenatalFeeTotal);
  console.log("ネームスペース作成手数料: " + rootNsRenatalFeeTotal);

  const ns_fee1 = document.getElementById("ns_fee");
  ns_fee1.innerHTML = `<p style="font-size:20px;color:blue;">レンタル手数料　 ${rootNsRenatalFeeTotal} XYM</p>`
  return;

}


//////////////////////////////////////////////////////////////////////////////////
//     モザイク有効期限計算
//////////////////////////////////////////////////////////////////////////////////

function ex_date1() {
  const rentalBlock = document.getElementById('Duration1').value;  // 有効期限を取得  //
  console.log("レンタルブロック: " + rentalBlock);
  chainRepo.getChainInfo().subscribe(chain => {  //////////   

    rxjs.zip(
      blockRepo1.getBlockByHeight(chain.height),
      blockRepo1.getBlockByHeight(chain.latestFinalizedBlock.height),
    ).subscribe(zip => {

      if (rentalBlock === "0") {
        t = "無期限 ∞";
      } else {
        t = dispTimeStamp(zip[0].timestamp.compact() + (rentalBlock * 30000), epochAdjustment)
      }
      console.log("有効期限=: ", t);

      const ex_date1 = document.getElementById("ex_date1");
      ex_date1.innerHTML = `<p style="font-size:20px;color:blue">　　有効期限　${t}</p>`

    })
  })
  return;
}

//////////////////////////////////////////////////////////////////////////////////
//     ネームスペース有効期限計算
//////////////////////////////////////////////////////////////////////////////////

function ex_date2() {
  const rentalBlock = document.getElementById('Duration2').value;    // 有効期限を取得  //

  console.log("レンタルブロック: " + rentalBlock);
  chainRepo.getChainInfo().subscribe(chain => {  //////////   

    rxjs.zip(
      blockRepo1.getBlockByHeight(chain.height),
      blockRepo1.getBlockByHeight(chain.latestFinalizedBlock.height),
    ).subscribe(zip => {

      t = dispTimeStamp(zip[0].timestamp.compact() + (rentalBlock * 30000), epochAdjustment)
      console.log("有効期限=: ", t);

      const ex_date2 = document.getElementById("ex_date2");
      ex_date2.innerHTML = `<p style="font-size:20px;color:blue">　　　　有効期限　 <br>　　${t}</p>`

    })
  })
  return;
}

//////////////////////////////////////////////////////////////////////////////////
//     Metadata Key　セレクトボックス
//////////////////////////////////////////////////////////////////////////////////

function MetaKey_select() {
  const Meta_type = document.getElementById('Meta_type').value;    // Metadata Typeを取得  //
  const dom_address = document.getElementById("meta_address");
  const dom_mosaic = document.getElementById("meta_mosaic");
  const dom_namespace = document.getElementById("meta_namespace");


  if (Meta_type === "0") {    // Account の時は　アドレスを表示
    dom_mosaic.style.display = 'none';
    dom_namespace.style.display = 'none';
    dom_address.innerHTML = `<div class="Form-Item_Meta">
    <p class="Form-Item-Label"><span class="Form-Item-Label-Required_Meta">Address</span></br></p>
    <input type="text" class="Form-Item-Input_Meta" id="Meta_address" placeholder="${window.SSS.activeAddress}" />
    </div>`;
    //`<div class="meta_address"><small>${window.SSS.activeAddress}　　　　　　　　　　　　　　　　　　　　　　　　　　　　　</small></div>`
  }
  if (Meta_type === "1") {    // Mosaic
    dom_address.innerHTML = "";
    dom_mosaic.style.display = 'flex';
    dom_namespace.style.display = 'none';
  }
  if (Meta_type === "2") {    // Namespace
    dom_address.innerHTML = "";
    dom_mosaic.style.display = 'none';
    dom_namespace.style.display = 'flex';
  }
  if (Meta_type === "-1") {   // select 
    dom_address.innerHTML = "";
    dom_mosaic.style.display = 'none';
    dom_namespace.style.display = 'none';
  }

}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  nftData を対象のタグに挿入する //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function appendImg(src, dom_NFT) {          //   取得した画像をimgタグに挿入するfunctionを定義

  (tag = document.createElement('img')).src = src;
  tag.width = 300;
  tag.className = "mosaic_img";
  //document.getElementsByTagName('body')[0].appendChild(tag);
  dom_NFT.appendChild(tag);
}
//////////////////////////////////////////////////////////////////////////////

function appendAudio(src, dom_NFT) {     // Audio

  (tag = document.createElement('source')).src = src;
  // tag.width = 200;
  tag.style.textAlign = 'center';
  //document.getElementsByTagName('body')[0].appendChild(tag);
  dom_NFT.appendChild(tag);
  $('source').wrap('<audio controls>');
}
/////////////////////////////////////////////////////////////////////////////

function appendVideo(src, dom_NFT) {      // Video

  (tag = document.createElement('source')).src = src;
  tag.width = 600;
  //document.getElementsByTagName('body')[0].appendChild(tag);
  dom_NFT.appendChild(tag);
  $('source').wrap('<video controls>');
}
/////////////////////////////////////////////////////////////////////////////

function appendPdf(src, dom_NFT) {      // Pdf

  (tag = document.createElement('embed')).src = src;
  tag.width = 600;
  tag.height = 600;
  tag.className = "mosaic_img";
  //document.getElementsByTagName('body')[0].appendChild(tag);
  dom_NFT.appendChild(tag);
}
/////////////////////////////////////////////////////////////////////////////

function appendHtml(src, dom_NFT) {      // html

  (tag = document.createElement('iframe')).src = src;
  tag.width = 600;
  tag.height = 700;
  tag.className = "mosaic_img";
  //document.getElementsByTagName('body')[0].appendChild(tag);
  dom_NFT.appendChild(tag);
}
/////////////////////////////////////////////////////////////////////////////

function append_3D(src, dom_NFT, mo_id) {      // 3D

  src = `https://nftdrive-ex.net/3dload.php?address=${mo_id}`;
  (tag = document.createElement('iframe')).src = src;
  tag.width = 300;
  tag.height = 300;
  tag.className = "mosaic_img";
  //document.getElementsByTagName('body')[0].appendChild(tag);
  dom_NFT.appendChild(tag);
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  NFT (ジムモン) をデコードして表示する //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function xym_mon(mosaic, dom_NFT, pubkey) {

  const symbolService = new metal.SymbolService({ node_url: NODE });
  const metalService = new metal.MetalService(symbolService);

  mosaicRepo.getMosaic(mosaic.id)
    .subscribe(async mo => {

      let meta = await metaRepo.search({ targetId: mo.id, scopedMetadataKey: "F1974BA6F6CE5A63" }).toPromise();
      //console.log("meta ========  ========  ======",meta)
      if (meta.data.length !== 0) {
        let metadata = JSON.parse(meta.data[0].metadataEntry.value)
        console.log("XYMMON メタデータ＝＝＝＝＝＝＝＝＝＝＝＝＝", metadata);

        let result = await metalService.fetchByMetalId(metadata.MetalID);

        if (result !== undefined) {
          let uint8Array = result.payload // Uint8Arrayを取得
          let base64 = uint8ArrayToBase64(uint8Array); // Base64に変換
          let newSrc = 'data:image/png;base64,' + base64;

          dom_NFT.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_1" href="https://xym-monster.netlify.app/list?publicKey=${pubkey}" target="_blank">XYM Monster</a></div><br>`
          appendImg(newSrc, dom_NFT);
        }
      }
    });

}

function uint8ArrayToBase64(bytes) {  // uint8Array を Base64文字列に変換
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  NFT (NFTDrive) をデコードして表示する //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var nglist = [];
fetch('https://nftdrive-explorer.info/black_list/',)
  .then((response) => {
    return response.text().then(function (text) {
      nglist = JSON.parse(text);
      console.log(text);
    });
  });


function nftdrive(mosaic, dom_NFT) {
  mosaicRepo.getMosaic(mosaic.id)
    .pipe(
      op.filter(mo => {
        return !nglist.find(elem => elem[1] === mo.id.toHex())
      })
    )
    .subscribe(async mo => {

      const ownerAddress = mo.ownerAddress;
      const preTxes = await txRepo.search({
        type: [
          sym.TransactionType.TRANSFER,
        ],
        address: ownerAddress, group: sym.TransactionGroup.Confirmed, pageSize: 10, order: sym.Order.Asc
      }).toPromise();

      if (preTxes.data.find(tx => {
        if (tx.message === undefined) {
          return false;
        } else if (tx.message.payload === "Please note that this mosaic is an NFT.") {
          needSample = false;
          return true;
        } else {
          return false;
        }
      })) {

        const tx = await txRepo.search({
          type: [
            sym.TransactionType.AGGREGATE_COMPLETE,
            sym.TransactionType.AGGREGATE_BONDED,
          ],
          address: ownerAddress, group: sym.TransactionGroup.Confirmed, pageSize: 100
        }).toPromise();

        const aggTxes = [];
        for (let idx = 0; idx < tx.data.length; idx++) {
          const aggTx = await txRepo.getTransaction(tx.data[idx].transactionInfo.hash, sym.TransactionGroup.Confirmed).toPromise();

          if (aggTx.innerTransactions.find(elem => elem.type === 16724)) {
            aggTxes.push(aggTx);
          }
        }

        const sotedAggTxes = aggTxes.sort(function (a, b) {

          if (Number(a.innerTransactions[0].message.payload) > Number(b.innerTransactions[0].message.payload)) { return 1; } else { return -1; }
        })

        let nftData = "";
        let header = 15;
        for (let aggTx of sotedAggTxes) {

          for (let idx = 0 + header; idx < aggTx.innerTransactions.length; idx++) {
            nftData += aggTx.innerTransactions[idx].message.payload;
          }
          header = 1;
        }

        //console.log(nftData);
        if (nftData.indexOf("data:image/") >= 0) {
          dom_NFT.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_2" href="https://nftdrive-explorer.info/chart.html?net=main&mosaic=${mosaic.id.toHex()}" target="_blank">NFTDrive</a></div><br>`
          appendImg(nftData, dom_NFT);
        }
        if (nftData.indexOf("data:audio/") === 0) {
          dom_NFT.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_2" href="https://nftdrive-explorer.info/chart.html?net=main&mosaic=${mosaic.id.toHex()}" target="_blank">NFTDrive</a></div><br>`
          appendAudio(nftData, dom_NFT);
        }
        if (nftData.indexOf("data:video/") === 0) {
          dom_NFT.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_2" href="https://nftdrive-explorer.info/chart.html?net=main&mosaic=${mosaic.id.toHex()}" target="_blank">NFTDrive</a></div><br>`
          appendVideo(nftData, dom_NFT);
        }
        if (nftData.indexOf("data:application/pdf") === 0) {
          dom_NFT.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_2" href="https://nftdrive-explorer.info/chart.html?net=main&mosaic=${mosaic.id.toHex()}" target="_blank">NFTDrive</a></div><br>`
          appendPdf(nftData, dom_NFT);
        }
        if (nftData.indexOf("data:text/html") === 0) {
          dom_NFT.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_2" href="https://nftdrive-explorer.info/chart.html?net=main&mosaic=${mosaic.id.toHex()}" target="_blank">NFTDrive</a></div><br>`
          appendHtml(nftData, dom_NFT);
        }
        if (nftData.indexOf("data:application/octet-stream") === 0) {
          dom_NFT.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_2" href="https://nftdrive-explorer.info/chart.html?net=main&mosaic=${mosaic.id.toHex()}" target="_blank">NFTDrive</a></div><br>`
          append_3D(nftData, dom_NFT, mo.id.toHex());
        }
      }
    });
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  NFT (COMSA) をデコードして表示する //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Buffer = require("/node_modules/buffer").Buffer;

function comsa(mosaic, dom_NFT) {

  mosaicRepo.getMosaic(mosaic.id)
    .subscribe(async mo => {

      let meta = await metaRepo.search({
        targetId: mo.id,
        metadataType: sym.MetadataType.Mosaic,
        pageSize: 100
      }).toPromise();

      let comsaHeader = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'DA030AA7795EBE75');
      if (comsaHeader !== undefined) {

        let headerJSON = JSON.parse(comsaHeader.metadataEntry.value);
        console.log("ヘッダー情報＝＝＝＝", headerJSON);
        let aggTxes1 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'D77BFE313AF3EF1F');
        let aggTxes2 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'AACFBE3CC93EABF3');
        let aggTxes3 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'A0B069B710B3754C');
        let aggTxes4 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'D75B016AA9FAC056');
        let aggTxes5 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'BABD9C10F590F0F3');
        let aggTxes6 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'D4B5933FA2FD62E7');
        let aggTxes7 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'FA60A37C56457F1A');
        let aggTxes8 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'FEDD372E157E9CF0');
        let aggTxes9 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'C9384119AD73CF95');
        let aggTxes10 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'EADE00D8D78AC0BD');
        let aggTxes11 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'F6578214308E7990');

        let aggTxes12 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'CE7226A968287482');
        let aggTxes13 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'C2811F3B6F49C568');
        let aggTxes14 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === '886A58DBE955A788');
        let aggTxes15 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === '87300B99E5B10E2C');
        let aggTxes16 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'EE553D7141B98753');
        let aggTxes17 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'B3084C09176CA990');


        let aggTxes = JSON.parse(aggTxes1.metadataEntry.value);

        if (aggTxes2 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes2.metadataEntry.value));
        }


        if (aggTxes3 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes3.metadataEntry.value));
        }

        if (aggTxes4 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes4.metadataEntry.value));
        }

        if (aggTxes5 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes5.metadataEntry.value));
        }

        if (aggTxes6 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes6.metadataEntry.value));
        }

        if (aggTxes7 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes7.metadataEntry.value));
        }

        if (aggTxes8 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes8.metadataEntry.value));
        }

        if (aggTxes9 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes9.metadataEntry.value));
        }

        if (aggTxes10 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes10.metadataEntry.value));
        }

        if (aggTxes11 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes11.metadataEntry.value));
        }

        if (aggTxes12 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes12.metadataEntry.value));
        }

        if (aggTxes13 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes13.metadataEntry.value));
        }

        if (aggTxes14 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes14.metadataEntry.value));
        }

        if (aggTxes15 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes15.metadataEntry.value));
        }

        if (aggTxes16 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes16.metadataEntry.value));
        }

        if (aggTxes17 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes17.metadataEntry.value));
        }


        if (headerJSON.version === "comsa-nft-1.0") {  // バージョン 1.0 の場合 //////////////////////////////
          let nftData = "";
          let dataType = "data:" + headerJSON.mime_type + ";base64,";
          for (let idx = 0; idx < aggTxes.length; idx++) {
            const aggTx = await txRepo.getTransaction(aggTxes[idx], sym.TransactionGroup.Confirmed).toPromise();
            for (let idx2 = 1; idx2 < aggTx.innerTransactions.length; idx2++) {
              let payload = aggTx.innerTransactions[idx2].message.payload;

              nftData += payload.slice(6);
            }
          }

          dom_NFT.innerHTML = `<br><div style="text-align: center;color: yellow;"><a class="btn-style-link_3" href="https://explorer.comsa.io/mosaic/${mosaic.id.toHex()}" target="_blank">COMSA < UNIQUE ></a></div><br>`

          if (dataType.indexOf("data:image/") === 0) {
            appendImg(dataType + nftData, dom_NFT);
          }
          if (dataType.indexOf("data:audio/") === 0) {
            appendAudio(dataType + nftData, dom_NFT);
          }
          if (dataType.indexOf("data:video/") === 0) {
            appendVideo(dataType + nftData, dom_NFT);
          }
        }

        if (headerJSON.version === "comsa-nft-1.1") {  //  バージョン 1.1 の場合 //////////////////////////////
          let nftData = "";
          let dataType = "data:" + headerJSON.mime_type + ";base64,";
          for (aggTx of aggTxes) {

            const data = { "transactionIds": [aggTx] }
            const res = await fetch(nodeRepo.url + "/transactions/confirmed", {
              headers: {
                "Content-Type": "application/json;charset=utf-8"
              },
              method: "POST",
              body: JSON.stringify(data)
            });
            const json = await res.json();
            const innerTxes = json[0].transaction.transactions;
            let isSkip = true;
            for (innerTx of innerTxes) {
              if (isSkip) {
                isSkip = false;
                continue;
              }
              nftData += innerTx.transaction.message;
              //console.log(innerTx.transaction.message);
            }
          }

          dom_NFT.innerHTML = `<br><div style="text-align: center;color: yellow;"><a class="btn-style-link_3" href="https://explorer.comsa.io/mosaic/${mosaic.id.toHex()}" target="_blank">COMSA < UNIQUE ></a></div><br>`


          if (dataType.indexOf("data:image/") === 0) {
            appendImg(dataType + Buffer.from(nftData, "hex").toString("base64"), dom_NFT);
          }
          if (dataType.indexOf("data:audio/") === 0) {
            appendAudio(dataType + Buffer.from(nftData, "hex").toString("base64"), dom_NFT);
          }
          if (dataType.indexOf("data:video/") === 0) {
            appendVideo(dataType + Buffer.from(nftData, "hex").toString("base64"), dom_NFT);
          }
        }


      }
    });

}



///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  NCFT BUNDLE (COMSA) をデコードして表示する //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


function comsaNCFT(mosaic, dom_NFT) {

  mosaicRepo.getMosaic(mosaic.id)
    .subscribe(async mo => {
      let meta = await metaRepo.search({
        targetId: mo.id,
        metadataType: sym.MetadataType.Mosaic,
        pageSize: 100
      }).toPromise();

      let comsaNcftHeader = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === '8E0823CEF8A40075');
      if (comsaNcftHeader !== undefined) {
        needSample = false;
        let headerJSON = JSON.parse(comsaNcftHeader.metadataEntry.value);
        let aggTxes1 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'D77BFE313AF3EF1F');
        let aggTxes2 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'AACFBE3CC93EABF3');
        let aggTxes3 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'A0B069B710B3754C');
        let aggTxes4 = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === 'D75B016AA9FAC056');

        let aggTxes = JSON.parse(aggTxes1.metadataEntry.value);

        if (aggTxes2 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes2.metadataEntry.value));
        }

        if (aggTxes3 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes3.metadataEntry.value));
        }

        if (aggTxes4 !== undefined) {
          aggTxes = aggTxes.concat(JSON.parse(aggTxes4.metadataEntry.value));
        }

        let nftData = "";
        let dataType = "data:" + headerJSON.mime_type + ";base64,";
        for (aggTx of aggTxes) {

          const data = { "transactionIds": [aggTx] }
          const res = await fetch(nodeRepo.url + "/transactions/confirmed", {
            headers: {
              "Content-Type": "application/json;charset=utf-8"
            },
            method: "POST",
            body: JSON.stringify(data)
          });
          const json = await res.json();
          const innerTxes = json[0].transaction.transactions;
          let isSkip = true;
          for (innerTx of innerTxes) {
            if (isSkip) {
              isSkip = false;
              continue;
            }
            nftData += innerTx.transaction.message;
          }
        }

        dom_NFT.innerHTML = `<br><div style="text-align: center"><a class="btn-style-link_4" href="https://explorer.comsa.io/mosaic/${mosaic.id.toHex()}" target="_blank">COMSA < BUNDLE ></a></div><br>`
        //imgtarget++;
        if (dataType.indexOf("data:image/") === 0) {
          appendImg(dataType + Buffer.from(nftData, "hex").toString("base64"), dom_NFT);
        }
        if (dataType.indexOf("data:audio/") === 0) {
          appendAudio(dataType + Buffer.from(nftData, "hex").toString("base64"), dom_NFT);
        }
        if (dataType.indexOf("data:video/") === 0) {
          appendVideo(dataType + Buffer.from(nftData, "hex").toString("base64"), dom_NFT);
        }
        //createImgTag(dataType  + Buffer.from(nftData, "hex").toString("base64") ,imgtarget,escape_html(decodeURIComponent( sym.Convert.decodeHex(headerJSON.title))));
      }
    });
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  ウクライナ NFT をデコードして表示する //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ukraine(mosaic, dom_NFT) {

  mosaicRepo.getMosaic(mosaic.id)
    .subscribe(async mo => {

      const meta = await metaRepo.search({
        targetId: mo.id,
        metadataType: sym.MetadataType.Mosaic,
        pageSize: 100
      }).toPromise();

      const ukraineHeader = meta.data.find(tx => tx.metadataEntry.scopedMetadataKey.toHex() === '8AFD95A719B1BB90');
      if (ukraineHeader !== undefined) {

        console.log("%cukraine NFT", "color: red");
        console.count("ukraine");

        const rootTransactionHash = JSON.parse(ukraineHeader.metadataEntry.value).info.rootTransactionHash;
        const tx = await txRepo.getTransactionsById([rootTransactionHash], sym.TransactionGroup.Confirmed).toPromise();
        const aggTxes = [];
        for (let i = 0; i < tx[0].innerTransactions[1].message.payload.length / 64; i++) {
          aggTxes.push(tx[0].innerTransactions[1].message.payload.substr(i * 64, 64));
        }

        let nftData = "";
        for (aggTx of aggTxes) {

          const data = { "transactionIds": [aggTx] }
          const res = await fetch(nodeRepo.url + "/transactions/confirmed", {
            headers: {
              "Content-Type": "application/json;charset=utf-8"
            },
            method: "POST",
            body: JSON.stringify(data)
          });
          const json = await res.json();
          const innerTxes = json[0].transaction.transactions;
          for (innerTx of innerTxes) {
            nftData += innerTx.transaction.message;
          }
        }

        const buffer = sym.Convert.hexToUint8(nftData);
        const blob = new Blob([buffer], { type: 'image/png' });
        const url = window.URL || window.webkitURL;

        dom_NFT.innerHTML = `<br><a class="btn-style-link" href="https://symbol-ukraine.org/nft/${mosaic.id.toHex()}" target="_blank">Ukraine</a><br><br>`

        appendImg(url.createObjectURL(blob), dom_NFT);
      }
    });
}


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//  ワンクリックハーベスティング  //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



$('#txBtn').on('click', async function () {

  //委任先ノードの取得
  const node = $('#node').val();
  //委任アドレスの取得
  const accountInfo = await accountRepo.getAccountInfo(sym.Address.createFromRawAddress(window.SSS.activeAddress)).toPromise();
  const publicAccount = sym.PublicAccount.createFromPublicKey(
    window.SSS.activePublicKey,
    networkType
  );

  let accountImportance = Number(accountInfo.importance.toString()) / totalChainImportance;
  if (accountImportance > 0) {
    accountImportance = Math.round(accountImportance);
    accountImportance /= 1000000;
  } else {
    Swal.fire(`インポータンスが無効です！`, `アカウントに 10,000 XYM 以上を保有して、
    約12時間経つとインポータンスが有効になります`);
    return;
  }

  let transactionList = [];

  //ノードのパプリックキーを取得
  let nodeHttp = new sym.NodeHttp('https://' + node + ':3001');
  let nodeInfo = await nodeHttp.getNodeInfo().toPromise().catch(() => Swal.fire(`ノードエラー!!`, `別のノードを選択してください`));

  if (nodeInfo === true) {
    return;
  }

  if (networkType !== nodeInfo.networkIdentifier) {
    Swal.fire(`ネットワークタイプ エラー!!`, `別のノードを選択してください`);
    return;
  }

  // epochAdjustmentの取得
  //epochAdjustment = await repositoryFactory.getEpochAdjustment().toPromise();

  //リモートアカウントの生成
  const remoteAccount = sym.Account.generateNewAccount(networkType);
  //VRFアカウントの生成
  const vrfAccount = sym.Account.generateNewAccount(networkType);


  //委任しているようであれば解除トランザクション作成
  if (accountInfo.supplementalPublicKeys.linked) {
    //AccountKeyLinkTransaction （解除）
    const accountUnLink_tx = sym.AccountKeyLinkTransaction.create(
      sym.Deadline.create(epochAdjustment),
      accountInfo.supplementalPublicKeys.linked.publicKey,
      sym.LinkAction.Unlink,
      networkType,
    );
    transactionList.push(accountUnLink_tx.toAggregate(publicAccount));
  }

  if (accountInfo.supplementalPublicKeys.vrf) {
    //VrfKeyLinkTransaction （解除）
    const vrfUnLink_tx = sym.VrfKeyLinkTransaction.create(
      sym.Deadline.create(epochAdjustment),
      accountInfo.supplementalPublicKeys.vrf.publicKey,
      sym.LinkAction.Unlink,
      networkType,
    );
    transactionList.push(vrfUnLink_tx.toAggregate(publicAccount));
  }

  if (accountInfo.supplementalPublicKeys.node) {
    //NodeKeyLinkTransaction （解除）
    const nodeUnLink_tx = sym.NodeKeyLinkTransaction.create(
      sym.Deadline.create(epochAdjustment),
      accountInfo.supplementalPublicKeys.node.publicKey,
      sym.LinkAction.Unlink,
      networkType,
    );
    transactionList.push(nodeUnLink_tx.toAggregate(publicAccount));
  }

  //AccountKeyLinkTransaction （リンク）
  const accountLink_tx = sym.AccountKeyLinkTransaction.create(
    sym.Deadline.create(epochAdjustment),
    remoteAccount.publicKey,
    sym.LinkAction.Link,
    networkType,
  );
  transactionList.push(accountLink_tx.toAggregate(publicAccount));

  //VrfKeyLinkTransaction （リンク）
  const vrfLink_tx = sym.VrfKeyLinkTransaction.create(
    sym.Deadline.create(epochAdjustment),
    vrfAccount.publicKey,
    sym.LinkAction.Link,
    networkType,
  );
  transactionList.push(vrfLink_tx.toAggregate(publicAccount));

  //NodeKeyLinkTransaction （リンク）
  const nodeLink_tx = sym.NodeKeyLinkTransaction.create(
    sym.Deadline.create(epochAdjustment),
    nodeInfo.nodePublicKey,
    sym.LinkAction.Link,
    networkType,
  );
  transactionList.push(nodeLink_tx.toAggregate(publicAccount));

  //PersistentDelegationRequestTransactionを作成
  const persistentDelegationRequest_tx = sym.PersistentDelegationRequestTransaction.createPersistentDelegationRequestTransaction(
    sym.Deadline.create(epochAdjustment),
    remoteAccount.privateKey,
    vrfAccount.privateKey,
    nodeInfo.nodePublicKey,
    networkType,
  );
  transactionList.push(persistentDelegationRequest_tx.toAggregate(publicAccount));

  //アグリゲートでまとめる
  const aggregate_tx = sym.AggregateTransaction.createComplete(
    sym.Deadline.create(epochAdjustment),
    transactionList,
    networkType,
    [],
  ).setMaxFeeForAggregate(100);

  window.SSS.setTransaction(aggregate_tx);               // SSSにトランザクションを登録        
  window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
    console.log('signedTx', signedTx);
    txRepo.announce(signedTx);
  })

});


///////////////////////////////////////////////////////////////////////////
// 配列の中に指定した文字列があるか検索して、あれば true を返す関数
///////////////////////////////////////////////////////////////////////////

function searchArray(array, searchString) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === searchString) {
      return true;
    }
  }
  return false;
}

// 配列からランダムに要素を選択する関数 ///////////////////////////
function getRandomElement(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

// アクティブなノードを探す //////////////////////////
async function getActiveNode() {

  if (window.SSS.activeNetworkType === 104) {
    NODE = new Array('https://symbol.cryptobeliever.net:3001', 'https://symbol-mikun.net:3001', 'https://sym-main-03.opening-line.jp:3001', 'https://symbol-main-1.nemtus.com:3001');
  }
  if (window.SSS.activeNetworkType === 152) {
    NODE = new Array('https://testnet2.symbol-mikun.net:3001', 'https://testnet1.symbol-mikun.net:3001', 'https://2.dusanjp.com:3001');
  }

  let a = 0;
  let b;
  let data;
  for (let i = 0; i < NODE.length; i++) {
    try {
      // Fetchリクエストを送信
      const response = await fetch(`${NODE[i]}/chain/info`);

      // レスポンス判定
      if (!response.ok) {
        throw new Error('HTTPエラー ' + response.status);
      } else {
        // レスポンスをJSONとして解析
        data = await response.json();
        console.log(`${NODE[i]}  height === `, data.height);
        return NODE[i];
        /*  if (a < data.height) {    // 4つのノードを調べて1番ブロック高が高いノードを選ぶ / ブロック高が同じ場合は、最初のノードが選ばれる
            a = data.height;
            b = i;
          } */
      }
    } catch (error) {
      // エラーハンドリング
      console.error(`Node Error!! ==> ${NODE[i]}`, error);
    }
  }
  //return NODE[b];   // ノードの値を返す

  //　アクティブなノードが見つからない場合
  //Swal.fire(`Active Node Error!!`, `サイト管理者にお問い合わせください
  //   X(Twitter): @mikunNEM`)

}

//////////////////   マルチシグアカウントのモザイクを取得する関数　/////////////////////////

// セレクトボックスの要素を取得
const select_multisig_address = document.querySelector('.multisig_address_select');
//const select_multisig_address_1 = document.querySelector('.multisig_address_select_1');    // 保留中


// マルチシグアドレス、一括送信の元アドレスのセレクトボックスの値が変更されたときに実行される関数
function handleChange2(event) {
  // 選択された値を取得
  const selectedValue = event.target.value;

  console.log("マルチシグアドレス選択　＝＝＝＝＝＝", selectedValue)

  // 取得した値を元に関数を実行する
  multisig_mosaic(selectedValue);
}

// セレクトボックスにchangeイベントリスナーを追加
select_multisig_address.addEventListener('change', handleChange2);
// select_multisig_address_1.addEventListener('change', handleChange2);   //   保留中



async function multisig_mosaic(address) {
  const select_mosaic2 = [];
  const kigen = document.getElementById("multisig_kigen-gire"); // 有効期限切れ表示
  kigen.textContent = "";
  accountRepo.getAccountInfo(sym.Address.createFromRawAddress(address))
    .toPromise()
    .then((accountInfo) => {
      nsRepo.getMosaicsNames(accountInfo.mosaics.map((m) => new sym.MosaicId(m.id.id.toHex())))
        .toPromise()
        .then((data) => {
          if (!data) return

          console.log("%cdata====", "color:red", data);
          data.forEach((val, index) => {
            let d = {
              mosaicId: val.mosaicId,
              mosaic: accountInfo.mosaics[index],
              // mosaicInfo: mosaicInfo,
              namespaces: val.names.map(n => n.name),
            };

            if (d.namespaces.length !== 0) {  //  ネームスペースがある場合　　　　　　　　　　　　　　　　　　// 連想配列を作成　モザイクのセレクトボックス用
              select_mosaic2.push({ value: d.mosaic.id.id.toHex(), name: `${d.namespaces}` });
            } else {                          //ネームスペースがない場合
              select_mosaic2.push({ value: d.mosaic.id.id.toHex(), name: `${d.mosaic.id.id.toHex()}` });
            }
          })

          // nameプロパティでソートする
          const sortedArray = select_mosaic2.sort((a, b) => {
            // aが"symbol.xym"を含む場合、aを先に配置
            if (a.name.includes('symbol.xym')) return -1;
            // bが"symbol.xym"を含む場合、bを先に配置
            if (b.name.includes('symbol.xym')) return 1;

            // それ以外の場合はnameの値で昇順にソート
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
          });

          const jsSelectBox_m = document.querySelector('.multisig_mosaic_select');

          if (jsSelectBox_m !== null) { // null じゃなければ子ノードを全て削除  
            while (jsSelectBox_m.firstChild) {
              jsSelectBox_m.removeChild(jsSelectBox_m.firstChild);
            }
          }

          const select_m2 = document.createElement('select');

          select_m2.classList.add('select_m2');
          sortedArray.forEach((v) => {
            const option = document.createElement('option');
            option.value = v.value;
            option.textContent = v.name;
            select_m2.appendChild(option);
            jsSelectBox_m.appendChild(select_m2);
          });

          // select_m2 をコピーして新しい要素を作成
          /*const select_m2_copy = select_m2.cloneNode(true);
  
          const jsSelectBox_m2 = document.querySelector('.mosaic_ID2');
          jsSelectBox_m2.classList.add('select_m2');
          jsSelectBox_m2.appendChild(select_m2_copy);*/

          const hoyu = document.getElementById("multisig_hoyu-ryo");          //  XYMの保有量を　初期表示する
          const hoyu_agg = document.getElementById("hoyu-ryo_agg");  // XYMの保有量を　初期表示する
          hoyu.textContent = `保有量 : ${(parseInt(accountInfo.mosaics[0].amount.toHex(), 16) / (10 ** 6)).toLocaleString(undefined, { maximumFractionDigits: 6 })}　`;
          hoyu_agg.textContent = `保有量 : ${(parseInt(accountInfo.mosaics[0].amount.toHex(), 16) / (10 ** 6)).toLocaleString(undefined, { maximumFractionDigits: 6 })}　　　　　　`;



          const select_m12 = document.querySelectorAll('.select_m2');

          // セレクトボックスの値が変更されたときに実行される関数
          function handleChange_m12(event) {
            console.log("モザイクチェンジ")

            const hoyu = document.getElementById("multisig_hoyu-ryo"); //  XYMの保有量を　初期表示する
            const hoyu_agg = document.getElementById("hoyu-ryo_agg");  // XYMの保有量を　初期表示する
            const kigen = document.getElementById("multisig_kigen-gire");
            const kigen_agg = document.getElementById("kigen-gire_agg");

            hoyu.textContent = "　";
            hoyu_agg.textContent = "　";
            kigen.textContent = "";
            kigen_agg.textContent = "";
            let mosaic_id;
            let mosaic_amount;

            for (let m of accountInfo.mosaics) {  //accountInfo のモザイクの数だけ繰り返す
              if (m.id.id.toHex() === event.target.value) {
                mosaic_id = m.id.id;
                mosaic_amount = m.amount;
                break;      // 対象のモザイクが見つかったらfor文 終了
              }
            }

            // 他のセレクトボックスの値を変更する
            select_m12.forEach(select => {
              if (select !== event.target) {
                select.value = event.target.value;
              }
            });

            // swapElements(); // mosaicID2 の要素をマルチシグアカウントのモザイクに置換する     //   保留中  /////////////////////////
            mosaicRepo.getMosaic(mosaic_id) // 可分性の情報を取得する
              .toPromise()
              .then(
                (mosaicInfo) => {
                  const hoyu = document.getElementById("multisig_hoyu-ryo");
                  const hoyu_agg = document.getElementById("hoyu-ryo_agg");
                  hoyu.textContent = `保有量 : ${(parseInt(mosaic_amount.toHex(), 16) / (10 ** mosaicInfo.divisibility)).toLocaleString(undefined, { maximumFractionDigits: 6 })}　`;
                  hoyu_agg.textContent = `保有量 : ${(parseInt(mosaic_amount.toHex(), 16) / (10 ** mosaicInfo.divisibility)).toLocaleString(undefined, { maximumFractionDigits: 6 })}　　　　　　`;

                  chainRepo.getChainInfo().subscribe(chain => {
                    if (mosaicInfo.duration.toString() === '0' || (chain.height - mosaicInfo.startHeight.add(mosaicInfo.duration)) < 0) {
                      // 期限なし OR 期限ありで期限が切れていないもの はOK
                      kigen.textContent = "";
                      kigen_agg.textContent = "";
                    } else {
                      kigen.textContent = `有効期限が切れています　`;
                      kigen_agg.textContent = `有効期限が切れています　　　　　　`;
                    }
                  })
                })
          }

          // 全てのセレクトボックスにchangeイベントリスナーを追加
          select_m12.forEach(select => {
            select.addEventListener('change', handleChange_m12);
          });

        })

    }).catch((error) => {
      console.error('Promiseが拒否されました:', error); // エラーが発生した場合はキャッチする
    });

}





////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

async function Msig_account() {    //  マルチシグアカウント作成　

  console.log('handle sss multisig account');
  let multisig_addr = document.querySelector('.select_msig');
  let min_sig = document.getElementById('min_sig').value;
  let min_del_sig = document.getElementById('min_del_sig').value;
  let tx;
  let aggregateTx;

  if (multisig_addr === null) {   // セレクトボックスの値が null の場合
    multisig_addr = window.SSS.activeAddress;
  } else {                        // セレクトボックスの値がある場合
    multisig_addr = document.querySelector('.select_msig').value;
  }


  console.log("multisig_addr==", multisig_addr);
  console.log("新しい承認数 ==", min_sig);
  console.log("新しい削除承認数 ==", min_del_sig);
  console.log("cosig2==", cosig2); // グローバル変数
  console.log("cosig_del==", cosig_del); // グローバル変数


  const msig_account_Info = await accountRepo.getAccountInfo(sym.Address.createFromRawAddress(multisig_addr))
    .toPromise()

  //console.log("msig_account_Info===", msig_account_Info.publicKey)

  const publicAccount = sym.PublicAccount.createFromPublicKey(       // マルチシグ化したいアカウントの公開鍵
    msig_account_Info.publicKey,
    networkType
  );


  if (multisig_addr !== window.SSS.activeAddress) { //  マルチシグに変更したいアカウントが、元々マルチシグアカウントの場合）
    msigRepo.getMultisigAccountInfo(msig_account_Info.address).subscribe(msig => {


      if (cosig.length - cosig_del.length !== 0) { // 連署者がいる場合
        if (min_sig === '0') {
          Swal.fire({
            title: `<font color="coral">連署者が居る場合
            最小 承認者数は
            １以上の連署者数の範囲内で設定してください！</font>` })
          return;
        }
        if (min_del_sig === '0') {
          Swal.fire({
            title: `<font color="coral">連署者が居る場合
            最小削除 承認者数は
            １以上の連署者数の範囲内で設定してください！</font>` })
          return;
        }
      } else {  // 連署者がいない場合
        if (min_sig !== '0') {
          Swal.fire({
            title: `<font color="coral">マルチシグを解除する場合
            最小 承認者数は
            0に設定してください！</font>` })
          return;
        }
        if (min_del_sig !== '0') {
          Swal.fire({
            title: `<font color="coral">マルチシグを解除する場合
            最小削除 承認者数は
            0に設定してください！</font>` })
          return;
        }
      }

      if ((cosig.length - cosig_del.length) < min_sig) {
        Swal.fire({
          title: `<font color="coral">最小 承認者数は
          連署者数の範囲内で設定してください！</font>` })
        return;
      }
      if ((cosig.length - cosig_del.length) < min_del_sig) {
        Swal.fire({
          title: `<font color="coral">最小削除 承認者数は
          連署者数の範囲内で設定してください！</font>` })
        return;
      }

      console.log("マルチシグアカウントの設定変更");
      console.log("現在の最小承認数 =======", msig.minApproval);
      console.log("現在の最小削除承認数 =======", msig.minRemoval);

      min_sig = min_sig - msig.minApproval;        // 承認 署名者の増減計算
      min_del_sig = min_del_sig - msig.minRemoval; // 除名 署名者の増減計算

      tx = sym.MultisigAccountModificationTransaction.create(
        undefined,
        min_sig, //minApproval:承認のために必要な最小署名者数の増減
        min_del_sig, //minRemoval:除名のために必要な最小署名者数の増減
        cosig2, //追加対象アドレスリスト
        cosig_del, //除名対象アドレス
        networkType
      );

      console.log("multisig_Modification====", tx);

      if (msig.minRemoval === 1 && cosig2.length === 0 && cosig_del.length === 1) {  // 最小削除承認数が 1で、追加のアカウントが無い、削除アカウントが１の場合------------------------

        console.log("aggregate Complete Tx", "color: red");
        aggregateTx = sym.AggregateTransaction.createComplete(
          sym.Deadline.create(epochAdjustment),  //Deadline
          [
            tx.toAggregate(publicAccount),
          ],
          networkType,
          []
        ).setMaxFeeForAggregate(100, 1);

        console.log("aggregateTx====", aggregateTx);

        window.SSS.setTransaction(aggregateTx);       // SSSにトランザクションを登録
        window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
          console.log('signedTx', signedTx);
          txRepo.announce(signedTx);
        })

      } else { // 最小承認数が　２以上の場合   -------------------------------------------------------
        console.log("aggregate Bonded Tx", "color: red");

        aggregateTx = sym.AggregateTransaction.createBonded(
          sym.Deadline.create(epochAdjustment, 48),  //Deadline
          [
            tx.toAggregate(publicAccount),
          ],
          networkType,
          []
        ).setMaxFeeForAggregate(100, msig.minApproval);


        console.log("aggregateTx====", aggregateTx)
        console.log("aggregateTx.maxFee======", parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000);

        window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録
        window.SSS.requestSign().then((signedAggregateTx) => {// アグリゲートTxに署名

          console.log("signedAggregateTx===", signedAggregateTx);

          const hashLockTx = sym.HashLockTransaction.create(  //  ハッシュロック
            sym.Deadline.create(epochAdjustment),
            new sym.Mosaic(
              new sym.NamespaceId("symbol.xym"),
              sym.UInt64.fromUint(10 * 1000000)
            ), //固定値:10XYM
            sym.UInt64.fromUint(5760),
            signedAggregateTx,
            networkType
          ).setMaxFee(100);

          console.log("hashLockTx===", hashLockTx);

          setTimeout(() => {
            window.SSS.setTransaction(hashLockTx);               // SSSにトランザクションを登録
            window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
              console.log('signedTx', signedTx);
              txRepo.announce(signedTx);
            })
          }, 1000);

          wsEndpoint = NODE.replace('http', 'ws') + "/ws";
          listener = new sym.Listener(wsEndpoint, nsRepo, WebSocket);

          listener.open().then(() => {

            //Websocketが切断される事なく、常時監視するために、ブロック生成(約30秒毎)の検知を行う

            // ブロック生成の検知  /////////////////////////////////////////////////////////////////
            listener.newBlock()
              .subscribe(block => {
                //  console.log(block);    //ブロック生成 　表示OFF
              });

            // 承認トランザクションの検知  //////////////////////////////////////////////////////////
            listener.confirmed(sym.Address.createFromRawAddress(window.SSS.activeAddress))
              .subscribe(tx => {
                //受信後の処理を記述
                console.log(tx);

                setTimeout(() => {
                  txRepo.announceAggregateBonded(signedAggregateTx);   // アグボンアナウンス
                }, 100);
              });
          });

        })
      }
    })
  } else {  // マルチシグに変換したいアカウントが、アクティブアカウントの場合　 ///////////////////////////////////////////

    console.log("アクティブアカウントからのマルチシグ変換");

    if (cosig2.length < min_sig) {
      Swal.fire({
        title: `<font color="coral">最小 承認者数は
        連署者数の範囲内で設定してください！</font>` })
      return;
    }
    if (cosig2.length < min_del_sig) {
      Swal.fire({
        title: `<font color="coral">最小削除 承認者数は
        連署者数の範囲内で設定してください！</font>` })
      return;
    }

    tx = sym.MultisigAccountModificationTransaction.create(
      undefined,
      min_sig, //minApproval:承認のために必要な最小署名者数の増減
      min_del_sig, //minRemoval:除名のために必要な最小署名者数の増減
      cosig2, //追加対象アドレスリスト
      cosig_del, //除名対象アドレス
      networkType
    );

    console.log("multisig_Modification====", tx);

    aggregateTx = sym.AggregateTransaction.createBonded(
      sym.Deadline.create(epochAdjustment, 48),  //Deadline
      [
        tx.toAggregate(publicAccount),
      ],
      networkType,
      []
    ).setMaxFeeForAggregate(100, cosig.length); // 追加したい連署者数


    console.log("aggregateTx====", aggregateTx)
    console.log("aggregateTx.maxFee======", parseInt(aggregateTx.maxFee.toHex(), 16) / 1000000);

    window.SSS.setTransaction(aggregateTx);               // SSSにトランザクションを登録
    window.SSS.requestSign().then((signedAggregateTx) => {// アグリゲートTxに署名

      console.log("導通チェック＝＝＝  signedAggregateTx ")

      console.log("signedAggregateTx===", signedAggregateTx);

      const hashLockTx = sym.HashLockTransaction.create(  //  ハッシュロック
        sym.Deadline.create(epochAdjustment),
        new sym.Mosaic(
          new sym.NamespaceId("symbol.xym"),
          sym.UInt64.fromUint(10 * 1000000)
        ), //固定値:10XYM
        sym.UInt64.fromUint(5760),
        signedAggregateTx,
        networkType
      ).setMaxFee(100);

      console.log("hashLockTx===", hashLockTx);

      setTimeout(() => {
        window.SSS.setTransaction(hashLockTx);               // SSSにトランザクションを登録
        window.SSS.requestSign().then(signedTx => {   // SSSを用いた署名をユーザーに要求
          console.log('signedTx', signedTx);
          txRepo.announce(signedTx);
        })
      }, 1000);

      wsEndpoint = NODE.replace('http', 'ws') + "/ws";
      listener = new sym.Listener(wsEndpoint, nsRepo, WebSocket);

      listener.open().then(() => {

        //Websocketが切断される事なく、常時監視するために、ブロック生成(約30秒毎)の検知を行う

        // ブロック生成の検知  /////////////////////////////////////////////////////////////////
        listener.newBlock()
          .subscribe(block => {
            //  console.log(block);    //ブロック生成 　表示OFF
          });

        // 承認トランザクションの検知  //////////////////////////////////////////////////////////
        listener.confirmed(sym.Address.createFromRawAddress(window.SSS.activeAddress))
          .subscribe(tx => {
            //受信後の処理を記述
            console.log(tx);

            setTimeout(() => {
              txRepo.announceAggregateBonded(signedAggregateTx);   // アグボンアナウンス
            }, 100);
          });
      });
    })
  }
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 再帰処理で訪れたアドレスを追跡するセット
const visitedAddresses = new Set();
const addressNodeMap = new Map();
let popups = [];

// RxJSのObservableをPromiseに変換するヘルパー関数
function toPromise(observable) {
  return new Promise((resolve, reject) => {
    observable.subscribe({
      next: resolve,
      error: reject
    });
  });
}

// マルチシグアカウント情報を非同期に取得する関数
async function fetchAccountInfo(address) {
  try {
    const multisigInfo = await toPromise(msigRepo.getMultisigAccountInfo(sym.Address.createFromRawAddress(address)));
    return multisigInfo;
  } catch (error) {
    console.error(`Error fetching account info for address: ${address}`, error);
    return null;
  }
}

// ツリーノードを構築する関数
async function buildTreeNode(address, parent = null) {
  if (visitedAddresses.has(address)) {
    return addressNodeMap.get(address);
  }

  visitedAddresses.add(address);

  const multisigInfo = await fetchAccountInfo(address);
  if (!multisigInfo) {
    return null;
  }

  const a_address = multisigInfo.accountAddress.address;
  const isActive = address === window.SSS.activeAddress;

  const node = {
    name: [a_address.slice(0, 5) + "..." + a_address.slice(-5)],
    approval: multisigInfo.minApproval,
    removal: multisigInfo.minRemoval,
    children: [],
    color: multisigInfo.minApproval === 0 ? "lightblue" : "lightpink",
    isActive: isActive,
    parent: parent ? { name: parent.name } : null
  };

  addressNodeMap.set(address, node);
  return node;
}

// ルートノードを見つけるために、マルチシグアカウントを再帰的に調査する関数
async function findRootNodes(address) {
  const rootNodes = [];
  const multisigInfo = await fetchAccountInfo(address);
  if (!multisigInfo) {
    rootNodes.push(address);
    return rootNodes;
  }

  if (multisigInfo.multisigAddresses.length === 0) {
    rootNodes.push(address);
    return rootNodes;
  }

  for (let multisigAddress of multisigInfo.multisigAddresses) {
    const subRootNodes = await findRootNodes(multisigAddress.address);
    rootNodes.push(...subRootNodes);
  }
  return rootNodes;
}

// 連署者を再帰的に処理し、ツリー構造を構築する関数
async function processCosignatories(address, parent = null) {
  const node = await buildTreeNode(address, parent);
  if (!node) {
    return;
  }

  const multisigInfo = await fetchAccountInfo(address);
  if (!multisigInfo) {
    return;
  }

  for (let cosigner of multisigInfo.cosignatoryAddresses) {
    const childNode = await processCosignatories(cosigner.address, node);
    if (childNode) {
      if (!node.children.some(child => child.name.join('') === childNode.name.join(''))) {
        node.children.push(childNode);
      }
    }
  }

  return node;
}

// ツリー構造を構築する関数
async function buildTreeStructure() {
  console.log('Finding root nodes...');
  const rootAddresses = await findRootNodes(window.SSS.activeAddress);

  const rootNodes = [];
  for (let rootAddress of rootAddresses) {
    const rootNode = await processCosignatories(rootAddress);
    rootNodes.push(rootNode);
  }
  console.log('Root nodes:', rootNodes);
  return rootNodes;
}

// ポップアップを全て閉じる関数
function closeAllPopups() {
  popups.forEach(popup => {
    if (popup && !popup.closed) {
      popup.close();
    }
  });
  popups = [];
}

// ポップアップウィンドウの参照
let popup;

// ポップアップを開く関数
function openPopup(treeHeight = 300, separationHeight = 100) {
  console.log('Opening popup...');
  // 新しいツリーを作成する前に、訪れたアドレスのセットをクリア
  visitedAddresses.clear();
  addressNodeMap.clear();

  // 既存のポップアップウィンドウをチェック
  if (!popup || popup.closed) {
    const popupWidth = 1200;
    const popupHeight = 800;
    const left = (screen.width / 2) - (popupWidth / 2);
    const top = (screen.height / 2) - (popupHeight / 2);
    popup = window.open("", "multisigTreePopup", `width=${popupWidth},height=${popupHeight},top=${top},left=${left},scrollbars=yes`);
    popups.push(popup);
  } else {
    popup.focus();
  }

  // ツリー構造を構築
  buildTreeStructure().then(treeDataArray => {
    const uniqueTreeDataArray = treeDataArray.filter((tree, index, self) =>
      index === self.findIndex((t) => (
        t.name[0] === tree.name[0]
      ))
    );
    const treeDataStrArray = uniqueTreeDataArray.map(treeData => JSON.stringify(treeData));

    console.log("treeDataArray=====", treeDataArray)

    // ポップアップの内容を更新
    if (popup && !popup.closed) {
      popup.document.open();
      popup.document.write(`
                <!DOCTYPE html>
                <html lang="ja">
                <head>
                    <meta charset="UTF-8">
                    <title>マルチシグツリー</title>
                    <script src="https://d3js.org/d3.v7.min.js"></script>
                    <style>
                        .node rect {
                            stroke-width: 3px;
                        }
                        .node text {
                            font: 12px sans-serif;
                        }
                        .link {
                            fill: none;
                            stroke: #ccc;
                            stroke-width: 1.5px;
                        }
                        .separator {
                            stroke: blue;
                            stroke-width: 3px;
                        }
                    </style>
                </head>
                <body>
                    <svg width="1200" height="${(treeHeight + 100) * uniqueTreeDataArray.length + separationHeight * (uniqueTreeDataArray.length - 1)}"></svg>
                    <script>
                        const treeHeight = ${treeHeight};
                        const separationHeight = ${separationHeight};
                        const treeDataArray = [${treeDataStrArray}];
                        const svg = d3.select("svg"),
                              width = +svg.attr("width"),
                              height = +svg.attr("height");

                        const g = svg.append("g").attr("transform", "translate(50,50)");

                        g.append("text")
                          .attr("x", 20)
                          .attr("y", -20)
                          .attr("text-anchor", "left")
                          .style("font-size", "24px")
                          .text("マルチシグツリー");

                        const tree = d3.tree().size([width - 100, treeHeight]);

                        treeDataArray.forEach((treeData, index) => {
                            const localTreeHeight = treeHeight;
                            const root = d3.hierarchy(treeData);
                            tree(root);

                            const subtree = g.append("g").attr("transform", \`translate(0,\${index * (localTreeHeight + separationHeight)})\`);

                            const elbow = d => {
                                const midY = (d.y + d.parent.y) / 2;
                                return \`M\${d.x},\${d.y}V\${midY}H\${d.parent.x}V\${d.parent.y}\`;
                            };

                            const link = subtree
                                .selectAll(".link")
                                .data(root.descendants().slice(1))
                                .enter()
                                .append("path")
                                .attr("class", "link")
                                .attr("d", elbow);

                            const node = subtree
                                .selectAll(".node")
                                .data(root.descendants())
                                .enter()
                                .append("g")
                                .attr("class", d => "node" + (d.children ? " node--internal" : " node--leaf"))
                                .attr("transform", d => "translate(" + d.x + "," + d.y + ")");

                            node.append("rect")
                                .attr("width", 130)
                                .attr("height", d => d.data.approval !== undefined && d.data.approval > 0 ? 60 : 30)
                                .attr("x", -65)
                                .attr("y", d => d.data.approval !== undefined && d.data.approval > 0 ? -20 : -20)
                                .attr("rx", 10)
                                .attr("ry", 10)
                                .attr("fill", d => d.data.isActive ? "#FFFF99" : "#fff")
                                .attr("stroke", d => d.data.color === "lightpink" ? "pink" : "lightblue");

                            node.append("text")
                                .attr("dy", 0)
                                .attr("x", 0)
                                .attr("text-anchor", "middle")
                                .selectAll("tspan")
                                .data(d => {
                                    if (d.data.approval !== undefined && d.data.approval > 0) {
                                        return [
                                            d.data.name[0],
                                            d.data.name[1],
                                            \`最小署名✍️:　 \${d.data.approval}\`,
                                            \`最小削除🗑️:　 \${d.data.removal}\`
                                        ];
                                    } else {
                                        return d.data.name;
                                    }
                                })
                                .enter()
                                .append("tspan")
                                .attr("x", 0)
                                .attr("dy", (d, i) => (i ? "1.2em" : 0))
                                .text(d => d)
                                .style("fill", (d, i) => i > 1 ? "blue" : null);

                            if (index < treeDataArray.length - 1) {
                                g.append("line")
                                    .attr("x1", 0)
                                    .attr("y1", (index + 1) * (localTreeHeight + separationHeight) - separationHeight / 2)
                                    .attr("x2", width - 100)
                                    .attr("y2", (index + 1) * (localTreeHeight + separationHeight) - separationHeight / 2)
                                    .attr("class", "separator");
                            }
                        });
                    </script>
                </body>
                </html>
            `);
      popup.document.close();
      popup.focus();
    }
  }).catch(error => {
    console.error('Error:', error);
  });
}

///////////////////////////  CSV ダウンロード //////////////////////////////////////////

function downloadCSV() {
  const holderTable = document.getElementById('holder_table');
  const table = holderTable.querySelector('table'); // holder_tableの中のtable要素を取得
  const page_num = document.getElementById('page_num_holder1').value;
  const mosaic = document.querySelector(".select_r").value;


  console.log("table======", table.rows)
  let csvContent = '';
  // テーブルの2行目からループを開始
  for (let i = 1; i < table.rows.length; i++) {
    let row = table.rows[i];
    let rowData = [];
    for (let cell of row.cells) {
      // セル内にリンクがある場合、そのテキストを取得
      if (cell.querySelector('a')) {
        rowData.push(cell.querySelector('a').textContent);
      } else {
        let cellText = cell.textContent;
        // 保有量のセルの場合、ロケール表記を数値に変換
        if (cellText.includes(',')) {
          cellText = cellText.replace(/,/g, ''); // カンマを削除
        }
        rowData.push(cellText);
      }
    }
    csvContent += rowData.join(',') + '\n';
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `RichList_${mosaic}_${page_num}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}