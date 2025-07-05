import React, { useEffect } from 'react';
import '../index.css';

export default function CalculatorModal({ onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Калькулятор переводов</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        <div style={{ padding: '1rem' }}>
          {/* сюда впоследствии ваш калькулятор */}
          <p>Здесь будет калькулятор.</p>
        </div>
      </div>
    </div>
  );
}
