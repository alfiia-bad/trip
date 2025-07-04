import React, { useState, useEffect, useRef } from 'react';
import mountainImage from './assets/montain2.jpg';
import './index.css';
import SettingsModal from './components/SettingsModal'; 
import { BiEditAlt, BiTrash } from 'react-icons/bi';

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
    const value = e.target.value;
    
    // Разрешаем только положительные числа или пустую строку
    if (value === '' || (/^\d*\.?\d*$/.test(value) && parseFloat(value) >= 0)) {
      setForm(f => ({ ...f, amount: value }));
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
  
  const handleEditExchangeRate = async () => {
  const newRate = prompt('Введите новый курс лари к рублю', currencyRate);
  if (newRate && !isNaN(newRate)) {
    const parsedRate = parseFloat(newRate);
    setCurrencyRate(parsedRate);

    try {
      const response = await fetch('/api/currency-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from_currency: 'GEL',
          to_currency: 'RUB',
          rate: parsedRate
        })
      });

      if (!response.ok) {
        const err = await response.json();
        alert('Ошибка при сохранении курса: ' + err.detail);
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении курса');
    }
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
        <select name="who" value={form.who} onChange={handleSelectChange}>
          <option value="" disabled>Кто платил</option>
          {participants && participants.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input name="what" placeholder="За что платил" value={form.what} onChange={handleChange} />
        <input name="amount" placeholder="Сколько" type="number" min="0" step="0.01" value={form.amount} onChange={handleAmountChange} />
        {/* Валюта - селект */}
        <select name="currency" value={form.currency} onChange={handleSelectChange}>
          <option value="" disabled>Валюта</option>
          {currencies && currencies.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input type="date" name="date" placeholder="Дата" value={form.date} onChange={handleChange} />
                {/* За кого платил - мультиселект */}
        <div
          className="forWhom-multiselect"
          ref={forWhomRef}
          style={{ position: 'relative', display: 'inline-block', width: 300, marginTop: 8 }}
        >
          <input
            readOnly
            placeholder="За кого платил"
            value={forWhomDisplay}
            onClick={() => setForWhomDropdownOpen(o => !o)}
            style={{ cursor: 'pointer' }}
          />
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
                    cursor: 'pointer',
                    gap: '0.5rem'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.forWhom.includes(p)}
                    onChange={() => toggleForWhom(p)}
                    style={{ margin: 0 }}
                  />
                  <span>{p}</span>
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
                <td>{e.date}</td>
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
      
      {currencyRate !== null && (
        <div className="exchange-rate-container">
          <h2 className="exchange-rate">В 1 лари {currencyRate.toFixed(2)} рублей</h2>
          <button
            className="edit-btn"
            onClick={handleEditExchangeRate}
            aria-label="Редактировать курс"
          >
            <BiEditAlt />
          </button>
        </div>
      )}

      <button className="settings-btn" onClick={openSettings}>Настройки</button>

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
              <h3>Вы уверены, что хотите удалить строку?</h3>
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
