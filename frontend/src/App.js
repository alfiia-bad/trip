import React, { useState, useEffect, useRef } from 'react';
import mountainImage from './assets/montain2.jpg';
import './index.css';
import SettingsModal from './components/SettingsModal'; 
import { BiEditAlt } from "react-icons/bi";

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
  
  // Для мультиселекта "За кого платил"
  const [forWhomDropdownOpen, setForWhomDropdownOpen] = useState(false);
  const forWhomRef = useRef(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--mountain-image', `url(${mountainImage})`);
    fetchExpenses();

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

  // Для select "Кто платил" и "Валюта"
  const handleSelectChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Для чекбоксов "За кого платил"
  const toggleForWhom = (name) => {
    setForm(f => {
      if (f.forWhom.includes(name)) {
        return { ...f, forWhom: f.forWhom.filter(p => p !== name) };
      } else {
        return { ...f, forWhom: [...f.forWhom, name] };
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

  const isFormValid = () =>
    Object.values(form).every(field => field.trim() !== '');

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
    setForm({ who: '', what: '', amount: '', currency: '', date: '', forWhom: '' });
    fetchExpenses();
  };

  const openSettings = async () => {
    setLoadingSettings(true);
    try {
      // Загрузка участников
      const participantsRes = await fetch('/api/participants');
      if (!participantsRes.ok) throw new Error('Ошибка загрузки участников');
      const participantsData = await participantsRes.json();

      // Загрузка валют
      const currenciesRes = await fetch('/api/currencies');
      if (!currenciesRes.ok) throw new Error('Ошибка загрузки валют');
      const currenciesData = await currenciesRes.json();

      setParticipants(participantsData);
      setCurrencies(currenciesData);
      setShowSettings(true);
    } catch (error) {
      console.error(error);
      alert('Ошибка загрузки данных настроек');
    } finally {
      setLoadingSettings(false);
    }
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
        <input name="amount" placeholder="Сколько" type="number" value={form.amount} onChange={handleChange} />
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
                  style={{ display: 'block', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={form.forWhom.includes(p)}
                    onChange={() => toggleForWhom(p)}
                    style={{ marginRight: 8 }}
                  />
                  {p}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {currencyRate !== null && (
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
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
    </div>
  );
}

export default App;
