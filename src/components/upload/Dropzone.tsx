import { Upload } from "lucide-react";

interface DropzoneProps {
  onProcessFiles: (files: File[]) => void;
}

export function Dropzone({ onProcessFiles }: DropzoneProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onProcessFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      className="border-2 border-dashed border-border bg-surface rounded-xl p-8 min-h-40 flex flex-col items-center justify-center text-center transition-colors hover:bg-surface-hover hover:border-primary cursor-pointer shrink-0"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => document.getElementById("fileInput")?.click()}
    >
      <input
        type="file"
        id="fileInput"
        className="hidden"
        multiple
        accept=".jpg,.jpeg,.eps"
        data-testid="dropzone-input"
        onChange={(e) => {
          if (e.target.files) onProcessFiles(Array.from(e.target.files));
        }}
      />
      <Upload className="w-8 h-8 text-primary mb-3" />
      <h3 className="text-base font-medium text-foreground mb-1">
        Drag & Drop files here
      </h3>
      <p className="text-xs text-muted">
        Auto-pairs files with the same name (e.g. img.eps + img.jpg)
      </p>
    </div>
  );
}
