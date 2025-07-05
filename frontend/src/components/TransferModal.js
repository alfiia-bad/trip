import React, { useState, useEffect } from 'react';
import { BiEditAlt } from 'react-icons/bi';
import { FaSave } from "react-icons/fa";
import '../index.css';

export default function TransferModal({ onClose, rate, onSaveRate }) {
  const [input, setInput] = useState(rate?.toFixed(2) ?? '');
  const [currencies, setCurrencies] = useState([]);
  const [matrix, setMatrix]       = useState([]); 
  const [editingCell, setEditing] = useState(null);

  // 1) подгружаем матрицу при открытии
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    fetch('/api/exchange-matrix')
      .then(r => r.json())
      .then(({ currencies, matrix }) => {
        setCurrencies(currencies);
        setMatrix(matrix);
      });
    return () => { document.body.style.overflow = ''; };
  }, []);

  // 2) сохранить новую величину
  const saveCell = async () => {
    const { row, col, value } = editingCell;
    const from = currencies[row];
    const to   = currencies[col];
    const rate = parseFloat(value.replace(',', '.'));
    if (isNaN(rate) || rate <= 0) {
      alert('Неверный курс');
      return;
    }

    // шлём на бэкенд, который сам обновит и обратный курс
    await fetch('/api/exchange-rate', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ from_code: from, to_code: to, rate })
    });

    // локально пересчитываем матрицу
    setMatrix(m => {
      const nm = m.map(r => r.slice());
      nm[row][col] = rate;
      nm[col][row] = 1 / rate;
      return nm;
    });
    setEditing(null);
  };

  const onBlurInput = () => {
    saveCell();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Перевод валют</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div style={{ overflowX: 'auto', padding: '1rem' }}>
          <table className="table-currency">
            <thead>
              <tr>
                <th></th>
                {currencies.map(c => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {currencies.map((rowCode, i) => (
                <tr key={rowCode}>
                  <th>{rowCode}</th>
                  {currencies.map((colCode, j) => {
                    const rawVal = matrix[i]?.[j];
                    const val = rawVal != null ? rawVal.toFixed(3) : '';
                    const isEditing = editingCell && editingCell.row === i && editingCell.col === j;
                    return (
                      <td key={colCode}>
                        {i === j ? (
                          '1'
                        ) : isEditing ? (
                          <>
                            <input
                              type="text"
                              inputMode="decimal"
                              autoFocus
                              value={editingCell.value}
                              onFocus={e => e.target.select()} 
                              onChange={e => setEditing(ec => ({ ...ec, value: e.target.value }))}
                              onBlur={onBlurInput}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.target.blur();
                                }
                              }}
                              style={{ width: 80, padding: '4px', fontSize: '16px' }}
                            />
                          </>
                        ) : (
                          <span
                            style={{ cursor: 'pointer', color: val ? 'inherit' : '#ccc' }}
                            onClick={() => {
                              const rawVal = matrix[i]?.[j];
                              const fullVal = rawVal != null ? rawVal.toFixed(8) : '';
                              setEditing({ row: i, col: j, value: fullVal });
                            }}
                          >
                            {val || '-'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem', fontSize: '14px', color: '#000' }}>
            {currencies.map((fromCode, i) =>
              currencies.map((toCode, j) => {
                if (i === j) return null;
                const rate = matrix[i]?.[j];
                if (!rate) return null;
                return (
                  <div key={`${fromCode}-${toCode}`}>
                    В 1 {fromCode} будет {+rate.toFixed(3)} {toCode}
                  </div>
                );
              })
            )}
          </div>   
        </div>
      </div>
    </div>
  );
}
