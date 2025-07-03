// frontend/src/components/SettingsModal.js
import React, { useState } from 'react';
import '../index.css';

export default function SettingsModal({
  participants,
  setParticipants,
  currencies,
  setCurrencies,
  onClose
}) {
  const [editingName, setEditingName] = useState(null);
  const [editedName, setEditedName] = useState('');

  const deleteParticipant = (name) => {
    setParticipants(participants.filter(p => p !== name));
  };

  const editParticipant = (name) => {
    setEditingName(name);
    setEditedName(name);
  };

  const saveParticipantEdit = () => {
    setParticipants(participants.map(p => (p === editingName ? editedName : p)));
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

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
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
          <button onClick={onClose}>Отмена</button>
          <button onClick={onClose}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}
