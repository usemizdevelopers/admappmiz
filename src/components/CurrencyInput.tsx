import type { ChangeEvent } from 'react';
import { centavosParaExibicao } from '../lib/currency';

type CurrencyInputProps = {
  id: string;
  valueCentavos: number;
  onChange: (centavos: number) => void;
};

/** Máscara de moeda: a pessoa digita só números, o cursor sempre entra pela direita (centavos). */
export function CurrencyInput({ id, valueCentavos, onChange }: CurrencyInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, '');
    onChange(digitos ? parseInt(digitos, 10) : 0);
  }

  return (
    <div className="currency-input">
      <span className="currency-prefix">R$</span>
      <input id={id} inputMode="numeric" value={centavosParaExibicao(valueCentavos)} onChange={handleChange} />
    </div>
  );
}
