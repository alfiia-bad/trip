// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import mountainImage from './assets/montain2.jpg';
import './index.css';

function App() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({
    who: '',
    what: '',
    amount: '',
    currency: '',
    date: '',
    forWhom: ''
  });

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--mountain-image', `url(${mountainImage})`);
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const res = await fetch('/api/expenses');
    const data = await res.json();
    setExpenses(data);
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isFormValid = () =>
    Object.values(form).every(field => field.trim() !== '');

  const handleSubmit = async () => {
    if (!isFormValid()) {
      alert('Пожалуйста, заполните все поля!');
      return;
    }

    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setForm({ who: '', what: '', amount: '', currency: '', date: '', forWhom: '' });
    fetchExpenses();
  };

  // --- Settings modal logic ---
  const deleteParticipant = (name) => {
    setParticipants(participants.filter(p => p !== name));
  };

  const editParticipant = (name) => {
    setEditingName(name);
    setEditedName(name);
  };

  const saveParticipantEdit = () => {
    setParticipants(participants.map(p => p === editingName ? editedName : p));
    setEditingName(null);
    setEditedName('');
  };

  const addParticipant = () => {
    const name = prompt('Введите имя нового участника');
    if (name && !participants.includes(name)) {
      setParticipants([...participants, name]);
    }
  };

  const deleteCurrency = (cur) => {
    setCurrencies(currencies.filter(c => c !== cur));
  };

  const addCurrency = () => {
    const cur = prompt('Введите название валюты');
    if (cur && !currencies.includes(cur)) {
      setCurrencies([...currencies, cur]);
    }
  };

  const closeSettings = () => {
    setShowSettings(false);
    setEditingName(null);
    setEditedName('');
  };

  return (
    <div>
      <div className="header">
        <h1 className="header-title">Гамарджоба, тут наши расходы на поездку друг ♥</h1>
      </div>

      <div>
        <input name="who" placeholder="Кто платил" value={form.who} onChange={handleChange} />
        <input name="what" placeholder="За что платил" value={form.what} onChange={handleChange} />
        <input name="amount" placeholder="Сколько" value={form.amount} onChange={handleChange} />
        <input name="currency" placeholder="Валюта" value={form.currency} onChange={handleChange} />
        <input name="date" placeholder="Дата" value={form.date} onChange={handleChange} />
        <input name="forWhom" placeholder="За кого платил" value={form.forWhom} onChange={handleChange} />
        <button onClick={handleSubmit}>Добавить в список</button>
      </div>

      <h2>Таблица расходов</h2>
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

      <button className="settings-btn" onClick={() => setShowSettings(true)}>Настройки</button>

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Настройки</h3>
              <button onClick={closeSettings} className="close-btn">&times;</button>
            </div>

            <div>
              <h4>Участники:</h4>
              {participants.map((p, idx) => (
                <div key={idx} className="settings-row">
                  {editingName === p ? (
                    <>
                      <input
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                      />
                      <button onClick={saveParticipantEdit}>Сохранить</button>
                    </>
                  ) : (
                    <>
                      <span>{p}</span>
                      <button onClick={() => editParticipant(p)}>редактировать</button>
                      <button onClick={() => deleteParticipant(p)}>удалить</button>
                    </>
                  )}
                </div>
              ))}
              <button onClick={addParticipant}>Добавить нового участника</button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <h4>Валюты:</h4>
              {currencies.map((c, idx) => (
                <div key={idx} className="settings-row">
                  <span>{c}</span>
                  <button onClick={() => deleteCurrency(c)}>удалить</button>
                </div>
              ))}
              <button onClick={addCurrency}>добавить валюту</button>
            </div>

            <div className="modal-actions">
              <button onClick={closeSettings}>Отмена</button>
              <button onClick={closeSettings}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
