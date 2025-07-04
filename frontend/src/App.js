import React, { useState, useEffect, useRef } from 'react';
import mountainImage from './assets/montain2.jpg';
import './index.css';
import SettingsModal from './components/SettingsModal'; 
import { BiEditAlt, BiTrash } from 'react-icons/bi';
import { IoSettingsOutline } from "react-icons/io5";

function formatDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [currencyRate, setCurrencyRate] = useState(null);
  const [form, setForm] = useState({
    who: '',
    what: '',
    amount: '',
    currency: '',
    date: '',
    forWhom: []
  });

  const [showSettings, setShowSettings] = useState(false);
  const [participants, setParticipants] = useState(null);
  const [currencies, setCurrencies] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [forWhomDropdownOpen, setForWhomDropdownOpen] = useState(false);
  const forWhomRef = useRef(null);
  const [editingRate, setEditingRate] = React.useState(null);
  const [editingRateInput, setEditingRateInput] = React.useState('');

  useEffect(() => {
    document.documentElement.style.setProperty('--mountain-image', `url(${mountainImage})`);
    fetchExpenses();
    fetchInitialSettings();

    fetch('/api/currency-rate')
      .then(res => res.json())
      .then(data => {
        if (data.rate) {
          setCurrencyRate(data.rate);
        }
      })
      .catch(console.error);
  }, []);

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
  
    // optionally можно сделать флаг `isEditing`, если ты хочешь редактировать и обновлять существующую строку, а не добавлять новую
  };

  // В useEffect при монтировании
  useEffect(() => {
    setForm(f => ({
      ...f,
      date: new Date().toISOString().slice(0, 10)  // YYYY-MM-DD, для input type="date"
    }));
  }, []);

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
    setForm({ who: '', what: '', amount: '', currency: '', date: new Date().toISOString().slice(0, 10), forWhom: [] });
    fetchExpenses();
  };

  const fetchInitialSettings = async () => {
    try {
      const participantsRes = await fetch('/api/participants');
      if (!participantsRes.ok) throw new Error('Ошибка загрузки участников');
      const participantsData = await participantsRes.json();
  
      const currenciesRes = await fetch('/api/currencies');
      if (!currenciesRes.ok) throw new Error('Ошибка загрузки валют');
      const currenciesData = await currenciesRes.json();
  
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

  const closeSettings = () => {
    setShowSettings(false);
  };

    // Отображение выбранных участников через +
  const forWhomDisplay = form.forWhom.length > 0 ? form.forWhom.join(' + ') : '';

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
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <IoSettingsOutline size={32} color="#718583" />
          </button>
        </div> 
        <input name="what" placeholder="За что платил" value={form.what} onChange={handleChange} />
        <input name="amount" placeholder="Сколько" inputMode="decimal" pattern="^\d+([.,]\d{0,2})?$" value={form.amount} onChange={handleAmountChange} />
        {/* Валюта - селект */}
        <select name="currency" value={form.currency} onChange={handleSelectChange} required>
          <option value="" disabled hidden>Валюта</option>
          {currencies && currencies.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input type="date" name="date" placeholder="Дата" value={form.date} onChange={handleChange} />
                {/* За кого платил - мультиселект */}
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

      {currencyRate !== null && (
        <div className="exchange-rate-container">
          {editingRate ? (
            <>
              <input
                type="text"
                value={editingRateInput}
                onChange={handleEditingRateChange}
                autoFocus
                style={{ width: 100, marginRight: 8 }}
                placeholder="Курс"
              />
              <button onClick={saveNewRate}>Сохранить</button>
              <button onClick={() => setEditingRate(false)}>Отмена</button>
            </>
          ) : (
            <>
              <h2 className="exchange-rate">В 1 лари {currencyRate.toFixed(2)} рублей</h2>
              <button
                className="edit-btn"
                onClick={handleEditExchangeRate}
                aria-label="Редактировать курс"
              >
                <BiEditAlt />
              </button>
            </>
          )}
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
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  expenses.reduce((acc, exp) => {
                    const key = `${exp.who} → ${exp.forWhom}`;
                    if (!acc[key]) acc[key] = {};
                    if (!acc[key][exp.currency]) acc[key][exp.currency] = 0;
                    const amount = parseFloat(exp.amount.replace(',', '.'));
                    acc[key][exp.currency] += isNaN(amount) ? 0 : amount;
                    return acc;
                  }, {})
                ).map(([key, currencyAmounts], idx) => {
                  const [who, forWhom] = key.split(' → ');
                  const text = `${who} платила за ${forWhom}`;
                  return (
                    <tr key={idx}>
                      <td>{text}</td>
                      {currencies.map(cur => (
                        <td key={cur}>
                          {currencyAmounts[cur] ? currencyAmounts[cur].toFixed(2) : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showSettings && participants && currencies && (
        <SettingsModal
          onClose={closeSettings}
          participants={participants}
          setParticipants={setParticipants}
          currencies={currencies}
          setCurrencies={setCurrencies}
        />
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
