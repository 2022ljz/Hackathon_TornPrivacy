// Data
const NET = [{ n: 'Ethereum', s: 'ETH' }, { n: 'Polygon', s: 'MATIC' }, { n: 'BSC', s: 'BNB' }, { n: 'Avalanche', s: 'AVAX' }];
// tokens: s = symbol, p = fallback/static USD price, i = icon, id = coingecko id for live price
const TOK = [
  { s: 'ETH', p: 2500, i: '🟦', id: 'ethereum' },
  { s: 'USDC', p: 1, i: '🔵', id: 'usd-coin' },
  { s: 'DAI', p: 1, i: '🟡', id: 'dai' },
  { s: 'WBTC', p: 64000, i: '🟠', id: 'wrapped-bitcoin' },
  { s: 'MATIC', p: .7, i: '🟪', id: 'matic-network' },
  { s: 'ARB', p: .9, i: '⚪', id: 'arbitrum' },
  { s: 'OP', p: 1.9, i: '🔴', id: 'optimism' }
];
let state = { net: 'Ethereum', from: 'ETH', to: null, amt: 0, slip: .01, ddl: 20 };

// live price map (coingecko id -> usd price)
let priceMap = {};

// fetch prices from CoinGecko simple API and populate priceMap; silent fallback to static p
async function fetchPrices() {
  try {
    const ids = TOK.map(t => t.id).filter(Boolean).join(',');
    if (!ids) return;
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('price fetch failed');
    const data = await resp.json();
    TOK.forEach(t => {
      if (t.id && data[t.id] && data[t.id].usd) priceMap[t.id] = Number(data[t.id].usd);
      else priceMap[t.id] = Number(t.p);
    });
  } catch (e) {
    // fallback to static prices if network fails
    TOK.forEach(t => { if (!priceMap[t.id]) priceMap[t.id] = Number(t.p); });
  }
}

// helper to get live price for a symbol (uses priceMap or fallback p)
function getLivePrice(symbol) {
  const tok = findToken(symbol);
  if (!tok) return NaN;
  if (tok.id && priceMap[tok.id] && !isNaN(priceMap[tok.id])) return Number(priceMap[tok.id]);
  return Number(tok.p);
}

// helpers
const findToken = s => TOK.find(x => x.s === s);
const fmt = (n, d = 6) => isNaN(n) ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
function quote() {
  let f = findToken(state.from), t = findToken(state.to);
  if (!f || !t || !state.amt) return { q: 0, min: 0, rate: '—' };
  const pf = getLivePrice(f.s); const pt = getLivePrice(t.s);
  const q = (isNaN(pf) || isNaN(pt)) ? 0 : state.amt * (pf / pt);
  const min = q * (1 - state.slip);
  const rate = (isNaN(pf) || isNaN(pt)) ? '—' : `1 ${f.s} ≈ ${fmt(pf / pt)} ${t.s}`;
  return { q, min, rate };
}

function ui() {
  $("#fromLbl").text(state.from); $("#fromIcon").text(findToken(state.from)?.i || '⬜');
  $("#toLbl").text(state.to || 'Select a token'); $("#toIcon").text(findToken(state.to)?.i || '⬜');
  $("#netBtn").html(state.net + " <span>▾</span>");
  let r = quote(); $("#toAmt").val(r.q ? fmt(r.q) : ""); $("#rate").text(r.rate);
  let ok = state.amt > 0 && state.to && state.from !== state.to; $("#quote").prop("disabled", !ok);
  $("#sum").html(!state.to ? "Enter an amount and choose two tokens." : (state.from === state.to ? "From/To can not be same." : r.q ? `Receive ≈ <b>${fmt(r.q)} ${state.to}</b>, Min (slip ${Math.round(state.slip * 1000) / 10}%): <b>${fmt(r.min)} ${state.to}</b>, Deadline ${state.ddl}m.` : "Fill an amount."));
}

// list render
function list($wrap, arr, click, filter) {
  $wrap.empty();
  var show = filter ? arr.filter(function (a) {
    var key = (a.s || a.n).toLowerCase();
    return key.indexOf(filter.toLowerCase()) !== -1 || (a.i || '').indexOf(filter) !== -1;
  }) : arr;
  show.forEach(function (a) {
    var $item = $('<div class="item"></div>');
    $item.append('<div>' + (a.i ? a.i + ' ' : '') + '<b>' + (a.s || a.n) + '</b></div>');
    $item.append('<span class="small smallmuted">' + (a.p ? ('$' + a.p) : (a.s || '')) + '</span>');
    $item.on('click', function () { click(a); });
    $wrap.append($item);
  });
}

