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
    <div style={{ color: 'red', fontSize: 14, marginTop: 8 }}>
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

  useEffect(() => {
    document.documentElement.style.setProperty('--mountain-image', `url(${mountainImage})`);
    fetchExpenses();
    fetchInitialSettings();
  }, []);

  useEffect(() => {
    if (currencies.length > 0 && !form.currency) {
      setForm(f => ({ ...f, currency: currencies[0].code }));
    }
  }, [currencies]);

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

  useEffect(() => {
    fetch("/api/exchange-matrix")
      .then(res => res.json())
      .then(data => {
        const { currencies, matrix } = data;
        const matrixObj = {};
        currencies.forEach((from, i) => {
          matrixObj[from] = {};
          currencies.forEach((to, j) => {
            matrixObj[from][to] = matrix[i][j];
          });
        });
        setExchangeMatrix(matrixObj);
        setCurrencyList(currencies);
      });
  }, []);
  
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
    currency: currencies?.[0] || '',
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
    if (!exchangeMatrix || !currencies) return [];
  
    // Создаем карту валют к индексам
    const currencyIndexMap = currencies.reduce((acc, cur, i) => {
      acc[cur] = i;
      return acc;
    }, {});
  
    return currencies.filter((cur, i) => {
      // Проверяем для каждой валюты, что для каждой другой валюты есть курс в exchangeMatrix
      for (let j = 0; j < currencies.length; j++) {
        if (i === j) continue;
  
        // Если для пары отсутствует курс (null или undefined или 0)
        if (
          !exchangeMatrix[i] || 
          exchangeMatrix[i][j] == null ||
          exchangeMatrix[i][j] === 0
        ) {
          // Чтобы не показывать предупреждение для валют, которые нигде не используются,
          // можно добавить проверку, что в расходах эта валюта действительно есть
          // Но если это не нужно - просто возвращаем true
          return true;
        }
      }
      return false;
    });
  }, [exchangeMatrix, currencies]);

    // Для обычных input'ов: что, сколько, дата
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value;
    
    // Разрешаем ввод: 123, 5.4, 5,44, 0.99
    if (/^\d*([.,]\d{0,2})?$/.test(raw) || raw === '') {
      setForm(f => ({ ...f, amount: raw }));
    }
  };

  // Для select "Кто платил" и "Валюта"
  const handleSelectChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Для чекбоксов "За кого платил"
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
  
  // Открыть поле ввода курса
  const handleEditExchangeRate = () => {
    setEditingRateInput(currencyRate.toString().replace('.', ','));
    setEditingRate(true);
  };
  
  // Обработка изменения в input курса
  const handleEditingRateChange = (e) => {
    const val = e.target.value;
    // Разрешаем цифры, точку или запятую, максимум 2 знака после запятой
    if (/^\d*([.,]\d{0,2})?$/.test(val) || val === '') {
      setEditingRateInput(val);
    }
  };
  
  // Сохранение нового курса с валидацией
  const saveNewRate = async () => {
    if (!editingRateInput) {
      alert('Введите курс');
      return;
    }
    // Заменяем запятую на точку для парсинга
    const normalized = editingRateInput.replace(',', '.');
    const parsed = parseFloat(normalized);
  
    if (isNaN(parsed) || parsed <= 0) {
      alert('Введите корректное положительное число с максимум двумя знаками после запятой');
      return;
    }
  
    // Сохраняем
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

        // Превращаем массив forWhom в строку через " + "
    const forWhomStr = form.forWhom.join(' + ');

    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, forWhom: forWhomStr })
    });
    setForm({ who: '', what: '', amount: '', currency: currencies?.[0] || '', date: getLocalDateTimeString(), forWhom: [] });
    fetchExpenses();
  };


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
      currenciesData.sort((a, b) => a.id - b.id);
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
  };

    // Отображение выбранных участников через +
  const forWhomDisplay = form.forWhom.length > 0 ? form.forWhom.join(' + ') : '';


  let debts = {};
  if (expenses.length > 0 && participants.length > 0 && currencies.length > 0) {
    // 1) raw‑долги
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
  
    // 2) нормализация
    debts = JSON.parse(JSON.stringify(debtsRaw));
    currencies.forEach(cur => {
      participants.forEach(a => {
        participants.forEach(b => {
          if (a === b) return;
          const ab = debtsRaw[a]?.[b]?.[cur] || 0;
          const ba = debtsRaw[b]?.[a]?.[cur] || 0;
          const diff = ab - ba;
          debts[a] ||= {};
          debts[a][b] ||= {};
          debts[b] ||= {};
          debts[b][a] ||= {};
          debts[a][b][cur] = diff > 0 ? diff : 0;
          debts[b][a][cur] = diff < 0 ? -diff : 0;
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
        {/* Кто платил - селект */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <select name="who" className="who-select" value={form.who} onChange={handleSelectChange} required>
            <option value="" disabled hidden>Кто платил</option>
            {participants && participants.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={openSettings}
            title="Настройки"
            className="settings-icon-btn"
            aria-label="Настройки"  
          >
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
          {currencies && currencies.map(c => (
            <option key={c.id} value={c.code}>{c.code}</option>
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
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              zIndex: 10,
              background: 'white',
              border: '1px solid #ccc',
              borderRadius: 8,
              maxHeight: 150,
              overflowY: 'auto',
              width: '100%',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}>
              {participants.map(p => (
                <label
                  key={p}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.5rem',
                    justifyContent: 'flex-start',
                    cursor: 'pointer',
                    gap: '0.5rem'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.forWhom.includes(p)}
                    onChange={() => toggleForWhom(p)}
                    style={{ 
                      margin: 0,
                      marginRight: '0.5rem',
                      flexShrink: 0 
                    }}
                  />
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
                        <button
                          className="delete-btn icon-btn table-delete-btn"
                          onClick={() => openDeleteModal(i)}
                          title="Удалить"
                        >
                          <BiTrash />
                        </button>
                      </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Общая сумма */}
      {currencies && currencies.length > 0 && (
        <div style={{ marginTop: '1rem', marginLeft: '8px', fontSize: '1.2rem', fontWeight: 'bold', textShadow: '1px 1px 4px rgba(0, 0, 0, 0.5)' }}>
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

      {expenses.length > 0 && participants && currencies && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Расчетный листок</h2>
          <div className="table-wrapper">
            <table className="expense-table">
              <thead>
                <tr>
                  <th>Что происходило</th>
                  {currencies.map((cur, idx) => (
                    <th key={idx}>{cur}</th>
                  ))}
                  {currencies.map((cur, idx) => (
                    <th key={`conv-${idx}`}>Всё в {cur}</th>
                  ))}
                </tr>
              </thead>
                
              <tbody>
              {Object.entries(groupedExpenses)
                .filter(([desc]) => !desc.includes('платила за') && desc.trim() !== '')
                .map(([desc, data], idx) => {
                const { currencyAmounts } = data;
              
                return (
                  <tr key={`group-${idx}`}>
                    <td>{desc}</td>
              
                    {currencies.map(cur => (
                      <td key={`amount-${idx}-${cur}`}>
                        {currencyAmounts[cur] > 0 ? currencyAmounts[cur].toFixed(2) : ''}
                      </td>
                    ))}
              
                    {currencies.map(cur => (
                      <td key={`conv-${idx}-${cur}`}>
                        {convertToTotal(cur, currencyAmounts, exchangeMatrix).toFixed(2)}
                      </td>
                    ))}
                  </tr>
                );
              })}
                                
                {participants.flatMap((from) =>
                  participants
                    .filter(to => to !== from)
                    .map(to => {
                      const rowDebts = debts[from]?.[to] || {};
                      const currencyAmounts = {};
          
                      currencies.forEach(cur => {
                        currencyAmounts[cur] = rowDebts[cur] || 0;
                      });
          
                      const convertedTotals = currencies.map(targetCurrency => {
                        const total = convertToTotal(targetCurrency, currencyAmounts, exchangeMatrix);
                        return total.toFixed(2);
                      });
          
                      const isEmpty = Object.values(currencyAmounts).every(v => v === 0);
                      if (isEmpty) return null;
          
                      return (
                        <tr key={`${from}-${to}`}>
                          <td>{from} должна {to}</td>
                          {currencies.map(cur => (
                            <td key={`${from}-${to}-${cur}`}>
                              {currencyAmounts[cur] > 0 ? currencyAmounts[cur].toFixed(2) : ''}
                            </td>
                          ))}
                          {convertedTotals.map((total, idx) => (
                            <td key={`converted-${from}-${to}-${idx}`}>
                              {parseFloat(total) > 0 ? total : ''}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                )}
              </tbody>
   
            </table>
          </div>
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
        />
      )}

      {showTransfer && (
        <TransferModal
          rate={currencyRate}
          onSaveRate={newRate => {
            setCurrencyRate(newRate);
            setShowTransfer(false);
            // а если нужно, запушить на сервер тут
          }}
          onClose={() => setShowTransfer(false)}
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
