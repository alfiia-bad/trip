import React, { useState, useEffect, useRef, useMemo } from 'react';
import mountainImage from './assets/montain2.jpg';
import './index.css';
import SettingsModal from './components/SettingsModal'; 
import TransferModal from './components/TransferModal';
import CalculatorModal from './components/CalculatorModal';
import { BiEditAlt, BiTrash, BiCalculator } from 'react-icons/bi';
import { IoMdSettings } from "react-icons/io";
import { FaMoneyBillTransfer } from 'react-icons/fa6';

function formatDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
}

function MissingRatesWarning({ missingCurrencies }) {
  if (missingCurrencies.length === 0) return null;

  return (
    <div style={{ color: 'red', fontSize: 14, marginLeft: 8, marginTop: 8 }}>
      {missingCurrencies.map(c => (
        <div key={c}>
          * Расчеты могут быть неправильные, так как не указан курс валют для "{c}"
        </div>
      ))}
    </div>
  );
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [currencyRate, setCurrencyRate] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [forWhomDropdownOpen, setForWhomDropdownOpen] = useState(false);
  const forWhomRef = useRef(null);
  const [editingRate, setEditingRate] = React.useState(null);
  const [editingRateInput, setEditingRateInput] = React.useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [exchangeMatrix, setExchangeMatrix] = useState({});
  const [currencyList, setCurrencyList] = useState([]);
  const [defaultCurrency, setDefaultCurrency] = useState('');
  const [missingCurrencies, setMissingCurrencies] = useState([]);

  useEffect(() => {
    document.documentElement.style.setProperty('--mountain-image', `url(${mountainImage})`);
    fetchExpenses();
    fetchInitialSettings();
  }, []);

  useEffect(() => {
    if (currencies.length > 0 && defaultCurrency) {
      setForm(f => ({ ...f, currency: defaultCurrency }));
    }
  }, [currencies, defaultCurrency]);

    // Закрытие мультиселекта по клику вне
  useEffect(() => {
    function handleClickOutside(event) {
      if (forWhomRef.current && !forWhomRef.current.contains(event.target)) {
        setForWhomDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchExpenses = async () => {
    const res = await fetch('/api/expenses');
    const data = await res.json();
    setExpenses(data);
  };

  const openDeleteModal = (index) => {
    setDeleteIndex(index);
  };
  
  const closeDeleteModal = () => {
    setDeleteIndex(null);
  };
  
  const confirmDelete = async () => {
    const expenseToDelete = expenses[deleteIndex];
    if (!expenseToDelete) return;
  
    await fetch(`/api/expenses/${expenseToDelete.id}`, {
      method: 'DELETE'
    });
  
    setDeleteIndex(null);
    fetchExpenses();
  };

  const fetchExchangeMatrix = async () => {
    const res = await fetch('/api/exchange-matrix');
    const { currencies, matrix } = await res.json();
    setCurrencies(currencies);
    setExchangeMatrix(matrix);

    // вычисляем missingCurrencies
    const missing = currencies.filter((from, i) =>
      currencies.some((to, j) => {
        if (i === j) return false;
        const rate = matrix[i]?.[j];
        return rate == null || rate === 0;
      })
    );
    setMissingCurrencies(missing);
  };

  // при монтировании и после закрытия TransferModal
  useEffect(() => {
    fetchExchangeMatrix();
  }, []);
  
  const handleCloseTransfer = () => {
    setShowTransfer(false);
    fetchExchangeMatrix(); // обновить курсы и missingCurrencies
  };

  const handleEdit = (index) => {
    const item = expenses[index];
    const forWhomParsed = item.forWhom.split(' + '); // если хранишь как строку
  
    setForm({
      who: item.who,
      what: item.what,
      amount: item.amount,
      currency: item.currency,
      date: item.date,
      forWhom: forWhomParsed
    });
  };
  
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getLocalDateTimeString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const [form, setForm] = useState({
    who: '',
    what: '',
    amount: '',
    currency: '',
    date: getLocalDateTimeString(), // ← вот здесь
    forWhom: [],
  });
  
  const parsedDate = new Date(form.date);
 
  function convertToTotal(targetCurrency, currencyAmounts, matrix) {
    let total = 0;
    for (const [cur, amt] of Object.entries(currencyAmounts)) {
      const rate = matrix[cur]?.[targetCurrency] ?? 1;
      if (amt > 0) {
        const converted = +(amt * rate).toFixed(8);
        total = +(total + converted).toFixed(8);
      }
    }
    return total;
  }

  const missingCurrencies = useMemo(() => {
    if (!exchangeMatrix || currencies.length === 0) return [];
  
    return currencies.filter(code => {
      return currencies.some(otherCode => {
        if (otherCode === code) return false;
        const rate = exchangeMatrix[code]?.[otherCode];
        // если rate null, undefined или 0 — считаем, что курс отсутствует
        return rate == null || rate === 0;
      });
    });
  }, [exchangeMatrix, currencies]);
  
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value;
    if (/^\d*([.,]\d{0,2})?$/.test(raw) || raw === '') {
      setForm(f => ({ ...f, amount: raw }));
    }
  };

  const handleSelectChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const toggleForWhom = (name) => {
    setForm(f => {
      const current = Array.isArray(f.forWhom) ? f.forWhom : [];
      if (current.includes(name)) {
        return { ...f, forWhom: current.filter(p => p !== name) };
      } else {
        return { ...f, forWhom: [...current, name] };
      }
    });
  };
  
  const handleEditExchangeRate = () => {
    setEditingRateInput(currencyRate.toString().replace('.', ','));
    setEditingRate(true);
  };
  
  const handleEditingRateChange = (e) => {
    const val = e.target.value;
    if (/^\d*([.,]\d{0,2})?$/.test(val) || val === '') {
      setEditingRateInput(val);
    }
  };
  
  const saveNewRate = async () => {
    if (!editingRateInput) {
      alert('Введите курс');
      return;
    }
    const normalized = editingRateInput.replace(',', '.');
    const parsed = parseFloat(normalized);
  
    if (isNaN(parsed) || parsed <= 0) {
      alert('Введите корректное положительное число с максимум двумя знаками после запятой');
      return;
    }
  
    try {
      const response = await fetch('/api/currency-rate', {
        method: 'PUT', // PUT, т.к. в бэке используется PUT
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_currency: 'GEL',
          to_currency: 'RUB',
          rate: parsed
        })
      });
      if (!response.ok) {
        const err = await response.json();
        alert('Ошибка при сохранении курса: ' + err.detail);
        return;
      }
      setCurrencyRate(parsed);
      setEditingRate(false);
    } catch (err) {
      alert('Ошибка при сохранении курса');
      console.error(err);
    }
  };

  const isFormValid = () => {
    const { who, what, amount, currency, date, forWhom } = form;
    return (
      who.trim() !== '' &&
      what.trim() !== '' &&
      amount.trim() !== '' &&
      currency.trim() !== '' &&
      date.trim() !== '' &&
      Array.isArray(forWhom) &&
      forWhom.length > 0
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      alert('Пожалуйста, заполните все поля!');
      return;
    }

    const forWhomStr = form.forWhom.join(' + ');

    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, forWhom: forWhomStr })
    });
    setForm({ who: '', what: '', amount: '', currency: currencies?.[0] || '', date: getLocalDateTimeString(), forWhom: [] });
    fetchExpenses();
  };

  useEffect(() => {
    fetch('/api/default-currency')
      .then(res => res.json())
      .then(data => {
        setDefaultCurrency(data.code);
        setForm(f => ({ ...f, currency: data.code }));
      })
      .catch(console.error);
  }, []);

  const groupedExpenses = {};

  expenses.forEach(exp => {
    const key = `${exp.who} платила за ${exp.forWhom}`;
    const amount = parseFloat(exp.amount.replace(',', '.'));
    const currency = exp.currency;
  
    if (!groupedExpenses[key]) {
      groupedExpenses[key] = { currencyAmounts: {}, raw: exp };
      currencies.forEach(cur => {
        groupedExpenses[key].currencyAmounts[cur] = 0;
      });
    }
  
    groupedExpenses[key].currencyAmounts[currency] += amount;
  });

  const fetchInitialSettings = async () => {
    try {
      const participantsRes = await fetch('/api/participants');
      if (!participantsRes.ok) throw new Error('Ошибка загрузки участников');
      const participantsData = await participantsRes.json();
  
      const currenciesRes = await fetch('/api/currencies');
      if (!currenciesRes.ok) throw new Error('Ошибка загрузки валют');
      const currenciesData = await currenciesRes.json();
      const normalizedCurrencies = currenciesData.map((item, idx) =>
        typeof item === 'string'
          ? { id: idx, code: item }
          : item
        );
      normalizedCurrencies.sort((a, b) => a.id - b.id);
      setParticipants(participantsData);
      setCurrencies(currenciesData);
    } catch (error) {
      console.error(error);
      alert('Ошибка при начальной загрузке данных участников/валют');
    }
  };

  const openSettings = () => {
    setShowSettings(true);
  };

  const closeSettings = async () => {
    setShowSettings(false);
    await fetchInitialSettings();
    await fetchExpenses();
    const res = await fetch('/api/default-currency');
    const data = await res.json();
    setDefaultCurrency(data.code);
    setForm(f => ({
      ...f,
      currency: f.currency || data.code
    }));
  };

  const forWhomDisplay = form.forWhom.length > 0 ? form.forWhom.join(' + ') : '';

  function convertAmount(amount, fromCurrency, toCurrency) {
    if (!exchangeMatrix[fromCurrency] || !exchangeMatrix[fromCurrency][toCurrency]) return 0;
    return amount * exchangeMatrix[fromCurrency][toCurrency];
  }  

  let debts = {};
  if (expenses.length > 0 && participants.length > 0 && currencies.length > 0) {
    const debtsRaw = {};

    expenses.forEach(exp => {
      const ppl = exp.forWhom.split(' + ');
      const share = parseFloat(exp.amount.replace(',', '.')) / ppl.length;
      ppl.forEach(person => {
        if (person === exp.who) return;
        debtsRaw[person] ||= {};
        debtsRaw[person][exp.who] ||= {};
        debtsRaw[person][exp.who][exp.currency] =
          (debtsRaw[person][exp.who][exp.currency] || 0) + share;
      });
    });

    debts = {};

    participants.forEach(a => {
      participants.forEach(b => {
        if (a === b) return;
        currencies.forEach(cur => {
          const aOwesB = debtsRaw[a]?.[b]?.[cur] || 0;
          const bOwesA = debtsRaw[b]?.[a]?.[cur] || 0;
          const net = aOwesB - bOwesA;
          if (net > 0) {
            debts[a] = debts[a] || {};
            debts[a][b] = debts[a][b] || {};
            debts[a][b][cur] = net;
          } else if (net < 0) {
            debts[b] = debts[b] || {};
            debts[b][a] = debts[b][a] || {};
            debts[b][a][cur] = -net;
          }
        });
      });
    });
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1 className="header-title">Гамарджоба, тут наши расходы на поездку, друг ♥</h1>
      </div>

      <div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select name="who" className="who-select" value={form.who} onChange={handleSelectChange} required>
            <option value="" disabled hidden>Кто платил</option>
            {participants && participants.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button onClick={openSettings} title="Настройки" className="settings-icon-btn" aria-label="Настройки" >
            <IoMdSettings size={32} color="#718583" />
          </button>
        </div> 
        <input name="what" placeholder="За что платил" value={form.what} onChange={handleChange} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input name="amount" placeholder="Сколько" inputMode="decimal" pattern="^\d+([.,]\d{0,2})?$" value={form.amount} onChange={handleAmountChange} style={{ marginTop: 0, marginBottom: 0 }} />
          <button onClick={() => setShowTransfer(true)} title="Перевод валют" className="settings-icon-btn" aria-label="Перевод валют">
            <FaMoneyBillTransfer size={32} color="#718583" />
          </button>  
        </div>      
        
        <select name="currency" value={form.currency} onChange={handleSelectChange} required>
          <option value="" disabled hidden>Валюта</option>
          {currencies && currencies.map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
          
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '8px 0px' }}>
          <input type="datetime-local" name="date" placeholder="Дата" value={form.date} onChange={handleChange} style={{ marginTop: 0, marginBottom: 0 }} />
          <button onClick={() => setShowCalc(true)} title="Калькулятор переводов" className="settings-icon-btn" aria-label="Калькулятор переводов">
            <BiCalculator size={32} color="#718583" />
          </button>
        </div>  
          
        <div
          className="forWhom-multiselect"
          ref={forWhomRef}
          style={{ position: 'relative', display: 'inline-block', width: 300 }}
        >
          <div className="forWhom-display" onClick={() => setForWhomDropdownOpen(o => !o)} style={{color: form.forWhom.length === 0 ? '#999' : '#333'}}>
            {forWhomDisplay || 'За кого платил'}
          </div>

          {forWhomDropdownOpen && participants && (
            <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: 'white', border: '1px solid #ccc', borderRadius: 8, maxHeight: 150, overflowY: 'auto', width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              {participants.map(p => (
                <label
                  key={p}
                  style={{ display: 'flex', alignItems: 'center', padding: '0.5rem', justifyContent: 'flex-start', cursor: 'pointer', gap: '0.5rem' }}
                >
                  <input type="checkbox" checked={form.forWhom.includes(p)} onChange={() => toggleForWhom(p)} style={{ margin: 0, marginRight: '0.5rem', flexShrink: 0 }} />
                  <span style={{ textAlign: 'left' }}>{p}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleSubmit}>Добавить в список</button>
      </div>

      <h2>Таблица расходов</h2>
      <div className="table-wrapper">
        <table className="expense-table">
          <thead>
            <tr>
              <th>Кто платил</th>
              <th>За что платил</th>
              <th>Сколько</th>
              <th>Валюта</th>
              <th>Дата</th>
              <th>За кого платил</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, i) => (
              <tr key={i}>
                <td>{e.who}</td>
                <td>{e.what}</td>
                <td>{e.amount}</td>
                <td>{e.currency}</td>
                <td>{formatDate(e.date)}</td>
                <td>{e.forWhom}</td>
                      <td>
                        <button className="delete-btn icon-btn table-delete-btn" onClick={() => openDeleteModal(i)} title="Удалить" >
                          <BiTrash />
                        </button>
                      </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {currencies && currencies.length > 0 && (
        <div style={{ marginTop: '1rem', marginLeft: '8px', fontSize: '14px', fontWeight: 'bold', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}>
          {currencies.map(currency => {
            const total = expenses
              .filter(e => e.currency === currency)
              .reduce((sum, item) => {
                const amount = parseFloat(item.amount.replace(',', '.'));
                return sum + (isNaN(amount) ? 0 : amount);
              }, 0);
            return (
              <div key={currency}>
                Итого в "{currency}": {total.toFixed(2)}
              </div>
            );
          })}
        </div>
      )}

      {Object.keys(debts).length > 0 && (
        <div className="debts-summary">
          <h2>Расчетный листок</h2>
          <table className="debts-table">
            <thead>
              <tr>
                <th>Должнички</th>
                {currencies.map(cur => (
                  <th key={cur}>Всё в {cur}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {participants.map((from, i) =>
                participants.slice(i + 1).map(to => {
                  const entryA = debts[from]?.[to] || {};
                  const entryB = debts[to]?.[from] || {};
                  const netEntry = {};
                  currencies.forEach(cur => {
                    netEntry[cur] = (entryA[cur] || 0) - (entryB[cur] || 0);
                  });
                  if (currencies.every(cur => Math.abs(netEntry[cur]) < 0.0001)) return null;
                  const mainCurrency = currencies[0];
                  const mainNet = netEntry[mainCurrency];

                  let debtor, creditor, entry;
                  if (mainNet > 0) {
                    debtor = from;
                    creditor = to;
                    entry = netEntry;
                  } else {
                    debtor = to;
                    creditor = from;
                    entry = {};
                    currencies.forEach(cur => {
                      entry[cur] = -netEntry[cur];
                    });
                  }

                  if (currencies.every(cur => Math.abs(entry[cur]) < 0.0001)) return null;

                  return (
                    <tr key={`${debtor}->${creditor}`}>
                      <td>Долг у {debtor} перед {creditor}</td>
                      {currencies.map(cur => (
                        <td key={cur}>
                          {convertToTotal(cur, entry, exchangeMatrix).toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {missingCurrencies.length > 0 && (
        <MissingRatesWarning missingCurrencies={missingCurrencies} />
      )}
        
      <p className="footer-note">
        Разработано с любовью, вопросы и пожелания в тг 
        <a href="https://t.me/alfeikaa" target="_blank" rel="noopener noreferrer">@alfeikaa</a>
      </p>

      {showSettings && participants && currencies && (
        <SettingsModal 
          onClose={closeSettings}
          participants={participants}
          setParticipants={setParticipants}
          currencies={currencies}
          setCurrencies={setCurrencies}
          exchangeMatrix={exchangeMatrix}
          setExchangeMatrix={setExchangeMatrix}
          defaultCurrency={defaultCurrency}
        />
      )}

      {showTransfer && (
        <TransferModal
          rate={currencyRate}
          onSaveRate={newRate => {
            setCurrencyRate(newRate);
            setShowTransfer(false);
            fetchExchangeMatrix();
          }}
          onClose={handleCloseTransfer}
        />
      )}
      
      {showCalc && (
        <CalculatorModal onClose={() => setShowCalc(false)} />
      )}

      {deleteIndex !== null && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Вы уверены, что хотите удалить строку? Действие необратимо</h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button
                style={{ backgroundColor: '#b00020', color: 'white', flex: 1, marginRight: '0.5rem' }}
                onClick={confirmDelete}
              >
                Удалить
              </button>
              <button
                style={{ backgroundColor: '#ccc', color: '#333', flex: 1, marginLeft: '0.5rem' }}
                onClick={closeDeleteModal}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
            
    </div>
  );
}

export default App;