function drop(btn, panel) {
  $(btn).on('click', e => { e.stopPropagation(); $(".panel").not(panel).slideUp(120); $(panel).stop(true, true).slideToggle(120); });
  $(document).on('click', () => $(".panel").slideUp(120));
  $(panel).on('click', e => e.stopPropagation());
}

$(function () {
  // on load, detect provider and show helpful banner if missing
  (function detectProviderOnLoad() {
    const provider = (typeof window.ethereum !== 'undefined') ? window.ethereum : ((window.web3 && window.web3.currentProvider) ? window.web3.currentProvider : null);
    if (!provider) {
      var $b = $("#mmBanner");
      $b.html('<div class="alert alert-warning small" role="alert">MetaMask not detected. To enable wallet features, install MetaMask in your browser and open this page over http(s). <a href="https://metamask.io/download.html" target="_blank">Install MetaMask</a></div>');
      $b.show();
    }
  })();
  // init lists
  list($("#netList"), NET, a => { state.net = a.n; $("#netPanel").slideUp(120); ui(); });
  list($("#fromList"), TOK, a => { state.from = a.s; $("#fromPanel").slideUp(120); ui(); });
  list($("#toList"), TOK, a => { state.to = a.s; $("#toPanel").slideUp(120); ui(); });
  $("#netPanel input").on("input", function () { list($("#netList"), NET, function (a) { state.net = a.n; $("#netPanel").slideUp(120); ui(); }, this.value); });
  $("#fromPanel input").on("input", function () { list($("#fromList"), TOK, function (a) { state.from = a.s; $("#fromPanel").slideUp(120); ui(); }, this.value); });
  $("#toPanel input").on("input", function () { list($("#toList"), TOK, function (a) { state.to = a.s; $("#toPanel").slideUp(120); ui(); }, this.value); });
  drop("#netBtn", "#netPanel"); drop("#fromBtn", "#fromPanel"); drop("#toBtn", "#toPanel");

  $("#copyBtn").on("click", function () { let addr = $("#accAddr").text(); if (navigator.clipboard) { navigator.clipboard.writeText(addr); $("#copyTip").fadeIn(200, function () { setTimeout(function () { $("#copyTip").fadeOut(400); }, 1200); }); } });

  // from amount formatting
  $("#fromAmt").on("input", function () { var cleaned = this.value.replace(/[^\d.]/g, ''); var parts = cleaned.split('.'); if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join(''); this.value = cleaned; var v = parseFloat(cleaned); state.amt = isNaN(v) ? 0 : v; ui(); }).on('blur', function () { var v = parseFloat(this.value); if (!isNaN(v)) this.value = Number(v).toLocaleString(undefined, { maximumFractionDigits: 6 }); }).on('focus', function () { if (this.value) { this.value = (state.amt ? String(state.amt) : ''); } });

  $("#flip").on("click", function () { let t = state.from; state.from = state.to || state.from; state.to = t; ui(); });
  let advOpen = false; $("#advT").on("click", function () { advOpen = !advOpen; $("#adv").slideToggle(120); $("#advArrow").css({ transform: advOpen ? "rotate(180deg)" : "rotate(0deg)", transition: ".2s" }); });
  $(".slip").on("click", function () { $(".slip").removeClass("active"); $(this).addClass("active"); state.slip = parseFloat($(this).data("v")); ui(); });
  $("#slipC").on("input", function () { let p = parseFloat(this.value); if (!isNaN(p) && p >= 0) state.slip = p / 100, ui(); });
  $("#deadline").on("input", function () { let m = parseInt(this.value); if (!isNaN(m) && m > 0) state.ddl = m, ui(); });

  $("#quote").on("click", function () { $("#quoteTxt").hide(); $("#quoteLoad").show(); setTimeout(function () { let q = quote(); $("#mb").html(`Network: <b>${state.net}</b><br>From: <b>${fmt(state.amt)} ${state.from}</b><br>To (est): <b>${fmt(q.q)} ${state.to}</b><br>Min received: <b>${fmt(q.min)} ${state.to}</b>`); new bootstrap.Modal('#m').show(); $("#quoteTxt").show(); $("#quoteLoad").hide(); }, 700); });
  $("#confirmBtn").on("click", function () { $("#mb").html('<span style="color:#4ade80;">Swap success！(only demo)</span>'); setTimeout(function () { bootstrap.Modal.getInstance(document.getElementById('m')).hide(); }, 1200); });

  // top search + panels
  $("#topSearch").on('input', function () { var q = this.value.trim(); var $r = $("#topResults"); $r.empty(); if (!q) { $r.hide(); return; } var results = TOK.filter(function (t) { return (t.s || '').toLowerCase().indexOf(q.toLowerCase()) !== -1; }); if (results.length === 0) $r.append('<div class="small smallmuted p-2">No results</div>'); results.forEach(function (t) { var $it = $('<div class="item" style="padding:.5rem;cursor:pointer"></div>'); $it.append('<div>' + (t.i ? t.i + ' ' : '') + '<b>' + t.s + '</b></div>'); $it.on('click', function () { state.to = t.s; ui(); $r.hide(); $("#topSearch").val(''); }); $r.append($it); }); $r.show(); });
  $(document).on('click', function (e) { if (!$(e.target).closest('#topSearch,#topResults').length) $('#topResults').hide(); });
  drop('#gasBtn', '#gasPanel'); drop('#notifBtn', '#notifPanel');
  $('#buyEth').on('click', function () { alert('Buy ETH (simulated)'); });
  $('#clearNotif').on('click', function () { $('#notifList').html('<div class="small smallmuted p-2">No notifications</div>'); $('#notifCount').text('0'); $('#notifPanel').hide(); });

  ui();

  // load live prices once and refresh every 60 seconds
  fetchPrices().then(()=>{ ui(); });
  setInterval(()=>{ fetchPrices().then(()=>{ ui(); }); }, 60000);

  async function readBalanceFromMetaMask() {
    if (typeof window.ethereum === 'undefined') {
      // wallet not injected
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const acc = accounts[0];
      $('#accAddr').text(acc);
      // show account info when we have an address
      $('#accountInfo').show();
      // get balance (wei)
      const balanceHex = await window.ethereum.request({ method: 'eth_getBalance', params: [acc, 'latest'] });
      const balance = parseInt(balanceHex, 16) / 1e18;
      $('#available').text(balance ? (Number(balance).toFixed(6) + ' available to swap') : '0 available to swap');
  } catch (e) { /* ignore errors while demo-reading balance */ }
  }

  // if user clicks connect, always request accounts to prompt MetaMask popup when available
  let mmConnected = false;
  $('#connectBtn').on('click', async function () {
    // detect provider
    const provider = (typeof window.ethereum !== 'undefined') ? window.ethereum : ((window.web3 && window.web3.currentProvider) ? window.web3.currentProvider : null);
    if (!provider) {
      alert('MetaMask not detected. Please install/enable the MetaMask extension and open this page via http(s).');
      return;
    }

    if (mmConnected) {
      // simulate disconnect
      mmConnected = false;
      $(this).text('Connect wallet').removeClass('btn-primary').addClass('btn-outline-light');
      $('#accAddr').text('0x9dc0...d509');
      $('#available').text('— available to swap');
      $('#accountInfo').hide();
      return;
    }

    // Always request accounts to attempt to trigger the MetaMask popup
    try {
      // use a small timeout so UI doesn't hang forever if the popup is blocked
      const req = provider.request({ method: 'eth_requestAccounts' });
      const winner = await Promise.race([
        req,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 16000))
      ]);
      // if we get accounts, read balance and update UI
      if (Array.isArray(winner) && winner.length) {
        await readBalanceFromMetaMask();
        mmConnected = true;
        $(this).text('Disconnect').removeClass('btn-outline-light').addClass('btn-primary');
      } else {
        // sometimes provider.request resolves to undefined; still try to read
        await readBalanceFromMetaMask();
        mmConnected = true;
        $(this).text('Disconnect').removeClass('btn-outline-light').addClass('btn-primary');
      }
    } catch (e) {
      // user rejected or popup blocked
      alert(e && e.message && e.message.toLowerCase().includes('user rejected') ? 'Connection rejected in MetaMask.' : 'Failed to open MetaMask popup. Check extension or browser settings.');
    }
  });

});
