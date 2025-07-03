import React, { useState, useEffect } from 'react';
import mountain2Image from './assets/montain2.jpg';

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

  const fetchExpenses = async () => {
    const res = await fetch('/api/expenses');
    const data = await res.json();
    setExpenses(data);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);
  
  useEffect(() => {
   document.documentElement.style.setProperty('--background-image', `url(${mountain2Image})`);
  }, []);

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

  return (
    <div>
      <div className="header">
        <h1>Гамарджоба, тут наши расходы на поездку, друг ♥</h1>
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
      <table border="1" cellPadding="5">
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
  );
}

export default App;
