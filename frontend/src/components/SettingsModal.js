import React, { useState, useEffect } from 'react';
import { BiEditAlt, BiTrash } from "react-icons/bi";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import '../index.css';


export default function SettingsModal({ onClose, participants, setParticipants, currencies, setCurrencies, exchangeMatrix, setExchangeMatrix, defaultCurrency: defaultCurrencyProp, fetchExchangeMatrix }) {
      useEffect(() => {
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflowY = 'scroll';
    
        return () => {
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflowY = '';
          window.scrollTo(0, scrollY);
        }; 
      }, []);
  
  const [editingName, setEditingName] = useState(null);
  const [editedName, setEditedName] = useState(''); 
  const [defaultCurrency, setDefaultCurrency] = useState(defaultCurrencyProp);
  const [toDelete, setToDelete] = useState(null); 
      
  const confirmDelete = async () => {
    if (!toDelete) return;

    if (toDelete.type === 'participant') {
      await fetch(`/api/participants/${encodeURIComponent(toDelete.name)}`, { method: 'DELETE' });
      const res = await fetch('/api/participants');
      setParticipants(await res.json());
    } else {
      await fetch(`/api/currencies/${encodeURIComponent(toDelete.name)}`, { method: 'DELETE' });
      const res = await fetch('/api/currencies');
      setCurrencies(await res.json());

      // Если удаляем дефолтную валюту — сбрасываем её на бэке
      if (toDelete.name === defaultCurrency) {
        await fetch('/api/default-currency', {
          method: 'DELETE'
        });
        setDefaultCurrency('');
      }
      // ОБЯЗАТЕЛЬНО обновляем матрицу курсов и missingCurrencies!
      if (fetchExchangeMatrix) await fetchExchangeMatrix();
    }

    setToDelete(null);
  };
  const cancelDelete = () => setToDelete(null);

    useEffect(() => {
      setDefaultCurrency(defaultCurrencyProp);
    }, [defaultCurrencyProp]);

  const promptDeleteParticipant = (name) => {
    setToDelete({ type: 'participant', name });
  };

  const promptDeleteCurrency = (code) => {
    setToDelete({ type: 'currency', name: code });
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
    const res = await fetch('/api/participants');
    const updatedParticipants = await res.json();
    setParticipants(updatedParticipants);
    setEditingName(null);
    setEditedName('');
    onClose();
  };

  const addParticipant = async () => {
    const name = prompt('Введите имя нового участника');
    if (name) {
      await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const res = await fetch('/api/participants');
      const data = await res.json();
      setParticipants(data);
    }
  };

  const deleteCurrency = async (currency) => {
    await fetch(`/api/currencies/${currency}`, { method: 'DELETE' });
    const res = await fetch('/api/currencies');
    const data = await res.json();
    setCurrencies(data);
  };

  const addCurrency = async () => {
    const name = prompt('Введите название валюты');
    if (name) {
      await fetch('/api/currencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: name })
      });
      const res = await fetch('/api/currencies');
      const data = await res.json();
      setCurrencies(data);
      if (fetchExchangeMatrix) {
        fetchExchangeMatrix(); // обновить курсы и уведомления на главной
      }
    }
  };

  const handleSetDefault = async (code) => {
    await fetch('/api/default-currency', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    setDefaultCurrency(code);
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal"
          style={{ paddingLeft: 16, paddingRight: 16 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header" style={{ paddingLeft: 8, paddingRight: 8 }}>
            <h3>Настройки</h3>
            <button onClick={onClose} className="close-btn">
              &times;
            </button>
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
                    <button
                      className="edit-participant-save-btn"
                      onClick={saveParticipantEdit}
                    >
                      Сохранить
                    </button>
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
                        onClick={() => promptDeleteParticipant(p)}
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
                <div className="currency-code">{c}</div>
                <div className="icon-buttons">
                  <button
                    onClick={() => handleSetDefault(c)}
                    className="favorite-btn"
                    aria-label={`Сделать ${c} валютой по умолчанию`}
                  >
                    {c === defaultCurrency ? (
                      <FaHeart className="heart-filled" />
                    ) : (
                      <FaRegHeart className="heart-fill" />
                    )}
                    <span className="custom-tooltip">валюта по умолчанию</span>
                  </button>
                  <button
                    onClick={() => promptDeleteCurrency(c)}
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

      {/* Диалог подтверждения удаления */}
      {toDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {toDelete.type === 'participant'
                  ? `Вы уверены, что хотите удалить участника "${toDelete.name}"? Действие необратимо`
                  : `Вы уверены, что хотите удалить валюту "${toDelete.name}"? Действие необратимо`}
              </h3>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1rem',
              }}
            >
              <button
                style={{
                  backgroundColor: '#b00020',
                  color: 'white',
                  flex: 1,
                  marginRight: '0.5rem',
                }}
                onClick={confirmDelete}
              >
                Удалить
              </button>
              <button
                style={{
                  backgroundColor: '#ccc',
                  color: '#333',
                  flex: 1,
                  marginLeft: '0.5rem',
                }}
                onClick={cancelDelete}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
