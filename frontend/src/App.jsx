import React, { useState, useEffect } from 'react';
import API from './services/api';
import Plot from 'react-plotly.js';

// IMMEDIATE INSTANT VOICE TRIGGER (Fires before React even finishes rendering)
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.cancel();
  const instantUtterance = new SpeechSynthesisUtterance("Welcome to Perseus Trader, Commander. Register your institutional profile.");
  instantUtterance.pitch = 0.1;
  instantUtterance.rate = 0.9;
  instantUtterance.volume = 1.0;
  window.speechSynthesis.speak(instantUtterance);
}

function App() {
  const [token, setToken] = useState('');
  const [authMode, setAuthMode] = useState('register'); 
  const [otpCode, setOtpCode] = useState('');
  
  const [activeTab, setActiveTab] = useState('dashboard');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [stockSymbol, setStockSymbol] = useState('GOOGL');
  const [timePeriod, setTimePeriod] = useState('1y');
  const [chartType, setChartType] = useState('candlestick');
  
  const [marketData, setMarketData] = useState(null);
  const [tradeShares, setTradeShares] = useState(1);
  const [message, setMessage] = useState('');

  // Custom Cyber Guide Bot States
  const [tutorialStep, setTutorialStep] = useState(null);
  const tutorialDialogues = [
    {
      title: "1. Market Interface",
      text: "Greetings, Commander. Enter any stock ticker like AAPL or GOOGL here to analyze live institutional market data.",
      tab: "dashboard"
    },
    {
      title: "2. Order Execution Desk",
      text: "Input your desired quantity and execute a BUY or SELL simulated order right from this terminal.",
      tab: "dashboard"
    },
    {
      title: "3. Net Equity & Portfolio",
      text: "Navigate to your Portfolio tab to monitor your Net Equity, liquid cash, and complete transaction history.",
      tab: "portfolio"
    }
  ];

  // Lightning Fast Speech Helper
  const speakOptimus = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 0.1; 
      utterance.rate = 0.9;  
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const deepVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Microsoft David') || v.name.includes('Guy'));
      if (deepVoice) {
        utterance.voice = deepVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    fetchStockData('GOOGL', '1y');
  }, []);

  // Auth Handlers
  const handleSimpleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('auth/login/', { username, password });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('username', res.data.username);
      setToken(res.data.access);
      setUsername(res.data.username);
      setMessage('Terminal Authorized Successfully.');
      speakOptimus("Access granted. Main trading terminal unlocked.");
      fetchPortfolio();
      fetchTransactions();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Invalid credentials.');
      speakOptimus("Authorization failed. Check your security credentials.");
    }
  };

  const handleRegisterRequest = async (e) => {
    e.preventDefault();
    try {
      await API.post('auth/register-step1/', { username, email, password });
      setAuthMode('verify');
      setMessage('Security OTP dispatched to your email.');
      speakOptimus("Transmission sent. Enter your 6 digit security verification code to complete registration.");
    } catch (err) {
      setMessage(err.response?.data?.error || 'Registration failed.');
      speakOptimus("Registration transmission failed. Try another identifier.");
    }
  };

  const handleRegisterVerify = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('auth/register-step2/', { username, password, otp: otpCode });
      localStorage.setItem('access_token', res.data.access);
      localStorage.setItem('username', res.data.username);
      setToken(res.data.access);
      setUsername(res.data.username);
      setMessage('Account Activated.');
      speakOptimus("Account successfully initialized. Entering main terminal screen.");
      fetchPortfolio();
      fetchTransactions();
    } catch (err) {
      setMessage(err.response?.data?.error || 'OTP Verification failed.');
      speakOptimus("Verification code invalid.");
    }
  };

  const fetchPortfolio = async () => {
    try {
      const res = await API.get('portfolio/');
      setPortfolio(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await API.get('transactions/');
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStockData = async (symbol = stockSymbol, period = timePeriod) => {
    try {
      const sym = symbol.toUpperCase();
      const res = await API.get(`stock/${sym}/history/?period=${period}`);
      setMarketData(res.data);
    } catch (err) {
      setMessage('Stock ticker not found');
      speakOptimus("Warning. Invalid ticker symbol.");
    }
  };

  const executeTrade = async (action) => {
    if (!token) {
      setMessage('Please log in to execute trade orders');
      speakOptimus("Restricted action. Authentication required.");
      return;
    }
    try {
      const res = await API.post('trade/', {
        symbol: stockSymbol,
        action: action,
        shares: parseFloat(tradeShares),
      });
      setMessage(res.data.message);
      fetchPortfolio();
      fetchTransactions();
      speakOptimus(`Order executed successfully. ${action} order processed for ${stockSymbol}.`);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Trade execution failed');
      speakOptimus("Trade execution failed. Check available liquidity.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    setToken('');
    setPortfolio(null);
    setTransactions([]);
    setAuthMode('register'); 
    
    setUsername('');
    setPassword('');
    setEmail('');
    setOtpCode('');
    setMessage('Disconnected successfully.');
    speakOptimus("Session terminated. Please register a new account to continue.");
  };

  const totalHoldingsValue = portfolio ? portfolio.holdings.reduce((sum, h) => sum + h.total_value, 0) : 0;
  const netEquity = portfolio ? portfolio.balance + totalHoldingsValue : 0;
  const totalPL = portfolio ? portfolio.holdings.reduce((sum, h) => sum + h.profit_loss, 0) : 0;

  return (
    <div 
      onClick={() => {
        // Fallback: If browser blocks autoplay until user clicks anywhere on screen, this instantly triggers audio
        if (!token && window.speechSynthesis && !window.speechSynthesis.speaking) {
          speakOptimus("Perseus Trader secure gateway active.");
        }
      }}
      className="h-screen w-screen flex flex-col bg-gradient-to-br from-[#07090e] via-[#0b0e14] to-[#151a26] text-slate-100 font-sans overflow-hidden"
    >
      
      {/* Custom Cyber Guide Bot Modal */}
      {tutorialStep !== null && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121620]/95 backdrop-blur-[25px] border border-emerald-500/40 p-6 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)] w-96 animate-fade-in">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
            <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">CYBER BOT : OPTIMUS PRIME</h3>
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">{tutorialDialogues[tutorialStep].title}</h4>
          <p className="text-xs text-slate-300 font-mono mb-6 leading-relaxed">{tutorialDialogues[tutorialStep].text}</p>
          <div className="flex justify-between items-center">
            <button 
              onClick={() => {
                setTutorialStep(null);
                speakOptimus("Tutorial bypassed.");
              }} 
              className="text-[10px] uppercase font-bold text-slate-500 hover:text-white transition-colors"
            >
              Skip Tutorial
            </button>
            <div className="flex space-x-2">
              {tutorialStep > 0 && (
                <button 
                  onClick={() => {
                    const prev = tutorialStep - 1;
                    setTutorialStep(prev);
                    setActiveTab(tutorialDialogues[prev].tab);
                    speakOptimus(tutorialDialogues[prev].text);
                  }} 
                  className="px-3 py-1.5 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-all"
                >
                  Back
                </button>
              )}
              <button 
                onClick={() => {
                  if (tutorialStep < tutorialDialogues.length - 1) {
                    const next = tutorialStep + 1;
                    setTutorialStep(next);
                    setActiveTab(tutorialDialogues[next].tab);
                    speakOptimus(tutorialDialogues[next].text);
                  } else {
                    setTutorialStep(null);
                    speakOptimus("Simulation protocol complete. You are ready to trade, Commander.");
                  }
                }} 
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
              >
                {tutorialStep === tutorialDialogues.length - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      {tutorialStep === null && token && (
        <button 
          onClick={() => {
            setTutorialStep(0);
            setActiveTab(tutorialDialogues[0].tab);
            speakOptimus(tutorialDialogues[0].text);
          }} 
          className="fixed bottom-6 right-6 z-50 bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-400 hover:text-slate-950 font-black px-4 py-3 rounded-full text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center space-x-2"
        >
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span>CYBER GUIDE (BOT)</span>
        </button>
      )}

      {/* Navbar Header */}
      <nav className="h-16 bg-[#121620]/40 backdrop-blur-[20px] border-b border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] px-6 flex justify-between items-center shrink-0 z-50">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)] text-slate-950 font-black px-2 py-0.5 rounded text-xs">PT</div>
            <span className="font-extrabold tracking-widest text-white text-sm">PERSEUS<span className="text-emerald-400">TRADER</span></span>
          </div>
          {token && (
            <div className="flex space-x-3 text-sm">
              <button 
                onClick={() => {
                  setActiveTab('dashboard');
                  speakOptimus("Terminal grid active.");
                }} 
                className={`px-4 py-1.5 rounded-lg transition-all font-medium ${activeTab === 'dashboard' ? 'bg-white/10 text-emerald-400 border border-white/[0.08]' : 'text-slate-400 hover:text-white'}`}
              >
                Terminal
              </button>
              <button 
                onClick={() => {
                  setActiveTab('portfolio');
                  speakOptimus("Accessing portfolio vault.");
                }} 
                className={`portfolio-nav-btn px-4 py-1.5 rounded-lg transition-all font-medium ${activeTab === 'portfolio' ? 'bg-white/10 text-emerald-400 border border-white/[0.08]' : 'text-slate-400 hover:text-white'}`}
              >
                Portfolio
              </button>
              <button 
                onClick={() => {
                  setActiveTab('profile');
                  speakOptimus("System identity panel online.");
                }} 
                className={`px-4 py-1.5 rounded-lg transition-all font-medium ${activeTab === 'profile' ? 'bg-white/10 text-emerald-400 border border-white/[0.08]' : 'text-slate-400 hover:text-white'}`}
              >
                Profile
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {token ? (
            <>
              {portfolio && <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">Cash: ${portfolio.balance.toLocaleString()}</span>}
              <button onClick={handleLogout} className="text-xs bg-black/20 hover:bg-rose-500/20 text-slate-300 border border-white/[0.08] px-4 py-1.5 rounded-lg transition-all">Disconnect</button>
            </>
          ) : (
            <span className="text-xs text-emerald-400 font-mono tracking-widest uppercase">Secure Auth Required</span>
          )}
        </div>
      </nav>

      {message && <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-full text-emerald-400 text-xs shadow-lg flex items-center font-bold uppercase tracking-widest">{message}</div>}

      {/* Auth Modal Overlay */}
      {!token && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-lg z-40 flex items-center justify-center p-4">
          <div className="p-8 bg-[#121620]/95 backdrop-blur-[25px] border border-white/[0.08] rounded-3xl shadow-[0_25px_45px_rgba(0,0,0,0.9)] w-96 relative">
            <h2 className="text-2xl font-black text-center text-white tracking-wider mb-2">PERSEUS<span className="text-emerald-400">TRADER</span></h2>
            
            {/* REGISTER SCREEN */}
            {authMode === 'register' && (
              <>
                <p className="text-xs text-center text-slate-400 mb-6">Step 1: Create Institutional Account</p>
                <form onSubmit={handleRegisterRequest} className="space-y-4" autoComplete="off">
                  <input type="email" name="blank_email_unique" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" data-lpignore="true" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500" required />
                  <input type="text" name="blank_user_unique" placeholder="Choose Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" data-lpignore="true" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500" required />
                  <input type="password" name="blank_pass_unique" placeholder="Choose Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" data-lpignore="true" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500" required />
                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">Send Email OTP</button>
                </form>
                <p 
                  className="mt-6 text-xs text-center cursor-pointer text-slate-400 hover:text-emerald-400" 
                  onClick={() => {
                    setAuthMode('login');
                    speakOptimus("Switching to login section. Enter your credentials.");
                  }}
                >
                  Already registered? Sign In instead
                </p>
              </>
            )}

            {/* OTP VERIFICATION */}
            {authMode === 'verify' && (
              <>
                <p className="text-xs text-center text-slate-400 mb-6">Verify OTP sent to your email</p>
                <form onSubmit={handleRegisterVerify} className="space-y-4" autoComplete="off">
                  <input type="text" placeholder="Enter 6-Digit OTP" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="w-full px-4 py-3 text-center tracking-widest font-mono text-xl rounded-xl bg-black/40 border border-emerald-500 text-emerald-400 focus:outline-none" maxLength="6" required />
                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">Verify & Unlock Terminal</button>
                  <p 
                    className="text-center text-xs text-slate-500 cursor-pointer hover:text-slate-300" 
                    onClick={() => {
                      setAuthMode('register');
                      speakOptimus("Returning to registration screen.");
                    }}
                  >
                    ← Back to Registration
                  </p>
                </form>
              </>
            )}

            {/* LOGIN SECTION */}
            {authMode === 'login' && (
              <>
                <p className="text-xs text-center text-slate-400 mb-6">Step 2: Institutional Gateway Log In</p>
                <form onSubmit={handleSimpleLogin} className="space-y-4" autoComplete="off">
                  <input type="text" name="blank_login_user_unique" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" data-lpignore="true" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500" required />
                  <input type="password" name="blank_login_pass_unique" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" data-lpignore="true" className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-emerald-500" required />
                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">Authenticate & Unlock</button>
                </form>
                <p 
                  className="mt-6 text-xs text-center cursor-pointer text-slate-400 hover:text-emerald-400" 
                  onClick={() => {
                    setAuthMode('register');
                    speakOptimus("Switching to registration screen.");
                  }}
                >
                  Need a new account? Register
                </p>
              </>
            )}

            <p 
              className="mt-4 text-[10px] text-center text-slate-500 cursor-pointer hover:text-white" 
              onClick={() => {
                setToken('GUEST');
                speakOptimus("Entering guest observation mode. Main terminal unlocked.");
              }}
            >
              Continue as Guest (View Mode)
            </p>
          </div>
        </div>
      )}

      {/* Main App Canvas */}
      {token && (
        <div className="flex-1 flex flex-row overflow-hidden w-full relative">
          
          {activeTab === 'dashboard' && (
            <>
              <aside className="w-[340px] bg-[#121620]/40 backdrop-blur-[20px] border-r border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-6 flex flex-col space-y-6 shrink-0 overflow-y-auto z-10">
                <h2 className="text-sm font-black text-white tracking-widest uppercase">Market Interface</h2>
                
                <div className="market-interface-input space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Asset Ticker:</label>
                  <input
                    type="text"
                    value={stockSymbol}
                    onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-4 py-3 text-sm uppercase font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button 
                    onClick={() => {
                      fetchStockData(stockSymbol, timePeriod);
                      speakOptimus(`Loading data stream for asset ${stockSymbol}.`);
                    }} 
                    className="w-full mt-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    Load Market Data
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolution:</label>
                  <select
                    value={timePeriod}
                    onChange={(e) => { 
                      setTimePeriod(e.target.value); 
                      fetchStockData(stockSymbol, e.target.value); 
                      speakOptimus(`Adjusting resolution timeframe to ${e.target.value}.`);
                    }}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="1d">1 Day</option>
                    <option value="5d">5 Days</option>
                    <option value="1mo">1 Month</option>
                    <option value="6mo">6 Months</option>
                    <option value="1y">1 Year</option>
                    <option value="5y">5 Years</option>
                    <option value="max">Max History</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visualization:</label>
                  <div className="flex space-x-3 bg-black/30 p-1.5 rounded-xl border border-white/[0.08]">
                    <button onClick={() => setChartType('line')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${chartType === 'line' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Line</button>
                    <button onClick={() => setChartType('candlestick')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${chartType === 'candlestick' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>Candles</button>
                  </div>
                </div>

                <div className="order-execution-desk pt-6 border-t border-white/[0.08] space-y-3">
                  <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Order Execution Desk</h3>
                  <input
                    type="number"
                    min="1"
                    value={tradeShares}
                    onChange={(e) => setTradeShares(e.target.value)}
                    placeholder="Quantity"
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => executeTrade('BUY')} className="bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-400 hover:text-black font-black py-3 rounded-xl text-xs transition-all">BUY</button>
                    <button onClick={() => executeTrade('SELL')} className="bg-rose-500/20 hover:bg-rose-500 border border-rose-500/30 text-rose-400 hover:text-black font-black py-3 rounded-xl text-xs transition-all">SELL</button>
                  </div>
                </div>
              </aside>

              <main className="flex-1 p-8 space-y-6 overflow-y-auto">
                {marketData && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] rounded-2xl p-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Price</span>
                      <div className="text-3xl font-black font-mono text-white mt-2">${marketData.current_price}</div>
                      <span className={`text-xs font-mono font-bold mt-2 inline-block px-2.5 py-1 rounded-md ${marketData.price_change >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {marketData.price_change >= 0 ? '▲' : '▼'} {Math.abs(marketData.price_change)} ({marketData.percent_change}%)
                      </span>
                    </div>
                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] rounded-2xl p-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Peak</span>
                      <div className="text-2xl font-bold font-mono text-white mt-3">${marketData.day_high}</div>
                    </div>
                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] rounded-2xl p-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Day Floor</span>
                      <div className="text-2xl font-bold font-mono text-white mt-3">${marketData.day_low}</div>
                    </div>
                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] rounded-2xl p-6">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Volume</span>
                      <div className="text-2xl font-bold font-mono text-white mt-3">{marketData.volume.toLocaleString()}</div>
                    </div>
                  </div>
                )}

                <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-2 rounded-3xl h-[550px] w-full">
                  {marketData && marketData.ohlc ? (
                    <Plot
                      data={chartType === 'candlestick' ? [{
                        type: 'candlestick',
                        x: marketData.ohlc.map(d => d.x),
                        open: marketData.ohlc.map(d => d.o),
                        high: marketData.ohlc.map(d => d.h),
                        low: marketData.ohlc.map(d => d.l),
                        close: marketData.ohlc.map(d => d.c),
                        increasing: { line: { color: '#10b981', width: 2 } },
                        decreasing: { line: { color: '#f43f5e', width: 2 } },
                        name: stockSymbol
                      }] : [{
                        type: 'scatter',
                        mode: 'lines',
                        x: marketData.dates,
                        y: marketData.prices,
                        line: { color: '#10b981', width: 2.5 },
                        name: stockSymbol
                      }]}
                      layout={{
                        autosize: true,
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        font: { color: '#64748b' },
                        margin: { l: 60, r: 20, t: 30, b: 40 },
                        xaxis: { gridcolor: 'rgba(255,255,255,0.03)' },
                        yaxis: { gridcolor: 'rgba(255,255,255,0.03)' },
                        showlegend: false
                      }}
                      useResizeHandler={true}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : <div className="flex items-center justify-center h-full text-slate-500">Loading chart...</div>}
                </div>
              </main>
            </>
          )}

          {activeTab === 'portfolio' && (
            <div className="flex-1 p-8 lg:p-12 space-y-8 overflow-y-auto">
              <h2 className="text-3xl font-black text-white tracking-wide">Net Equity <span className="text-emerald-400">Overview</span></h2>

              {portfolio ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-emerald-500/[0.2] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-6 rounded-2xl">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Total Net Equity</span>
                      <div className="text-3xl font-black font-mono text-white mt-2">${netEquity.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    </div>
                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-6 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liquid Cash</span>
                      <div className="text-2xl font-bold font-mono text-white mt-3">${portfolio.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    </div>
                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-6 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Holdings Valuation</span>
                      <div className="text-2xl font-bold font-mono text-white mt-3">${totalHoldingsValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    </div>
                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-6 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unrealized P/L</span>
                      <div className={`text-2xl font-bold font-mono mt-3 ${totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${totalPL.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-6 rounded-3xl">
                    <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-6">Execution & Transaction History</h3>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-black/40 text-emerald-400 sticky top-0">
                          <tr>
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Symbol</th>
                            <th className="p-4">Shares</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Total Execution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-300">
                          {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/5">
                              <td className="p-4 text-slate-400">{tx.date}</td>
                              <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${tx.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{tx.type}</span></td>
                              <td className="p-4 font-bold text-white">{tx.symbol}</td>
                              <td className="p-4">{tx.shares}</td>
                              <td className="p-4">${tx.price}</td>
                              <td className="p-4 font-bold text-white">${tx.total_value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : <p className="text-slate-500">Sign in to view your personalized portfolio and transaction history.</p>}
            </div>
          )}
{activeTab === 'profile' && (
          <div className="flex-1 p-8 lg:p-12 overflow-y-auto z-10 relative custom-scrollbar">
            
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex justify-between items-center border-b border-white/[0.08] pb-4">
                <div>
                  <h2 className="text-3xl font-black text-white tracking-wide">System <span className="text-emerald-400">Identity</span></h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">SECURE INSTITUTIONAL TELEMETRY & CLEARANCE</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-mono text-emerald-400 font-bold">
                  STATUS: OPTIMAL
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Col: ID & Security */}
                <div className="space-y-6">
                  <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-8 rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    
                    <div className="flex flex-col items-center text-center pb-6 border-b border-white/[0.08]">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 p-1 shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-4">
                        <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-4xl font-black text-white tracking-tighter">
                          {username ? username.substring(0, 2).toUpperCase() : 'PT'}
                        </div>
                      </div>
                      <h2 className="text-2xl font-black text-white tracking-wide">{username || 'Guest Access'}</h2>
                      <div className="inline-flex items-center space-x-2 mt-3 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{token ? 'Active Connection' : 'Offline'}</span>
                      </div>
                    </div>

                    <div className="pt-6 space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">User Identifier</span>
                        <div className="bg-black/30 px-4 py-3 rounded-xl border border-white/[0.08] font-mono text-white text-sm">
                          {username || 'Anonymous'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Account Tier</span>
                        <div className="bg-emerald-500/5 px-4 py-3 rounded-xl border border-emerald-500/20 font-mono text-emerald-400 text-sm font-bold flex items-center space-x-2">
                          <span>Institutional Sandbox</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Col: Stats & Metrics Grid */}
                <div className="lg:col-span-2 space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-6 rounded-3xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Total Trade Volume</span>
                        <div className="text-3xl font-black font-mono text-white">$248,102.50</div>
                      </div>
                      <div className="mt-6">
                        <div className="w-full bg-slate-800 rounded-full h-1.5">
                           <div className="bg-emerald-500 h-1.5 rounded-full w-3/4 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-2 block uppercase tracking-widest">75% to Platinum Tier</span>
                      </div>
                    </div>

                    <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-6 rounded-3xl flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Execution Accuracy</span>
                        <div className="text-3xl font-black font-mono text-white">99.98%</div>
                      </div>
                      <div className="mt-6">
                        <div className="flex space-x-1">
                          {[1,2,3,4,5,6,7,8,9,10].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i === 10 ? 'bg-slate-700' : 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`}></div>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-2 block uppercase tracking-widest">Optimal Latency Status</span>
                      </div>
                    </div>
                  </div>

                  {/* Security & API Panel */}
                  <div className="bg-[#121620]/40 backdrop-blur-[20px] border border-white/[0.08] shadow-[0_25px_45px_rgba(0,0,0,0.8)] p-8 rounded-3xl space-y-6">
                     <div className="flex justify-between items-center border-b border-white/[0.08] pb-4">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">API Interface Credentials</h3>
                        <button 
                          onClick={() => playAudio('optimus_success.mp3')}
                          className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-[10px] font-bold text-emerald-400 uppercase tracking-widest transition-all"
                        >
                          Generate New Key
                        </button>
                     </div>
                     <div className="space-y-4">
                       <div className="bg-black/40 p-4 rounded-xl border border-white/[0.08] flex items-center justify-between">
                         <div>
                           <div className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Production Key - Main</div>
                           <div className="text-sm font-mono text-slate-500 select-none">pk_live_***************************8f92</div>
                         </div>
                         <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">ACTIVE</span>
                       </div>
                       <div className="bg-black/40 p-4 rounded-xl border border-white/[0.08] flex items-center justify-between">
                         <div>
                           <div className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Testing Key - Sandbox</div>
                           <div className="text-sm font-mono text-slate-500 select-none">sk_test_***************************3a1b</div>
                         </div>
                         <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">SANDBOX</span>
                       </div>
                     </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      )}
    </div>
  );
}

export default App;