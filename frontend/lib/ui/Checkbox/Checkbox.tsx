import cls from "./Checkbox.module.css";

interface CheckboxProps {
  id: string;
  children: React.ReactNode;
  defaultChecked?: boolean;
}

export function Checkbox({ id, children, defaultChecked }: CheckboxProps) {
  return (
    <div className={cls.checkbox} aria-label="input" id={`checkbox-container-${id}`}>
      <input type="checkbox" id={id} name={id} defaultChecked={defaultChecked} />
      <label htmlFor={id}>{children}</label>
    </div>
  );
}
