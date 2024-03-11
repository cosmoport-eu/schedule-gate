import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import styles from './GateSelect.module.css';

export default function GateSelect(props) {
  const navigate = useNavigate();
  const [gates, setGates] = useState([]);

  useEffect(() => {
    props.api
      .get('/gates?isActive=true')
      .then((gates_) => setGates(gates_))
      .catch(console.error);
  }, []); // woof!

  const gatesOptions = gates.map((gate) => {
    const enTranslation = gate.translations.filter((t) => t.localeId === 1);
    
    return <option key={gate.id} value={gate.id}>
      {gate.id} - {enTranslation[0].text}
    </option>
  });

  const handleGateSelect = (e) => navigate(`/app/${e.target.value}`);

  return (
    <div>
      <div>Please select the Gate:</div>
      <select
        className={styles.select}
        defaultValue="-1"
        onChange={handleGateSelect}
      >
        <option value="-1" disabled>
          Gates
        </option>
        {gatesOptions}
      </select>
    </div>
  );
}
