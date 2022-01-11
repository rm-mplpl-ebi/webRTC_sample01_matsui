//PeerはSkyway使うときにSkyWayのシグナリングサーバや、他のクライアントとの接続を管理するエージェント(詳細：https://qiita.com/yusuke84/items/13fab1d0f97c466e4d4b)
const Peer = window.Peer;

//ストップウォッチ(遅延計測用)の処理
(function(){
    //strictモードの使用
    'use strict';

    //htmlのidからデータを取得
    var timer = document.getElementById('timer');
    var start = document.getElementById('start');
    var stop = document.getElementById('stop');
    var reset = document.getElementById('reset');
    //クリック時の時間を保持するための変数
    var startTime;
    //経過時刻を更新するための変数,0で初期化
    var elapsedTime = 0;
    //タイマーを止めるにはclearTimeoutを使う必要があり、そのためにはclearTimeoutの引数に渡すためのタイマーのidが必要
    var timerId;
    //タイマーをストップ -> 再開させたら0になってしまうのを避けるための変数
    var timeToadd = 0;
    
    //ミリ秒→分，秒に変換
    //例：135200ミリ秒経過 -> 02:15:200
    function updateTimetText(){
        //m(分)
        var m = Math.floor(elapsedTime / 60000);
        //s(秒)
        var s = Math.floor(elapsedTime % 60000 / 1000);
        //ms(ミリ秒）
        var ms = elapsedTime % 1000;
        //HTML 上で表示の際の桁数を固定する　例）3 => 03　、 12 -> 012
        //文字列の末尾2桁を表示したいのでsliceで負の値(-2)引数で渡すといいかんじ
        m = ('0' + m).slice(-2); 
        s = ('0' + s).slice(-2);
        ms = ('0' + ms).slice(-3);
        //HTMLのid　timer部分に表示
        timer.textContent = m + ':' + s + ':' + ms;
    }

    //カウントアップする
    function countUp(){
        //timerId変数はsetTimeoutの返り値になるので代入する
        timerId = setTimeout(function(){
            //経過時刻は現在時刻をミリ秒で示すDate.now()からstartを押した時の時刻(startTime)を引く
            elapsedTime = Date.now() - startTime + timeToadd;
            updateTimetText()
            //countUp関数自身を呼ぶことで10ミリ秒毎に以下の計算を始める
            countUp();
        //1秒以下の時間を表示するために10ミリ秒後に始めるよう宣言
        },10);
    }

    //タイマースタート
    start.addEventListener('click',function(){
        //現在時刻Date.nowを代入
        startTime = Date.now();
        //再帰的に上の関数を呼び出し
        countUp();
    });

    //タイマーストップ
    stop.addEventListener('click',function(){
        //タイマーを止めるにはclearTimeoutを使う必要があり、そのためにはclearTimeoutの引数に渡すためのタイマーのidが必要
       clearTimeout(timerId);
        //タイマーに表示される時間elapsedTimeが現在時刻からスタートボタンを押した時刻を引いたもの
        //タイマーを再開させたら0になってしまう。elapsedTime = Date.now - startTime
        //過去のスタート時間からストップ時間までの経過時間を足す　例：elapsedTime = Date.now - startTime + timeToadd (timeToadd = ストップを押した時刻(Date.now)から直近のスタート時刻(startTime)を引く)
       timeToadd += Date.now() - startTime;
    });

    //タイマーリセット
    reset.addEventListener('click',function(){
        //経過時刻を更新するための変数elapsedTimeを0にしてあげつつ、updateTimetTextで0になったタイムを表示
        elapsedTime = 0;
        //リセット時に0に初期化したいのでリセットを押した際に0を代入
        timeToadd = 0;
        //updateTimetTextで0になったタイムを表示
        updateTimetText();
    });
})();

//ビデオ通話の処理
(async function main() {
  const localVideo = document.getElementById('js-local-stream');
  const localId = document.getElementById('js-local-id');
  const callTrigger = document.getElementById('js-call-trigger');
  const closeTrigger = document.getElementById('js-close-trigger');
  const remoteVideo = document.getElementById('js-remote-stream');
  const remoteId = document.getElementById('js-remote-id');
  const meta = document.getElementById('js-meta');
  const sdkSrc = document.querySelector('script[src*=skyway]');

  const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    })
    .catch(console.error);

  // ローカル側の準備
  localVideo.muted = true;
  localVideo.srcObject = localStream;
  localVideo.playsInline = true;
  await localVideo.play().catch(console.error);

  //Skywayのシグナリングサーバに接続, debugはログレベル
  const peer = (window.peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  }));

  // 呼び出す側のハンドラ
  callTrigger.addEventListener('click', () => {
    // peerインスタンスのメソッドはP2Pが確立してないとだめ
    if (!peer.open) {
      return;
    }

    const mediaConnection = peer.call(remoteId.value, localStream);

    mediaConnection.on('stream', async stream => {
      // リモート側の準備
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    });

    closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  peer.once('open', id => (localId.textContent = id));

  // P2Pの接続設定
  peer.on('call', mediaConnection => {
    mediaConnection.answer(localStream);

    mediaConnection.on('stream', async stream => {
      // 呼び出される側のリモートの設定
      remoteVideo.srcObject = stream;
      remoteVideo.playsInline = true;
      await remoteVideo.play().catch(console.error);
    });

    mediaConnection.once('close', () => {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    });

    closeTrigger.addEventListener('click', () => mediaConnection.close(true));
  });

  peer.on('error', console.error);
})();

