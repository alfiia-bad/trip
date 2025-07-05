import React, { useState, useEffect } from 'react';
import { BiEditAlt } from 'react-icons/bi';
import '../index.css';

export default function TransferModal({ onClose, rate, onSaveRate }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(rate?.toFixed(2) ?? '');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Перевод валют</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <div style={{ padding: '1rem' }}>
          {editing
            ? (
              <>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  style={{ marginRight: 8 }}
                />
                <button onClick={() => { onSaveRate(parseFloat(input)); setEditing(false); }}>
                  Сохранить
                </button>
                <button onClick={() => setEditing(false)} style={{ marginLeft: 8 }}>
                  Отмена
                </button>
              </>
            )
            : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>В 1 лари {rate?.toFixed(2)} рублей</span>
                <button
                  onClick={() => setEditing(true)}
                  className="edit-btn"
                  aria-label="Редактировать курс"
                >
                  <BiEditAlt />
                </button>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}
