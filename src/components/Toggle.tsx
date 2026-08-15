type ToggleProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Toggle({ id, label, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle-field" htmlFor={id}>
      <span className="toggle-track">
        <input
          type="checkbox"
          id={id}
          className="toggle-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-thumb" />
      </span>
      {label}
    </label>
  );
}
