import React, { useState, useEffect } from 'react';
import { BiEditAlt, BiTrash } from "react-icons/bi";
import '../index.css';

export default function SettingsModal({ onClose }) {
  const [participants, setParticipants] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [editingName, setEditingName] = useState(null);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    fetchParticipants();
    fetchCurrencies();
  }, []);

  const fetchParticipants = async () => {
    try {
      const res = await fetch('/api/participants');
      if (!res.ok) throw new Error(`Ошибка загрузки участников: ${res.status}`);
      const data = await res.json();
      setParticipants(data);
    } catch (err) {
      console.error('Ошибка при получении участников:', err);
      setParticipants([]);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await fetch('/api/currencies');
      if (!res.ok) throw new Error(`Ошибка загрузки валют: ${res.status}`);
      const data = await res.json();
      setCurrencies(data);
    } catch (err) {
      console.error('Ошибка при получении валют:', err);
      setCurrencies([]);
    }
  };

  const deleteParticipant = async (name) => {
    await fetch(`/api/participants/${name}`, { method: 'DELETE' });
    fetchParticipants();
  };

  const editParticipant = (name) => {
    setEditingName(name);
    setEditedName(name);
  };

  const saveParticipantEdit = async () => {
    await fetch(`/api/participants/${editingName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editedName })
    });
    setEditingName(null);
    setEditedName('');
    fetchParticipants();
  };

  const addParticipant = async () => {
    const name = prompt('Введите имя нового участника');
    if (name) {
      await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      fetchParticipants();
    }
  };

  const deleteCurrency = async (currency) => {
    await fetch(`/api/currencies/${currency}`, { method: 'DELETE' });
    fetchCurrencies();
  };

  const addCurrency = async () => {
    const name = prompt('Введите название валюты');
    if (name) {
      await fetch('/api/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      fetchCurrencies();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ paddingLeft: 8, paddingRight: 8 }}>
        <div className="modal-header" style={{ paddingLeft: 8, paddingRight: 8 }}>
          <h3>Настройки</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
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
                  <div className="icon-buttons">
                    <button 
                      onClick={() => editParticipant(p)} 
                      className="edit-btn"
                      aria-label={`Редактировать участника ${p}`}
                    >
                      <BiEditAlt />
                    </button>
                    <button 
                      onClick={() => deleteParticipant(p)} 
                      className="delete-btn"
                      aria-label={`Удалить участника ${p}`}
                    >
                      <BiTrash />
                    </button>
                  </div>
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
              <div className="icon-buttons">
                <button 
                  onClick={() => deleteCurrency(c)} 
                  className="delete-btn"
                  aria-label={`Удалить валюту ${c}`}
                >
                  <BiTrash />
                </button>
              </div>
            </div>
          ))}
          <button onClick={addCurrency}>Добавить валюту</button>
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
