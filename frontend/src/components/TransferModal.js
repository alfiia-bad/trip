import React, { useState, useEffect } from 'react';
import { BiEditAlt } from 'react-icons/bi';
import { FaRegCheckCircle } from 'react-icons/fa';
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
    const rate = parseFloat(value);
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
                    const val = matrix[i]?.[j]?.toFixed(4) ?? '';
                    const isEditing = editingCell && editingCell.row===i && editingCell.col===j;
                    return (
                      <td key={colCode}>
                        {i === j
                          ? '1'
                          : isEditing
                            ? <>
                                <input
                                  value={editingCell.value}
                                  onChange={e => setEditing(ec => ({...ec, value: e.target.value}))}
                                  onKeyDown={e => e.key==='Enter' && saveCell()}
                                />
                                <FaRegCheckCircle onClick={saveCell} style={{ cursor: 'pointer', color: '#718583', fontSize: '20px', marginLeft: '8px' }} />
                              </>
                            : <span
                                style={{ cursor: 'pointer' }}
                                onClick={() => setEditing({ row:i, col:j, value: val })}
                              >
                                {val}
                              </span>
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
