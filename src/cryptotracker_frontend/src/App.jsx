import { useEffect, useState, useRef } from 'react';
import './index.css';

const CURRENCY = 'USD';
const API_KEY = import.meta.env.VITE_CRYPTOCOMPARE_API_KEY;

export default function App() {
  const [cryptos, setCryptos] = useState(['BTC', 'ETH', 'SOL']);
  const [cryptoData, setCryptoData] = useState({});
  const [highlightMap, setHighlightMap] = useState({});
  const [signalHistory, setSignalHistory] = useState([]);
  const [sensitivity, setSensitivity] = useState(5);
  const [slidingWindowSize, setSlidingWindowSize] = useState(1);
  const [thresholds, setThresholds] = useState({ price: 2.5, volume: 2 });
  const [allCoins, setAllCoins] = useState([]);
  const [coinImageMap, setCoinImageMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(null);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [nextDrawerOpen, setNextDrawerOpen] = useState(null);
  const [windowWarning, setWindowWarning] = useState('');
  const [notificationsEnabledCoins, setNotificationsEnabledCoins] = useState(new Set());

  const prevDataRef = useRef({});
  const historyRef = useRef({});
  const refreshCounterRef = useRef({});
  const prevSlidingWindowSizeRef = useRef(slidingWindowSize);
  const highlightTimeoutRef = useRef(null);
  const lastHighlightPriceRef = useRef({});

  const toggleDrawer = (coin) => {
    if (drawerOpen === coin) {
      setDrawerClosing(true);
      setTimeout(() => {
        setDrawerOpen(null);
        setDrawerClosing(false);
      }, 300);
    } else {
      if (drawerOpen !== null) {
        setDrawerClosing(true);
        setNextDrawerOpen(coin);
        setTimeout(() => {
          setDrawerOpen(null);
          setDrawerClosing(false);
        }, 300);
      } else {
        setDrawerOpen(coin);
      }
    }
  };

  useEffect(() => {
    if (drawerOpen === null && nextDrawerOpen !== null) {
      setTimeout(() => {
        setDrawerOpen(nextDrawerOpen);
        setNextDrawerOpen(null);
      }, 300);
    }
  }, [drawerOpen, nextDrawerOpen]);

  const getSignal = (current, previous, thresholds) => {
    if (!previous) return 'Hold';

    const priceChangePercent = ((current.price - previous.price) / previous.price) * 100;
    const volumeChangePercent = ((current.volume - previous.volume) / previous.volume) * 100;

    const priceMoved = Math.abs(priceChangePercent) >= thresholds.price;
    if (!priceMoved) return 'Hold';

    if (priceChangePercent > 0) {
      if (volumeChangePercent > 0) return 'Sell';
      else return 'Caution Sell';
    } else {
      if (volumeChangePercent > 0) return 'Buy';
      else return 'Caution Buy';
    }
  };

  const fetchData = async () => {
    try {
      const url = `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${cryptos.join()}&tsyms=${CURRENCY}&api_key=${API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      const now = new Date().toLocaleTimeString();

      const minPriceThreshold = 0.10;
      const maxPriceThreshold = 5.0;
      const priceThreshold = minPriceThreshold + ((maxPriceThreshold - minPriceThreshold) * (10 - sensitivity) / 9);

      const minVolumeThreshold = 0.10;
      const maxVolumeThreshold = 3.0;
      const volumeThreshold = minVolumeThreshold + ((maxVolumeThreshold - minVolumeThreshold) * (10 - sensitivity) / 9);

      setThresholds({ price: priceThreshold, volume: volumeThreshold });

      const newData = {};
      const newHighlights = {};
      const newSignals = [];

      cryptos.forEach((coin) => {
        const raw = json.RAW?.[coin]?.[CURRENCY];
        const disp = json.DISPLAY?.[coin]?.[CURRENCY];
        if (!raw || !disp) return;

        const current = {
          price: raw.PRICE,
          volume: raw.VOLUME24HOURTO,
          change1h: parseFloat(disp.CHANGEPCTHOUR || 0),
          change24h: parseFloat(disp.CHANGEPCT24HOUR || 0),
        };

        if (!historyRef.current[coin]) historyRef.current[coin] = [];
        const hist = historyRef.current[coin];

        let previous = null;
        if (hist.length > 0 && hist.length < slidingWindowSize) {
          previous = hist[hist.length - 1];
          setWindowWarning(`Not enough history for selected settings yet, using most recent (${hist.length} available).`);
        } else if (hist.length >= slidingWindowSize) {
          previous = hist[slidingWindowSize - 1];
          setWindowWarning('');
        } else {
          setWindowWarning('');
        }

        const lastHist = hist[0];
        const isNewData = !lastHist || lastHist.price !== current.price || lastHist.volume !== current.volume;

        let dPricePct = 0, dVolPct = 0;
        let signal = prevDataRef.current[coin]?.signal || 'Hold';
        let priceChanged = false, volumeChanged = false;

        if (previous) {
          const priceDiff = current.price - previous.price;
          const volumeDiff = current.volume - previous.volume;
          priceChanged = Math.abs(priceDiff) > 0.0001;
          volumeChanged = Math.abs(volumeDiff) > 0.01;

          dPricePct = priceChanged ? (priceDiff / previous.price) * 100 : (prevDataRef.current[coin]?.dPrice || 0);
          dVolPct = volumeChanged ? (volumeDiff / previous.volume) * 100 : (prevDataRef.current[coin]?.dVolume || 0);
        }

        const slidingWindowChanged = prevSlidingWindowSizeRef.current !== slidingWindowSize;
        prevSlidingWindowSizeRef.current = slidingWindowSize;

        if (isNewData || slidingWindowChanged) {
          hist.unshift(current);
          if (hist.length > 21) hist.pop();

          if (!refreshCounterRef.current[coin]) refreshCounterRef.current[coin] = 0;
          if (priceChanged) {
            refreshCounterRef.current[coin]++;
          }

          signal = getSignal(current, previous, { price: priceThreshold, volume: volumeThreshold });
        }

        const fields = {};
          const roundedPrice = Number(current.price.toFixed(2));
          if (lastHighlightPriceRef.current[coin] !== roundedPrice) {
            fields.price = true;
            lastHighlightPriceRef.current[coin] = roundedPrice;
          }
          if (signal !== prevDataRef.current[coin]?.signal) {
            fields.signal = true;
            newSignals.unshift({ coin, signal, time: now, dPrice: dPricePct, dVolume: dVolPct });
          }
        if (priceChanged) fields.price = true;
        if (signal !== prevDataRef.current[coin]?.signal) {
          fields.signal = true;
          newSignals.unshift({ coin, signal, time: now, dPrice: dPricePct, dVolume: dVolPct });
        }

        const comparedData = hist.length >= slidingWindowSize ? hist[slidingWindowSize - 1] : (hist.length > 0 ? hist[hist.length - 1] : null);

        newData[coin] = {
          current,
          signal,
          dPrice: dPricePct,
          dVolume: dVolPct,
          refreshCount: refreshCounterRef.current[coin] || 0,
          compared: comparedData || {},
        };

        newHighlights[coin] = fields;
      });

      setCryptoData(newData);
      setHighlightMap(newHighlights);
      setSignalHistory((prev) => [...newSignals, ...prev.slice(0, 50 - newSignals.length)]);

      if (Object.keys(newHighlights).length > 0) {
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        const coinsToClear = Object.keys(newHighlights);
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightMap((prev) => {
            const cleared = { ...prev };
            coinsToClear.forEach((coin) => {
              delete cleared[coin];
            });
            return cleared;
          });
          highlightTimeoutRef.current = null;
        }, 1000);
      }

      prevDataRef.current = newData;
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  const fetchAllCoins = async () => {
    if (allCoins.length > 0) return;
    const res = await fetch('https://min-api.cryptocompare.com/data/top/totalvolfull?limit=100&tsym=USD');
    const json = await res.json();
    setAllCoins(json.Data.map((d) => d.CoinInfo.Name));
    const imageMap = {};
    json.Data.forEach((d) => {
      imageMap[d.CoinInfo.Name] = `https://www.cryptocompare.com${d.CoinInfo.ImageUrl}`;
    });
    setCoinImageMap(imageMap);
  };

  useEffect(() => {
    const id = setInterval(fetchData, 5000);
    fetchData();
    return () => clearInterval(id);
  }, [cryptos, sensitivity, slidingWindowSize]);
  
  useEffect(() => {
    if (notificationsEnabledCoins.size === 0) return;
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notification");
      return;
    }
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then(permission => {
        if (permission !== "granted") {
          setNotificationsEnabledCoins(new Set());
        }
      });
    }
  }, [notificationsEnabledCoins]);
  
  useEffect(() => {
    if (notificationsEnabledCoins.size === 0) return;
    setSignalHistory((prev) => {
      prev.forEach((signal) => {
        if (signal.notified) return;
        if (signal.signal === "Hold") return;
        if (!notificationsEnabledCoins.has(signal.coin)) return;
        const title = `Signal: ${signal.coin}`;
        const body = `${signal.signal} - ΔPrice: ${typeof signal.dPrice === 'number' ? signal.dPrice.toFixed(2) : 'N/A'}%, ΔVolume: ${typeof signal.dVolume === 'number' ? signal.dVolume.toFixed(2) : 'N/A'}%`;
        new Notification(title, { body });
        signal.notified = true;
      });
      return prev;
    });
  }, [signalHistory, notificationsEnabledCoins]);
  

  useEffect(() => {
    fetchAllCoins();
  }, []);

  const filtered = allCoins.filter((n) => n.toLowerCase().includes(searchTerm.toLowerCase()));
  const getSignalClass = (s) => s.toLowerCase().replace(' ', '-');

  const replaceCrypto = (sym) => {
    if (!cryptos.includes(sym)) {
      const idx = cryptos.indexOf(drawerOpen);
      const arr = [...cryptos];
      arr[idx] = sym;
      setCryptos(arr);
    }
    setDrawerOpen(null);
    setSearchTerm('');
  };

  return (
    <>
      <div className="app">
        <h1>📊 Crypto Tracker</h1>

        <div className="slider-section-horizontal">
          <div className="slider-box">
            <label className="slider-label">Sensitivity: {sensitivity}</label>
            <input
              type="range"
              min="1"
              max="10"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="modern-slider"
            />
            <p className="slider-desc">
              Price threshold: <strong>{thresholds.price.toFixed(2)}%</strong>, Volume threshold: <strong>{thresholds.volume.toFixed(2)}x</strong>
            </p>
          </div>

        <div className="slider-box">
          <label className="slider-label">Sliding Window: {slidingWindowSize}</label>
          <input
            type="range"
            min="1"
            max="20"
            value={slidingWindowSize}
            onChange={(e) => setSlidingWindowSize(Number(e.target.value))}
            className="modern-slider"
          />
          <p className="slider-desc">
            Currently comparing to {slidingWindowSize === 1 ? 'last update' : `${slidingWindowSize} updates ago`}
          </p>
          {windowWarning && (
            <p className="slider-desc" style={{ color: 'orange', fontWeight: 'bold' }}>{windowWarning}</p>
          )}
        </div>
        </div>

        <div className="grid">
          {cryptos.map((coin) => {
            const d = cryptoData[coin];
            const hl = highlightMap[coin] || {};
            if (!d) return null;
            return (
              <div key={coin} className={`card ${notificationsEnabledCoins.has(coin) ? 'notify-enabled' : ''}`}>
                <div className="card-header">
                  <img
                    key={coin}
                    src={coinImageMap[coin] || 'https://www.cryptocompare.com/media/19633/btc.png'}
                    alt={`${coin} logo`}
                    className="coin-icon-large"
                    onClick={() => {
                      setNotificationsEnabledCoins((prev) => {
                        const newSet = new Set(prev);
                        if (newSet.has(coin)) {
                          newSet.delete(coin);
                        } else {
                          newSet.add(coin);
                        }
                        return newSet;
                      });
                    }}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://www.cryptocompare.com/media/19633/btc.png'; }}
                    style={{ cursor: 'pointer' }}
                  />
                  <h2 className={notificationsEnabledCoins.has(coin) ? 'notify-enabled-label' : ''}>{coin}</h2>
                  <button className="change-btn" onClick={() => toggleDrawer(coin)}>Change</button>
                </div>
                <div className="field-row">
                  <div className={`field ${hl.price ? 'fade-highlight' : ''}`}>💰 {d.current.price.toFixed(2)}</div>
                  <div className={`field percent ${d.current.change1h >= 0 ? 'up' : 'down'}`}>1h {d.current.change1h.toFixed(2)}%</div>
                  <div className={`field percent ${d.current.change24h >= 0 ? 'up' : 'down'}`}>24h {d.current.change24h.toFixed(2)}%</div>
                </div>
                <div className="field-row">
                  <div className={`field ${d.dPrice > 0 ? 'up' : d.dPrice < 0 ? 'down' : 'delta-zero'}`}>
                    Δ Price: {d.dPrice.toFixed(2)}%
                  </div>
                  <div className={`field ${d.dVolume > 0 ? 'up' : d.dVolume < 0 ? 'down' : 'delta-zero'}`}>
                    Δ Volume: {d.dVolume.toFixed(2)}%
                  </div>
                </div>
                <div className={`field signal ${getSignalClass(d.signal)} ${hl.signal ? 'fade-highlight' : ''} ${
                  d.signal === 'Buy' ? 'signal-buy' :
                  d.signal === 'Caution Buy' ? 'signal-caution-buy' :
                  d.signal === 'Sell' ? 'signal-sell' :
                  d.signal === 'Caution Sell' ? 'signal-caution-sell' : ''
                }`}>📢 {d.signal}</div>
                <div className="field refresh-count">🔁 Refreshes: {d.refreshCount}</div>
                <div className="field compared-to">🧮 Compared to Price: ${d.compared?.price?.toFixed(2) || 'N/A'}</div>
                <div className="field compared-to">📦 Compared to Volume: {d.compared?.volume?.toLocaleString() || 'N/A'}</div>
              </div>
            );
          })}
        </div>

        <div className={`sidebar ${drawerClosing ? 'close' : drawerOpen ? 'open' : ''}`}>
          <input
            className="search-input"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="coin-list">
            {filtered.map((n) => (
              <button key={n} onClick={() => replaceCrypto(n)}>{n}</button>
            ))}
          </div>
        </div>

        <div className="signal-log modern-dark-signal-log">
          <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📈 Signal History</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#aaa' }}>
              Toggle notification by clicking the coin icon
            </span>
          </h3>
          <div className="log-list modern-dark-log-list">
            {signalHistory.map((l, i) => (
              <div key={i} className={`log-entry modern-dark-log-entry signal-${getSignalClass(l.signal)}`}>
                <span className="log-time">{l.time}</span>
                <span className="log-coin">{l.coin}</span>
                <span className="log-signal">{l.signal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
