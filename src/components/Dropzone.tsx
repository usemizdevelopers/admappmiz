import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

type DropzoneProps = {
  accept: string;
  multiple?: boolean;
  uploading?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
  actionLabel?: string;
  iconBadge?: boolean;
  imageIcon?: boolean;
};

export function Dropzone({
  accept,
  multiple,
  uploading,
  onFiles,
  label,
  hint,
  actionLabel,
  iconBadge,
  imageIcon,
}: DropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const acceptPrefix = accept.split(',')[0]?.split('/')[0];
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => !acceptPrefix || accept === '*' || f.type.startsWith(acceptPrefix)
    );
    onFiles(files);
  }

  const Icon = imageIcon ? ImageIcon : UploadCloud;
  const icon = <Icon size={20} strokeWidth={1.5} className="dropzone-icon" />;

  return (
    <motion.div
      className="dropzone"
      animate={{ borderColor: dragOver ? '#999085' : '#D1CCC7', scale: dragOver ? 1.01 : 1 }}
      transition={{ duration: 0.15 }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={uploading}
      />
      {uploading ? (
        <p>Enviando...</p>
      ) : (
        <>
          {iconBadge ? <span className="dropzone-icon-badge">{icon}</span> : icon}
          <p className="dropzone-title">{label ?? 'Arraste arquivos aqui ou clique para escolher'}</p>
          {actionLabel ? (
            <>
              <span className="dropzone-or">ou</span>
              <span className="btn-tan dropzone-action">{actionLabel}</span>
            </>
          ) : (
            <p className="dropzone-hint">{hint ?? 'Vários arquivos de uma vez são permitidos'}</p>
          )}
        </>
      )}
    </motion.div>
  );
}
