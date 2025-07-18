// frontend/src/components/CalculatorModal.js
import React, { useState, useEffect } from 'react';
import '../index.css';

export default function CalculatorModal({ onClose }) {
  const [currencies, setCurrencies] = useState([]);
  const [matrix, setMatrix] = useState([]);
  // хранит вводимые пользователем значения, ключ вида `${from}_${to}`
  const [inputs, setInputs] = useState({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    // подтягиваем матрицу курсов
    fetch('/api/exchange-matrix')
      .then(r => r.json())
      .then(({ currencies, matrix }) => {
        setCurrencies(currencies);
        setMatrix(matrix);
        // инициализируем все input'ы нулями
        const initial = {};
        currencies.forEach((from, i) =>
          currencies.forEach((to, j) => {
            if (i !== j) initial[`${from}_${to}`] = '';
          })
        );
        setInputs(initial);
      });
    return () => { document.body.style.overflow = ''; };
  }, []);

  // валидатор: положительное число с точкой или запятой, до 2 знаков
  const PATTERN = /^\d*([.,]\d{0,2})?$/;

  const handleChange = (key, value) => {
    const normalized = value.replace(',', '.');
    if (!PATTERN.test(value) && value !== '') return;
    setInputs(inputs => ({ ...inputs, [key]: value }));
  };

  const missingCurrencies = currencies.filter((from, i) =>
    currencies.some((to, j) => {
      if (i === j) return false;
      const rate = matrix[i]?.[j];
      return rate == null || rate === 0;
    })
  );

  const format = v => {
    const str = String(v).replace(',', '.');
    const n = parseFloat(str);
    return isNaN(n) ? '—' : n.toFixed(2);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Калькулятор</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div style={{ padding: '1rem' }}>
          {currencies.map((from, i) =>
            currencies.map((to, j) => {
              if (i === j) return null;
              const key = `${from}_${to}`;
              const rate = matrix[i]?.[j] ?? 0;
              const inputVal = inputs[key] ?? '';
              const converted = format(parseFloat(inputVal.replace(',', '.')) * rate);
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    value={inputVal}
                    onChange={e => handleChange(key, e.target.value)}
                    placeholder="0"
                    style={{
                      width: 80,
                      marginRight: '0.5rem',
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #ccc',
                      textAlign: 'right',
                      flexShrink: 0
                    }}
                  />

                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      wordBreak: 'break-word',
                      whiteSpace: 'normal'
                    }}
                  >
                    {from} это{' '}
                    <strong className="calculator-modal__converted">
                      {converted}
                    </strong>{' '}
                    {to}
                  </div>
                </div>
              );
            })
          )}

          {missingCurrencies.length > 0 && (
            <div style={{ marginTop: '1rem', fontSize: '14px', color: 'red' }}>
              {missingCurrencies.map(c => (
                <div key={c}>* Расчеты могут быть неправильные, так как не указан курс валют для "{c}"</div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
