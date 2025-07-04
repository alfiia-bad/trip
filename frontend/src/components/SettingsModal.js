import React, { useState, useEffect } from 'react';
import { BiEditAlt, BiTrash } from "react-icons/bi";
import '../index.css';

export default function SettingsModal({ onClose, participants, setParticipants, currencies, setCurrencies }) {
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }, []);
  
  const [editingName, setEditingName] = useState(null);
  const [editedName, setEditedName] = useState('');

  // Удаление участника
  const deleteParticipant = async (name) => {
    await fetch(`/api/participants/${name}`, { method: 'DELETE' });
    // Обновляем участников
    const res = await fetch('/api/participants');
    const data = await res.json();
    setParticipants(data);
  };

  // Редактирование участника
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
    // Обновляем участников
    const res = await fetch('/api/participants');
    const data = await res.json();
    setParticipants(data);
  };

  const addParticipant = async () => {
    const name = prompt('Введите имя нового участника');
    if (name) {
      await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      // Обновляем участников
      const res = await fetch('/api/participants');
      const data = await res.json();
      setParticipants(data);
    }
  };

  // Удаление валюты
  const deleteCurrency = async (currency) => {
    await fetch(`/api/currencies/${currency}`, { method: 'DELETE' });
    const res = await fetch('/api/currencies');
    const data = await res.json();
    setCurrencies(data);
  };

  // Добавление валюты
  const addCurrency = async () => {
    const name = prompt('Введите название валюты');
    if (name) {
      await fetch('/api/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const res = await fetch('/api/currencies');
      const data = await res.json();
      setCurrencies(data);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ paddingLeft: 16, paddingRight: 16 }} onClick={(e) => e.stopPropagation()}>
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
                    className="edit-participant-input"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                  />
                  <button className="edit-participant-save-btn" onClick={saveParticipantEdit}>Сохранить</button>
                </>
              ) : (
                <>
                  <div className="participant-name">{p}</div>
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
      </div>
    </div>
  );
}
